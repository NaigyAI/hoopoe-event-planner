import { listScoringEvents, getScoringSession, listScoringMembers } from "@/app/actions/scoring"
import { ScoringTracker } from "@/components/scoring-tracker"
import { listAttendanceMembers } from "@/app/actions/members"

export const dynamic = "force-dynamic"

export default async function ScoringPage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId } = await searchParams
  const [{ actor, events }, members] = await Promise.all([listScoringEvents(), listAttendanceMembers()])
  const selectedEvents = eventId ? events.filter((event) => event.id === eventId) : events
  const cards = await Promise.all(selectedEvents.map(async (event) => ({ event, data: await getScoringSession(event.id), eventMembers: await listScoringMembers(event.id) })))
  return <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-8"><div><h1 className="font-heading mt-1 text-2xl font-normal uppercase tracking-normal sm:mt-2 sm:text-4xl">Scoring</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:mt-2 sm:text-sm sm:leading-6">Claim an event to track its pairings and scores from your phone.</p></div>{cards.length ? <div className="space-y-3 sm:space-y-5">{cards.map(({ event, data, eventMembers }) => <div key={event.id}><div className="mb-3 sm:mb-4"><h2 className="font-heading text-lg leading-6 sm:text-xl font-normal uppercase tracking-normal leading-7">{event.title}</h2><p className="mt-1 text-sm text-muted-foreground">{event.startDate} · {event.location}</p></div><ScoringTracker eventId={event.id} eventTitle={event.title} actorId={actor.id} actorRole={actor.role} session={data.session} matches={data.matches} members={members} eventMembers={eventMembers} priorOpponents={data.priorOpponents ?? {}} /></div>)}</div> : <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">There are no events scheduled for today.</div>}</main>
}
