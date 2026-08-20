"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { deleteDecklist, deleteStandings, saveDecklistUrl } from "@/app/actions/standings"
import { Button } from "@/components/ui/button"

type Entry = { id: string; standingId: string; placement: number; memberId: string | null; playerName: string; deckName: string; decklistPathname: string | null; decklistFilename: string | null; decklistUrl: string | null }

export function PastEventStandings({ rows, currentUserId, isAdmin }: { rows: Entry[]; currentUserId: string; isAdmin: boolean }) {
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
  const render = (entry: Entry) => {
    const canManage = entry.memberId === currentUserId || isAdmin

    return (
      <li key={entry.id} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 text-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="min-w-0">
            <strong className="block truncate">#{entry.placement} {entry.playerName}</strong>
            <span className="block text-muted-foreground">{entry.deckName}</span>
          </div>
          {entry.decklistUrl ? (
            <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
              <a className="text-accent hover:underline" href={entry.decklistUrl} target="_blank" rel="noreferrer">
                View decklist
              </a>
              {canManage ? (
                <Button
                  variant="destructive"
                  size="icon-sm"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => remove(entry.id)}
                  aria-label={`Delete decklist for ${entry.playerName}`}
                  title="Delete decklist"
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          ) : canManage ? (
            <form
              className="ml-auto flex min-w-0 flex-col items-stretch gap-1 sm:flex-row sm:items-center"
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
    </div>
  )
}
