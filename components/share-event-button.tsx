"use client"

import { useState } from "react"
import { Check, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function ShareEventButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = `${window.location.origin}/join/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Guest link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers/iframes that block the async clipboard API
      window.prompt("Copy this guest link:", url)
    }
  }

  return (
    <Button variant="outline" className="gap-2" onClick={copy}>
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      {copied ? "Copied" : "Share guest link"}
    </Button>
  )
}
