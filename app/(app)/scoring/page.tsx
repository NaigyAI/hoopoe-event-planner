import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { listScoringEvents, getScoringSession, listScoringMembers } from "@/app/actions/scoring"
import { ScoringTracker } from "@/components/scoring-tracker"
import { listAttendanceMembers } from "@/app/actions/members"

export const dynamic = "force-dynamic"

export default async function ScoringPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  const [{ actor, events }, members] = await Promise.all([listScoringEvents(), listAttendanceMembers()])
  const selectedEvents = eventId ? events.filter((event) => event.id === eventId) : events
  const cards = await Promise.all(selectedEvents.map(async (event) => ({ event, data: await getScoringSession(event.id), eventMembers: await listScoringMembers(event.id) })))
  return <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8"><div><div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /> Today&apos;s events</div><h1 className="mt-2 text-3xl font-medium tracking-normal sm:text-4xl">Scoring</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Claim an event to track its pairings and scores from your phone.</p></div>{cards.length ? <div className="space-y-5">{cards.map(({ event, data, eventMembers }) => <section key={event.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"><div className="mb-4 flex items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">Selected event</p><h2 className="mt-1 text-xl font-medium tracking-normal">{event.title}</h2><p className="mt-1 text-sm text-muted-foreground">{event.startDate} · {event.location}</p></div><Link href={`/report-standings?eventId=${event.id}`} className="inline-flex h-10 shrink-0 items-center rounded-xl bg-primary px-4 text-sm font-medium tracking-normal text-primary-foreground transition-colors hover:bg-primary/90">Report standings</Link></div><ScoringTracker eventId={event.id} eventTitle={event.title} actorId={actor.id} actorRole={actor.role} session={data.session} matches={data.matches} members={members} eventMembers={eventMembers} priorOpponents={data.priorOpponents ?? {}} /></section>)}</div> : <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">There are no events scheduled for today.</div>}</main>
}
