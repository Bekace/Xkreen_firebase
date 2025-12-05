import { generateObject } from "ai"
import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"

const FaceAnalysisSchema = z.object({
  faces: z.array(
    z.object({
      gender: z.enum(["male", "female", "unknown"]).describe("The apparent gender of the person"),
      estimatedAge: z.number().describe("The estimated age of the person in years"),
      emotion: z
        .enum(["happy", "neutral", "sad", "angry", "surprised", "fearful", "disgusted"])
        .describe("The primary emotion expressed by the person"),
      lookingAtCamera: z.boolean().describe("Whether the person appears to be looking at the camera"),
      confidence: z.number().min(0).max(1).describe("Confidence level of the analysis (0-1)"),
    }),
  ),
})

async function analyzeWithRetry(imageData: string, faceCount: number, maxRetries = 2) {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] Server: Attempt ${attempt + 1}/${maxRetries + 1} - Analyzing ${faceCount} face(s)...`)

      const { object } = await generateObject({
        model: "gpt-4o",
        schema: FaceAnalysisSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: imageData,
              },
              {
                type: "text",
                text: `You are an expert in facial analysis and computer vision. Analyze this image with MAXIMUM ACCURACY and provide detailed information about each person visible. I detected ${faceCount} face(s) using face detection.

CRITICAL: Be as accurate as possible. This is for real-world analytics, not entertainment.

For EACH person in the image, analyze carefully and provide:

1. **Gender Analysis** (male/female/unknown):
   - Examine: facial bone structure, jawline shape, brow ridge, facial hair, skin texture
   - Use "unknown" ONLY if genuinely ambiguous
   - Be confident in your assessment based on visible features

2. **Age Estimation** (provide exact number in years):
   - Examine: skin texture and elasticity, wrinkles and fine lines, facial fat distribution, eye area, hair characteristics
   - Children (0-12): smooth skin, rounder faces, larger eyes relative to face
   - Teens (13-19): developing features, possible acne, youthful skin
   - Adults (20-59): mature features, varying skin texture, possible early aging signs
   - Seniors (60+): pronounced wrinkles, age spots, thinner skin, sagging
   - Provide your BEST estimate as a specific number (e.g., 25, 42, 67)

3. **Emotion Detection** (happy/neutral/sad/angry/surprised/fearful/disgusted):
   - Examine: mouth corners (up/down/neutral), eye shape (wide/narrow/relaxed), eyebrow position, forehead wrinkles, cheek position
   - Happy: mouth corners up, eyes crinkled, raised cheeks
   - Sad: mouth corners down, drooping eyes, furrowed brow
   - Angry: furrowed brow, tense jaw, narrowed eyes
   - Surprised: raised eyebrows, wide eyes, open mouth
   - Neutral: relaxed features, no strong expression
   - Be precise - don't default to neutral unless truly expressionless

4. **Attention/Gaze** (true/false for looking at camera):
   - Examine: eye direction, head orientation, pupil position
   - True: eyes directed toward camera, face oriented forward
   - False: eyes looking away, head turned, gaze averted

5. **Confidence Level** (0.0 to 1.0):
   - High confidence (0.8-1.0): clear view, good lighting, obvious features
   - Medium confidence (0.5-0.7): partial view, moderate lighting, some ambiguity
   - Low confidence (0.0-0.4): poor lighting, obscured features, significant uncertainty

Analyze ALL ${faceCount} faces detected. Be thorough, accurate, and analytical.`,
              },
            ],
          },
        ],
      })

      console.log("[v0] Server: AI vision analysis complete on attempt", attempt + 1)
      return object
    } catch (error) {
      lastError = error as Error
      console.error(`[v0] Server: Attempt ${attempt + 1} failed:`, {
        message: error instanceof Error ? error.message : "Unknown error",
        name: error instanceof Error ? error.name : undefined,
      })

      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000
        console.log(`[v0] Server: Waiting ${waitTime}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError
}

export async function POST(request: NextRequest) {
  try {
    const { imageData, faceCount } = await request.json()

    if (!imageData || !faceCount) {
      return NextResponse.json({ error: "Missing imageData or faceCount" }, { status: 400 })
    }

    console.log(`[v0] Server: Received request to analyze ${faceCount} face(s)`)

    const object = await analyzeWithRetry(imageData, faceCount)

    return NextResponse.json({
      faces: object.faces.map((face) => ({
        gender: face.gender,
        age: face.estimatedAge,
        ageGroup:
          face.estimatedAge < 13
            ? "child"
            : face.estimatedAge < 20
              ? "teen"
              : face.estimatedAge < 60
                ? "adult"
                : "senior",
        emotion: face.emotion === "fearful" || face.emotion === "disgusted" ? "unknown" : face.emotion,
        lookingAtScreen: face.lookingAtCamera,
        confidence: face.confidence,
      })),
    })
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      // @ts-ignore - Capture any additional error properties
      cause: error?.cause,
      // @ts-ignore
      code: error?.code,
    }

    console.error("[v0] Server: All retry attempts failed:", errorDetails)

    return NextResponse.json(
      {
        error: "AI analysis failed after retries",
        details: errorDetails.message,
        errorName: errorDetails.name,
        errorCode: errorDetails.code,
        fullError: JSON.stringify(errorDetails, null, 2),
      },
      { status: 500 },
    )
  }
}
