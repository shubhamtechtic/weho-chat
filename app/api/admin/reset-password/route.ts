export async function POST(request: Request) {
  try {
    const body = await request.json()

    const response = await fetch(`${process.env.BACKEND_URL}/admin/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return Response.json(data, { status: response.status })
    }

    return Response.json(data)
  } catch (error) {
    console.error("Admin reset password error:", error)
    return Response.json({ detail: "Internal server error" }, { status: 500 })
  }
}
