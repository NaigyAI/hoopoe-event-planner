import { CalendarPlus } from "lucide-react"
import { listEvents } from "@/app/actions/events"
import { getSessionUser } from "@/lib/session"
import { EventCard, type EventSummary } from "@/components/event-card"
import { CreateEventDialog } from "@/components/create-event-dialog"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [events, user] = await Promise.all([listEvents(), getSessionUser()])
  const isAdmin = user?.role === "admin"

  const summaries: EventSummary[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    location: e.location,
    startDate: e.startDate,
    endDate: e.endDate,
    lockedDate: e.lockedDate,
    status: e.status,
    createdByName: e.createdByName,
    respondentCount: e.responderCount,
  }))

  const active = summaries.filter((e) => e.status !== "cancelled")

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Events
          </h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            {isAdmin
              ? "Create events and lock in the date that works best for everyone."
              : "Mark your availability so the team can find the best date."}
          </p>
        </div>
        {isAdmin ? <CreateEventDialog /> : null}
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  )
}
