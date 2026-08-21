import { CalendarDays } from "lucide-react"
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
  return <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"><div><div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /> Event results</div><h1 className="mt-2 text-3xl font-medium tracking-normal sm:text-4xl">Report standings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{saved ? "Standings saved. Choose another past event when you are ready." : "Select a past event to register its players, decks, and decklists."}</p></div>{selected ? <><section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"><div className="mb-4"><h2 className="text-xl font-medium tracking-normal">{selected.title}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.startDate} · {selected.location}</p></div><StandingsReporter eventId={selected.id} members={members} /></section></> : past.length > 0 ? <section className="space-y-3"><h2 className="text-xl font-medium tracking-normal">Select an event</h2><div className="space-y-3">{past.map((event) => <Link key={event.id} href={`/report-standings?eventId=${event.id}`} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"><div><span className="font-medium tracking-normal">{event.title}</span><p className="mt-1 text-sm text-muted-foreground">{event.startDate} · {event.location}</p><span className="mt-2 inline-block text-sm font-medium text-accent">Report standings</span></div></Link>)}</div></section> : <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">There are no past events to report at this time. Wait until an event has passed, then report its standings here.</p>}</main>
}
