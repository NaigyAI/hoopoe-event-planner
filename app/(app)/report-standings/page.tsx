import { listEvents } from "@/app/actions/events"
import { listStandingData, listStandingMembers } from "@/app/actions/standings"
import { StandingsReporter } from "@/components/standings-reporter"
import { todayISO } from "@/lib/dates"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ReportStandingsPage({ searchParams }: { searchParams: Promise<{ eventId?: string; saved?: string }> }) {
  const [{ eventId, saved }, events, members, standings] = await Promise.all([searchParams, listEvents(), listStandingMembers(), listStandingData()])
  const reportedEventIds = new Set(standings.map((row) => row.standing.eventId))
  const past = events.filter((event) => event.startDate < todayISO() && event.status !== "cancelled" && !reportedEventIds.has(event.id))
  const selected = eventId ? past.find((event) => event.id === eventId) : undefined
  return <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8"><Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" />Back to Dashboard</Link><div><h1 className="font-oswald mt-1 text-3xl font-normal leading-[1.5em] tracking-normal sm:text-4xl">Report standings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{saved ? "Standings saved. Choose another past event when you are ready." : "Select a past event to register its players, decks, and decklists."}</p></div>{selected ? <><section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"><div className="mb-4"><h2 className="font-heading text-xl font-normal uppercase tracking-normal leading-7">{selected.title}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.startDate} · {selected.location}</p></div><StandingsReporter eventId={selected.id} members={members} /></section></> : past.length > 0 ? <section className="border-t border-border pt-4 sm:pt-5"><div className="space-y-3">{past.map((event, index) => <Link key={event.id} href={`/report-standings?eventId=${event.id}`} className={`flex items-center justify-between gap-4 py-1 ${index > 0 ? "border-t border-border pt-4" : ""}`}><div className="w-full"><h2 className="font-heading text-xl font-normal uppercase tracking-normal leading-7">{event.title}</h2><p className="mt-1 text-sm text-muted-foreground">{event.startDate} · {event.location}</p><span className="mt-3 flex h-8 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium tracking-normal text-primary-foreground transition-colors hover:bg-primary/90">Report standings</span></div></Link>)}</div></section> : <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">There are no past events to report at this time. Wait until an event has passed, then report its standings here.</p>}</main>
}
