"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Activity, ActivityType } from "@/lib/types"

const activityTypeConfig: Record<ActivityType, { bg: string; text: string }> = {
  email: { bg: "bg-sky-50", text: "text-sky-600" },
  linkedin: { bg: "bg-indigo-50", text: "text-indigo-600" },
  zoom: { bg: "bg-emerald-50", text: "text-emerald-600" },
  calendar: { bg: "bg-amber-50", text: "text-amber-600" },
  slack: { bg: "bg-rose-50", text: "text-rose-600" }
}

function formatTimestamp(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function ActivityQueue() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch("/api/activities")
        if (!response.ok) throw new Error("Failed to fetch activities")
        const data = await response.json()
        // Convert timestamp strings back to Date objects
        const activitiesWithDates = data.map((activity: Activity) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }))
        setActivities(activitiesWithDates)
      } catch (error) {
        console.error("Error fetching activities:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [])

  return (
    <div className="border-t border-neutral-200 bg-neutral-50 shadow-md shrink-0 w-full overflow-hidden">
      <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 w-full">
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <h2 className="text-xs sm:text-sm font-semibold text-neutral-900">
            Recent Activity
          </h2>
          <button className="text-[10px] sm:text-xs text-neutral-500 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-300 rounded-sm px-1.5 sm:px-2 py-0.5 sm:py-1 whitespace-nowrap shrink-0">
            View All
          </button>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-2 sm:gap-3 pb-2">
            {isLoading ? (
              <div className="flex items-center justify-center w-full py-3 sm:py-4">
                <p className="text-xs text-neutral-400">Loading activities...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex items-center justify-center w-full py-3 sm:py-4">
                <p className="text-xs text-neutral-400">No recent activities</p>
              </div>
            ) : (
              activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
}

function ActivityCard({ activity }: { activity: Activity }) {
  const config = activityTypeConfig[activity.type]

  return (
    <div
      className={cn(
        "relative flex-shrink-0 w-52 sm:w-64 md:w-72 bg-white shadow-md rounded-sm p-3 sm:p-3.5 md:p-4",
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-neutral-300",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          // Handle activity click - could open a modal or navigate
          console.log("Activity clicked:", activity.id)
        }
      }}
    >
      {/* Tag Badge - Top Right */}
      <div className="absolute top-2 sm:top-2.5 md:top-3 right-2 sm:right-2.5 md:right-3">
        <Badge
          className={cn(
            "border-transparent text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5",
            config.bg,
            config.text
          )}
        >
          {activity.type}
        </Badge>
      </div>

      {/* Content */}
      <div className="pr-11 sm:pr-14 md:pr-16">
        <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 mb-0.5 sm:mb-1 line-clamp-1">
          {activity.title}
        </h3>
        <p className="text-[10px] sm:text-xs text-neutral-500 line-clamp-2 mb-1 sm:mb-1.5">
          {activity.description}
        </p>
        <span className="text-[10px] sm:text-xs text-neutral-400">
          {formatTimestamp(activity.timestamp)}
        </span>
      </div>
    </div>
  )
}

