"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"

interface WatchStatus {
  active: boolean
  historyId: string | null
  expiration: string | null
  isExpired: boolean
}

export function GmailWatchSettings() {
  const [status, setStatus] = useState<WatchStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isStopping, setIsStopping] = useState(false)

  useEffect(() => {
    checkWatchStatus()
  }, [])

  async function checkWatchStatus() {
    try {
      const response = await fetch("/api/gmail/watch/setup")
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Error checking watch status:", error)
      toast.error("Failed to check watch status")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetupWatch() {
    setIsSettingUp(true)
    try {
      const response = await fetch("/api/gmail/watch/setup", {
        method: "POST",
      })
      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Gmail watch setup successfully!")
        await checkWatchStatus()
      } else {
        toast.error(data.error || "Failed to setup Gmail watch")
      }
    } catch (error) {
      console.error("Error setting up watch:", error)
      toast.error("Failed to setup Gmail watch")
    } finally {
      setIsSettingUp(false)
    }
  }

  async function handleStopWatch() {
    setIsStopping(true)
    try {
      const response = await fetch("/api/gmail/watch/setup", {
        method: "DELETE",
      })
      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Gmail watch stopped successfully")
        await checkWatchStatus()
      } else {
        toast.error(data.error || "Failed to stop Gmail watch")
      }
    } catch (error) {
      console.error("Error stopping watch:", error)
      toast.error("Failed to stop Gmail watch")
    } finally {
      setIsStopping(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-5" />
            Real-Time Email Sync
          </CardTitle>
          <CardDescription>
            Receive new emails automatically as they arrive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Checking status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isActive = status?.active && !status?.isExpired

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isActive ? (
            <>
              <Bell className="size-5 text-green-600" />
              Real-Time Email Sync
            </>
          ) : (
            <>
              <BellOff className="size-5 text-muted-foreground" />
              Real-Time Email Sync
            </>
          )}
        </CardTitle>
        <CardDescription>
          Receive new emails automatically as they arrive via push notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        {isActive ? (
          <div className="flex flex-col gap-2 p-3 rounded-md bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 text-green-700">
              <Bell className="size-4" />
              <span className="text-sm font-medium">Active</span>
            </div>
            {status.expiration && (
              <p className="text-xs text-green-600">
                Expires: {new Date(status.expiration).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3 rounded-md bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-600">
              <BellOff className="size-4" />
              <span className="text-sm font-medium">Inactive</span>
            </div>
            {status?.isExpired && (
              <p className="text-xs text-orange-600">Watch has expired. Please renew.</p>
            )}
          </div>
        )}

        {/* Warning if watch will expire soon */}
        {status?.expiration && !status.isExpired && (
          (() => {
            const expirationDate = new Date(status.expiration);
            const now = new Date();
            const hoursUntilExpiry = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            if (hoursUntilExpiry < 24) {
              return (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Watch expires in {Math.round(hoursUntilExpiry)} hours. Please renew to continue receiving real-time updates.
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isActive ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSetupWatch}
                disabled={isSettingUp}
                className="flex-1"
              >
                {isSettingUp ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Renewing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-4 mr-2" />
                    Renew Watch
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopWatch}
                disabled={isStopping}
                className="flex-1"
              >
                {isStopping ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <BellOff className="size-4 mr-2" />
                    Stop Watch
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleSetupWatch}
              disabled={isSettingUp}
              className="w-full"
            >
              {isSettingUp ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Setting up...
                </>
              ) : (
                <>
                  <Bell className="size-4 mr-2" />
                  Enable Real-Time Sync
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• Gmail push notifications expire after 7 days</p>
          <p>• New emails are automatically synced when they arrive</p>
          <p>• Requires Gmail connection and Google Cloud Pub/Sub setup</p>
        </div>
      </CardContent>
    </Card>
  )
}

