"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import useSWR from "swr"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PeopleTable } from "@/components/people-table"
import { toast } from "sonner"
import type { Contact } from "@/db/schema"
import { useCopilotReadable } from "@copilotkit/react-core"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function PeoplePage() {
  const searchParams = useSearchParams()
  const highlightEmail = searchParams.get('email')

  // Use SWR for contacts data
  const { data: contacts = [], isLoading } = useSWR<Contact[]>(
    '/api/contacts',
    fetcher,
    {
      refreshInterval: 10000, // Auto-refresh every 10 seconds
      revalidateOnFocus: true,
    }
  )

  useCopilotReadable({
    description: "The current contacts in the CRM",
    value: contacts,
  })

  useEffect(() => {
    // Check for OAuth callback messages
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'gmail_connected') {
      toast.success('Gmail connected successfully!', {
        description: 'Your Gmail account has been linked to the CRM.',
      })
      // Clean up URL params
      window.history.replaceState({}, '', '/people')
    } else if (error) {
      const errorMessages: Record<string, string> = {
        'no_code': 'No authorization code received',
        'auth_failed': 'Failed to authenticate with Gmail',
      }
      toast.error('Gmail connection failed', {
        description: errorMessages[error] || error,
      })
      // Clean up URL params
      window.history.replaceState({}, '', '/people')
    }
  }, [searchParams])

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
          <PeopleTable contacts={contacts} isLoading={isLoading} highlightEmail={highlightEmail} />
        </div>
      </div>
    </div>
  )
}

