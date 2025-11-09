"use client"

import { useEffect, useState } from "react"
import useSWR, { mutate as globalMutate } from "swr"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Activity, ActivityType } from "@/lib/types"
import type { Activity as DBActivity } from "@/db/schema"
import { RefreshCw, Check, X } from "lucide-react"
import { toast } from "sonner"
import { useActivityQueueStore } from "@/stores/activity-queue-store"
import { useActivityActionsStore } from "@/stores/activity-actions-store"
import { useCopilotReadable } from "@copilotkit/react-core"
import { useEmailNotifications } from "@/hooks/use-email-notifications"

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json())

const activityTypeConfig: Record<ActivityType, { bg: string; text: string }> = {
  email: { bg: "bg-sky-50", text: "text-sky-600" },
  meeting: { bg: "bg-purple-50", text: "text-purple-600" },
  linkedin: { bg: "bg-indigo-50", text: "text-indigo-600" }
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
  const [statusText, setStatusText] = useState<string>("")
  
  // Listen for real-time email notifications
  // When new emails arrive, this triggers the update via Zustand store
  useEmailNotifications();
  
  // Use Zustand store for update state
  const { isUpdating: storeIsUpdating, setIsUpdating: setStoreIsUpdating } = useActivityQueueStore()
  const [isUpdating, setIsUpdating] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)

  // Sync local state with store state
  useEffect(() => {
    if (storeIsUpdating && !isUpdating && !hasTriggered) {
      // Trigger update when store state changes
      setHasTriggered(true)
      handleUpdate().finally(() => setHasTriggered(false))
    }
  }, [storeIsUpdating, isUpdating, hasTriggered])

  // Use SWR for data fetching
  const { data: rawActivities, isLoading, mutate } = useSWR<Activity[]>(
    '/api/activities',
    fetcher,
    {
      refreshInterval: 60000, // Auto-refresh every 60 seconds
      revalidateOnFocus: true,
    }
  )

  // Fetch last activity sync time from user settings
  const { data: syncData, mutate: mutateSyncTime } = useSWR<{ lastActivitySync: string | null }>(
    '/api/settings/activity-sync',
    fetcher,
    {
      refreshInterval: 30000,
    }
  )

  const lastSyncTime = syncData?.lastActivitySync ? new Date(syncData.lastActivitySync) : null

  // Convert timestamp strings to Date objects
  const activities = rawActivities?.map(activity => ({
    ...activity,
    timestamp: new Date(activity.timestamp)
  })) || []
  
  // Subscribe to activity actions from the store
  const { pendingAction, clearPendingAction } = useActivityActionsStore()

  // Handle activity actions from the store (triggered by AI tools)
  useEffect(() => {
    if (!pendingAction) return

    const processAction = async () => {
      try {
        const endpoint = pendingAction.action === 'accept' 
          ? `/api/activities/${pendingAction.activityId}/accept`
          : `/api/activities/${pendingAction.activityId}/reject`

        const response = await fetch(endpoint, {
          method: 'PATCH',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `Failed to ${pendingAction.action} activity`)
        }

        const result = await response.json()
        console.log(`Activity ${pendingAction.action}ed:`, result)

        // Invalidate activities cache
        await mutate()

        // Also invalidate the contacts or tasks cache based on entity type
        const activity = activities.find(a => a.id === pendingAction.activityId)
        if (activity?.entityType === 'contact') {
          await globalMutate('/api/contacts')
          console.log('✅ Contacts cache invalidated')
        } else if (activity?.entityType === 'task') {
          await globalMutate('/api/tasks')
          console.log('✅ Tasks cache invalidated')
        }

        toast.success(
          `Activity ${pendingAction.action}ed successfully`,
          { duration: 3000 }
        )
      } catch (error) {
        console.error(`Error ${pendingAction.action}ing activity:`, error)
        toast.error(
          `Failed to ${pendingAction.action} activity`,
          { 
            description: error instanceof Error ? error.message : 'Unknown error',
            duration: 5000 
          }
        )
        // Revalidate on error
        await mutate()
      } finally {
        clearPendingAction()
      }
    }

    processAction()
  }, [pendingAction, activities, mutate, clearPendingAction])

  useCopilotReadable({
    description: "The current activities in the activity queue, these activites might be added to the CRM as contacts or tasks",
    value: activities,
  })
  async function handleUpdate() {
    setIsUpdating(true)
    setStoreIsUpdating(true)
    setStatusText("Starting sync...")

    // Start polling more frequently during analysis
    const pollInterval = setInterval(() => {
      mutate() // Refresh activities every 3 seconds during analysis
    }, 3000)

    try {
      // Step 1: Sync emails and transcripts in parallel
      setStatusText("Syncing emails and transcripts...")
      const [emailSyncResult, transcriptSyncResult] = await Promise.allSettled([
        // Email sync from Gmail
        fetch('/api/emails/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to sync emails')
          }
          const data = await response.json()
          console.log('📧 Email sync complete:', data)
          return data
        }),
        // Transcript sync (without analyzing)
        fetch('/api/transcripts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analyze: false, autoInsert: false }),
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to sync transcripts')
          }
          const data = await response.json()
          console.log('📄 Transcript sync complete:', data)
          return data
        })
      ])

      // Check sync results
      const emailSyncSuccess = emailSyncResult.status === 'fulfilled'
      const transcriptSyncSuccess = transcriptSyncResult.status === 'fulfilled'

      const emailSyncData = emailSyncSuccess ? emailSyncResult.value : null
      const transcriptSyncData = transcriptSyncSuccess ? transcriptSyncResult.value : null

      const totalPendingEmails = emailSyncData?.results?.created || 0
      const totalPendingTranscripts = transcriptSyncData?.results?.created || 0
      const totalPending = totalPendingEmails + totalPendingTranscripts
      console.log('totalPending', totalPending)
      if (totalPending > 0) {
        setStatusText(`Found ${totalPendingEmails} emails and ${totalPendingTranscripts} transcripts to analyze`)
      }
      console.log('emailSyncSuccess', emailSyncSuccess)
      console.log('transcriptSyncSuccess', transcriptSyncSuccess)
      console.log('emailSyncData', emailSyncData)
      console.log('transcriptSyncData', transcriptSyncData)

      // Step 2: Analyze pending emails (after sync completes)
      // Always try to analyze, even if no NEW emails were created
      // (there might be pending emails from webhook or previous syncs)
      let emailAnalysisResult = null
      if (emailSyncSuccess) {
        try {
          setStatusText(`Checking for pending emails to analyze...`)
          console.log('🤖 Starting analysis of pending emails...')
          const analyzeResponse = await fetch('/api/emails/analyze-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })

          if (analyzeResponse.ok) {
            emailAnalysisResult = await analyzeResponse.json()
            console.log('✅ Email analysis complete:', emailAnalysisResult)

            const emailsProcessed = emailAnalysisResult.results?.processed || 0
            const activitiesCreated = emailAnalysisResult.results?.activities || 0
            
            if (emailsProcessed > 0) {
              setStatusText(`Analyzed ${emailsProcessed} email(s), created ${activitiesCreated} activity(ies)`)
            } else {
              setStatusText(`No pending emails to analyze`)
            }

            // Revalidate activities cache to show new activities
            await mutate()
          } else {
            const error = await analyzeResponse.json()
            console.error('❌ Failed to analyze emails:', error)
          }
        } catch (error) {
          console.error('❌ Error analyzing pending emails:', error)
        }
      }

      // Step 3: Analyze pending transcripts (after sync completes)
      let transcriptAnalysisResult = null
      if (transcriptSyncSuccess && totalPendingTranscripts > 0) {
        try {
          const emailsProcessed = emailAnalysisResult?.results?.processed || 0
          setStatusText(`Analyzing emails and transcripts (${emailsProcessed}/${totalPending})...`)

          console.log('🤖 Starting analysis of pending transcripts...')
          const analyzeResponse = await fetch('/api/transcripts/analyze-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })

          if (analyzeResponse.ok) {
            transcriptAnalysisResult = await analyzeResponse.json()
            console.log('✅ Transcript analysis complete:', transcriptAnalysisResult)

            const totalProcessed = emailsProcessed + (transcriptAnalysisResult.results?.processed || 0)
            setStatusText(`Analyzing emails and transcripts (${totalProcessed}/${totalPending})...`)

            // Revalidate activities cache to show new activities
            await mutate()
          } else {
            const error = await analyzeResponse.json()
            console.error('❌ Failed to analyze transcripts:', error)
          }
        } catch (error) {
          console.error('❌ Error analyzing pending transcripts:', error)
        }
      }

      // Update lastActivitySync timestamp
      setStatusText("Finalizing...")
      await fetch('/api/settings/activity-sync', { method: 'POST' })
      await mutateSyncTime() // Revalidate sync time cache

      // Final revalidation after all operations
      await mutate()

      // Show appropriate toast based on results
      const emailAnalysisData = emailAnalysisResult?.results
      const transcriptAnalysisData = transcriptAnalysisResult?.results

      const description = []

      if (emailSyncSuccess && emailAnalysisData) {
        description.push(
          `Emails: ${emailSyncData.results.created} synced, ${emailAnalysisData.processed} analyzed, ${emailAnalysisData.activities} activities created`
        )
      } else if (emailSyncSuccess && emailSyncData) {
        description.push(`Emails: ${emailSyncData.results.created} synced`)
      }

      if (transcriptSyncSuccess && transcriptAnalysisData) {
        description.push(
          `Transcripts: ${transcriptSyncData.results.created} synced, ${transcriptAnalysisData.processed} analyzed, ${transcriptAnalysisData.activities} activities created`
        )
      } else if (transcriptSyncSuccess && transcriptSyncData) {
        description.push(`Transcripts: ${transcriptSyncData.results.created} synced`)
      }

      if (description.length > 0) {
        setStatusText("Complete!")
        toast.success("Update complete", {
          description: description.join('. '),
          duration: 5000,
        })
      } else {
        throw new Error('All sync operations failed')
      }
    } catch (error) {
      console.error('Error during update:', error)
      setStatusText("")
      toast.error(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // Stop frequent polling
      clearInterval(pollInterval)
      setIsUpdating(false)
      setStoreIsUpdating(false)
      // Clear status text after a delay
      setTimeout(() => setStatusText(""), 2000)
    }
  }

  return (
    <div className="flex border-t border-neutral-200 bg-neutral-50 shadow-md shrink-0 w-full overflow-hidden">
      <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 w-full">
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-neutral-900">
              Recent Activity
            </h2>
            {isUpdating && statusText ? (
              <p className="text-[10px] text-blue-600 font-medium animate-pulse truncate">
                {statusText}
              </p>
            ) : lastSyncTime ? (
              <p className="text-[10px] text-neutral-500">
                Last synced: {formatTimestamp(lastSyncTime)}
              </p>
            ) : null}
          </div>
          <Button
            onClick={handleUpdate}
            disabled={isUpdating}
            size="sm"
            variant="outline"
            className="text-[10px] sm:text-xs whitespace-nowrap shrink-0 h-7 sm:h-8"
          >
            <RefreshCw className={cn(
              "w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1",
              isUpdating && "animate-spin"
            )} />
            {isUpdating ? "Updating..." : "Update"}
          </Button>
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
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onActivityProcessed={mutate}
                />
              ))
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
}

function ActivityCard({
  activity,
  onActivityProcessed,
}: {
  activity: Activity
  onActivityProcessed: () => Promise<any>
}) {
  const config = activityTypeConfig[activity.type]
  const [isProcessing, setIsProcessing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fullActivityData, setFullActivityData] = useState<DBActivity | null>(null)

  // Use entityType from activity object
  const entityType = activity.entityType
  useEffect(() => {
    const fetchActivityDetails = async () => {
      const response = await fetch(`/api/activities/${activity.id}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Activity details:', data)
        setFullActivityData(data)
      }
    }
    fetchActivityDetails()
  }, [activity.id])
  
  const handleCardClick = async () => {
    // Fetch full activity data
    try {
      const response = await fetch(`/api/activities/${activity.id}`)
      if (response.ok) {
        const data = await response.json()
        setFullActivityData(data)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error('Error fetching activity details:', error)
    }
  }

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsProcessing(true)

    try {
      const response = await fetch(`/api/activities/${activity.id}/accept`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept activity')
      }

      const result = await response.json()
      console.log('Activity accepted:', result)

      // Invalidate activities cache
      await onActivityProcessed()

      // Also invalidate the contacts or tasks cache based on entity type
      if (activity.entityType === 'contact') {
        await globalMutate('/api/contacts')
        console.log('✅ Contacts cache invalidated')
      } else if (activity.entityType === 'task') {
        await globalMutate('/api/tasks')
        console.log('✅ Tasks cache invalidated')
      }
    } catch (error) {
      console.error('Error accepting activity:', error)
      toast.error(`Failed to accept: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Revalidate on error
      await onActivityProcessed()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsProcessing(true)

    try {
      const response = await fetch(`/api/activities/${activity.id}/reject`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to reject activity')
      }

      const result = await response.json()
      console.log('Activity rejected:', result)

      // Optimistically update SWR cache
      await onActivityProcessed()
    } catch (error) {
      console.error('Error rejecting activity:', error)
      toast.error(`Failed to reject: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Revalidate on error
      await onActivityProcessed()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <div
        onClick={handleCardClick}
        className={cn(
          "flex-shrink-0 w-52 sm:w-64 md:w-72 bg-white shadow-md rounded-lg overflow-hidden",
          "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-neutral-300",
          "animate-in fade-in slide-in-from-bottom-2",
          "flex flex-col"
        )}
      >
        {/* Header - Badges in one line */}
        <div className="px-3 sm:px-4 pt-3 sm:pt-3.5 pb-1 bg-white">
          <div className="flex gap-1.5 flex-wrap">
            {/* Entity Type Badge */}
            {entityType && (
              <Badge
                className={cn(
                  "border-transparent text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-0.5",
                  entityType === 'contact'
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                )}
              >
                {entityType}
              </Badge>
            )}
            {/* Action Badge (Create/Update) */}
            {entityType === 'contact' && fullActivityData && (
              <Badge
                className={cn(
                  "border-transparent text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-0.5",
                  fullActivityData.action === 'update'
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
                )}
              >
                {fullActivityData.action === 'update' ? 'Update' : 'Create'}
              </Badge>
            )}
            {/* Source Type Badge */}
            <Badge
              className={cn(
                "border-transparent text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-0.5",
                config.bg,
                config.text
              )}
            >
              {activity.type}
            </Badge>
          </div>
        </div>

        {/* Body - Title and Information */}
        <div className="px-3 sm:px-4 pt-1 pb-1 flex-1">
          {/* Title */}
          <h3 className="text-sm sm:text-base font-semibold text-neutral-900 mb-2 line-clamp-1">
            {activity.title}
          </h3>
          
          {/* Description */}
          <p className="text-xs sm:text-sm text-neutral-600 line-clamp-2 min-h-[2.5rem]">
            {activity.description}
          </p>
          
          {/* Timestamp */}
          <div className="flex items-center text-[10px] sm:text-xs text-neutral-400">
            <span>{formatTimestamp(activity.timestamp)}</span>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="px-3 sm:px-4 pb-3 pt-2 border-t border-neutral-100 bg-neutral-50/30">
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1 h-8 sm:h-9 text-xs sm:text-sm bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1 h-8 sm:h-9 text-xs sm:text-sm border-red-300 text-red-600 hover:bg-red-50"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
              Reject
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {entityType && (
                <Badge
                  className={cn(
                    "text-xs",
                    entityType === 'contact'
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  )}
                >
                  {entityType}
                </Badge>
              )}
              {/* Action Badge in Modal */}
              {entityType === 'contact' && fullActivityData && (
                <Badge
                  className={cn(
                    "text-xs",
                    fullActivityData.action === 'update'
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  )}
                >
                  {fullActivityData.action === 'update' ? 'Update' : 'Create'}
                </Badge>
              )}
              <span>{activity.title}</span>
            </DialogTitle>
            <DialogDescription>
              {fullActivityData?.sourceEmailSubject && (
                <span className="block">From: {fullActivityData.sourceEmailSubject}</span>
              )}
              {fullActivityData?.sourceEmailFrom && (
                <span className="block text-xs">Sender: {fullActivityData.sourceEmailFrom}</span>
              )}
              {fullActivityData?.sourceEmailDate && (
                <span className="block text-xs">
                  Date: {new Date(fullActivityData.sourceEmailDate).toLocaleString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Display extracted data */}
          {fullActivityData && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2 text-sm">Extracted Information:</h4>
              {entityType === 'contact' && (
                <ContactDetails data={fullActivityData.extractedData as any} />
              )}
              {entityType === 'task' && (
                <TaskDetails data={fullActivityData.extractedData as any} />
              )}
            </div>
          )}

          {/* Action buttons in modal */}
          <div className="flex gap-2 mt-6">
            <Button
              onClick={(e) => {
                setIsModalOpen(false)
                handleAccept(e)
              }}
              disabled={isProcessing}
              className={cn(
                "flex-1 text-white",
                fullActivityData?.action === 'update'
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
              )}
            >
              <Check className="w-4 h-4 mr-2" />
              {entityType === 'contact' && fullActivityData?.action === 'update' 
                ? 'Update Contact' 
                : entityType === 'contact'
                ? 'Create Contact'
                : 'Accept & Close'}
            </Button>
            <Button
              variant="outline"
              onClick={(e) => {
                setIsModalOpen(false)
                handleReject(e)
              }}
              disabled={isProcessing}
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Reject & Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper component to display contact details
function ContactDetails({ data }: { data: any }) {
  const isUpdate = data.action === 'update';
  const hasChanges = isUpdate && data.changes && data.changes.length > 0;

  return (
    <div className="space-y-4 text-sm">
      {/* Show changes summary for updates */}
      {hasChanges && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <span className="text-lg">📝</span>
            Changes Detected ({data.changes.length})
          </h5>
          <div className="space-y-2">
            {data.changes.map((change: any, idx: number) => (
              <div key={idx} className="text-xs bg-white p-2 rounded border border-amber-100">
                <span className="font-medium capitalize">{change.field}:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-neutral-500 line-through">
                    {change.oldValue || '(empty)'}
                  </span>
                  <span className="text-neutral-400">→</span>
                  <span className="text-amber-700 font-medium">
                    {change.newValue || '(empty)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact information */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="font-medium">Name:</span>
          <p className="text-neutral-600">{data.name}</p>
        </div>
        <div>
          <span className="font-medium">Email:</span>
          <p className="text-neutral-600">{data.email}</p>
        </div>
        {data.companyName && (
          <div>
            <span className="font-medium">Company:</span>
            <p className="text-neutral-600">{data.companyName}</p>
          </div>
        )}
        {data.title && (
          <div>
            <span className="font-medium">Title:</span>
            <p className="text-neutral-600">{data.title}</p>
          </div>
        )}
        {data.phone && (
          <div>
            <span className="font-medium">Phone:</span>
            <p className="text-neutral-600">{data.phone}</p>
          </div>
        )}
        {data.linkedin && (
          <div>
            <span className="font-medium">LinkedIn:</span>
            <p className="text-neutral-600 break-all">{data.linkedin}</p>
          </div>
        )}
        {data.x && (
          <div>
            <span className="font-medium">Twitter/X:</span>
            <p className="text-neutral-600">{data.x}</p>
          </div>
        )}
        {data.city && (
          <div>
            <span className="font-medium">City:</span>
            <p className="text-neutral-600">{data.city}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper component to display task details
function TaskDetails({ data }: { data: any }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <span className="font-medium">Title:</span>
          <p className="text-neutral-600">{data.title}</p>
        </div>
        {data.description && (
          <div className="col-span-2">
            <span className="font-medium">Description:</span>
            <p className="text-neutral-600">{data.description}</p>
          </div>
        )}
        {data.companyName && (
          <div>
            <span className="font-medium">Company:</span>
            <p className="text-neutral-600">{data.companyName}</p>
          </div>
        )}
        {data.status && (
          <div>
            <span className="font-medium">Status:</span>
            <p className="text-neutral-600 capitalize">{data.status.replace('_', ' ')}</p>
          </div>
        )}
        {data.priority && (
          <div>
            <span className="font-medium">Priority:</span>
            <p className="text-neutral-600 capitalize">{data.priority}</p>
          </div>
        )}
        {data.dueDate && (
          <div>
            <span className="font-medium">Due Date:</span>
            <p className="text-neutral-600">
              {new Date(data.dueDate).toLocaleDateString()}
            </p>
          </div>
        )}
        {data.contactEmails && data.contactEmails.length > 0 && (
          <div className="col-span-2">
            <span className="font-medium">Contact Emails:</span>
            <p className="text-neutral-600">{data.contactEmails.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

