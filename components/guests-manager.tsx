"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { removeGuestFromEvent } from "@/app/actions/guest"
import type { GuestRow } from "@/app/actions/members"

export function GuestsManager({ guests }: { guests: GuestRow[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-accent" />
        <h2 className="text-lg font-medium text-foreground">Guests</h2>
        <Badge variant="secondary" className="text-[11px]">{guests.length}</Badge>
      </div>
      {guests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No guests have responded to an event yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {guests.map((guest) => (
            <li key={guest.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  {guest.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{guest.name}</p>
              </div>
              <ul className="mt-3 space-y-2 border-t border-border pt-3">
                {guest.events.map((item) => (
                  <GuestEventRow key={item.id} guest={guest} event={item} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function GuestEventRow({ guest, event }: { guest: GuestRow; event: GuestRow["events"][number] }) {
  const [isPending, startTransition] = useTransition()
  function handleRemove() {
    if (!window.confirm(`Remove ${guest.name} from ${event.title}?`)) return
    startTransition(async () => {
      try {
        await removeGuestFromEvent({ eventId: event.id, guestId: guest.id })
        toast.success(`${guest.name} removed from ${event.title}`)
      } catch {
        toast.error("Could not remove this guest")
      }
    })
  }
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{event.title}</span>
      <Badge variant="outline" className="shrink-0 text-[10px]">{event.responses} responses</Badge>
      <Button type="button" size="sm" variant="outline" onClick={handleRemove} disabled={isPending} className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
        <Trash2 className="size-3.5" />
        <span className="hidden sm:inline">Remove</span>
      </Button>
    </li>
  )
}
