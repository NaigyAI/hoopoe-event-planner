import Link from "next/link"
import { CalendarPlus, UserPlus } from "lucide-react"
import { getMyEventAvailability, listEvents } from "@/app/actions/events"
import { getSessionUser } from "@/lib/session"
import { getTeamStats } from "@/app/actions/members"
import { EventTypeFilter } from "@/components/event-type-filter"
import type { EventSummary } from "@/components/event-card"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { PersonalAvailabilityDialog } from "@/components/personal-availability-dialog"
import { listPersonalAvailability, listPersonalAvailabilityFrom } from "@/app/actions/personal-availability"
import type { PersonalAvailabilityStatus } from "@/app/actions/personal-availability"
import { AvailabilityEventPrompt } from "@/components/availability-event-prompt"
import { addDaysISO, dateRange, getRecurringDates, todayISO } from "@/lib/dates"
import { BestDatesDialog } from "@/components/best-dates-dialog"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const month = new Date().toISOString().slice(0, 7)
  const [events, user, personalDates, futurePersonalDates, teamStats] = await Promise.all([
    listEvents(),
    getSessionUser(),
    listPersonalAvailability(month),
    listPersonalAvailabilityFrom(todayISO()),
    getTeamStats(),
  ])
  const answeredAvailability = await getMyEventAvailability(events.map((event) => event.id))
  const initialStatuses: Record<string, PersonalAvailabilityStatus> = Object.fromEntries(
    personalDates.map((row) => [row.date, row.status as PersonalAvailabilityStatus]),
  )
  const isAdmin = user?.role === "admin" || user?.role === "superuser"

  const summaries: EventSummary[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    format: e.format,
    eventType: e.eventType,
    eventUrl: e.eventUrl,
    travelDetails: e.travelDetails,
    location: e.location,
    startDate: e.startDate,
    endDate: e.endDate,
    startTime: e.startTime,
    endTime: e.endTime,
    lockedDate: e.lockedDate,
    status: e.status,
    createdByName: e.createdByName,
    respondentCount: e.responderCount,
    goingCount: e.goingCount,
    recurrenceType: e.recurrenceType,
    recurrenceWeekday: e.recurrenceWeekday,
    recurrenceOrdinal: e.recurrenceOrdinal,
  }))

  const active = summaries
    .filter((e) => e.status !== "cancelled" && e.startDate >= todayISO())
    .sort((a, b) => {
      const dateComparison = a.startDate.localeCompare(b.startDate)
      return dateComparison !== 0 ? dateComparison : a.title.localeCompare(b.title)
    })
  const availableDates = futurePersonalDates.filter((row) => row.status === "available").map((row) => row.date)
  const promptMatches = active
    .filter((event) => !event.lockedDate)
    .flatMap((event) => {
      const openDates = event.recurrenceType !== "none"
        ? getRecurringDates(event.recurrenceType, event.startDate, event.recurrenceWeekday, event.recurrenceOrdinal, 12)
            .filter((date) => date <= addDaysISO(todayISO(), 21))
        : dateRange(event.startDate, event.endDate ?? event.startDate)
      const answeredDates = new Set(
        answeredAvailability
          .filter((answer) => answer.eventId === event.id)
          .map((answer) => answer.date),
      )
      const matchingDates = openDates.filter((date) => availableDates.includes(date) && !answeredDates.has(date))
      if (matchingDates.length === 0) return []
      if (event.recurrenceType !== "none") {
        return matchingDates.map((date) => ({ event, matchingDates: [date] }))
      }
      return [{ event, matchingDates }]
    })

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-2xl bg-secondary px-5 py-6 text-secondary-foreground shadow-sm sm:px-8 sm:py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
            Hoopoe Boys team command center
          </p>
          <h1 className="mt-2 text-4xl leading-none tracking-wide text-balance sm:text-5xl">
            Keep the reps, trips, and tournaments organized.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-secondary-foreground/80 sm:text-base">
            Plan practice sessions, find the best RC Qualifier date, coordinate travel,
            and keep everyone aligned when it is time to register for the big event.
          </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
          <div className="rounded-xl bg-primary/70 p-3">
            <p className="text-2xl font-bold">{active.length}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-secondary-foreground/70">
              {active.length === 1 ? "Event" : "Events"} planned
            </p>
          </div>
          <div className="rounded-xl bg-primary/70 p-3">
            <p className="text-2xl font-bold">{teamStats.activeMembers}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-secondary-foreground/70">
              Team {teamStats.activeMembers === 1 ? "member" : "members"}
            </p>
          </div>
          <div className="rounded-xl bg-accent p-3 text-white">
            <p className="text-2xl font-bold text-white">{teamStats.externalMembers}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-white">
              {teamStats.externalMembers === 1 ? "External member" : "External members"}
            </p>
          </div>
        </div>
      </section>

      {isAdmin && teamStats.pendingMembers > 0 ? (
        <Link
          href="/members"
          className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 transition-colors hover:bg-accent/15"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
            <UserPlus className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {teamStats.pendingMembers} {teamStats.pendingMembers === 1 ? "prospect is" : "prospects are"} waiting for approval
            </p>
            <p className="text-xs text-muted-foreground">
              Review and approve them on the Members page.
            </p>
          </div>
        </Link>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl tracking-wide text-balance">Team events</h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {isAdmin
              ? "Find your next practice, weekly or qualifier here."
              : "Mark availability, RSVP when locked, and keep the team moving."}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          <PersonalAvailabilityDialog initialStatuses={initialStatuses} events={active} />
          <BestDatesDialog />
          <CreateEventDialog />
        </div>
      </div>

      {promptMatches.length > 0 ? <AvailabilityEventPrompt key={promptMatches.map((match) => `${match.event.id}-${match.matchingDates.join(",")}`).join("|")} suggestions={promptMatches} /> : null}

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CalendarPlus className="size-6" />
          </div>
          <h2 className="font-medium text-foreground">No events yet</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground text-pretty">
            {isAdmin
              ? "Create your first event to start collecting availability."
              : "Once an admin creates an event, you can mark your availability here."}
          </p>
        </div>
      ) : (
        <EventTypeFilter events={active} />
      )}

      <div className="flex justify-center pt-2">
        <Link
          href="/past-events"
          className="rounded-lg border border-accent/50 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        >
          Looking for past events? Press here.
        </Link>
      </div>
    </div>
  )
}
