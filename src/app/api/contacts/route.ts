import { NextResponse } from "next/server"
import { listContacts } from "@/services/contactService"

export async function GET() {
  try {
    const allContacts = await listContacts()

    return NextResponse.json(allContacts)
  } catch (error) {
    console.error("Error fetching contacts:", error)
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    )
  }
}
