"use client"

import { useEffect, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      if (data.success) {
        setTasks(data.tasks)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-neutral-100 text-neutral-800'
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-12 sm:h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-2 sm:px-4">
        <SidebarTrigger className="text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
        <h1 className="text-base sm:text-lg font-semibold text-neutral-900 truncate">Tasks</h1>
      </header>
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-neutral-500">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-neutral-50 rounded-sm shadow-md">
            <p className="text-sm text-neutral-500">No tasks found. Extract tasks from emails to see them here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base flex items-start justify-between gap-2">
                    <span className="line-clamp-2">{task.title}</span>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.description && (
                    <p className="text-sm text-neutral-600 line-clamp-3">{task.description}</p>
                  )}
                  {task.companyName && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500">Company:</span>
                      <span className="text-sm text-neutral-900">{task.companyName}</span>
                    </div>
                  )}
                  {task.priority && (
                    <Badge className={getPriorityColor(task.priority)} variant="outline">
                      {task.priority}
                    </Badge>
                  )}
                  {task.dueDate && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-500">Due:</span>
                      <span className="text-sm text-neutral-900">
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {task.contactEmails && task.contactEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.contactEmails.map((email, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

