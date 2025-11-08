import { NextResponse } from "next/server"
import { db } from "@/db"
import { contacts } from "@/db/schema"
import { desc } from "drizzle-orm"

export async function GET() {
  try {
    const allContacts = await db
      .select()
      .from(contacts)
      .orderBy(desc(contacts.createdAt))

    return NextResponse.json(allContacts)
  } catch (error) {
    console.error("Error fetching contacts:", error)
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    )
  }
}

