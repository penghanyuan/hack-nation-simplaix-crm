import { NextRequest, NextResponse } from "next/server"
import { deleteContact, updateContact } from "@/services/contactService"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const updatedContact = await updateContact(id, updateData)

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const deletedContact = await deleteContact(id)

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
