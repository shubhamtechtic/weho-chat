import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { promptId: string } }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Authorization token required" }, { status: 401 })
    }

    const response = await fetch(
      `${process.env.BACKEND_URL || "https://api.weho.websitetestingbox.com/api/v1"}/prompts/set-active/${params.promptId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.detail || "Failed to set active prompt" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Set active prompt error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
