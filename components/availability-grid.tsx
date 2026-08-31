"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, HelpCircle, X, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { setAvailability, type AvailabilityStatus } from "@/app/actions/events"
import { removeSelfFromGuestEvent, setGuestAvailability } from "@/app/actions/guest"
import { formatWeekday, formatDayMonth, formatDateRange, isWeekend } from "@/lib/dates"

export type DateTally = {
  date: string
  available: number
  guestAvailable: number
  maybe: number
  unavailable: number
  score: number
  responders: string[]
  myStatus: AvailabilityStatus | null
}

const OPTIONS: {
  value: AvailabilityStatus
  label: string
  icon: typeof Check
  active: string
}[] = [
  { value: "available", label: "Yes", icon: Check, active: "bg-available text-available-foreground border-available" },
  { value: "maybe", label: "Maybe", icon: HelpCircle, active: "bg-maybe text-maybe-foreground border-maybe" },
  { value: "unavailable", label: "No", icon: X, active: "bg-unavailable text-unavailable-foreground border-unavailable" },
]

function HeatBar({ tally, total }: { tally: DateTally; total: number }) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)
  const memberAvailable = Math.max(0, tally.available - tally.guestAvailable)
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="bg-available" style={{ width: `${pct(memberAvailable)}%` }} />
      <div className="bg-muted-foreground/30" style={{ width: `${pct(tally.guestAvailable)}%` }} />
      <div className="bg-maybe" style={{ width: `${pct(tally.maybe)}%` }} />
      <div className="bg-unavailable" style={{ width: `${pct(tally.unavailable)}%` }} />
    </div>
  )
}

export function AvailabilityGrid({
  eventId,
  eventEndDate,
  tallies,
  totalRespondents,
  bestDate,
  variant = "member",
  token,
  selectedDate,
  onDateSelect,
  occurrenceLinks,
}: {
  eventId: string
  eventEndDate: string | null | undefined
  tallies: DateTally[]
  totalRespondents: number
  bestDate: string | null
  variant?: "member" | "guest"
  token?: string
  selectedDate?: string
  onDateSelect?: (date: string) => void
  occurrenceLinks?: Record<string, string>
}) {
  const router = useRouter()
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function vote(date: string, status: AvailabilityStatus) {
    setPendingDate(date)
    startTransition(async () => {
      try {
        if (variant === "guest" && token) {
          if (status === "unavailable") {
            await removeSelfFromGuestEvent(token)
            window.location.href = `/join/${token}`
            return
          }
          await setGuestAvailability({ token, date, status })
        } else {
          await setAvailability({ eventId, date, status })
        }
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save your vote")
      } finally {
        setPendingDate(null)
      }
    })
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {tallies.map((t) => {
        const isBest = t.date === bestDate && totalRespondents > 0
        const weekend = isWeekend(t.date)
        return (
          <li
            key={t.date}
            className={cn(
              "flex min-w-0 cursor-pointer flex-col gap-2 px-3 py-3 transition-colors sm:items-center sm:gap-4 sm:px-4 sm:py-3.5",
              variant !== "guest" && "sm:flex-row",
              t.date === selectedDate ? "bg-available/15 ring-1 ring-inset ring-available/50" : "hover:bg-muted/40",
            )}
          onClick={() => {
            const occurrencePath = occurrenceLinks?.[t.date]
            if (occurrencePath) {
              window.location.href = occurrencePath
              return
            }
            onDateSelect?.(t.date)
          }}
          >
            {/* Date */}
            <div className="flex min-w-0 items-center gap-2 sm:w-28 sm:shrink-0">
              <div className="flex flex-col leading-tight">
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    weekend ? "text-muted-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {formatWeekday(t.date)}
                </span>
                <span className="break-words font-medium tabular-nums text-foreground">
                  {eventEndDate ? formatDateRange(t.date, eventEndDate) : formatDayMonth(t.date)}
                </span>
              </div>
              {isBest ? (
                <Trophy className="size-3.5 text-accent-foreground" aria-label="Best date" />
              ) : null}
            </div>

            {/* Heat */}
            {variant !== "guest" ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <HeatBar tally={t} total={totalRespondents} />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    <span className="font-medium text-foreground">{t.available}</span> yes
                  </span>
                  <span className="tabular-nums">{t.maybe} maybe</span>
                  <span className="tabular-nums">{t.unavailable} no</span>
                </div>
              </div>
            ) : null}

            {/* Your vote */}
            <div className={cn("flex shrink-0 items-center gap-1.5", variant === "guest" && "w-full") }>
              <div className={cn("inline-flex rounded-lg border border-border p-0.5", variant === "guest" && "w-full") }>
                  {OPTIONS.filter((opt) => variant !== "guest" || opt.value === "available" || opt.value === "unavailable").map((opt) => {
                    const Icon = opt.icon
                    const selected = t.myStatus === opt.value
                    const loading = pendingDate === t.date && isPending
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          vote(t.date, opt.value)
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        disabled={loading}
                        aria-pressed={selected}
                        aria-label={`Mark ${formatDayMonth(t.date)} as ${opt.label}`}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1 rounded-md px-2.5 py-2 text-xs font-medium transition-colors",
                          "border border-transparent",
                          selected
                            ? opt.active
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="size-3.5" />
                        <span>{variant === "guest" ? (opt.value === "available" ? "Yes, I will be there" : "No, I can't make it") : opt.label}</span>
                      </button>
                    )
                  })}
                </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
