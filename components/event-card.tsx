import Link from "next/link"
import { CalendarDays, ExternalLink, MapPin, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { formatDateRange, formatTime, formatRecurrence } from "@/lib/dates"

export type EventSummary = {
  id: string
  title: string
  format: string
  eventType: string
  eventUrl: string | null
  travelDetails: string | null
  location: string | null
  startDate: string
  endDate: string | null
  startTime: string | null
  endTime: string | null
  lockedDate: string | null
  status: string
  createdByName: string
  respondentCount: number
  goingCount: number
  recurrenceType: string
  recurrenceWeekday: number | null
  recurrenceOrdinal: string | null
}

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link href={`/events/${event.id}`} className="group block">
      <Card className="h-full gap-0 p-5 leading-[1.3] transition-colors group-hover:border-primary/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="text-pretty text-[22px] font-medium leading-tight text-foreground">
              {event.title}
            </h3>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            <span>
              {formatDateRange(event.startDate, event.endDate ?? event.startDate)}
              {event.startTime ? ` · ${formatTime(event.startTime)}` : ""}
            </span>
          </div>
          {formatRecurrence(event.recurrenceType, event.recurrenceWeekday, event.recurrenceOrdinal) ? (
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" />
              <span>{formatRecurrence(event.recurrenceType, event.recurrenceWeekday, event.recurrenceOrdinal)}</span>
            </div>
          ) : null}
          {event.location ? (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          ) : null}
          {event.eventUrl ? (
            <div className="flex items-center gap-2 text-primary">
              <ExternalLink className="size-4 shrink-0" />
              <span>Official event details</span>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Users className="size-4 shrink-0" />
            <span>
              {event.respondentCount}{" "}
              {event.respondentCount === 1 ? "response" : "responses"}
            </span>
          </div>
        </dl>

      </Card>
    </Link>
  )
}
