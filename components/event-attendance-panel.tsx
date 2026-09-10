"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Check, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { resetAdminAttendance, setAdminAttendance } from "@/app/actions/events"

import { Badge } from "@/components/ui/badge"
import { capitalizeFirstName } from "@/lib/names"

type Person = { id: string; name: string }
type DateAttendance = { date: string; attending: Person[]; maybe: Person[]; unavailable: Person[]; awaiting: Person[] }

export function EventAttendancePanel({ eventId, dates, selectedDate, isAdmin = false }: { eventId: string; dates: DateAttendance[]; selectedDate: string; isAdmin?: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const selected = dates.find((item) => item.date === selectedDate) ?? dates[0]
  if (!selected) return null

  return (
    <section className="flex flex-col gap-3">
      <div key={selected.date} className="grid animate-in gap-3 fade-in slide-in-from-bottom-1 duration-200 sm:grid-cols-3">
        <Group title="Attending" people={[...selected.attending, ...selected.maybe]} maybeStart={selected.attending.length} variant="default" duplicateNames={duplicateNames(selected)} isAdmin={isAdmin} pending={pending} onReset={(userId) => startTransition(async () => { try { await resetAdminAttendance(eventId, userId, selected.date); router.refresh(); toast.success("Attendee removed") } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to remove attendee") } })} />
        <Group title="Unavailable" people={selected.unavailable} variant="outline" duplicateNames={duplicateNames(selected)} isAdmin={isAdmin} pending={pending} onReset={(userId) => startTransition(async () => { try { await resetAdminAttendance(eventId, userId, selected.date); router.refresh(); toast.success("Attendee removed") } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to remove attendee") } })} />
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

function Group({ title, people, maybeStart, variant, duplicateNames, isAdmin = false, pending = false, onReset, onSetStatus }: { title: string; people: Person[]; maybeStart?: number; variant: "default" | "outline" | "secondary"; duplicateNames: Set<string>; isAdmin?: boolean; pending?: boolean; onReset?: (userId: string) => void; onSetStatus?: (userId: string, status: "available" | "maybe" | "unavailable") => void }) {
  return <div className="rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-2"><h3 className="font-medium">{title}</h3><Badge variant={variant}>{people.length}</Badge></div><ul className="mt-2 flex min-w-0 flex-col gap-1 text-sm text-muted-foreground">{people.length ? people.map((person) => <li key={person.id} className="flex min-w-0 items-start justify-between gap-2"><span className="flex min-w-0 items-center gap-2 break-words">{displayName(person.name, duplicateNames)}{maybeStart !== undefined && people.indexOf(person) >= maybeStart ? <Badge variant="secondary" className="shrink-0 border-amber-500/40 bg-amber-500/15 text-amber-400 text-xs">Maybe</Badge> : null}</span>{isAdmin && onSetStatus ? <span className="flex shrink-0 gap-1"><Button type="button" size="icon" variant="ghost" className="size-6 border border-emerald-500/60 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400" aria-label={`Mark ${person.name} as attending`} title="Mark attending" disabled={pending} onClick={() => onSetStatus(person.id, "available")}><Check className="size-4" aria-hidden="true" /></Button><Button type="button" size="icon" variant="ghost" className="size-6 border border-amber-500/60 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400" aria-label={`Mark ${person.name} as maybe`} title="Mark maybe" disabled={pending} onClick={() => onSetStatus(person.id, "maybe")}><span className="text-sm font-medium">~</span></Button><Button type="button" size="icon" variant="ghost" className="size-6 border border-red-500/60 text-red-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Mark ${person.name} as unavailable`} title="Mark unavailable" disabled={pending} onClick={() => onSetStatus(person.id, "unavailable")}><X className="size-4" aria-hidden="true" /></Button></span> : isAdmin && onReset ? <Button type="button" size="icon" variant="ghost" className="size-6 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground" aria-label={`Move ${person.name} to awaiting response`} title="Move to awaiting response" disabled={pending} onClick={() => onReset(person.id)}
        onPointerDown={(event) => event.stopPropagation()}><X className="size-4" aria-hidden="true" /></Button> : null}</li>) : <li>No members</li>}</ul></div>
}
