import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://api.weho.websitetestingbox.com/api/v1"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    const response = await fetch(`${BACKEND_URL}/chatbot-v2/metrics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch metrics" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Metrics API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
