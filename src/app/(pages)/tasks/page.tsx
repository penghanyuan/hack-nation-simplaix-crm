"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export default function TasksPage() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-4">
        <SidebarTrigger className="text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
        <h1 className="text-lg font-semibold text-neutral-900">Tasks</h1>
      </header>
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64 bg-neutral-50 rounded-sm shadow-md">
          <p className="text-neutral-500">Tasks page - Coming soon</p>
        </div>
      </div>
    </>
  )
}

