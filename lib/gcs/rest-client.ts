// Google Cloud Storage REST API client
// Uses V4 signed URLs for direct client-side uploads (CORS-friendly)

interface GCSCredentials {
  project_id: string
  private_key: string
  client_email: string
}

function getCredentials(): GCSCredentials {
  const projectId = process.env.GCS_PROJECT_ID || process.env.GCP_PROJECT_ID
  const clientEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GCP_PRIVATE_KEY

  if (!projectId) {
    throw new Error("GCS_PROJECT_ID or GCP_PROJECT_ID environment variable is not set")
  }
  if (!clientEmail) {
    throw new Error("GCP_SERVICE_ACCOUNT_EMAIL environment variable is not set")
  }
  if (!privateKey) {
    throw new Error("GCP_PRIVATE_KEY environment variable is not set")
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  }
}

// Normalize private key format
function normalizePrivateKey(key: string): string {
  let privateKey = key
  privateKey = privateKey.replace(/\\n/g, "\n")
  privateKey = privateKey.replace(/\\\\n/g, "\n")
  return privateKey
}

// Import private key for signing
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/[\r\n\s]/g, "")

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  return crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"])
}

// Sign data with private key
async function signData(key: CryptoKey, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(data))

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Generate V4 signed URL for direct upload
export async function generateSignedUploadUrl(
  bucketName: string,
  objectName: string,
  contentType: string,
  expiresInSeconds = 900, // 15 minutes
): Promise<string> {
  const credentials = getCredentials()
  const privateKey = normalizePrivateKey(credentials.private_key)
  const cryptoKey = await importPrivateKey(privateKey)

  const now = new Date()
  const datestamp = now.toISOString().replace(/[-:]/g, "").split(".")[0].replace("T", "T").substring(0, 8)
  const timestamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

  const credentialScope = `${datestamp}/auto/storage/goog4_request`
  const credential = `${credentials.client_email}/${credentialScope}`

  const host = "storage.googleapis.com"
  const canonicalUri = `/${bucketName}/${encodeURIComponent(objectName).replace(/%2F/g, "/")}`

  const queryParams = new URLSearchParams({
    "X-Goog-Algorithm": "GOOG4-RSA-SHA256",
    "X-Goog-Credential": credential,
    "X-Goog-Date": timestamp,
    "X-Goog-Expires": expiresInSeconds.toString(),
    "X-Goog-SignedHeaders": "content-type;host",
  })

  // Sort query params
  const sortedParams = new URLSearchParams([...queryParams.entries()].sort())
  const canonicalQueryString = sortedParams.toString()

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`
  const signedHeaders = "content-type;host"

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n")

  // Hash canonical request
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest))
  const hashedCanonicalRequest = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const stringToSign = ["GOOG4-RSA-SHA256", timestamp, credentialScope, hashedCanonicalRequest].join("\n")

  const signature = await signData(cryptoKey, stringToSign)

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Goog-Signature=${signature}`
}

// Generate JWT for GCS authentication (for server-side operations)
async function generateJWT(credentials: GCSCredentials): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/devstorage.full_control",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  const message = `${headerB64}.${payloadB64}`

  const privateKey = normalizePrivateKey(credentials.private_key)
  const cryptoKey = await importPrivateKey(privateKey)

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(message))
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  return `${message}.${signatureB64}`
}

// Get OAuth2 access token (for server-side operations)
async function getAccessToken(): Promise<string> {
  const credentials = getCredentials()
  const jwt = await generateJWT(credentials)

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Make a file public after upload
export async function makeFilePublic(bucketName: string, fileName: string): Promise<void> {
  const accessToken = await getAccessToken()

  const encodedFileName = encodeURIComponent(fileName)
  const aclUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodedFileName}/acl`

  console.log("[v0] Making file public:", { bucketName, fileName, aclUrl })

  const response = await fetch(aclUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entity: "allUsers", role: "READER" }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("[v0] Failed to make file public:", error)
    throw new Error(`Failed to make file public: ${error}`)
  }

  console.log("[v0] File made public successfully")
}

// Delete file from GCS
export async function deleteFromGCS(bucketName: string, fileName: string): Promise<void> {
  const accessToken = await getAccessToken()

  const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(fileName)}`
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    throw new Error(`GCS delete failed: ${response.status} ${error}`)
  }
}

// Server-side upload (for small files or when CORS is not an issue)
export async function uploadToGCS(
  bucketName: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const accessToken = await getAccessToken()

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}`

  const uploadResponse = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: fileBuffer,
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    throw new Error(`GCS upload failed: ${uploadResponse.status} ${error}`)
  }

  // Make file public
  await makeFilePublic(bucketName, fileName)

  return `https://storage.googleapis.com/${bucketName}/${fileName}`
}
