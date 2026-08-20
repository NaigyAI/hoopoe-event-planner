"use client"

import { useState } from "react"
import { PartyPopper } from "lucide-react"
import { assignMatchOpponent, claimScoring, deleteScoring, nextScoringRound, saveMatchScore, setupScoring, transferScoring } from "@/app/actions/scoring"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type Match = { id: string; playerOneId?: string | null; playerOneName: string; playerTwoId?: string | null; playerTwoName: string; playerOneScore: number; playerTwoScore: number; completedAt: Date | null }
type Session = { id: string; eventId: string; trackerId: string; trackerName: string; playerCount: number; roundCount: number; currentRound: number; status: string }
type Member = { id: string; name: string }

export function ScoringTracker({ eventId, eventTitle, actorId, session, matches, members, eventMembers, priorOpponents = {} }: { eventId: string; eventTitle: string; actorId: string; session: Session | null; matches: Match[]; members: Member[]; eventMembers: Member[]; priorOpponents?: Record<string, string[]> }) {
  const [currentSession, setCurrentSession] = useState(session)
  const [currentMatches, setCurrentMatches] = useState(matches)
  const [players, setPlayers] = useState(session?.playerCount ? String(session.playerCount) : "")
  const [rounds, setRounds] = useState(session?.roundCount ? String(session.roundCount) : "")
  const [transferId, setTransferId] = useState("")
  const [transferOpen, setTransferOpen] = useState(false)
  const [lockedMatches, setLockedMatches] = useState<Set<string>>(new Set())
  const [celebrating, setCelebrating] = useState(false)
  const isTracker = currentSession?.trackerId === actorId

  async function assignOpponent(matchId: string, opponentId: string | null, opponentName: string) {
    await assignMatchOpponent(eventId, matchId, opponentId || null, opponentName)
    setCurrentMatches((matches) => matches.map((match) => match.id === matchId ? { ...match, playerTwoId: opponentId, playerTwoName: opponentName } : match))
  }

  async function score(matchId: string, side: "one" | "two", value: number) {
    const next = currentMatches.map((match) => {
      if (match.id !== matchId) return match
      const otherScore = side === "one" ? match.playerTwoScore : match.playerOneScore
      const safeValue = value === 2 && otherScore === 2 ? 1 : value
      return { ...match, [side === "one" ? "playerOneScore" : "playerTwoScore"]: safeValue, completedAt: new Date() }
    })
    setCurrentMatches(next)
    const match = next.find((item) => item.id === matchId)
    if (match) await saveMatchScore(eventId, matchId, match.playerOneScore, match.playerTwoScore)
  }

  if (!currentSession) return <Button className="w-full" onClick={async () => setCurrentSession(await claimScoring(eventId))}>Claim tracking</Button>
  if (!isTracker) return <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-6">This event is currently tracked by <strong>{currentSession.trackerName}</strong>. If you want to claim tracking, ask them to transfer ownership of tracking.</div>
  if (currentSession.status === "completed") return <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center text-sm leading-6">All rounds have been registered and saved on past events.</div>
  if (currentSession.status === "claimed") return <div className="space-y-4 rounded-2xl border border-border bg-card p-5"><h2 className="text-xl font-semibold">Set up scoring</h2><p className="text-sm text-muted-foreground">Enter the players and rounds for {eventTitle}.</p><div className="grid grid-cols-2 gap-3"><label className="text-sm">Players<input className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-lg" inputMode="numeric" value={players} onChange={(event) => setPlayers(event.target.value)} /></label><label className="text-sm">Rounds<input className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-lg" inputMode="numeric" value={rounds} onChange={(event) => setRounds(event.target.value)} /></label></div><Button className="w-full" onClick={async () => { await setupScoring(eventId, Number(players), Number(rounds)); window.location.reload() }}>Next: create round 1</Button></div>

  const isAssignedElsewhere = (match: Match) => currentMatches.some((other) => other.id !== match.id && other.playerTwoId && other.playerTwoId === match.playerOneId)
  const visibleMatches = currentMatches.filter((match) => !isAssignedElsewhere(match))
  const complete = visibleMatches.length > 0 && visibleMatches.every((match) => match.playerTwoName.trim() && match.completedAt)
  async function transfer() { const member = members.find((item) => item.id === transferId); if (!member) return; await transferScoring(eventId, member.id, member.name); setTransferOpen(false); window.location.reload() }
  async function remove() { if (!window.confirm("Are you sure you want to delete this scoring event and all registered rounds?")) return; await deleteScoring(eventId); window.location.reload() }
  async function nextRound() {
    const session = currentSession
    if (!session) return
    const finishing = session.currentRound >= session.roundCount
    await nextScoringRound(eventId)
    if (!finishing) window.location.reload()
    else {
      setCelebrating(true)
      setCurrentSession({ ...session, status: "completed" })
      const audio = new AudioContext()
      const now = audio.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator()
        const gain = audio.createGain()
        oscillator.frequency.value = frequency
        oscillator.type = "triangle"
        gain.gain.setValueAtTime(0.0001, now + index * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.12 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.28)
        oscillator.connect(gain).connect(audio.destination)
        oscillator.start(now + index * 0.12)
        oscillator.stop(now + index * 0.12 + 0.3)
      })
      window.setTimeout(() => void audio.close(), 1200)
    }
  }

  return <div className="space-y-5">
    {celebrating && <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm" role="status" aria-live="polite"><div className="animate-bounce rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-2xl"><PartyPopper className="mx-auto size-16 animate-pulse text-primary" aria-hidden="true" /><p className="mt-4 text-2xl font-bold">Event finished!</p><p className="mt-1 text-sm text-muted-foreground">Ta-da! All rounds are saved.</p></div></div>}
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"><div><p className="text-sm text-muted-foreground">Round</p><h2 className="text-3xl font-bold tracking-wide">{currentSession.currentRound} <span className="text-muted-foreground">/ {currentSession.roundCount}</span></h2><p className="mt-1 text-xs text-muted-foreground">Tracker: {currentSession.trackerName}</p></div><div className="flex items-center gap-2"><Dialog open={transferOpen} onOpenChange={setTransferOpen}><DialogTrigger render={<Button size="sm" variant="outline">Transfer</Button>} /><DialogContent><DialogHeader><DialogTitle>Transfer tracking</DialogTitle><DialogDescription>Choose the member who will take over score tracking for this event.</DialogDescription></DialogHeader><div className="space-y-3"><select aria-label="Transfer tracking member" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={transferId} onChange={(event) => setTransferId(event.target.value)}><option value="">Select a member</option>{members.filter((member) => member.id !== actorId).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><Button className="w-full" disabled={!transferId} onClick={transfer}>Transfer tracking</Button></div></DialogContent></Dialog><Button size="sm" variant="destructive" onClick={remove}>Delete</Button></div></div>
    <div className="space-y-3">{visibleMatches.length ? visibleMatches.map((match) => <div key={match.id} className="rounded-2xl border border-border bg-card p-3"><div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"><div className="min-w-0 text-center text-sm font-medium leading-tight">{match.playerOneName}</div><div className="flex items-center gap-2"><button type="button" aria-label={`${match.playerOneName} score ${match.playerOneScore}`} disabled={lockedMatches.has(match.id)} className="size-16 rounded-xl border-2 border-primary bg-background text-center text-3xl font-bold disabled:opacity-60" onClick={() => void score(match.id, "one", match.playerOneScore >= 2 ? 0 : match.playerOneScore + 1)}>{match.playerOneScore}</button><span className="text-xs text-muted-foreground">vs</span><button type="button" aria-label={`${match.playerTwoName} score ${match.playerTwoScore}`} disabled={lockedMatches.has(match.id)} className="size-16 rounded-xl border-2 border-primary bg-background text-center text-3xl font-bold disabled:opacity-60" onClick={() => void score(match.id, "two", match.playerTwoScore >= 2 ? 0 : match.playerTwoScore + 1)}>{match.playerTwoScore}</button></div><div className="min-w-0"><select aria-label={`Opponent for ${match.playerOneName}`} className="mx-auto block h-10 w-[75%] min-w-0 rounded-lg border border-input bg-background px-1 text-center text-sm font-medium text-foreground" value={match.playerTwoId ?? (match.playerTwoName === "Opponent" ? "external" : "")} onChange={(event) => { const value = event.target.value; const member = eventMembers.find((item) => item.id === value); void assignOpponent(match.id, member?.id ?? null, member?.name ?? "Opponent") }}><option value="">Blank</option><option value="external">Opponent (not in app)</option>{eventMembers.filter((member) => member.id !== match.playerOneId && (!match.playerOneId || !(priorOpponents[match.playerOneId] ?? []).includes(member.id) || member.id === match.playerTwoId)).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div></div><button type="button" className="mx-auto mt-2 block rounded-md border border-border px-3 py-1 text-xs font-medium" onClick={() => { const locking = !lockedMatches.has(match.id); setLockedMatches((locked) => { const next = new Set(locked); if (next.has(match.id)) next.delete(match.id); else next.add(match.id); return next }); if (locking) { setCurrentMatches((all) => all.map((item) => item.id === match.id ? { ...item, playerOneScore: 0, playerTwoScore: 0, completedAt: new Date() } : item)); void saveMatchScore(eventId, match.id, 0, 0) } }}>{lockedMatches.has(match.id) ? "Unlock scores" : "ID"}</button></div>) : <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No registered players were found for this event.</div>}</div>
    <Button className="w-full" disabled={!complete} onClick={nextRound}>{currentSession.currentRound < currentSession.roundCount ? `Start round ${currentSession.currentRound + 1}` : "Finish event"}</Button>
  </div>
}
