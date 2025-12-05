export async function GET() {
  return Response.json({
    message: "Screen config API route is working",
    timestamp: new Date().toISOString(),
  })
}
