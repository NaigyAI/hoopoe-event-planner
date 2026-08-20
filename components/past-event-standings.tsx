"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { deleteDecklist, deleteStandings, saveDecklistUrl } from "@/app/actions/standings"
import { capitalizeName } from "@/lib/names"
import { Button } from "@/components/ui/button"

type Entry = { id: string; standingId: string; placement: number; memberId: string | null; playerName: string; deckName: string; decklistPathname: string | null; decklistFilename: string | null; decklistUrl: string | null }
type ScoreRow = { roundNumber: number; playerOneName: string; playerTwoName: string; playerOneScore: number; playerTwoScore: number }

export function PastEventStandings({ rows, currentUserId, isAdmin, scores = [] }: { rows: Entry[]; currentUserId: string; isAdmin: boolean; scores?: ScoreRow[] }) {
  const [entries, setEntries] = useState(rows)
  async function remove(entryId: string) {
    await deleteDecklist(entryId)
    setEntries((current) => current.map((entry) => entry.id === entryId ? { ...entry, decklistPathname: null, decklistFilename: null, decklistUrl: null } : entry))
  }
  async function removeStandings() {
    await deleteStandings(entries[0].standingId)
    setEntries([])
  }
  async function saveUrl(entryId: string, value: string) {
    const url = await saveDecklistUrl(entryId, value)
    setEntries((current) => current.map((entry) => entry.id === entryId ? { ...entry, decklistUrl: url } : entry))
  }
  if (!entries.length) return <p className="mt-4 text-sm text-muted-foreground">No standings reported yet.</p>
  const records = new Map<string, { wins: number; losses: number; draws: number }>()
  for (const score of scores) {
    if (!score.playerTwoName.trim()) continue
    const first = records.get(score.playerOneName) ?? { wins: 0, losses: 0, draws: 0 }
    const second = records.get(score.playerTwoName) ?? { wins: 0, losses: 0, draws: 0 }
    if (score.playerOneScore > score.playerTwoScore) { first.wins += 1; second.losses += 1 }
    else if (score.playerTwoScore > score.playerOneScore) { second.wins += 1; first.losses += 1 }
    else { first.draws += 1; second.draws += 1 }
    records.set(score.playerOneName, first)
    records.set(score.playerTwoName, second)
  }
  const recordFor = (name: string) => {
    const record = records.get(name)
    return record ? ` ${record.wins}-${record.losses}-${record.draws}` : ""
  }
  const render = (entry: Entry) => {
    const canManage = entry.memberId === currentUserId || isAdmin

    return (
      <li key={entry.id} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 text-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="min-w-0">
            <strong className="block truncate">#{entry.placement} {capitalizeName(entry.playerName)}{recordFor(entry.playerName) ? <span className="ml-1 font-mono text-muted-foreground">{recordFor(entry.playerName)}</span> : null}</strong>
            <span className="block text-muted-foreground">{entry.deckName}</span>
            {!entry.decklistUrl && canManage ? (
              <form
                className="mt-2 flex min-w-0 flex-col items-stretch gap-1 sm:flex-row sm:items-center"
                action={(formData) => { void saveUrl(entry.id, String(formData.get("decklistUrl") ?? "")) }}
              >
                <input
                  name="decklistUrl"
                  type="url"
                  required
                  placeholder="Add decklist link"
                  aria-label="External decklist link"
                  className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-44"
                />
                <Button type="submit" variant="outline" size="sm" className="shrink-0 border-accent bg-accent text-primary-foreground hover:bg-accent/90 hover:text-primary-foreground">
                  Save link
                </Button>
              </form>
            ) : null}
          </div>
          {entry.decklistUrl ? (
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <a className="text-accent hover:underline" href={entry.decklistUrl} target="_blank" rel="noreferrer">
                View decklist
              </a>
              {canManage ? (
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => remove(entry.id)}
                  aria-label={`Delete decklist for ${entry.playerName}`}
                  title="Delete decklist"
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </li>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        {isAdmin ? (
          <Button variant="destructive" size="sm" onClick={removeStandings}>
            <Trash2 data-icon="inline-start" />
            Delete standings
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ol className="flex flex-col gap-2">{entries.filter((entry) => entry.placement <= 4).map(render)}</ol>
        <ol className="flex flex-col gap-2">{entries.filter((entry) => entry.placement >= 5).map(render)}</ol>
      </div>
      {scores.length ? <details className="mt-4 rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-medium text-accent">Show match scores</summary><div className="mt-3 space-y-2">{scores.map((score, index) => <div key={`${score.roundNumber}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm"><span className="text-xs font-medium text-muted-foreground">R{score.roundNumber}</span><span className="min-w-0 flex-1 truncate text-right">{score.playerOneName}</span><strong className="shrink-0 rounded-md bg-background px-2 py-1">{score.playerOneScore}–{score.playerTwoScore}</strong><span className="min-w-0 flex-1 truncate">{score.playerTwoName || "Opponent"}</span></div>)}</div></details> : null}
    </div>
  )
}
