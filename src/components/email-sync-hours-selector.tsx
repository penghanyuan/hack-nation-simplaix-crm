"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const syncOptions = [
  { value: 1, label: "Last 1 hour" },
  { value: 6, label: "Last 6 hours" },
  { value: 12, label: "Last 12 hours" },
  { value: 24, label: "Last 24 hours" },
  { value: 48, label: "Last 2 days" },
  { value: 72, label: "Last 3 days" },
  { value: 168, label: "Last 7 days" },
]

export function EmailSyncHoursSelector() {
  const { data: settingsData, mutate } = useSWR<{ emailSyncHours: number }>(
    '/api/settings/email-sync-hours',
    fetcher
  )

  const [isUpdating, setIsUpdating] = useState(false)

  const handleChange = async (value: string) => {
    const hours = parseInt(value, 10)
    setIsUpdating(true)

    try {
      const response = await fetch('/api/settings/email-sync-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSyncHours: hours }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to update sync hours')
      }

      await mutate()
      toast.success('Email sync hours updated', {
        description: `Emails will be synced from the ${syncOptions.find(o => o.value === hours)?.label.toLowerCase()}`,
      })
    } catch (error) {
      console.error('Error updating email sync hours:', error)
      toast.error('Failed to update sync hours', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const currentValue = settingsData?.emailSyncHours?.toString() || "12"

  return (
    <div className="space-y-2">
      <Label htmlFor="email-sync-hours" className="text-xs text-neutral-600">
        Email Sync Range
      </Label>
      <Select
        value={currentValue}
        onValueChange={handleChange}
        disabled={isUpdating}
      >
        <SelectTrigger id="email-sync-hours" className="w-full">
          <SelectValue placeholder="Select sync range" />
        </SelectTrigger>
        <SelectContent>
          {syncOptions.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-neutral-500">
        How far back to sync emails from Gmail
      </p>
    </div>
  )
}
