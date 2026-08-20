"use client"

import { useState, useTransition } from "react"
import { saveStandings } from "@/app/actions/standings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function StandingsReporter({ eventId, members }: { eventId: string; members: Array<{ id: string; name: string }> }) {
  const [entries, setEntries] = useState(() => Array.from({ length: 8 }, (_, index) => ({ placement: index + 1, memberId: "", playerName: "", deckName: "", decklistPathname: "", decklistFilename: "" })))
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  function update(index: number, key: "memberId" | "playerName" | "deckName" | "decklistPathname" | "decklistFilename", value: string) {
    setEntries((current) => current.map((entry, i) => i === index ? { ...entry, [key]: value, ...(key === "memberId" ? { playerName: members.find((member) => member.id === value)?.name ?? "" } : {}) } : entry))
  }
  async function upload(index: number, file?: File) {
    if (!file) return
    const form = new FormData(); form.set("file", file)
    const response = await fetch("/api/decklists/upload", { method: "POST", body: form })
    const result = await response.json()
    if (!response.ok) return setMessage(result.error ?? "Upload failed")
    setEntries((current) => current.map((entry, i) => i === index ? { ...entry, decklistPathname: result.pathname, decklistFilename: result.filename } : entry))
  }
  function submit() { startTransition(async () => { try { await saveStandings({ eventId, entries }); setMessage("Standings saved") } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save standings") } }) }
  return <div className="flex flex-col gap-3">
    {entries.map((entry, index) => <div key={entry.placement} className="grid gap-2 rounded-xl border border-border p-2.5 sm:grid-cols-[2.5rem_minmax(8rem,0.7fr)_minmax(0,1fr)_auto] sm:items-center">
      <span className="font-bold">#{entry.placement}</span>
      <select className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm" value={entry.memberId} onChange={(e) => update(index, "memberId", e.target.value)}><option value="">External player</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
      <Input className="h-9 max-w-40" placeholder="Player name" value={entry.playerName} onChange={(e) => update(index, "playerName", e.target.value)} />
      <Input className="h-9 min-w-0" placeholder="Deck name" value={entry.deckName} onChange={(e) => update(index, "deckName", e.target.value)} />
      <label className="cursor-pointer text-xs text-accent">{entry.decklistFilename ?? "Upload decklist"}<input className="sr-only" type="file" accept=".pdf,.txt,.csv" onChange={(e) => upload(index, e.target.files?.[0])} /></label>
    </div>)}
    <Button onClick={submit} disabled={pending}>{pending ? "Saving..." : "Save Top 8 standings"}</Button>{message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
  </div>
}
