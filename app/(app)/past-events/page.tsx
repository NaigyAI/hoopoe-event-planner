import Link from "next/link"
import { listEvents } from "@/app/actions/events"
import { listStandingData } from "@/app/actions/standings"
import { todayISO } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function PastEventsPage() {
  const events = await listEvents()
  const past = events.filter((event) => event.startDate < todayISO() && event.status !== "cancelled").sort((a, b) => b.startDate.localeCompare(a.startDate))
  const standings = await listStandingData()
  return <main className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Archive</p><h1 className="mt-2 text-3xl tracking-wide">Past events</h1><p className="mt-2 text-sm text-muted-foreground">Results, Top 8 finishes, and decklists from events we have played.</p></div><div className="space-y-4">{past.map((event) => { const rows = standings.filter((row) => row.standing?.eventId === event.id && row.entry).map((row) => row.entry!) ; return <section key={event.id} className="rounded-2xl border border-border p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl">{event.title}</h2><p className="text-sm text-muted-foreground">{event.startDate} · {event.location}</p></div><Link className="text-sm font-medium text-accent hover:underline" href={`/report-standings?eventId=${event.id}`}>Report standings</Link></div>{rows.length ? <ol className="mt-4 grid gap-2 sm:grid-cols-2">{rows.sort((a, b) => a.placement - b.placement).map((row) => <li key={row.id} className="rounded-lg bg-muted/40 p-3 text-sm"><strong>#{row.placement} {row.playerName}</strong><span className="block text-muted-foreground">{row.deckName}</span>{row.decklistPathname ? <a className="text-accent hover:underline" href={`/api/decklists/file?pathname=${encodeURIComponent(row.decklistPathname)}`}>Decklist: {row.decklistFilename}</a> : null}</li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">No standings reported yet.</p>}</section>})}</div></main>
}
