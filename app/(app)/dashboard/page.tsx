import { CalendarPlus, Plane, Swords, Trophy, Dumbbell } from "lucide-react"
import { listEvents } from "@/app/actions/events"
import { getSessionUser } from "@/lib/session"
import { EventCard, type EventSummary } from "@/components/event-card"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { PersonalAvailabilityDialog } from "@/components/personal-availability-dialog"
import { listPersonalAvailability } from "@/app/actions/personal-availability"
import type { PersonalAvailabilityStatus } from "@/app/actions/personal-availability"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const month = new Date().toISOString().slice(0, 7)
  const [events, user, personalDates] = await Promise.all([
    listEvents(),
    getSessionUser(),
    listPersonalAvailability(month),
  ])
  const initialStatuses: Record<string, PersonalAvailabilityStatus> = Object.fromEntries(
    personalDates.map((row) => [row.date, row.status as PersonalAvailabilityStatus]),
  )
  const isAdmin = user?.role === "admin"

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
  }))

  const active = summaries.filter((e) => e.status !== "cancelled")
  const planningCount = active.filter((e) => e.status === "planning").length
  const lockedCount = active.filter((e) => e.status === "locked").length

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
            Plan training sessions, find the best RCQ date, coordinate travel,
            and keep the roster aligned when it is time to register.
          </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
          <div className="rounded-xl bg-primary/70 p-3">
            <p className="text-2xl font-bold">{active.length}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-secondary-foreground/70">Active</p>
          </div>
          <div className="rounded-xl bg-primary/70 p-3">
            <p className="text-2xl font-bold">{planningCount}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-secondary-foreground/70">Planning</p>
          </div>
          <div className="rounded-xl bg-accent p-3 text-white">
            <p className="text-2xl font-bold text-white">{lockedCount}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-white">Finalized</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl tracking-wide text-balance">Team events</h2>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {isAdmin
              ? "Build the next practice, qualifier, RC, PT, or travel plan."
              : "Mark availability, RSVP when locked, and keep the team moving."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PersonalAvailabilityDialog initialStatuses={initialStatuses} />
          {isAdmin ? <CreateEventDialog /> : null}
        </div>
      </div>

      {active.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [Swords, "Training", "Schedule reps and testing"],
            [Trophy, "RCQs", "Lock the best date"],
            [Plane, "Travel", "Coordinate the trip"],
            [Dumbbell, "RC + PT", "Stay ready for the call"],
          ].map(([Icon, title, copy]) => {
            const QuickIcon = Icon as typeof Swords
            return (
              <div key={title as string} className="rounded-xl border border-border bg-card p-3 sm:p-4">
                <QuickIcon className="size-4 text-accent" />
                <p className="mt-3 text-sm font-bold">{title as string}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy as string}</p>
              </div>
            )
          })}
        </div>
      ) : null}

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  )
}
