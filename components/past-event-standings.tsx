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
    setEntries((current) => current.map((entry) => entry.id === entryId ? { ...entry, decklistPathname: null, decklistFilename: null } : entry))
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
  const render = (entry: Entry) => <li key={entry.id} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 text-sm"><div className="flex items-center gap-2"><strong className="min-w-0 truncate">#{entry.placement} {entry.playerName}</strong>{entry.decklistUrl ? <div className="ml-auto flex shrink-0 items-center gap-1"><a className="text-accent hover:underline" href={entry.decklistUrl} target="_blank" rel="noreferrer">View decklist</a>{entry.memberId === currentUserId || isAdmin ? <Button variant="ghost" size="sm" onClick={() => remove(entry.id)}><Trash2 data-icon="inline-start" />Delete</Button> : null}</div> : entry.memberId === currentUserId || isAdmin ? <form className="ml-auto flex shrink-0 items-center gap-1" action={(formData) => { void saveUrl(entry.id, String(formData.get("decklistUrl") ?? "")) }}><input name="decklistUrl" type="url" required placeholder="Add decklist link" className="h-8 w-44 rounded-md border border-input bg-background px-2 text-sm" /><Button type="submit" variant="ghost" size="sm">Save link</Button></form> : null}</div><span className="text-muted-foreground">{entry.deckName}</span></li>
  return <div className="flex flex-col gap-3"><div className="flex justify-end">{isAdmin ? <Button variant="destructive" size="sm" onClick={removeStandings}><Trash2 data-icon="inline-start" />Delete standings</Button> : null}</div><div className="grid gap-3 sm:grid-cols-2"><ol className="flex flex-col gap-2">{entries.filter((entry) => entry.placement <= 4).map(render)}</ol><ol className="flex flex-col gap-2">{entries.filter((entry) => entry.placement >= 5).map(render)}</ol></div></div>
}
