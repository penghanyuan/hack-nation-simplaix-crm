"use client"

import { useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Loader2, RefreshCw } from "lucide-react"

interface EmailData {
  id: string
  from: string
  to: string[]
  subject: string
  date: string
  snippet: string
  body: string
}

export default function TestEmailPage() {
  const [email, setEmail] = useState<EmailData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchLatestEmail() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/gmail/latest")
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch email")
      }
      
      if (data.email) {
        setEmail(data.email)
      } else {
        setError(data.message || "No emails found")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-12 sm:h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-2 sm:px-4">
        <SidebarTrigger className="text-neutral-700 hover:bg-neutral-100" />
        <h1 className="text-base sm:text-lg font-semibold text-neutral-900">Test Gmail API</h1>
      </header>
      
      <div className="flex-1 p-4 sm:p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fetch Latest Email</CardTitle>
              <CardDescription>
                Click the button below to fetch and display the latest email from your Gmail inbox
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={fetchLatestEmail} 
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-4" />
                    Get Latest Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {email && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-5" />
                  Latest Email
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-neutral-700">From:</label>
                  <p className="text-sm text-neutral-900">{email.from}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-neutral-700">To:</label>
                  <p className="text-sm text-neutral-900">{email.to.join(", ")}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-neutral-700">Subject:</label>
                  <p className="text-sm text-neutral-900">{email.subject}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-neutral-700">Date:</label>
                  <p className="text-sm text-neutral-900">{email.date}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-neutral-700">Snippet:</label>
                  <p className="text-sm text-neutral-500 italic">{email.snippet}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-neutral-700">Body:</label>
                  <div className="mt-2 p-4 bg-neutral-50 rounded-md border border-neutral-200">
                    <pre className="text-xs text-neutral-800 whitespace-pre-wrap font-mono">
                      {email.body}
                    </pre>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <label className="text-xs font-semibold text-neutral-500">Message ID:</label>
                  <p className="text-xs text-neutral-400 font-mono">{email.id}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

