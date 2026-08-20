"use client"

import { useState } from "react"
import { assignMatchOpponent, claimScoring, deleteScoring, nextScoringRound, saveMatchScore, setupScoring, transferScoring } from "@/app/actions/scoring"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

type Match = { id: string; playerOneId?: string | null; playerOneName: string; playerTwoId?: string | null; playerTwoName: string; playerOneScore: number; playerTwoScore: number; completedAt: Date | null }
type Session = { id: string; eventId: string; trackerId: string; trackerName: string; playerCount: number; roundCount: number; currentRound: number; status: string }
type Member = { id: string; name: string }

export function ScoringTracker({ eventId, eventTitle, actorId, session, matches, members, eventMembers }: { eventId: string; eventTitle: string; actorId: string; session: Session | null; matches: Match[]; members: Member[]; eventMembers: Member[] }) {
  const [currentSession, setCurrentSession] = useState(session)
  const [currentMatches, setCurrentMatches] = useState(matches)
  const [players, setPlayers] = useState(session?.playerCount ? String(session.playerCount) : "")
  const [rounds, setRounds] = useState(session?.roundCount ? String(session.roundCount) : "")
  const [transferId, setTransferId] = useState("")
  const [transferOpen, setTransferOpen] = useState(false)
  const isTracker = currentSession?.trackerId === actorId

  async function assignOpponent(matchId: string, opponentId: string | null, opponentName: string) {
    await assignMatchOpponent(eventId, matchId, opponentId || null, opponentName)
    setCurrentMatches((matches) => matches.map((match) => match.id === matchId ? { ...match, playerTwoId: opponentId, playerTwoName: opponentName } : match))
  }

  async function score(matchId: string, side: "one" | "two", value: string) {
    const next = currentMatches.map((match) => match.id === matchId ? { ...match, [side === "one" ? "playerOneScore" : "playerTwoScore"]: Math.max(0, Number(value) || 0) } : match)
    setCurrentMatches(next)
    const match = next.find((item) => item.id === matchId)
    if (match) await saveMatchScore(eventId, matchId, match.playerOneScore, match.playerTwoScore)
  }

  if (!currentSession) return <Button className="w-full" onClick={async () => setCurrentSession(await claimScoring(eventId))}>Claim tracking</Button>
  if (!isTracker) return <div className="rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-6">This event is currently tracked by <strong>{currentSession.trackerName}</strong>. If you want to claim tracking, ask them to transfer ownership of tracking.</div>
  if (currentSession.status === "completed") return <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center text-sm leading-6">All rounds have been registered and saved on past events.</div>
  if (currentSession.status === "claimed") return <div className="space-y-4 rounded-2xl border border-border bg-card p-5"><h2 className="text-xl font-semibold">Set up scoring</h2><p className="text-sm text-muted-foreground">Enter the players and rounds for {eventTitle}.</p><div className="grid grid-cols-2 gap-3"><label className="text-sm">Players<input className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-lg" inputMode="numeric" value={players} onChange={(event) => setPlayers(event.target.value)} /></label><label className="text-sm">Rounds<input className="mt-1 h-12 w-full rounded-lg border border-input bg-background px-3 text-lg" inputMode="numeric" value={rounds} onChange={(event) => setRounds(event.target.value)} /></label></div><Button className="w-full" onClick={async () => { await setupScoring(eventId, Number(players), Number(rounds)); window.location.reload() }}>Next: create round 1</Button></div>

  const complete = currentMatches.length > 0 && currentMatches.every((match) => match.completedAt)
  async function transfer() { const member = members.find((item) => item.id === transferId); if (!member) return; await transferScoring(eventId, member.id, member.name); setTransferOpen(false); window.location.reload() }
  async function remove() { if (!window.confirm("Are you sure you want to delete this scoring event and all registered rounds?")) return; await deleteScoring(eventId); window.location.reload() }
  async function nextRound() { await nextScoringRound(eventId); window.location.reload() }

  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4"><div><p className="text-sm text-muted-foreground">Round</p><h2 className="text-3xl font-bold tracking-wide">{currentSession.currentRound} <span className="text-muted-foreground">/ {currentSession.roundCount}</span></h2><p className="mt-1 text-xs text-muted-foreground">Tracker: {currentSession.trackerName}</p></div><div className="flex items-center gap-2"><Dialog open={transferOpen} onOpenChange={setTransferOpen}><DialogTrigger render={<Button size="sm" variant="outline">Transfer</Button>} /><DialogContent><DialogHeader><DialogTitle>Transfer tracking</DialogTitle><DialogDescription>Choose the member who will take over score tracking for this event.</DialogDescription></DialogHeader><div className="space-y-3"><select aria-label="Transfer tracking member" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={transferId} onChange={(event) => setTransferId(event.target.value)}><option value="">Select a member</option>{members.filter((member) => member.id !== actorId).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><Button className="w-full" disabled={!transferId} onClick={transfer}>Transfer tracking</Button></div></DialogContent></Dialog><Button size="sm" variant="destructive" onClick={remove}>Delete</Button></div></div>
    <div className="space-y-3">{currentMatches.length ? currentMatches.filter((match) => !currentMatches.some((other) => other.playerTwoId === match.playerOneId)).map((match) => <div key={match.id} className="rounded-2xl border border-border bg-card p-3"><div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"><div className="min-w-0 text-center text-sm font-medium leading-tight">{match.playerOneName}</div><div className="flex items-center gap-2"><input aria-label={`${match.playerOneName} score`} className="size-16 rounded-xl border-2 border-primary bg-background text-center text-3xl font-bold" inputMode="numeric" value={match.playerOneScore} onChange={(event) => void score(match.id, "one", event.target.value)} /><span className="text-xs text-muted-foreground">vs</span><input aria-label={`${match.playerTwoName} score`} className="size-16 rounded-xl border-2 border-primary bg-background text-center text-3xl font-bold" inputMode="numeric" value={match.playerTwoScore} onChange={(event) => void score(match.id, "two", event.target.value)} /></div><div className="min-w-0"><select aria-label={`Opponent for ${match.playerOneName}`} className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-center text-sm font-medium text-foreground" value={match.playerTwoId ?? (match.playerTwoName === "Opponent" ? "external" : "")} onChange={(event) => { const value = event.target.value; const member = eventMembers.find((item) => item.id === value); void assignOpponent(match.id, member?.id ?? null, member?.name ?? "Opponent") }}><option value="">Blank</option><option value="external">Opponent (not in app)</option>{eventMembers.filter((member) => member.id !== match.playerOneId).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div></div></div>) : <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No registered players were found for this event.</div>}</div>
    <Button className="w-full" disabled={!complete} onClick={nextRound}>{currentSession.currentRound < currentSession.roundCount ? `Start round ${currentSession.currentRound + 1}` : "Finish event"}</Button>
  </div>
}
