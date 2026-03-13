
import { useDropzone } from "react-dropzone"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { UploadCloud, File as FileIcon, CheckCircle, AlertCircle } from "lucide-react"

interface SimpleUploaderProps {
  onUploadComplete: (result: any) => void
  onUploadError: (error: string) => void
  maxFileSizeFormatted?: string
}

export function SimpleUploader({ onUploadComplete, onUploadError, maxFileSizeFormatted }: SimpleUploaderProps) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setFileName(file.name)
      setFileSize(file.size)
      setUploadProgress(0)
      setError(null)
      setIsSuccess(false)

      try {
        // 1. Get a signed URL from our backend
        const response = await fetch("/api/media/get-upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to get upload URL")
        }

        const { uploadUrl, publicUrl, gcsFileName, bucketName } = await response.json()

        // 2. Upload the file directly to GCS using the signed URL
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", uploadUrl, true)
        xhr.setRequestHeader("Content-Type", file.type)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100
            setUploadProgress(percentComplete)
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            // 3. The file is in GCS, now confirm with our backend
            fetch("/api/media/confirm-upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                publicUrl: publicUrl,
                gcsFileName: gcsFileName,
                bucketName: bucketName,
              }),
            })
              .then((confirmResponse) => {
                if (confirmResponse.ok) {
                  return confirmResponse.json()
                }
                return confirmResponse.json().then((err) => {
                  throw new Error(err.error || "Upload confirmation failed")
                })
              })
              .then((media) => {
                setIsSuccess(true)
                setUploadProgress(100)
                onUploadComplete(media)
              })
              .catch((e) => {
                const errorMessage = e instanceof Error ? e.message : "Unknown error during confirmation"
                setError(errorMessage)
                onUploadError(errorMessage)
              })
          } else {
            const errorMessage = `Upload failed: ${xhr.statusText}`
            setError(errorMessage)
            onUploadError(errorMessage)
          }
        }

        xhr.onerror = () => {
          const errorMessage = "An error occurred during the upload."
          setError(errorMessage)
          onUploadError(errorMessage)
        }

        xhr.send(file)
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown upload error occurred"
        setError(errorMessage)
        onUploadError(errorMessage)
      }
    },
    [onUploadComplete, onUploadError],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const formatFileSize = (bytes: number | null) => {
    if (bytes === null) return ""
    if (bytes < 1024) return `${bytes} Bytes`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const resetState = () => {
    setUploadProgress(null)
    setFileName(null)
    setFileSize(null)
    setError(null)
    setIsSuccess(false)
  }

  if (uploadProgress !== null) {
    return (
      <div className="w-full text-center p-8 border-2 border-dashed rounded-lg">
        <div className="flex items-center gap-4 mb-4">
          <FileIcon className="h-8 w-8 text-gray-500" />
          <div className="text-left flex-1">
            <p className="font-medium truncate">{fileName}</p>
            <p className="text-sm text-gray-500">{formatFileSize(fileSize)}</p>
          </div>
        </div>
        <Progress value={uploadProgress} className="mb-2" />
        <p className="text-sm text-gray-500 mb-4">{Math.round(uploadProgress)}% complete</p>
        {isSuccess && (
          <div className="flex items-center justify-center text-green-600 gap-2 mb-4">
            <CheckCircle className="h-5 w-5" />
            <p>Upload successful!</p>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center text-red-600 gap-2 mb-4">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}
        <Button onClick={resetState} variant="outline">
          Upload Another File
        </Button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"}`}>
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4">
        <UploadCloud className="h-12 w-12 text-gray-400" />
        <div>
          <p className="font-medium">Drop files here or click to upload</p>
          <p className="text-sm text-gray-500">Max {maxFileSizeFormatted} per file</p>
        </div>
      </div>
    </div>
  )
}
