"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setAdminAttendance } from "@/app/actions/events"

import { Badge } from "@/components/ui/badge"
import { capitalizeFirstName } from "@/lib/names"

type Person = { id: string; name: string }
type DateAttendance = { date: string; attending: Person[]; unavailable: Person[]; awaiting: Person[] }

export function EventAttendancePanel({ eventId, dates, selectedDate, isAdmin = false }: { eventId: string; dates: DateAttendance[]; selectedDate: string; isAdmin?: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const selected = dates.find((item) => item.date === selectedDate) ?? dates[0]
  if (!selected) return null

  return (
    <section className="flex flex-col gap-3">
      <div key={selected.date} className="grid animate-in gap-3 fade-in slide-in-from-bottom-1 duration-200 sm:grid-cols-3">
        <Group title="Attending" people={selected.attending} variant="default" duplicateNames={duplicateNames(selected)} isAdmin={isAdmin} pending={pending} onSetStatus={(userId, status) => startTransition(async () => { await setAdminAttendance(eventId, userId, selected.date, status); router.refresh() })} />
        <Group title="Unavailable" people={selected.unavailable} variant="outline" duplicateNames={duplicateNames(selected)} isAdmin={isAdmin} pending={pending} onSetStatus={(userId, status) => startTransition(async () => { await setAdminAttendance(eventId, userId, selected.date, status); router.refresh() })} />
        <Group title="Awaiting response" people={selected.awaiting} variant="secondary" duplicateNames={duplicateNames(selected)} isAdmin={isAdmin} pending={pending} onSetStatus={(userId, status) => startTransition(async () => { await setAdminAttendance(eventId, userId, selected.date, status); router.refresh() })} />
      </div>
    </section>
  )
}

function duplicateNames(selected: DateAttendance) {
  const counts = new Map<string, number>()
  for (const person of [...selected.attending, ...selected.unavailable, ...selected.awaiting]) {
    const key = person.name.trim().toLocaleLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name))
}

function displayName(name: string, duplicates: Set<string>) {
  const words = name.trim().split(/\s+/)
  const firstName = capitalizeFirstName(name)
  const key = name.trim().toLocaleLowerCase()
  if (!duplicates.has(key) || words.length < 2) return firstName
  return `${firstName} ${words[words.length - 1].charAt(0).toLocaleUpperCase()}.`
}

function Group({ title, people, variant, duplicateNames, isAdmin = false, pending = false, onSetStatus }: { title: string; people: Person[]; variant: "default" | "outline" | "secondary"; duplicateNames: Set<string>; isAdmin?: boolean; pending?: boolean; onSetStatus?: (userId: string, status: "available" | "unavailable") => void }) {
  return <div className="rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-2"><h3 className="font-medium">{title}</h3><Badge variant={variant}>{people.length}</Badge></div><ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">{people.length ? people.map((person) => <li key={person.id} className="flex items-center justify-between gap-2"><span>{displayName(person.name, duplicateNames)}</span>{isAdmin && onSetStatus ? <span className="flex shrink-0 gap-1"><Button type="button" size="icon" variant="outline" className="border-emerald-500/60 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400" aria-label={`Mark ${person.name} as attending`} title="Mark attending" disabled={pending} onClick={() => onSetStatus(person.id, "available")}><Check className="size-4" aria-hidden="true" /></Button><Button type="button" size="icon" variant="outline" className="border-red-500/60 text-red-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Mark ${person.name} as unavailable`} title="Mark unavailable" disabled={pending} onClick={() => onSetStatus(person.id, "unavailable")}><X className="size-4" aria-hidden="true" /></Button></span> : null}</li>) : <li>No members</li>}</ul></div>
}
