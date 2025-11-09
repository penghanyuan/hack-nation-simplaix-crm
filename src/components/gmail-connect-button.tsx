"use client"

import { useState, useEffect } from "react"
import { Mail, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface GmailConnectionStatus {
  isConnected: boolean
  email?: string
  lastSync?: string
}

export function GmailConnectButton() {
  const [status, setStatus] = useState<GmailConnectionStatus>({ isConnected: false })
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    checkConnectionStatus()
  }, [])

  async function checkConnectionStatus() {
    try {
      const response = await fetch("/api/auth/google/status")
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Error checking Gmail connection:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConnect() {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/auth/google")
      const data = await response.json()
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        toast.error("Failed to initiate Gmail connection")
        setIsConnecting(false)
      }
    } catch (error) {
      console.error("Error connecting to Gmail:", error)
      toast.error("Failed to connect to Gmail")
      setIsConnecting(false)
    }
  }

  if (isLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="w-full justify-start gap-2"
      >
        <Loader2 className="size-4 animate-spin" />
        <span>Checking status...</span>
      </Button>
    )
  }

  if (status.isConnected) {
    return (
      <div className="flex flex-col gap-2 p-2 rounded-md bg-green-50 border border-green-200">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="size-4" />
          <span className="text-sm font-medium">Gmail Connected</span>
        </div>
        {status.email && (
          <p className="text-xs text-green-600 truncate">{status.email}</p>
        )}
        {status.lastSync && (
          <p className="text-xs text-green-600">
            Last synced: {new Date(status.lastSync).toLocaleString()}
          </p>
        )}
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleConnect}
      disabled={isConnecting}
      className="w-full justify-start gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
    >
      {isConnecting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Mail className="size-4" />
          <span>Connect Gmail</span>
        </>
      )}
    </Button>
  )
}

