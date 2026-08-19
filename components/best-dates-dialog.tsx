"use client"

import { useState, useTransition } from "react"
import { Search, Loader2 } from "lucide-react"
import { findBestAvailabilityDates } from "@/app/actions/personal-availability"
import { formatFullDate, toISODate } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreateEventDialog } from "@/components/create-event-dialog"

type Result = { date: string; available: number; maybe: number; unavailable: number; total: number }
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function BestDatesDialog() {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState(toISODate(new Date()))
  const [endDate, setEndDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 60); return toISODate(d) })
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [results, setResults] = useState<Result[]>([])
  const [pending, startTransition] = useTransition()

  function search() {
    startTransition(async () => {
      const rows = await findBestAvailabilityDates(startDate, endDate)
      setResults(rows.filter((row) => selectedDays.includes(new Date(`${row.date}T12:00:00`).getDay())).slice(0, 10))
    })
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<Button variant="outline" />}>
      <Search className="mr-2 size-4" />
      Find best dates
    </DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Find best dates</DialogTitle>
        <DialogDescription>Rank dates by how many approved team members are available.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="best-start">From</Label><Input id="best-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="best-end">Through</Label><Input id="best-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
      </div>
      <div className="grid gap-2">
        <Label>Weekdays</Label>
        <div className="flex flex-wrap gap-2">
          {weekdays.map((day, index) => <button key={day} type="button" aria-pressed={selectedDays.includes(index)} onClick={() => setSelectedDays((days) => days.includes(index) ? days.filter((value) => value !== index) : [...days, index])} className={`rounded-lg border px-3 py-2 text-sm ${selectedDays.includes(index) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{day}</button>)}
        </div>
      </div>
      <Button onClick={search} disabled={pending || selectedDays.length === 0}>{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Search availability</Button>
      <div className="grid gap-2">
        {results.length ? results.map((result) => <div key={result.date} className="flex items-center justify-between gap-4 rounded-xl border border-border p-3"><div><p className="font-medium text-foreground">{formatFullDate(result.date)}</p><p className="text-xs text-muted-foreground">{result.available} available · {result.maybe} maybe · {result.unavailable} unavailable</p></div><CreateEventDialog initialStartDate={result.date} /></div>) : <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Search to see the strongest dates.</p>}
      </div>
      <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Close</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
