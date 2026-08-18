import Link from "next/link"
import { CalendarDays, ExternalLink, MapPin, Users, Lock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateRange, formatFullDate, formatTime } from "@/lib/dates"

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
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  training: "Training",
  rcq: "RCQ",
  regional: "RC",
  "pro-tour": "PT",
  travel: "Travel",
  other: "Team event",
}

function StatusBadge({ status }: { status: string }) {
  if (status === "locked") {
    return (
      <Badge className="gap-1 bg-accent text-accent-foreground hover:bg-accent">
        <Lock className="size-3" />
        Locked
      </Badge>
    )
  }
  if (status === "cancelled") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Cancelled
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      Planning
    </Badge>
  )
}

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link href={`/events/${event.id}`} className="group block">
      <Card className="h-full p-5 transition-colors group-hover:border-primary/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {EVENT_TYPE_LABELS[event.eventType] ?? "Team event"}
            </Badge>
            <h3 className="text-pretty text-[22px] font-medium leading-tight text-foreground">
              {event.title}
            </h3>
          </div>
          <StatusBadge status={event.status} />
        </div>

        <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0" />
            <span>
              {formatDateRange(event.startDate, event.endDate ?? event.startDate)}
              {event.startTime ? ` · ${formatTime(event.startTime)}` : ""}
            </span>
          </div>
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

        {event.lockedDate ? (
          <div className="mt-4 space-y-2 rounded-md bg-accent/10 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
              <Lock className="size-3.5" />
              <span>Confirmed for {formatFullDate(event.lockedDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-3.5" />
              <span>
                {event.goingCount} {event.goingCount === 1 ? "person" : "people"}{" "}
                going
              </span>
            </div>
          </div>
        ) : null}
      </Card>
    </Link>
  )
}
