"use client"

import { useState } from "react"
import { Trash2, Upload } from "lucide-react"
import { deleteDecklist, deleteStandings } from "@/app/actions/standings"
import { Button } from "@/components/ui/button"

type Entry = { id: string; standingId: string; placement: number; memberId: string | null; playerName: string; deckName: string; decklistPathname: string | null; decklistFilename: string | null }

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
  async function upload(entryId: string, file?: File) {
    if (!file) return
    const form = new FormData(); form.set("file", file); form.set("entryId", entryId)
    const response = await fetch("/api/decklists/upload", { method: "POST", body: form })
    if (!response.ok) return
    const result = await response.json()
    setEntries((current) => current.map((entry) => entry.id === entryId ? { ...entry, decklistPathname: result.pathname, decklistFilename: result.filename } : entry))
  }
  if (!entries.length) return <p className="mt-4 text-sm text-muted-foreground">No standings reported yet.</p>
  const render = (entry: Entry) => <li key={entry.id} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3 text-sm"><strong>#{entry.placement} {entry.playerName}</strong><span className="text-muted-foreground">{entry.deckName}</span>{entry.decklistPathname ? <div className="flex items-center gap-2"><a className="text-accent hover:underline" href={`/api/decklists/file?pathname=${encodeURIComponent(entry.decklistPathname)}`}>Decklist: {entry.decklistFilename}</a>{entry.memberId === currentUserId ? <Button variant="ghost" size="sm" onClick={() => remove(entry.id)}><Trash2 data-icon="inline-start" />Delete</Button> : null}</div> : entry.memberId === currentUserId ? <label className="flex w-fit cursor-pointer items-center gap-1 text-accent hover:underline"><Upload data-icon="inline-start" />Upload decklist<input className="sr-only" type="file" accept=".pdf,.txt,.csv" onChange={(event) => upload(entry.id, event.target.files?.[0])} /></label> : null}</li>
  return <div className="flex flex-col gap-3"><div className="flex justify-end">{isAdmin ? <Button variant="destructive" size="sm" onClick={removeStandings}><Trash2 data-icon="inline-start" />Delete standings</Button> : null}</div><div className="grid gap-3 sm:grid-cols-2"><ol className="flex flex-col gap-2">{entries.filter((entry) => entry.placement <= 4).map(render)}</ol><ol className="flex flex-col gap-2">{entries.filter((entry) => entry.placement >= 5).map(render)}</ol></div></div>
}
