import { NextResponse } from "next/server"
import type { Activity } from "@/lib/types"
import { getPendingActivities } from "@/services/activityService"
import { createInteraction } from "@/services/interactionService"

type ContactExtraction = {
  name?: string
  email?: string
  companyName?: string
  title?: string
}

type TaskExtraction = {
  title?: string
  companyName?: string
  status?: string
  priority?: string
  dueDate?: string
}

export async function GET() {
  try {
    // Fetch pending activities from database
    const dbActivities = await getPendingActivities(20)

    // Transform database activities to frontend Activity format
    const transformedActivities: Activity[] = dbActivities.map((activity) => {
      let title = ''
      let description = ''

      if (activity.entityType === 'contact') {
        const extractedData = activity.extractedData as ContactExtraction
        title = `${extractedData.name ?? ''}`
        description = extractedData.email ?? ''
        if (extractedData.companyName) {
          description += ` • ${extractedData.companyName}`
        }
        if (extractedData.title) {
          description += ` • ${extractedData.title}`
        }
      } else if (activity.entityType === 'task') {
        const extractedData = activity.extractedData as TaskExtraction
        title = `${extractedData.title ?? ''}`
        description = ''
        if (extractedData.companyName) {
          description += `${extractedData.companyName} • `
        }
        if (extractedData.status) {
          description += `Status: ${extractedData.status.replace('_', ' ')}`
        }
        if (extractedData.priority) {
          description += ` • Priority: ${extractedData.priority}`
        }
        if (extractedData.dueDate) {
          const dueDate = new Date(extractedData.dueDate)
          description += ` • Due: ${dueDate.toLocaleDateString()}`
        }
      }

      return {
        id: activity.id,
        type: activity.sourceType,
        sourceType: activity.sourceType,
        title,
        description,
        timestamp: activity.createdAt,
        entityType: activity.entityType as 'contact' | 'task',
        status: activity.status,
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
    const newInteraction = await createInteraction({
      type: type as 'email' | 'meeting',
      datetime: new Date(datetime),
      participants: participants || [],
      summary: summary || null,
      sentiment: sentiment || null,
      contactEmail: contactEmail || null,
    })

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
