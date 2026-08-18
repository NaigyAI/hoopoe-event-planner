"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Unlock, Trash2, MoreVertical, Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { unlockEvent, deleteEvent } from "@/app/actions/events"
import { CreateEventDialog, type EventEditData } from "@/components/create-event-dialog"

export function EventAdminActions({
  eventId,
  isLocked,
  event,
}: {
  eventId: string
  isLocked: boolean
  event: EventEditData
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)

  function handleUnlock() {
    startTransition(async () => {
      try {
        await unlockEvent(eventId)
        toast.success("Event reopened for voting")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not reopen event")
      }
    })
  }

  function handleDelete() {
    if (!confirm("Delete this event and all its responses? This cannot be undone.")) return
    startTransition(async () => {
      try {
        await deleteEvent(eventId)
        toast.success("Event deleted")
        router.push("/dashboard")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete event")
      }
    })
  }

  return (
    <>
      <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon" disabled={isPending} />}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MoreVertical className="size-4" />
        )}
        <span className="sr-only">Event actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          Edit event
        </DropdownMenuItem>
        {isLocked ? (
          <DropdownMenuItem onClick={handleUnlock}>
            <Unlock className="size-4" />
            Reopen voting
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={handleDelete} variant="destructive">
          <Trash2 className="size-4" />
          Delete event
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
      <CreateEventDialog
        event={event}
        open={editOpen}
        onOpenChange={setEditOpen}
        showTrigger={false}
      />
    </>
  )
}
