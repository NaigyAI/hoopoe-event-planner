"use client"

import { useTransition } from "react"
import { Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { remindAwaitingMembers } from "@/app/actions/events"

export function RemindAttendeesButton({ eventId, eventDate }: { eventId: string; eventDate: string }) {
  if (eventDate < new Date().toISOString().slice(0, 10)) return null
  const [pending, startTransition] = useTransition()
  function sendReminder() {
    startTransition(async () => {
      try {
        const result = await remindAwaitingMembers(eventId)
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success(result.failed ? `${result.count} reminder${result.count === 1 ? "" : "s"} sent; ${result.failed} failed` : result.count === 1 ? "Reminder sent to 1 member" : `Reminders sent to ${result.count} members`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not send reminders")
      }
    })
  }

  return <Button variant="outline" className="h-8" disabled={pending} onClick={sendReminder}>
    <Mail data-icon="inline-start" />
    {pending ? "Sending reminders..." : "Send reminder"}
  </Button>
}
