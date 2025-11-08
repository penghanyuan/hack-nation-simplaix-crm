"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export default function TasksPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-12 sm:h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-2 sm:px-4">
        <SidebarTrigger className="text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
        <h1 className="text-base sm:text-lg font-semibold text-neutral-900 truncate">Tasks</h1>
      </header>
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
        <div className="flex items-center justify-center h-64 bg-neutral-50 rounded-sm shadow-md">
          <p className="text-sm text-neutral-500">Tasks page - Coming soon</p>
        </div>
      </div>
    </div>
  )
}

