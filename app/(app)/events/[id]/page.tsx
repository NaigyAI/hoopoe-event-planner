import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CalendarDays, ClipboardCheck, ExternalLink, Lock, MapPin, Repeat2, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getEvent, getEventAvailability, getEventOccurrences, getEventRsvps } from "@/app/actions/events"
import { getSessionUser } from "@/lib/session"
import { listAttendanceMembers } from "@/app/actions/members"
  import { dateRange, formatDateRange, formatTime, formatRecurrence, getRecurringDates, todayISO } from "@/lib/dates"
import { type DateTally } from "@/components/availability-grid"
import { AttendancePanel } from "@/components/attendance-panel"
import { EventAvailabilityAttendance } from "@/components/event-availability-attendance"
import { EventAdminActions } from "@/components/event-admin-actions"
import { ShareEventButton } from "@/components/share-event-button"
import { RemindAttendeesButton } from "@/components/remind-attendees-button"
import { EventGuestsSection } from "@/components/event-guests-section"

export const dynamic = "force-dynamic"

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [event, votes, rsvps, user, members, occurrences] = await Promise.all([
    getEvent(id),
    getEventAvailability(id),
    getEventRsvps(id),
    getSessionUser(),
    listAttendanceMembers(),
    getEventOccurrences(id),
  ])

  if (!event) notFound()

  const occurrenceLinks = Object.fromEntries(occurrences.map((occurrence) => [occurrence.startDate.slice(0, 10), `/events/${occurrence.id}`]))
  // nextOccurrenceLocation is a temporary exception for the current week; it
  // must not override the normal location on future recurring occurrences.
  const displayLocation = event.recurrenceType === "none" ? event.location : event.location
  const isAdmin = user?.role === "admin" || user?.role === "superuser"
  const isLocked = event.status === "locked"
  const today = todayISO()
  // Every visible date is backed by its own occurrence record (getEventOccurrences
  // provisions upcoming ones), so each date links to a real page and navigates
  // consistently — no date can "select in place" while its siblings navigate.
  const seriesEvent = occurrences.find((occurrence) => occurrence.recurrenceType !== "none")
  const recurringDates = seriesEvent
    ? getRecurringDates(seriesEvent.recurrenceType, seriesEvent.startDate, seriesEvent.recurrenceWeekday, seriesEvent.recurrenceOrdinal, 3)
    : []
  const occurrenceDates = new Set(occurrences.map((occurrence) => occurrence.startDate.slice(0, 10)))
  const availabilityDates = recurringDates.filter((date) => occurrenceDates.has(date))
  const fallbackDates = availabilityDates.length > 0
    ? availabilityDates
    : dateRange(event.startDate, event.endDate ?? event.startDate).filter((date) => date >= today)
  const isMultiDay = event.endDate != null && event.endDate.slice(0, 10) !== event.startDate.slice(0, 10)
  // Multi-day events use one event-level availability response. Keep the
  // range in the display, but store and calculate the response on its start date.
  const days = isMultiDay ? [event.startDate.slice(0, 10)] : fallbackDates
  const normalizedStart = event.startDate.slice(0, 10)
  // If this event's own date is in the visible list use it, otherwise fall back to the
  // earliest upcoming date so a past parent record still highlights a valid green date.
  const selectedEventDate = days.includes(normalizedStart) ? normalizedStart : days[0] ?? normalizedStart
  const displayDate = selectedEventDate

  // Count distinct availability responses for the date currently displayed.
  // RSVP records are separate from availability votes and must not inflate this count.
  const normalizedVoteDate = (date: string | Date) => String(date).slice(0, 10)
  // A migration can leave one user/date in more than one occurrence row. Keep
  // one effective status per user/date, preferring this event's explicit vote.
  const effectiveVotes = Array.from(
    votes.reduce((map, vote) => {
      const key = `${vote.userId}:${normalizedVoteDate(vote.date)}`
      if (!map.has(key) || vote.eventId === event.id) map.set(key, vote)
      return map
    }, new Map<string, (typeof votes)[number]>()).values(),
  )
  const respondentIds = new Set(
    effectiveVotes.filter((vote) => normalizedVoteDate(vote.date) === displayDate).map((vote) => vote.userId),
  )
  const totalRespondents = respondentIds.size
  const guests = Array.from(new Set([...effectiveVotes.filter((vote) => vote.userId.startsWith("guest:")).map((vote) => vote.userId), ...rsvps.filter((rsvp) => rsvp.userId.startsWith("guest:")).map((rsvp) => rsvp.userId)])).map((guestId) => {
    const vote = effectiveVotes.find((item) => item.userId === guestId)
    const guestRsvp = rsvps.find((item) => item.userId === guestId)
    return { id: guestId.slice("guest:".length), name: guestRsvp?.userName ?? vote?.userName ?? "Guest", availability: vote?.status ?? "none", rsvp: guestRsvp?.status ?? null }
  })

  const tallies: DateTally[] = days.map((date) => {
    const dayVotes = effectiveVotes.filter((v) => normalizedVoteDate(v.date) === date)
    const available = dayVotes.filter((v) => v.status === "available").length
    const guestAvailable = dayVotes.filter((v) => v.status === "available" && v.userId.startsWith("guest:")).length
    const maybe = dayVotes.filter((v) => v.status === "maybe").length
    const unavailable = dayVotes.filter((v) => v.status === "unavailable").length
    const mine = dayVotes.find((v) => v.userId === user?.id)
    return {
      date,
      available,
      guestAvailable,
      maybe,
      unavailable,
      score: available * 2 + maybe,
      responders: dayVotes.filter((v) => v.status === "available").map((v) => v.userName),
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

  const dateAttendance = days.map((date) => {
    const dayVotes = effectiveVotes.filter((vote) => normalizedVoteDate(vote.date) === date)
    const voted = new Set(dayVotes.map((vote) => vote.userId))
    return {
      date,
      attending: members.filter((member) => dayVotes.some((vote) => vote.userId === member.id && vote.status === "available")),
      maybe: members.filter((member) => dayVotes.some((vote) => vote.userId === member.id && vote.status === "maybe")),
      unavailable: members.filter((member) => dayVotes.some((vote) => vote.userId === member.id && vote.status === "unavailable")),
      awaiting: members.filter((member) => !voted.has(member.id)),
    }
  })

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All events
      </Link>

      {/* Header */}
      <div className="flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
  <h1 className="text-2xl font-medium tracking-normal text-balance">
  {event.title}
  </h1>
            {isLocked ? (
              <Badge className="gap-1 bg-accent text-accent-foreground hover:bg-accent">
                <Lock className="size-3" />
                Finalized
              </Badge>
            ) : null}
            <Badge variant="outline" className="border-primary/30 text-primary">
              {(event.eventType === "practice" || event.eventType === "training")
                ? "Practice"
                : event.eventType === "weekly"
                  ? "Weekly"
                  : event.eventType === "store-championship"
                    ? "Store Championship"
                    : event.eventType === "rcq"
                      ? "RC Qualifier"
                      : event.eventType === "regional"
                        ? "Regional Championships"
                        : event.eventType === "pro-tour"
                          ? "PT"
                          : event.eventType === "travel"
                            ? "Travel / logistics"
                            : "Team event"}
            </Badge>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1 sm:text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {formatDateRange(displayDate, displayDate)}
              {event.startTime ? ` · ${formatTime(event.startTime)}` : ""}
              {formatRecurrence(event.recurrenceType, event.recurrenceWeekday, event.recurrenceOrdinal) ? (
                <Repeat2 className="ml-1 inline-block size-4 align-text-bottom" aria-label="Recurring event" />
              ) : null}
            </span>
            {event.location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {displayLocation}
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
                className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-primary/30 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ExternalLink className="size-4" />
                Official event details
              </a>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap gap-2 pt-2">
            <Link
              href={`/scoring?eventId=${event.id}`}
              className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ClipboardCheck className="size-4" />
              Submit
            </Link>
            <ShareEventButton
              token={event.shareToken}
              title={event.title}
              location={displayLocation}
              time={event.startTime ? formatTime(event.startTime) : null}
            />
            {isAdmin ? (
              <>
                <RemindAttendeesButton eventId={event.id} />
                <EventAdminActions eventId={event.id} isLocked={isLocked} event={event} />
              </>
            ) : null}
          </div>
          {event.travelDetails ? (
            <div className="max-w-full rounded-xl border border-border bg-muted/40 p-3 text-sm leading-6 sm:p-4">
              <p className="font-bold text-foreground">Travel notes</p>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">{event.travelDetails}</p>
            </div>
          ) : null}
        </div>
      </div>

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

      <EventAvailabilityAttendance
        eventId={event.id}
  eventEndDate={isMultiDay ? event.endDate : null}
  selectedEventDate={selectedEventDate}
  tallies={tallies}
        totalRespondents={totalRespondents}
bestDate={bestDate}
  dates={dateAttendance}
  isAdmin={isAdmin}
  occurrenceLinks={occurrenceLinks}
  />

      <EventGuestsSection eventId={event.id} guests={guests} isAdmin={isAdmin} />
    </div>
  )
}
