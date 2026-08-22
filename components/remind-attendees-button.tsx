"use client"

import { useTransition } from "react"
import { Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { remindAwaitingMembers } from "@/app/actions/events"

export function RemindAttendeesButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition()
  function sendReminder() {
    startTransition(async () => {
      try {
        const result = await remindAwaitingMembers(eventId)
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success(result.count === 1 ? "Reminder sent to 1 member" : `Reminders sent to ${result.count} members`)
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
