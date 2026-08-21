"use client"

import { useState } from "react"
import { PartyPopper } from "lucide-react"
import { adminResetRoundScores, assignMatchOpponent, claimScoring, deleteScoring, nextScoringRound, saveMatchScore, setupScoring, transferScoring } from "@/app/actions/scoring"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type Match = { id: string; playerOneId?: string | null; playerOneName: string; playerTwoId?: string | null; playerTwoName: string; playerOneScore: number; playerTwoScore: number; completedAt: Date | null }
type Session = { id: string; eventId: string; trackerId: string; trackerName: string; playerCount: number; roundCount: number; currentRound: number; status: string }
type Member = { id: string; name: string }

function StackedName({ name }: { name: string }) {
  const [firstName, ...lastName] = name.trim().split(/\s+/)
  return <span className="flex flex-col leading-tight"><span>{firstName}</span>{lastName.length ? <span>{lastName.join(" ")}</span> : null}</span>
}

export function ScoringTracker({ eventId, eventTitle, actorId, actorRole, session, matches, members, eventMembers, priorOpponents = {} }: { eventId: string; eventTitle: string; actorId: string; actorRole: string; session: Session | null; matches: Match[]; members: Member[]; eventMembers: Member[]; priorOpponents?: Record<string, string[]> }) {
  const [currentSession, setCurrentSession] = useState(session)
  const [currentMatches, setCurrentMatches] = useState(matches)
  const [players, setPlayers] = useState(session?.playerCount ? String(session.playerCount) : "")
  const [rounds, setRounds] = useState(session?.roundCount ? String(session.roundCount) : "")
  const [transferId, setTransferId] = useState("")
  const [transferOpen, setTransferOpen] = useState(false)
  const [lockedMatches, setLockedMatches] = useState<Set<string>>(new Set())
  const [celebrating, setCelebrating] = useState(false)
  const isTracker = currentSession?.trackerId === actorId
  const isAdmin = actorRole === "admin" || actorRole === "superuser"

  async function resetRoundScores() {
    if (!currentSession) return
    const targetRound = Math.max(1, currentSession.currentRound - 1)
    if (!window.confirm(`Are you sure you want to reset all scores for round ${targetRound}? You will return to that round.`)) return
    await adminResetRoundScores(eventId, targetRound)
    window.location.reload()
  }

  async function assignOpponent(matchId: string, opponentId: string | null, opponentName: string) {
    const isBye = opponentId === "bye"
    await assignMatchOpponent(eventId, matchId, isBye ? null : opponentId, opponentName)
    if (isBye) await saveMatchScore(eventId, matchId, 2, 0)
    setCurrentMatches((matches) => matches.map((match) => match.id === matchId ? { ...match, playerTwoId: isBye ? null : opponentId, playerTwoName: opponentName, playerOneScore: isBye ? 2 : match.playerOneScore, playerTwoScore: isBye ? 0 : match.playerTwoScore, completedAt: isBye ? new Date() : match.completedAt } : match))
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
  if (!isTracker && !isAdmin) return <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-6">This event is currently tracked by <strong>{currentSession.trackerName}</strong>. If you want to claim tracking, ask them to transfer ownership of tracking.</div>
  if (currentSession.status === "completed") return <div className="relative rounded-2xl border border-border bg-muted/30 p-6 text-center text-sm leading-6">{celebrating && <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm" role="status" aria-live="polite"><div className="animate-bounce rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-2xl"><PartyPopper className="mx-auto size-16 animate-pulse text-primary" aria-hidden="true" /><p className="mt-4 text-2xl font-medium tracking-normal">Event finished!</p><p className="mt-1 text-sm text-muted-foreground">Ta-da! All rounds are saved.</p></div></div>}All rounds have been registered and saved on past events.{isAdmin ? <Button className="absolute right-4 top-4" size="sm" variant="destructive" onClick={resetRoundScores}>Reset round scores</Button> : null}</div>
  if (currentSession.status === "claimed") return <div className="space-y-4 rounded-2xl border border-border bg-card p-5"><h2 className="text-xl font-medium tracking-normal">Set up scoring</h2><p className="text-sm text-muted-foreground">Enter the players and rounds for {eventTitle}.</p><div className="grid grid-cols-2 gap-3"><label className="text-sm">Players<input className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-lg" inputMode="numeric" value={players} onChange={(event) => setPlayers(event.target.value)} /></label><label className="text-sm">Rounds<input className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-lg" inputMode="numeric" value={rounds} onChange={(event) => setRounds(event.target.value)} /></label></div><Button className="w-full" onClick={async () => { await setupScoring(eventId, Number(players), Number(rounds)); window.location.reload() }}>Next: create round 1</Button></div>

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
      window.setTimeout(() => window.location.reload(), 3000)
    }
  }

  return <div className="space-y-3 sm:space-y-5">
    {celebrating && <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm" role="status" aria-live="polite"><div className="animate-bounce rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-2xl"><PartyPopper className="mx-auto size-16 animate-pulse text-primary" aria-hidden="true" /><p className="mt-4 text-2xl font-medium tracking-normal">Event finished!</p><p className="mt-1 text-sm text-muted-foreground">Ta-da! All rounds are saved.</p></div></div>}
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-border bg-card p-2.5 sm:flex-row sm:items-start sm:gap-3 sm:p-4"><div><p className="text-xs text-muted-foreground sm:text-sm">Round</p><h2 className="text-2xl font-medium tracking-normal sm:text-3xl">{currentSession.currentRound} <span className="text-muted-foreground">/ {currentSession.roundCount}</span></h2><p className="mt-1 text-xs text-muted-foreground">Tracker: {currentSession.trackerName}</p></div><div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2"><Dialog open={transferOpen} onOpenChange={setTransferOpen}><DialogTrigger render={<Button className="w-full sm:w-auto" size="sm" variant="outline">Transfer</Button>} /><DialogContent><DialogHeader><DialogTitle>Transfer tracking</DialogTitle><DialogDescription>Choose the member who will take over score tracking for this event.</DialogDescription></DialogHeader><div className="space-y-3"><select aria-label="Transfer tracking member" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={transferId} onChange={(event) => setTransferId(event.target.value)}><option value="">Select a member</option>{members.filter((member) => member.id !== actorId).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><Button className="w-full" disabled={!transferId} onClick={transfer}>Transfer tracking</Button></div></DialogContent></Dialog><Button size="sm" variant="destructive" className="w-full bg-destructive/90 text-white hover:bg-destructive sm:w-auto" onClick={remove}>Delete</Button></div></div>
    <div className="space-y-2 sm:space-y-3">{visibleMatches.length ? visibleMatches.map((match) => <div key={match.id} className="rounded-2xl border border-border bg-card p-2 sm:p-3"><div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-2"><div className="min-w-0 text-center text-xs font-medium leading-tight sm:text-sm"><StackedName name={match.playerOneName} /></div><div className="flex items-center gap-1 sm:gap-2"><button type="button" aria-label={`${match.playerOneName} score ${match.playerOneScore}`} disabled={lockedMatches.has(match.id)} className="size-11 rounded-lg border-2 border-primary bg-background text-center text-2xl font-bold disabled:opacity-60 sm:size-16 sm:rounded-xl sm:text-3xl" onClick={() => void score(match.id, "one", match.playerOneScore >= 2 ? 0 : match.playerOneScore + 1)}>{match.playerOneScore}</button><span className="text-xs text-muted-foreground">vs</span><button type="button" aria-label={`${match.playerTwoName} score ${match.playerTwoScore}`} disabled={lockedMatches.has(match.id)} className="size-11 rounded-lg border-2 border-primary bg-background text-center text-2xl font-bold disabled:opacity-60 sm:size-16 sm:rounded-xl sm:text-3xl" onClick={() => void score(match.id, "two", match.playerTwoScore >= 2 ? 0 : match.playerTwoScore + 1)}>{match.playerTwoScore}</button></div><div className="min-w-0"><select aria-label={`Opponent for ${match.playerOneName}`} className="mx-auto block h-8 w-full min-w-0 rounded-lg border border-input bg-background px-0.5 text-center text-xs font-medium text-foreground sm:h-10 sm:w-[75%] sm:px-1 sm:text-sm" value={match.playerTwoId ?? (match.playerTwoName === "Bye" ? "bye" : match.playerTwoName === "Opponent" ? "external" : "")} onChange={(event) => { const value = event.target.value; const member = eventMembers.find((item) => item.id === value); void assignOpponent(match.id, value === "bye" ? "bye" : member?.id ?? null, value === "bye" ? "Bye" : member?.name ?? "Opponent") }}><option value="">Blank</option><option value="bye">Bye</option><option value="external">Opponent (not in app)</option>{eventMembers.filter((member) => member.id !== match.playerOneId && (!match.playerOneId || !(priorOpponents[match.playerOneId] ?? []).includes(member.id) || member.id === match.playerTwoId)).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div></div><button type="button" className="mx-auto mt-2 block rounded-md border border-border px-3 py-1 text-xs font-medium" onClick={() => { const locking = !lockedMatches.has(match.id); setLockedMatches((locked) => { const next = new Set(locked); if (next.has(match.id)) next.delete(match.id); else next.add(match.id); return next }); if (locking) { setCurrentMatches((all) => all.map((item) => item.id === match.id ? { ...item, playerOneScore: 0, playerTwoScore: 0, completedAt: new Date() } : item)); void saveMatchScore(eventId, match.id, 0, 0) } }}>{lockedMatches.has(match.id) ? "Unlock scores" : "ID"}</button></div>) : <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No registered players were found for this event.</div>}</div>
    <Button className="w-full" disabled={!complete} onClick={nextRound}>{currentSession.currentRound < currentSession.roundCount ? `Start round ${currentSession.currentRound + 1}` : "Finish event"}</Button>
  </div>
}
