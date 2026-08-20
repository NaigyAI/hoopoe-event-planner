"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveStandings } from "@/app/actions/standings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function StandingsReporter({ eventId, members }: { eventId: string; members: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const [entries, setEntries] = useState(() => Array.from({ length: 8 }, (_, index) => ({ placement: index + 1, memberId: "", playerName: "", deckName: "", decklistPathname: "", decklistFilename: "" })))
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  function update(index: number, key: "memberId" | "playerName" | "deckName" | "decklistPathname" | "decklistFilename", value: string) {
    setEntries((current) => current.map((entry, i) => i === index ? { ...entry, [key]: value, ...(key === "memberId" ? { playerName: members.find((member) => member.id === value)?.name ?? "" } : {}) } : entry))
  }
  function submit() { startTransition(async () => { try { await saveStandings({ eventId, entries }); router.push("/report-standings?saved=1") } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save standings") } }) }
  return <div className="flex max-w-3xl flex-col gap-3">
    <div className="grid gap-2 md:grid-cols-2">
      {[entries.slice(0, 4), entries.slice(4)].map((group, groupIndex) => <div key={groupIndex} className="flex flex-col gap-2">
        {group.map((entry, index) => {
          const entryIndex = groupIndex * 4 + index
          return <div key={entry.placement} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-lg border border-border p-2">
            <span className="row-span-2 self-center text-sm font-bold text-muted-foreground">#{entry.placement}</span>
            <select aria-label={`Player ${entry.placement}`} className="h-8 min-w-0 rounded-md border border-input bg-background px-2 text-sm" value={entry.memberId} onChange={(e) => update(entryIndex, "memberId", e.target.value)}><option value="">External player</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <Input className="h-8 min-w-0 px-2 text-sm" placeholder="Player name" value={entry.playerName} onChange={(e) => update(entryIndex, "playerName", e.target.value)} />
              <Input className="h-8 min-w-0 px-2 text-sm" placeholder="Deck name" value={entry.deckName} onChange={(e) => update(entryIndex, "deckName", e.target.value)} />
            </div>
          </div>
        })}
      </div>)}
    </div>
    <Button className="self-start" onClick={submit} disabled={pending}>{pending ? "Saving..." : "Save Top 8 standings"}</Button>{message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
  </div>
}
