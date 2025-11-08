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
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-4">
        <SidebarTrigger className="text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
        <h1 className="text-lg font-semibold text-neutral-900">People</h1>
      </header>
      <div className="flex-1 p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-neutral-500">
                All People · {contacts.length}
              </p>
            </div>
            <button className="bg-neutral-800 text-neutral-50 rounded-md px-4 py-2 hover:bg-neutral-900 active:bg-neutral-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-300 text-sm font-medium">
              + Add New
            </button>
          </div>
        </div>
        <PeopleTable contacts={contacts} isLoading={isLoading} />
      </div>
    </>
  )
}

