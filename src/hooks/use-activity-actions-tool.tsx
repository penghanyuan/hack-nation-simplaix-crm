"use client"

import { useFrontendTool } from "@copilotkit/react-core"
import { useActivityActionsStore } from "@/stores/activity-actions-store"

/**
 * Frontend tools that allow the AI agent to accept or reject activities
 * These tools enable the agent to manage activity queue items on behalf of the user
 */
export function useActivityActionsTool() {
  const triggerAccept = useActivityActionsStore((state) => state.triggerAccept)
  const triggerReject = useActivityActionsStore((state) => state.triggerReject)

  // Tool to accept an activity
  useFrontendTool({
    name: "acceptActivity",
    description: "Accept a pending activity from the activity queue. This will create or update the corresponding contact or task in the CRM. IMPORTANT: You can ONLY accept activities that have status 'pending'. Use the activity ID from the readable activities data. Always check the current activities first before accepting.",
    parameters: [
      {
        name: "activityId",
        type: "string",
        description: "The ID (UUID string) of the pending activity to accept. Get this from the current activities in the queue.",
        required: true,
      },
    ],
    handler: async ({ activityId }) => {
      try {
        triggerAccept(activityId)
        return `Activity ${activityId} has been accepted and is being processed. The corresponding contact or task will be created/updated in the CRM.`
      } catch (error) {
        return `Failed to accept activity ${activityId}: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the activity ID is correct and the activity is still pending.`
      }
    },
  })

  // Tool to reject an activity
  useFrontendTool({
    name: "rejectActivity",
    description: "Reject a pending activity from the activity queue. This will mark the activity as rejected and remove it from the queue. IMPORTANT: You can ONLY reject activities that have status 'pending'. Use the activity ID from the readable activities data. Always check the current activities first before rejecting.",
    parameters: [
      {
        name: "activityId",
        type: "string",
        description: "The ID (UUID string) of the pending activity to reject. Get this from the current activities in the queue.",
        required: true,
      },
    ],
    handler: async ({ activityId }) => {
      try {
        triggerReject(activityId)
        return `Activity ${activityId} has been rejected and will be removed from the queue.`
      } catch (error) {
        return `Failed to reject activity ${activityId}: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the activity ID is correct and the activity is still pending.`
      }
    },
  })
}

