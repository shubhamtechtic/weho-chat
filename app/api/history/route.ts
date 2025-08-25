const BASE_URL = "https://api.weho.websitetestingbox.com/api/v1/chatbot-v2"
const DEFAULT_USER_ID = "default_user"

// Get all sessions for a user
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("user_id") || DEFAULT_USER_ID

    const response = await fetch(`${BASE_URL}/history/sessions/${userId}`)

    if (!response.ok) {
      return Response.json({ error: "Failed to fetch sessions" }, { status: response.status })
    }

    const sessions = await response.json()
    return Response.json(sessions)
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
