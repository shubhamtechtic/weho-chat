const BASE_URL = "https://api.weho.websitetestingbox.com/api/v1/chatbot-v2"
const DEFAULT_USER_ID = "default_user"

// Get messages for a specific session
export async function GET(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("user_id") || DEFAULT_USER_ID
    const sessionId = params.sessionId

    const response = await fetch(`${BASE_URL}/history/session/${sessionId}/${userId}`)

    if (!response.ok) {
      return Response.json({ error: "Failed to fetch messages" }, { status: response.status })
    }

    const messages = await response.json()
    return Response.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Delete a session
export async function DELETE(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("user_id") || DEFAULT_USER_ID
    const sessionId = params.sessionId

    const response = await fetch(`${BASE_URL}/history/session/${sessionId}/${userId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      return Response.json({ error: "Failed to delete session" }, { status: response.status })
    }

    const result = await response.json()
    return Response.json(result)
  } catch (error) {
    console.error("Error deleting session:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Rename a session
export async function PATCH(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const { title, user_id } = await req.json()
    const userId = user_id || DEFAULT_USER_ID
    const sessionId = params.sessionId

    const response = await fetch(`${BASE_URL}/history/session/${sessionId}/rename`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        title: title,
      }),
    })

    if (!response.ok) {
      return Response.json({ error: "Failed to rename session" }, { status: response.status })
    }

    const result = await response.json()
    return Response.json(result)
  } catch (error) {
    console.error("Error renaming session:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
