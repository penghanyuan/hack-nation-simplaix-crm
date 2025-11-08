"use client"

import { useEffect, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PeopleTable } from "@/components/people-table"
import type { Contact } from "@/db/schema"

export default function PeoplePage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchContacts() {
      try {
        const response = await fetch("/api/contacts")
        if (!response.ok) throw new Error("Failed to fetch contacts")
        const data = await response.json()
        setContacts(data)
      } catch (error) {
        console.error("Error fetching contacts:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContacts()
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-12 sm:h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-2 sm:px-4">
        <SidebarTrigger className="text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
        <h1 className="text-base sm:text-lg font-semibold text-neutral-900 truncate">People</h1>
      </header>
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col min-h-0">
        <div className="mb-3 sm:mb-4 md:mb-6 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-neutral-500 truncate">
                All People · {contacts.length}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <PeopleTable contacts={contacts} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}

