import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://api.weho.websitetestingbox.com/api/v1"

export async function GET(request: NextRequest, { params }: { params: { promptId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")

    const response = await fetch(`${BACKEND_URL}/prompts/${params.promptId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch prompt" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Get prompt API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { promptId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/prompts/${params.promptId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText || "Failed to update prompt" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Update prompt API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { promptId: string } }) {
  try {
    const authHeader = request.headers.get("authorization")

    const response = await fetch(`${BACKEND_URL}/prompts/${params.promptId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to delete prompt" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Delete prompt API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
