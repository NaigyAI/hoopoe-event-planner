"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { removeSelfFromGuestEvent } from "@/app/actions/guest"

export function GuestSelfRemoval({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition()
  function handleRemove() {
    if (!window.confirm("Are you sure you want to remove yourself from this event?")) return
    startTransition(async () => {
      try {
        await removeSelfFromGuestEvent(token)
        toast.success("You have been removed from this event")
        window.location.href = `/join/${token}`
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove you from this event")
      }
    })
  }
  return (
    <Button type="button" variant="outline" size="sm" onClick={handleRemove} disabled={isPending} className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
      Remove me from this event
    </Button>
  )
}
