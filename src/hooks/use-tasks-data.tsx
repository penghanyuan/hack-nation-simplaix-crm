"use client"

import useSWR from "swr"
import { useCopilotReadable } from "@copilotkit/react-core"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Task {
  id: string
  title: string
  description: string | null
  companyName: string | null
  contactEmails: string[] | null
  tags: string[] | null
  status: string
  priority: string | null
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Hook that fetches all tasks and makes them available to the AI
 * This allows the AI to answer questions about tasks from any page
 */
export function useTasksData() {
  // Use SWR for tasks data with caching
  const { data, isLoading } = useSWR<{ success: boolean; tasks: Task[] }>(
    '/api/tasks',
    fetcher,
    {
      refreshInterval: 30000, // Auto-refresh every 30 seconds
      revalidateOnFocus: true,
      dedupingInterval: 10000, // Dedupe requests within 10 seconds
    }
  )

  const tasks = data?.tasks || []

  // Expose tasks data to the AI
  useCopilotReadable({
    description: "All tasks in the CRM system. Tasks can have different statuses: 'todo' (not started), 'in_progress' (currently being worked on), or 'done' (completed). Each task has a title, description, optional company name, contact emails, priority level, and due date. Use this information to answer questions about tasks, their status, priorities, and deadlines.",
    value: {
      totalTasks: tasks.length,
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        companyName: task.companyName,
        contactEmails: task.contactEmails,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
      })),
      tasksByStatus: {
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        done: tasks.filter(t => t.status === 'done').length,
      },
      isLoading,
    }
  })

  return {
    tasks,
    isLoading,
    totalTasks: tasks.length,
    todoTasks: tasks.filter(t => t.status === 'todo'),
    inProgressTasks: tasks.filter(t => t.status === 'in_progress'),
    doneTasks: tasks.filter(t => t.status === 'done'),
  }
}

