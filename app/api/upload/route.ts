export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const threadId = (formData.get("thread_id") as string) || "default"

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // Create FormData for backend
    const backendFormData = new FormData()
    backendFormData.append("file", file)

    const response = await fetch(
      `https://api.weho.websitetestingbox.com/api/v1/chatbot-v2/upload-doc?thread_id=${threadId}`,
      {
        method: "POST",
        body: backendFormData,
        headers: {
          // Note: Don't set Content-Type for FormData, let browser set it with boundary
        },
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      return Response.json({ error: errorData.message || "Upload failed" }, { status: response.status })
    }

    const result = await response.json()
    return Response.json(result)
  } catch (error) {
    console.error("Upload error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
