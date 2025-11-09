"use client"

import { useFrontendTool, useCopilotReadable } from "@copilotkit/react-core"
import { useRouter, usePathname } from "next/navigation"

/**
 * Frontend tool that allows the AI agent to navigate to different pages
 * This enables the agent to help users view different sections of the CRM
 */
export function useNavigationTool() {
  const router = useRouter()
  const pathname = usePathname()

  // Tell the AI what page the user is currently on
  const currentPage = pathname === '/' ? 'home' : pathname.split('/')[1] || 'home'
  
  useCopilotReadable({
    description: "The current page the user is viewing in the CRM application",
    value: {
      currentPage,
      fullPath: pathname,
      availablePages: ['people', 'tasks', 'home']
    }
  })

  useFrontendTool({
    name: "navigateToPage",
    description: "Navigate to a different page in the CRM application. Use this when the user wants to view or access a specific section of the CRM. Available pages: 'people' (to view contacts), 'tasks' (if you need more information about a task, you can navigate to the tasks page to view the task board and tasks), 'home' (dashboard/main page).",
    parameters: [
      {
        name: "page",
        type: "string",
        description: "The page to navigate to. Valid values: 'people', 'tasks'",
        required: true,
      },
    ],
    handler: async ({ page }) => {
      const pageRoutes: Record<string, string> = {
        people: '/people',
        tasks: '/tasks',
        home: '/',
      }

      const normalizedPage = page.toLowerCase().trim()
      const route = pageRoutes[normalizedPage]

      if (!route) {
        return `Invalid page: "${page}". Available pages are: people, tasks, home. Please use one of these exact values.`
      }

      try {
        router.push(route)
        
        // Map page names to more user-friendly descriptions
        const pageDescriptions: Record<string, string> = {
          people: 'People (Contacts)',
          tasks: 'Tasks Board',
          home: 'Dashboard',
        }

        return `Successfully navigated to ${pageDescriptions[normalizedPage]}. The page is now loading.`
      } catch (error) {
        return `Failed to navigate to ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    },
  })
}

