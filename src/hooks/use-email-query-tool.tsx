"use client"

import { useFrontendTool } from "@copilotkit/react-core"

type EmailQueryParams = {
  startDate?: string
  endDate?: string
  status?: string
  limit?: number
}

type QueriedEmail = {
  id: string
  subject: string
  fromName?: string | null
  fromEmail: string
  toEmail?: string | null
  receivedAt: string
  status: string
  body: string
}

/**
 * Frontend tool that allows the AI agent to query emails by time range
 * This enables the agent to retrieve and analyze email data from specific periods
 */
export function useEmailQueryTool() {
  useFrontendTool({
    name: "queryEmails",
    description: "Query emails from the database within a specific time range. Use this to retrieve and analyze emails received during a particular period. Returns email details including subject, body, sender, recipient, and metadata.",
    parameters: [
      {
        name: "startDate",
        type: "string",
        description: "The start date and time of the query range in ISO 8601 format (e.g., '2024-01-01T00:00:00Z'). If not provided, will query from the beginning of time.",
        required: false,
      },
      {
        name: "endDate",
        type: "string",
        description: "The end date and time of the query range in ISO 8601 format (e.g., '2024-12-31T23:59:59Z'). If not provided, will query up to the current time.",
        required: false,
      },
      {
        name: "status",
        type: "string",
        description: "Filter emails by status. Valid values: 'pending', 'processing', 'processed', 'error'. If not provided, returns emails of all statuses.",
        required: false,
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of emails to return. Defaults to 100. Use this to avoid retrieving too many results.",
        required: false,
      },
    ],
    handler: async ({ startDate, endDate, status, limit }: EmailQueryParams) => {
      try {
        // Validate date formats if provided
        if (startDate) {
          const parsedStart = new Date(startDate)
          if (isNaN(parsedStart.getTime())) {
            return `Invalid startDate format: "${startDate}". Please use ISO 8601 format (e.g., '2024-01-01T00:00:00Z')`
          }
        }

        if (endDate) {
          const parsedEnd = new Date(endDate)
          if (isNaN(parsedEnd.getTime())) {
            return `Invalid endDate format: "${endDate}". Please use ISO 8601 format (e.g., '2024-12-31T23:59:59Z')`
          }
        }

        // Validate status if provided
        const validStatuses = ['pending', 'processing', 'processed', 'error']
        if (status && !validStatuses.includes(status)) {
          return `Invalid status: "${status}". Valid values are: ${validStatuses.join(', ')}`
        }

        // Build query parameters
        const params = new URLSearchParams()
        if (startDate) params.append('startDate', startDate)
        if (endDate) params.append('endDate', endDate)
        if (status) params.append('status', status)
        if (limit) params.append('limit', limit.toString())

        // Call the API endpoint
        const response = await fetch(`/api/emails/query?${params.toString()}`)
        
        if (!response.ok) {
          const error = await response.text()
          return `Failed to query emails: ${error}`
        }

        const data = await response.json()
        
        // Format the response
        if (data.emails.length === 0) {
          return `No emails found for the specified criteria. Try adjusting your date range or removing filters.`
        }

        const summary = {
          totalCount: data.count,
          emailsReturned: data.emails.length,
          dateRange: {
            start: startDate || 'beginning of time',
            end: endDate || 'current time',
          },
          statusFilter: status || 'all',
          emails: data.emails.map((email: QueriedEmail) => ({
            id: email.id,
            subject: email.subject,
            from: `${email.fromName || 'Unknown'} <${email.fromEmail}>`,
            to: email.toEmail,
            receivedAt: email.receivedAt,
            status: email.status,
            bodyPreview: email.body.substring(0, 200) + (email.body.length > 200 ? '...' : ''),
          })),
        }

        return `Found ${data.count} email(s) matching your criteria:\n\n${JSON.stringify(summary, null, 2)}`
      } catch (error) {
        return `Failed to query emails: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your parameters and try again.`
      }
    },
  })
}
