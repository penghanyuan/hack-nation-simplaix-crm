import { NextResponse } from "next/server"
import type { Activity } from "@/lib/types"
import { db } from "@/db"
import { interactions, activities } from "@/db/schema"
import { desc, eq } from "drizzle-orm"

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
    // Fetch pending activities from database
    const dbActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.status, 'pending'))
      .orderBy(desc(activities.createdAt))
      .limit(20)

    // Transform database activities to frontend Activity format
    const transformedActivities: Activity[] = dbActivities.map((activity) => {
      const extractedData = activity.extractedData as any

      let title = ''
      let description = ''

      if (activity.entityType === 'contact') {
        title = `${extractedData.name}`
        description = extractedData.email
        if (extractedData.companyName) {
          description += ` • ${extractedData.companyName}`
        }
        if (extractedData.title) {
          description += ` • ${extractedData.title}`
        }
      } else if (activity.entityType === 'task') {
        title = `${extractedData.title}`
        description = ''
        if (extractedData.companyName) {
          description += `${extractedData.companyName} • `
        }
        description += `Stage: ${extractedData.stage}`
        if (extractedData.amount) {
          description += ` • $${extractedData.amount.toLocaleString()}`
        }
      }

      return {
        id: activity.id,
        type: 'email' as const,
        title,
        description,
        timestamp: activity.createdAt,
        entityType: activity.entityType as 'contact' | 'task',
      }
    })

    return NextResponse.json(transformedActivities)
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/activities
 * Create a new interaction/activity
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, datetime, participants, summary, sentiment, contactEmail } = body

    // Validate required fields
    if (!type || !datetime) {
      return NextResponse.json(
        { error: 'Missing required fields: type, datetime' },
        { status: 400 }
      )
    }

    // Insert into interactions table
    const [newInteraction] = await db
      .insert(interactions)
      .values({
        type: type as 'email' | 'meeting',
        datetime: new Date(datetime),
        participants: participants || [],
        summary: summary || null,
        sentiment: sentiment || null,
        contactEmail: contactEmail || null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      interaction: newInteraction,
    })
  } catch (error) {
    console.error('Error creating interaction:', error)
    return NextResponse.json(
      {
        error: 'Failed to create interaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

