import { NextResponse } from "next/server"
import { listDeals } from "@/services/dealService"

export async function GET() {
  try {
    const allDeals = await listDeals()

    return NextResponse.json(allDeals)
  } catch (error) {
    console.error("Error fetching deals:", error)
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    )
  }
}

