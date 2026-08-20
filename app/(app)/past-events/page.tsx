import Link from "next/link"
import { listEvents } from "@/app/actions/events"
import { listStandingData } from "@/app/actions/standings"
import { listCompletedScoringMatches } from "@/app/actions/scoring"
import { todayISO } from "@/lib/dates"
import { getSessionUser } from "@/lib/session"
import { PastEventStandings } from "@/components/past-event-standings"

export const dynamic = "force-dynamic"

export default async function PastEventsPage() {
  const [events, user] = await Promise.all([listEvents(), getSessionUser()])
  const past = events.filter((event) => event.startDate < todayISO() && event.status !== "cancelled").sort((a, b) => b.startDate.localeCompare(a.startDate))
  const [standings, scoreRows] = await Promise.all([listStandingData(), Promise.all(past.map((event) => listCompletedScoringMatches(event.id)))])
  const scoresByEvent = new Map(past.map((event, index) => [event.id, scoreRows[index]]))
  return <main className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Archive</p><h1 className="mt-2 text-3xl tracking-wide">Past events</h1><p className="mt-2 text-sm text-muted-foreground">Results, Top 8 finishes, and decklists from events we have played.</p></div><div className="space-y-4">{past.map((event) => { const rows = standings.filter((row) => row.standing?.eventId === event.id && row.entry).map((row) => row.entry!) ; return <section key={event.id} className="rounded-2xl border border-border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl">{event.title}</h2><p className="text-sm text-muted-foreground">{event.startDate} · {event.location}</p></div><Link className="text-sm font-medium text-accent hover:underline" href={`/report-standings?eventId=${event.id}`}>Report standings</Link></div>{rows.length ? <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-accent">Show Top 8 standings</summary><div className="mt-3"><PastEventStandings rows={rows.sort((a, b) => a.placement - b.placement)} scores={scoresByEvent.get(event.id) ?? []} currentUserId={user?.id ?? ""} isAdmin={user?.role === "admin" || user?.role === "superuser"} /></div></details> : <p className="mt-4 text-sm text-muted-foreground">No standings reported yet.</p>}</section>})}</div></main>
}
