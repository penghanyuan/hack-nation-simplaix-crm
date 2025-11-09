// State of the agent, make sure this aligns with your agent's state.
export type AgentState = {
  proverbs: string[];
}

// Activity Queue types
export type ActivityType = "email" | "meeting" | "linkedin"

export type ActivitySourceType = "email" | "meeting" | "linkedin"

export type ActivityStatus = "pending" | "accepted" | "rejected"

export interface Activity {
  id: string
  type: ActivityType
  sourceType?: ActivitySourceType
  title: string
  description: string
  timestamp: Date
  entityType: "contact" | "task" | "deal"
  status: ActivityStatus
}