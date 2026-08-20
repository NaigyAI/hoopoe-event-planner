import { listEvents } from "@/app/actions/events"
import { listStandingData, listStandingMembers } from "@/app/actions/standings"
import { StandingsReporter } from "@/components/standings-reporter"
import { todayISO } from "@/lib/dates"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ReportStandingsPage({ searchParams }: { searchParams: Promise<{ eventId?: string; saved?: string }> }) {
  const [{ eventId, saved }, events, members, standings] = await Promise.all([searchParams, listEvents(), listStandingMembers(), listStandingData()])
  const reportedEventIds = new Set(standings.map((row) => row.standing.eventId))
  const past = events.filter((event) => event.startDate < todayISO() && event.status !== "cancelled" && !reportedEventIds.has(event.id))
  const selected = eventId ? past.find((event) => event.id === eventId) : undefined
  return <main className="flex max-w-4xl flex-col gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Event results</p><h1 className="mt-2 text-3xl tracking-wide">Report Top 8 standings</h1><p className="mt-2 text-sm text-muted-foreground">{saved ? "Standings saved. Choose another past event when you are ready." : "Select a past event to register its players, decks, and decklists."}</p></div>{selected ? <><div className="rounded-xl border border-border p-3"><p className="font-medium">{selected.title}</p><p className="text-sm text-muted-foreground">{selected.startDate} · {selected.location}</p></div><StandingsReporter eventId={selected.id} members={members} /></> : past.length > 0 ? <section className="flex flex-col gap-2"><h2 className="text-base font-medium">Select an event</h2>{past.map((event) => <Link key={event.id} href={`/report-standings?eventId=${event.id}`} className="rounded-xl border border-border px-3 py-2 transition-colors hover:bg-muted/50"><span className="font-medium">{event.title}</span><span className="ml-2 text-sm text-muted-foreground">{event.startDate}</span></Link>)}</section> : <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">There are no past events to report at this time. Wait until an event has passed, then report its standings here.</p>}</main>
}
