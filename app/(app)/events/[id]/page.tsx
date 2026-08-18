import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays, ExternalLink, MapPin, Lock, Trophy, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getEvent, getEventAvailability, getEventRsvps } from "@/app/actions/events"
import { getSessionUser } from "@/lib/session"
import { dateRange, formatDateRange, formatFullDate } from "@/lib/dates"
import { AvailabilityGrid, type DateTally } from "@/components/availability-grid"
import { AttendancePanel } from "@/components/attendance-panel"
import { EventAdminActions } from "@/components/event-admin-actions"
import { ShareEventButton } from "@/components/share-event-button"

export const dynamic = "force-dynamic"

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [event, votes, rsvps, user] = await Promise.all([
    getEvent(id),
    getEventAvailability(id),
    getEventRsvps(id),
    getSessionUser(),
  ])

  if (!event) notFound()

  const isAdmin = user?.role === "admin"
  const isLocked = event.status === "locked"
  const days = dateRange(event.startDate, event.endDate)

  // Distinct respondents across the whole event
  const respondentIds = new Set(votes.map((v) => v.userId))
  const totalRespondents = respondentIds.size

  const tallies: DateTally[] = days.map((date) => {
    const dayVotes = votes.filter((v) => v.date === date)
    const available = dayVotes.filter((v) => v.status === "available").length
    const maybe = dayVotes.filter((v) => v.status === "maybe").length
    const unavailable = dayVotes.filter((v) => v.status === "unavailable").length
    const mine = dayVotes.find((v) => v.userId === user?.id)
    return {
      date,
      available,
      maybe,
      unavailable,
      score: available * 2 + maybe,
      responders: dayVotes.map((v) => v.userName),
      myStatus: (mine?.status as DateTally["myStatus"]) ?? null,
    }
  })

  // Best date = highest score, tie-broken by fewest "unavailable"
  let bestDate: string | null = null
  if (totalRespondents > 0) {
    const ranked = [...tallies].sort(
      (a, b) => b.score - a.score || a.unavailable - b.unavailable,
    )
    if (ranked[0] && ranked[0].score > 0) bestDate = ranked[0].date
  }

  const highlightDate = event.lockedDate ?? bestDate

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All events
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {event.eventType === "pro-tour"
                ? "PT"
                : event.eventType === "regional"
                  ? "RC"
                  : event.eventType === "training"
                    ? "Training session"
                    : event.eventType === "travel"
                      ? "Travel / logistics"
                      : event.eventType === "rcq"
                        ? "RCQ"
                        : "Team event"}
            </Badge>
            <h1 className="text-2xl font-medium tracking-normal text-balance">
              {event.title}
            </h1>
            {isLocked ? (
              <Badge className="gap-1 bg-accent text-accent-foreground hover:bg-accent">
                <Lock className="size-3" />
                Locked
              </Badge>
            ) : (
              <Badge variant="secondary">Planning</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {formatDateRange(event.startDate, event.endDate)}
            </span>
            {event.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {event.location}
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              {totalRespondents} responded
            </span>
          </div>
          {event.description ? (
            <p className="max-w-2xl whitespace-pre-line text-pretty text-sm leading-6 text-muted-foreground">
              {event.description}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {event.eventUrl ? (
              <a
                href={event.eventUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink className="size-4" />
                Official event details
              </a>
            ) : null}
          </div>
          {event.travelDetails ? (
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-6">
              <p className="font-bold text-foreground">Travel notes</p>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">{event.travelDetails}</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <ShareEventButton token={event.shareToken} />
          {isAdmin ? (
            <EventAdminActions eventId={event.id} isLocked={isLocked} />
          ) : null}
        </div>
      </div>

      {/* Highlight banner */}
      {highlightDate ? (
        <div
          className={
            isLocked
              ? "flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3"
              : "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
          }
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
            {isLocked ? <Lock className="size-4" /> : <Trophy className="size-4" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isLocked ? "Confirmed date" : "Best date so far"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatFullDate(highlightDate)}
              {!isLocked && isAdmin
                ? " — lock it in once everyone has responded."
                : ""}
            </p>
          </div>
        </div>
      ) : null}

      {/* Attendance / RSVP phase — only once a date is locked */}
      {isLocked && event.lockedDate ? (
        <AttendancePanel
          eventId={event.id}
          variant="member"
          lockedDate={event.lockedDate}
          rsvps={rsvps}
          myUserId={user?.id ?? null}
        />
      ) : null}

      {/* Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">
            {isLocked ? "How the date was chosen" : "Mark your availability"}
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-available" /> Yes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-maybe" /> Maybe
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-unavailable" /> No
            </span>
          </div>
        </div>

        <AvailabilityGrid
          eventId={event.id}
          tallies={tallies}
          totalRespondents={totalRespondents}
          bestDate={bestDate}
          lockedDate={event.lockedDate}
          isAdmin={isAdmin}
          isLocked={isLocked}
        />
      </section>
    </div>
  )
}
