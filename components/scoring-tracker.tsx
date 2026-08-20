"use client"

import { useState } from "react"
import { claimScoring, nextScoringRound, saveMatchScore, setupScoring, transferScoring } from "@/app/actions/scoring"
import { Button } from "@/components/ui/button"

type Match = { id: string; playerOneName: string; playerTwoName: string; playerOneScore: number; playerTwoScore: number; completedAt: Date | null }
type Session = { id: string; eventId: string; trackerId: string; trackerName: string; playerCount: number; roundCount: number; currentRound: number; status: string }

export function ScoringTracker({ eventId, eventTitle, actorId, actorName, session, matches, members }: { eventId: string; eventTitle: string; actorId: string; actorName: string; session: Session | null; matches: Match[]; members: { id: string; name: string }[] }) {
  const [currentSession, setCurrentSession] = useState(session)
  const [currentMatches, setCurrentMatches] = useState(matches)
  const [players, setPlayers] = useState(session?.playerCount ? String(session.playerCount) : "")
  const [rounds, setRounds] = useState(session?.roundCount ? String(session.roundCount) : "")
  const [transferId, setTransferId] = useState("")
  const isTracker = currentSession?.trackerId === actorId

  async function claim() {
    const next = await claimScoring(eventId)
    setCurrentSession(next)
  }
  async function setup() {
    await setupScoring(eventId, Number(players), Number(rounds))
    window.location.reload()
  }
  async function score(matchId: string, side: "one" | "two", value: string) {
    const next = currentMatches.map((match) => match.id === matchId ? { ...match, [side === "one" ? "playerOneScore" : "playerTwoScore"]: Math.max(0, Number(value) || 0) } : match)
    setCurrentMatches(next)
    const match = next.find((item) => item.id === matchId)
    if (match) await saveMatchScore(eventId, matchId, match.playerOneScore, match.playerTwoScore)
  }
  async function nextRound() {
    await nextScoringRound(eventId)
    window.location.reload()
  }

  if (!currentSession) return <Button className="w-full" onClick={claim}>Claim tracking</Button>
  if (!isTracker) return <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-6">This event is currently tracked by <strong>{currentSession.trackerName}</strong>. If you want to claim tracking, ask them to transfer ownership of tracking.</div>
  if (currentSession.status === "completed") return <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center text-sm leading-6">All rounds have been registered and saved on past events.</div>
  if (currentSession.status === "claimed") return <div className="space-y-4 rounded-2xl border border-border bg-card p-5"><div><h2 className="text-xl font-semibold">Set up scoring</h2><p className="mt-1 text-sm text-muted-foreground">Enter the players and rounds for {eventTitle}.</p></div><div className="grid grid-cols-2 gap-3"><label className="text-sm">Players<input className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-lg" inputMode="numeric" value={players} onChange={(event) => setPlayers(event.target.value)} /></label><label className="text-sm">Rounds<input className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-lg" inputMode="numeric" value={rounds} onChange={(event) => setRounds(event.target.value)} /></label></div><Button className="w-full" onClick={setup}>Next: create round 1</Button></div>
  const complete = currentMatches.length > 0 && currentMatches.every((match) => match.completedAt)
  async function transfer() {
    const member = members.find((item) => item.id === transferId)
    if (!member) return
    await transferScoring(eventId, member.id, member.name)
    window.location.reload()
  }
  return <div className="space-y-5"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Round</p><h2 className="text-3xl font-bold tracking-wide">{currentSession.currentRound} <span className="text-muted-foreground">/ {currentSession.roundCount}</span></h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">{currentSession.trackerName}</span></div><div className="space-y-3">{currentMatches.map((match) => <div key={match.id} className="rounded-2xl border border-border bg-card p-3"><div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"><div className="min-w-0 text-center text-sm font-medium leading-tight">{match.playerOneName}</div><div className="flex items-center gap-2"><input aria-label={`${match.playerOneName} score`} className="size-16 rounded-xl border-2 border-primary bg-background text-center text-3xl font-bold" inputMode="numeric" value={match.playerOneScore} onChange={(event) => void score(match.id, "one", event.target.value)} /><span className="text-xs text-muted-foreground">vs</span><input aria-label={`${match.playerTwoName} score`} className="size-16 rounded-xl border-2 border-primary bg-background text-center text-3xl font-bold" inputMode="numeric" value={match.playerTwoScore} onChange={(event) => void score(match.id, "two", event.target.value)} /></div><div className="min-w-0 text-center text-sm font-medium leading-tight">{match.playerTwoName}</div></div></div>)}</div><div className="flex flex-col gap-2 rounded-xl border border-border p-3"><label className="text-sm text-muted-foreground">Transfer tracking<select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-foreground" value={transferId} onChange={(event) => setTransferId(event.target.value)}><option value="">Select a member</option>{members.filter((member) => member.id !== actorId).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><Button variant="outline" disabled={!transferId} onClick={transfer}>Transfer tracker</Button></div><Button className="w-full" disabled={!complete} onClick={nextRound}>{currentSession.currentRound === currentSession.roundCount ? "Finish event" : `Start round ${currentSession.currentRound + 1} of ${currentSession.roundCount}`}</Button></div>
}
