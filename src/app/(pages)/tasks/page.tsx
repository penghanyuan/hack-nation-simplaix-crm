"use client"

import useSWR from "swr"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { KanbanBoard } from "@/components/kanban-board"
import { toast } from "sonner"
import { useCopilotReadable } from "@copilotkit/react-core"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Task {
  id: string
  title: string
  description: string | null
  companyName: string | null
  contactEmails: string[] | null
  status: string
  priority: string | null
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function TasksPage() {
  // Use SWR for tasks data
  const { data, isLoading, mutate } = useSWR<{ success: boolean; tasks: Task[] }>(
    '/api/tasks',
    fetcher,
    {
      refreshInterval: 10000, // Auto-refresh every 10 seconds
      revalidateOnFocus: true,
    }
  )

  const tasks = data?.tasks || []
  const loading = isLoading

  // useCopilotReadable({
  //   description: "The current tasks in the CRM. These tasks are organized into a Kanban board, where you can move tasks between columns based on their status.",
  //   value: tasks,
  // })
  const handleTaskUpdate = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      // Revalidate SWR cache to get fresh data
      await mutate()

      toast.success("Task status updated")
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error("Failed to update task")
      throw error // Re-throw to trigger optimistic update revert
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      // Revalidate SWR cache to get fresh data
      await mutate()

      toast.success("Task deleted successfully")
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error("Failed to delete task")
      throw error
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-12 sm:h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-2 sm:px-4">
        <SidebarTrigger className="text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
        <h1 className="text-base sm:text-lg font-semibold text-neutral-900 truncate">Tasks</h1>
      </header>
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-neutral-500">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-neutral-50 rounded-sm shadow-md">
            <p className="text-sm text-neutral-500">No tasks found. Extract tasks from emails to see them here.</p>
          </div>
        ) : (
          <div className="h-full">
            <KanbanBoard tasks={tasks} onTaskUpdate={handleTaskUpdate} onTaskDelete={handleTaskDelete} />
          </div>
        )}
      </div>
    </div>
  )
}

