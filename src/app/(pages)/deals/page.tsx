"use client"

import { Suspense } from "react"
import useSWR from "swr"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DealsTable } from "@/components/deals-table"
import type { Deal } from "@/db/schema"
import { useCopilotReadable } from "@copilotkit/react-core"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function DealsPageContent() {
  // Use SWR for deals data
  const { data: deals = [], isLoading } = useSWR<Deal[]>(
    '/api/deals',
    fetcher,
    {
      refreshInterval: 10000, // Auto-refresh every 10 seconds
      revalidateOnFocus: true,
    }
  )

  useCopilotReadable({
    description: "The current deals in the CRM",
    value: deals,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-12 sm:h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-2 sm:px-4">
        <SidebarTrigger className="text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300" />
        <h1 className="text-base sm:text-lg font-semibold text-neutral-900 truncate">Deals</h1>
      </header>
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col min-h-0">
        <div className="mb-3 sm:mb-4 md:mb-6 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-neutral-500 truncate">
                All Deals · {deals.length}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <DealsTable deals={deals} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
      <DealsPageContent />
    </Suspense>
  )
}

