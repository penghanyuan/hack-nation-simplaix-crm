"use client"

import { useFrontendTool } from "@copilotkit/react-core"
import { useActivityQueueStore } from "@/stores/activity-queue-store"

/**
 * Frontend tool that allows the AI agent to trigger activity queue updates
 * This enables the agent to sync emails and transcripts on demand
 */
export function useActivityQueueTool() {
  const triggerUpdate = useActivityQueueStore((state) => state.triggerUpdate)

  useFrontendTool({
    name: "updateActivityQueue",
    description: "Trigger an update of the activity queue to sync new emails and transcripts from Gmail and Fireflies. This will fetch the latest activities and analyze them for potential contacts and tasks. Use this when the user asks to refresh activities, sync emails, check for new messages, or update the activity feed.",
    parameters: [],
    handler: async () => {
      // Trigger the update through Zustand store
      triggerUpdate()
      
      return "Activity queue update has been triggered. The system is now syncing emails and transcripts from Gmail and Fireflies."
    },
  })
}


export function useEmailSyncHoursTool(mutate: () => void) {

  useFrontendTool({
    name: "updateEmailSyncHours",
    description: "Update the email sync hours setting to control how far back emails are synced from Gmail. Use this when the user wants to change the time range for email synchronization (e.g., last 1 hour, 6 hours, 12 hours, 24 hours, 48 hours, 72 hours, or 168 hours for 7 days).",
    parameters: [
      {
        name: "emailSyncHours",
        type: "number",
        description: "The number of hours to sync emails from (e.g., 1, 6, 12, 24, 48, 72, or 168)",
        required: true,
      },
    ],
    handler: async ({ emailSyncHours }) => {
      const response = await fetch('/api/settings/email-sync-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSyncHours: emailSyncHours }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to update email sync hours')
      }

      await mutate()

      return `Email sync hours updated. The system is now syncing emails from the last ${emailSyncHours} hours.`
    },
  })
}

