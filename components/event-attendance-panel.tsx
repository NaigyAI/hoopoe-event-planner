"use client"

import { Badge } from "@/components/ui/badge"
import { capitalizeFirstName } from "@/lib/names"

type Person = { id: string; name: string }
type DateAttendance = { date: string; attending: Person[]; unavailable: Person[]; awaiting: Person[] }

export function EventAttendancePanel({ dates, selectedDate }: { dates: DateAttendance[]; selectedDate: string }) {
  const selected = dates.find((item) => item.date === selectedDate) ?? dates[0]
  if (!selected) return null

  return (
    <section className="flex flex-col gap-3">
      <div key={selected.date} className="grid animate-in gap-3 fade-in slide-in-from-bottom-1 duration-200 sm:grid-cols-3">
        <Group title="Attending" people={selected.attending} variant="default" duplicateNames={duplicateNames(selected)} />
        <Group title="Unavailable" people={selected.unavailable} variant="outline" duplicateNames={duplicateNames(selected)} />
        <Group title="Awaiting response" people={selected.awaiting} variant="secondary" duplicateNames={duplicateNames(selected)} />
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

function Group({ title, people, variant, duplicateNames }: { title: string; people: Person[]; variant: "default" | "outline" | "secondary"; duplicateNames: Set<string> }) {
  return <div className="rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-2"><h3 className="font-medium">{title}</h3><Badge variant={variant}>{people.length}</Badge></div><ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">{people.length ? people.map((person) => <li key={person.id}>{displayName(person.name, duplicateNames)}</li>) : <li>No members</li>}</ul></div>
}
