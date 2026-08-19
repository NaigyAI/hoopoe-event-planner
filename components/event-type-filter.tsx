"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Swords, Trophy, type LucideIcon } from "lucide-react"
import { EventCard, type EventSummary } from "@/components/event-card"

type FilterKey = "practice" | "rcq" | "weekly" | "store-championship" | "rc-pt" | "other"

type FilterOption = {
  key: FilterKey
  title: string
  copy: string
  icon: LucideIcon
  eventTypes: string[]
}

const FILTERS: FilterOption[] = [
  { key: "practice", title: "Practice", copy: "Schedule reps and testing", icon: Swords, eventTypes: ["practice"] },
  { key: "rcq", title: "RC Qualifier", copy: "Find your Qualifier", icon: Trophy, eventTypes: ["rcq"] },
  { key: "weekly", title: "Weekly", copy: "Keep a regular rhythm", icon: CalendarDays, eventTypes: ["weekly"] },
  { key: "store-championship", title: "Store Championship", copy: "Prepare for the big event", icon: Trophy, eventTypes: ["store-championship"] },
  { key: "rc-pt", title: "RC + PT", copy: "This is your time to shine!", icon: Trophy, eventTypes: ["regional", "pro-tour", "rc", "pt", "rc-pt"] },
  { key: "other", title: "Other", copy: "Other scheduled events", icon: CalendarDays, eventTypes: ["other"] },
]

export function EventTypeFilter({ events }: { events: EventSummary[] }) {
  const [selected, setSelected] = useState<FilterKey | null>(null)
  const filteredEvents = useMemo(() => {
    if (!selected) return events
    const option = FILTERS.find((filter) => filter.key === selected)
    return option ? events.filter((event) => option.eventTypes.includes(event.eventType)) : events
  }, [events, selected])

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {FILTERS.map(({ key, title, copy, icon: Icon }) => {
          const isSelected = selected === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelected(isSelected ? null : key)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                isSelected
                  ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                  : "border-border bg-card hover:border-accent/60 hover:bg-muted/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-3.5 shrink-0 text-accent" />
                <span className="text-sm font-bold leading-tight">{title}</span>
              </span>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{copy}</p>
            </button>
          )
        })}
      </div>
      <div className="my-5 h-px w-full bg-border" aria-hidden="true" />

      {filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium text-foreground">No matching events</p>
          <p className="mt-1 text-sm text-muted-foreground">Try another event type or clear the filter.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </>
  )
}
