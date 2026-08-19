"use client"

import { useMemo, useState } from "react"
import { Dumbbell, Plane, Swords, Trophy, type LucideIcon } from "lucide-react"
import { EventCard, type EventSummary } from "@/components/event-card"

type FilterKey = "practice" | "rcq" | "travel" | "rc-pt"

type FilterOption = {
  key: FilterKey
  title: string
  copy: string
  icon: LucideIcon
  eventTypes: string[]
}

const FILTERS: FilterOption[] = [
  { key: "practice", title: "Practice", copy: "Schedule reps and testing", icon: Swords, eventTypes: ["practice"] },
  { key: "rcq", title: "RCQs", copy: "Lock the best date", icon: Trophy, eventTypes: ["rcq"] },
  { key: "travel", title: "Travel", copy: "Coordinate the trip", icon: Plane, eventTypes: ["travel"] },
  { key: "rc-pt", title: "RC + PT", copy: "Stay ready for the call", icon: Dumbbell, eventTypes: ["rc", "pt", "rc-pt"] },
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FILTERS.map(({ key, title, copy, icon: Icon }) => {
          const isSelected = selected === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelected(isSelected ? null : key)}
              className={`rounded-xl border p-3 text-left transition-colors sm:p-4 ${
                isSelected
                  ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                  : "border-border bg-card hover:border-accent/60 hover:bg-muted/40"
              }`}
            >
              <Icon className="size-4 text-accent" />
              <p className="mt-3 text-sm font-bold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy}</p>
            </button>
          )
        })}
      </div>

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
