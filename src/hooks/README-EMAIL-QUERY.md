# Email Query Tool

## Overview
The `useEmailQueryTool` is a CopilotKit frontend tool that allows the AI agent to query emails from the database with flexible time range filters.

## Features
- Query emails by date range (start and end date)
- Filter by email status (pending, processing, processed, error)
- Limit the number of results returned
- Returns detailed email information including subject, body, sender, recipient, and metadata

## Usage

### In the Application
The hook is already integrated in `/src/app/(pages)/layout.tsx` and is automatically available to the AI agent.

### Agent Commands
The AI agent can query emails using the following parameters:

```
Query emails from the last 24 hours:
- startDate: "2025-11-08T00:00:00Z"
- endDate: "2025-11-09T00:00:00Z"

Query all pending emails:
- status: "pending"

Query recent emails with a limit:
- limit: 50
```

### Example Agent Interactions

**User**: "Show me all emails from the last week"
**Agent**: Uses queryEmails with startDate and endDate parameters

**User**: "Find pending emails that need to be processed"
**Agent**: Uses queryEmails with status: "pending"

**User**: "Get the 10 most recent emails"
**Agent**: Uses queryEmails with limit: 10

## API Endpoint
The tool calls `/api/emails/query` with query parameters:
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `status` (optional): 'pending' | 'processing' | 'processed' | 'error'
- `limit` (optional): number (default: 100, max: 1000)

## Implementation Files
- Hook: `/src/hooks/use-email-query-tool.tsx`
- API Route: `/src/app/api/emails/query/route.ts`
- Service Function: `/src/services/emailService.ts` (queryEmailsByTimeRange)

## Date Format
All dates must be in ISO 8601 format:
- Valid: `2025-11-09T00:00:00Z`
- Valid: `2024-01-01T12:30:00.000Z`
- Invalid: `11/09/2025` or `2025-11-09`

