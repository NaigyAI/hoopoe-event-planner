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
  return <main className="space-y-6 px-3 py-4 sm:px-0 sm:py-0"><div><h1 className="mt-2 text-3xl tracking-wide">Past events</h1><p className="mt-2 text-sm text-muted-foreground">Results, Top 8 finishes, and decklists from events we have played.</p></div><div className="space-y-4">{past.map((event) => { const rows = standings.filter((row) => row.standing?.eventId === event.id && row.entry).map((row) => row.entry!) ; return <section key={event.id} className="rounded-2xl border border-border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl"><Link href={`/events/${event.id}`} className="transition-colors hover:text-accent hover:underline">{event.title}</Link></h2><p className="text-sm text-muted-foreground">{event.startDate} · {event.location}</p></div><Link className="text-sm font-medium text-accent hover:underline" href={`/report-standings?eventId=${event.id}`}>Report standings</Link></div><details className="mt-3 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-medium text-accent">Show standings</summary><div className="mt-3"><PastEventStandings rows={rows.sort((a, b) => a.placement - b.placement)} currentUserId={user?.id ?? ""} isAdmin={user?.role === "admin" || user?.role === "superuser"} /></div></details><details className="mt-3 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-medium text-accent">Show scoring</summary>{(scoresByEvent.get(event.id) ?? []).length ? <div className="mt-3 space-y-2">{(scoresByEvent.get(event.id) ?? []).map((score, index) => <div key={`${score.roundNumber}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"><span className="text-xs font-medium text-muted-foreground">R{score.roundNumber}</span><span className="min-w-0 flex-1 truncate text-right">{score.playerOneName}</span><strong className="shrink-0 rounded-md bg-background px-2 py-1">{score.playerOneScore}–{score.playerTwoScore}</strong><span className="min-w-0 flex-1 truncate">{score.playerTwoName || "Opponent"}</span></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No scoring recorded for this event.</p>}</details></section>})}</div></main>
}
