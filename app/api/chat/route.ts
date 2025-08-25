export async function POST(req: Request) {
  const { messages, id, user_id, guest } = await req.json()

  // Get the latest user message
  const lastUserMessage = [...messages].reverse().find((msg: any) => msg.role === "user")
  const query = lastUserMessage?.content

  if (!query) {
    return new Response("Empty query", { status: 400 })
  }

  const response = await fetch("https://api.weho.websitetestingbox.com/api/v1/chatbot-v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      query,
      thread_id: "default",
      language: "English",
      session_id: id,
      is_guest: guest !== undefined ? guest : true,
      user_id: user_id || "guest",
    }),
  })

  if (!response.ok || !response.body) {
    return new Response("Failed to fetch stream", { status: 500 })
  }

  // Stream the response directly back to the frontend
  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
