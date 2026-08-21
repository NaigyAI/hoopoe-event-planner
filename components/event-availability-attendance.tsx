"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { AvailabilityGrid, type DateTally } from "@/components/availability-grid"
import { EventAttendancePanel } from "@/components/event-attendance-panel"

type DateAttendance = { date: string; attending: { id: string; name: string }[]; unavailable: { id: string; name: string }[]; awaiting: { id: string; name: string }[] }

export function EventAvailabilityAttendance({ eventId, eventEndDate, tallies, totalRespondents, bestDate, dates, isAdmin = false }: { eventId: string; eventEndDate: string | null | undefined; tallies: DateTally[]; totalRespondents: number; bestDate: string | null; dates: DateAttendance[]; isAdmin?: boolean }) {
  const [selectedDate, setSelectedDate] = useState(dates[0]?.date ?? "")
  const router = useRouter()
  return (
    <div className="flex min-w-0 max-w-5xl flex-col gap-5 border-t border-border pt-4 sm:gap-8 sm:pt-6">
      <section className="space-y-3">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium text-foreground">Availability</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-available" /> Yes</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-maybe" /> Maybe</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-unavailable" /> No</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-muted-foreground" /> Guest</span>
          </div>
        </div>
        <AvailabilityGrid eventId={eventId} eventEndDate={eventEndDate} tallies={tallies} totalRespondents={totalRespondents} bestDate={bestDate} selectedDate={selectedDate} onDateSelect={setSelectedDate} />
      </section>
      <section>
        <EventAttendancePanel eventId={eventId} dates={dates} selectedDate={selectedDate} isAdmin={isAdmin} />
      </section>
    </div>
  )
}
