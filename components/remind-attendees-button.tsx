"use client"

import { useTransition } from "react"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { remindAwaitingMembers } from "@/app/actions/events"

export function RemindAttendeesButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition()
  return <Button variant="outline" size="sm" disabled={pending} onClick={() => startTransition(async () => { await remindAwaitingMembers(eventId) })}>
    <Mail data-icon="inline-start" />
    {pending ? "Sending reminders..." : "Remind awaiting members"}
  </Button>
}
