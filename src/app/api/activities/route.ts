import { NextResponse } from "next/server"
import type { Activity } from "@/lib/types"

// Mock data - replace with real database queries later
const mockActivities: Activity[] = [
  {
    id: "1",
    type: "email",
    title: "New Contact from Email",
    description: "John Smith replied to your outreach campaign",
    timestamp: new Date(Date.now() - 5 * 60000)
  },
  {
    id: "2",
    type: "linkedin",
    title: "Contact Update",
    description: "Sarah Johnson changed positions to Senior Manager at TechCorp",
    timestamp: new Date(Date.now() - 15 * 60000)
  },
  {
    id: "3",
    type: "zoom",
    title: "Task Update from Meeting",
    description: "Follow-up call scheduled with Michael Chen",
    timestamp: new Date(Date.now() - 30 * 60000)
  },
  {
    id: "4",
    type: "calendar",
    title: "Upcoming Meeting",
    description: "Q4 Planning with Emily Rodriguez in 30 minutes",
    timestamp: new Date(Date.now() - 45 * 60000)
  },
  {
    id: "5",
    type: "slack",
    title: "New Message",
    description: "David Lee mentioned you in #sales-team",
    timestamp: new Date(Date.now() - 60 * 60000)
  },
  {
    id: "6",
    type: "email",
    title: "New Lead Generated",
    description: "Alex Martinez filled out the contact form",
    timestamp: new Date(Date.now() - 90 * 60000)
  },
  {
    id: "7",
    type: "linkedin",
    title: "Connection Request",
    description: "Jennifer Wilson wants to connect",
    timestamp: new Date(Date.now() - 120 * 60000)
  }
]

export async function GET() {
  try {
    // Sort by timestamp descending (newest first)
    const sortedActivities = mockActivities.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )

    return NextResponse.json(sortedActivities)
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    )
  }
}

