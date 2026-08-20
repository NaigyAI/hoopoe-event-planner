"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, HelpCircle, X, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { setAvailability, type AvailabilityStatus } from "@/app/actions/events"
import { setGuestAvailability } from "@/app/actions/guest"
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
}) {
  const router = useRouter()
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function vote(date: string, status: AvailabilityStatus) {
    setPendingDate(date)
    startTransition(async () => {
      try {
        if (variant === "guest" && token) {
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
              "flex cursor-pointer flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:gap-4",
              t.date === selectedDate ? "bg-available/15 ring-1 ring-inset ring-available/50" : "hover:bg-muted/40",
            )}
          onClick={() => onDateSelect?.(t.date)}
          >
            {/* Date */}
            <div className="flex w-28 shrink-0 items-center gap-2">
              <div className="flex flex-col leading-tight">
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    weekend ? "text-muted-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {formatWeekday(t.date)}
                </span>
                <span className="font-medium tabular-nums text-foreground">
                  {eventEndDate ? formatDateRange(t.date, eventEndDate) : formatDayMonth(t.date)}
                </span>
              </div>
              {isBest ? (
                <Trophy className="size-3.5 text-accent-foreground" aria-label="Best date" />
              ) : null}
            </div>

            {/* Heat */}
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

            {/* Your vote */}
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="inline-flex rounded-lg border border-border p-0.5">
                  {OPTIONS.filter((opt) => variant !== "guest" || opt.value === "available").map((opt) => {
                    const Icon = opt.icon
                    const selected = t.myStatus === opt.value
                    const loading = pendingDate === t.date && isPending
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => vote(t.date, opt.value)}
                        disabled={loading}
                        aria-pressed={selected}
                        aria-label={`Mark ${formatDayMonth(t.date)} as ${opt.label}`}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                          "border border-transparent",
                          selected
                            ? opt.active
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="size-3.5" />
                        <span className="hidden sm:inline">{opt.label}</span>
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
