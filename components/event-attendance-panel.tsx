"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"

type Person = { id: string; name: string }
type DateAttendance = { date: string; attending: Person[]; unavailable: Person[]; awaiting: Person[] }

export function EventAttendancePanel({ dates }: { dates: DateAttendance[] }) {
  const [selectedDate, setSelectedDate] = useState(dates[0]?.date ?? "")
  const selected = dates.find((item) => item.date === selectedDate) ?? dates[0]
  if (!selected) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {dates.map((item) => (
          <button key={item.date} type="button" onClick={() => setSelectedDate(item.date)} className={`rounded-md border px-3 py-2 text-sm transition-colors ${item.date === selected.date ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background hover:bg-muted"}`}>
            {item.date}
          </button>
        ))}
      </div>
      <div key={selected.date} className="grid animate-in gap-3 fade-in slide-in-from-bottom-1 duration-200 sm:grid-cols-3">
        <Group title="Attending" people={selected.attending} variant="default" />
        <Group title="Unavailable" people={selected.unavailable} variant="outline" />
        <Group title="Awaiting response" people={selected.awaiting} variant="secondary" />
      </div>
    </section>
  )
}

function Group({ title, people, variant }: { title: string; people: Person[]; variant: "default" | "outline" | "secondary" }) {
  return <div className="rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-2"><h3 className="font-medium">{title}</h3><Badge variant={variant}>{people.length}</Badge></div><ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">{people.length ? people.map((person) => <li key={person.id}>{person.name}</li>) : <li>No members</li>}</ul></div>
}
