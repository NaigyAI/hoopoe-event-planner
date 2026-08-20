import { listEvents } from "@/app/actions/events"
import { listStandingMembers } from "@/app/actions/standings"
import { StandingsReporter } from "@/components/standings-reporter"
import { todayISO } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function ReportStandingsPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const [{ eventId }, events, members] = await Promise.all([searchParams, listEvents(), listStandingMembers()])
  const past = events.filter((event) => event.startDate < todayISO() && event.status !== "cancelled")
  const selected = past.find((event) => event.id === eventId) ?? past[0]
  return <main className="flex flex-col gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Event results</p><h1 className="mt-2 text-3xl tracking-wide">Report Top 8 standings</h1><p className="mt-2 text-sm text-muted-foreground">Register the players, decks, and decklists for a past event.</p></div>{selected ? <><div className="rounded-xl border border-border p-3"><p className="font-medium">{selected.title}</p><p className="text-sm text-muted-foreground">{selected.startDate} · {selected.location}</p></div><StandingsReporter eventId={selected.id} members={members} /></> : <p className="text-sm text-muted-foreground">There are no past events to report yet.</p>}</main>
}
