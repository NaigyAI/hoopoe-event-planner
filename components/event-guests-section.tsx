"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { UserRound, X } from "lucide-react"
import { removeGuestFromEvent } from "@/app/actions/guest"
import { Button } from "@/components/ui/button"

type Guest = { id: string; name: string; availability: string; rsvp: string | null }

export function EventGuestsSection({ eventId, guests, isAdmin = false }: { eventId: string; guests: Guest[]; isAdmin?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (!guests.length) return null

  function removeGuest(guestId: string) {
    startTransition(async () => {
      await removeGuestFromEvent({ eventId, guestId })
      router.refresh()
    })
  }

  return (
    <section className="space-y-3 border-t border-border pt-4 sm:pt-6" aria-labelledby="event-guests-heading">
      <div className="flex items-center gap-2">
        <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 id="event-guests-heading" className="text-lg font-medium text-foreground">Guests</h2>
        <span className="text-sm text-muted-foreground">{guests.length}</span>
      </div>
      <div className="flex flex-wrap gap-3">
        {guests.map((guest) => (
          <div key={guest.id} className="flex min-w-0 flex-[1_1_220px] items-center justify-between gap-3 rounded-xl border border-border px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{guest.name}</p>
            </div>
            {isAdmin ? (
              <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:bg-transparent hover:text-destructive" aria-label={`Remove ${guest.name} from event`} title="Remove guest" disabled={pending} onClick={() => removeGuest(guest.id)}>
                <X className="size-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
