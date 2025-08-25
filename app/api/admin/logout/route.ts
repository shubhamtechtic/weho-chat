export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")

    const response = await fetch(`${process.env.BACKEND_URL}/admin/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return Response.json(data, { status: response.status })
    }

    return Response.json(data)
  } catch (error) {
    console.error("Admin logout error:", error)
    return Response.json({ detail: "Internal server error" }, { status: 500 })
  }
}
