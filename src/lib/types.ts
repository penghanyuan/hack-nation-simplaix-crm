// State of the agent, make sure this aligns with your agent's state.
export type AgentState = {
  proverbs: string[];
}

// Activity Queue types
export type ActivityType = "email" | "linkedin" | "zoom" | "calendar" | "slack"

export interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: Date
  entityType: "contact" | "task"
}