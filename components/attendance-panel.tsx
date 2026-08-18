"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, HelpCircle, X, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { setRsvp, type RsvpStatus } from "@/app/actions/events"
import { setGuestRsvp } from "@/app/actions/guest"
import { formatFullDate } from "@/lib/dates"

type Rsvp = { userId: string; userName: string; status: string }

const OPTIONS: {
  value: RsvpStatus
  label: string
  icon: typeof Check
  activeClass: string
  dotClass: string
}[] = [
  {
    value: "going",
    label: "I'm going",
    icon: Check,
    activeClass:
      "border-available bg-available text-available-foreground hover:bg-available",
    dotClass: "bg-available",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: HelpCircle,
    activeClass:
      "border-maybe bg-maybe text-maybe-foreground hover:bg-maybe",
    dotClass: "bg-maybe",
  },
  {
    value: "not_going",
    label: "Can't make it",
    icon: X,
    activeClass:
      "border-unavailable bg-unavailable text-unavailable-foreground hover:bg-unavailable",
    dotClass: "bg-unavailable",
  },
]

export function AttendancePanel({
  eventId,
  token,
  variant = "member",
  lockedDate,
  rsvps,
  myUserId,
}: {
  eventId: string
  token?: string
  variant?: "member" | "guest"
  lockedDate: string
  rsvps: Rsvp[]
  myUserId: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pending, setPending] = useState<RsvpStatus | null>(null)

  const myRsvp = myUserId
    ? rsvps.find((r) => r.userId === myUserId)?.status ?? null
    : null

  const going = rsvps.filter((r) => r.status === "going")
  const maybe = rsvps.filter((r) => r.status === "maybe")
  const notGoing = rsvps.filter((r) => r.status === "not_going")

  function choose(status: RsvpStatus) {
    if (status === myRsvp) return
    setPending(status)
    startTransition(async () => {
      try {
        if (variant === "guest" && token) {
          await setGuestRsvp({ token, status })
        } else {
          await setRsvp({ eventId, status })
        }
        router.refresh()
        toast.success(
          status === "going"
            ? "You're on the roster"
            : status === "maybe"
              ? "Marked as maybe"
              : "Marked as not attending",
        )
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't save your RSVP",
        )
      } finally {
        setPending(null)
      }
    })
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-foreground">
          Are you attending?
        </h2>
        <p className="text-sm text-muted-foreground">
          The date is locked for{" "}
          <span className="font-medium text-foreground">
            {formatFullDate(lockedDate)}
          </span>
          . Let the team know if you&apos;ll be there.
        </p>
      </div>

      {myUserId ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon
            const active = myRsvp === opt.value
            const loading = isPending && pending === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => choose(opt.value)}
                disabled={isPending}
                aria-pressed={active}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60",
                  active
                    ? opt.activeClass
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
                {opt.label}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="space-y-4">
        <RosterGroup
          label="Going"
          dotClass="bg-available"
          people={going}
          emptyHint="No one has confirmed yet."
        />
        {maybe.length > 0 ? (
          <RosterGroup label="Maybe" dotClass="bg-maybe" people={maybe} />
        ) : null}
        {notGoing.length > 0 ? (
          <RosterGroup
            label="Can't make it"
            dotClass="bg-unavailable"
            people={notGoing}
          />
        ) : null}
      </div>
    </div>
  )
}

function RosterGroup({
  label,
  dotClass,
  people,
  emptyHint,
}: {
  label: string
  dotClass: string
  people: { userId: string; userName: string }[]
  emptyHint?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className={cn("size-2 rounded-full", dotClass)} />
        {label}
        <span className="text-muted-foreground/70">({people.length})</span>
      </div>
      {people.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {people.map((p) => (
            <li
              key={p.userId}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-sm text-foreground"
            >
              {p.userName}
            </li>
          ))}
        </ul>
      ) : emptyHint ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-3.5" />
          {emptyHint}
        </p>
      ) : null}
    </div>
  )
}
