import { NextResponse } from "next/server"
import { getDealById, updateDeal, deleteDeal } from "@/services/dealService"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deal = await getDealById(params.id)

    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(deal)
  } catch (error) {
    console.error("Error fetching deal:", error)
    return NextResponse.json(
      { error: "Failed to fetch deal" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()
    const deal = await updateDeal(params.id, data)

    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(deal)
  } catch (error) {
    console.error("Error updating deal:", error)
    return NextResponse.json(
      { error: "Failed to update deal" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deal = await deleteDeal(params.id)

    if (!deal) {
      return NextResponse.json(
        { error: "Deal not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting deal:", error)
    return NextResponse.json(
      { error: "Failed to delete deal" },
      { status: 500 }
    )
  }
}

