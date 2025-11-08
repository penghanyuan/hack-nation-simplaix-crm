import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { contacts } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = ['name', 'email', 'companyName', 'title', 'phone', 'city', 'linkedin', 'x']
    const updateData: Record<string, string | Date> = {}

    for (const key of allowedFields) {
      if (key in body) {
        updateData[key] = body[key] as string
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date()

    const [updatedContact] = await db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, id))
      .returning()

    if (!updatedContact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedContact)
  } catch (error) {
    console.error("Error updating contact:", error)
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const [deletedContact] = await db
      .delete(contacts)
      .where(eq(contacts.id, id))
      .returning()

    if (!deletedContact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, contact: deletedContact })
  } catch (error) {
    console.error("Error deleting contact:", error)
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    )
  }
}

