"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { createEvent, updateEvent } from "@/app/actions/events"

export type EventEditData = {
  id: string
  format: string
  eventType: string
  title: string
  description: string | null
  location: string | null
  eventUrl: string | null
  travelDetails: string | null
  startDate: string
  endDate: string | null
  startTime: string | null
  recurrenceType?: string | null
  recurrenceWeekday?: number | null
  recurrenceOrdinal?: string | null
}

export function CreateEventDialog({
  event,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
  initialStartDate,
  initialEndDate,
}: {
  event?: EventEditData
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
  initialStartDate?: string
  initialEndDate?: string
}) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [pending, setPending] = useState(false)
  const [multiDay, setMultiDay] = useState(Boolean(event?.endDate && event.endDate !== event.startDate) || Boolean(initialEndDate && initialEndDate !== initialStartDate))
  const [startTime, setStartTime] = useState(event?.startTime ?? "00:00")
  const [eventType, setEventType] = useState(event?.eventType === "training" ? "practice" : event?.eventType ?? "")
  const [recurrenceType, setRecurrenceType] = useState(event?.recurrenceType ?? "none")
  const [recurrenceWeekday, setRecurrenceWeekday] = useState(String(event?.recurrenceWeekday ?? new Date().getDay()))

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = {
      formats: form.getAll("format").map(String),
      eventType: String(form.get("eventType") ?? ""),
      eventTypeDetail: String(form.get("eventTypeDetail") ?? ""),
      description: String(form.get("description") ?? ""),
      location: String(form.get("location") ?? ""),
      eventUrl: String(form.get("eventUrl") ?? ""),
      travelDetails: String(form.get("travelDetails") ?? ""),
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? ""),
      startTime: String(form.get("startTime") ?? ""),
      recurrenceType: String(form.get("recurrenceType") ?? "none") as "none" | "weekly" | "monthly",
      recurrenceWeekday: Number(form.get("recurrenceWeekday") ?? 0),
      recurrenceOrdinal: String(form.get("recurrenceOrdinal") ?? "last") as "first" | "second" | "third" | "fourth" | "last",
    }
    setPending(true)
    try {
      const id = event?.id
      const result = id ? await updateEvent(id, payload) : await createEvent(payload)
      toast.success(event ? "Event updated" : "Event created")
      setOpen(false)
      if (!event && "id" in result) router.push(`/events/${result.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create event")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <DialogTrigger render={<Button className="gap-2" />}>
          <Plus className="size-4" />
          {event ? "Edit event" : "New event"}
        </DialogTrigger>
      ) : null}
      <DialogContent className="flex max-h-[90vh] min-w-0 flex-col overflow-x-hidden overflow-y-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{event ? "Edit event" : "Create an event"}</DialogTitle>
          <DialogDescription>
            Choose a confirmed date for the event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-h-0 min-w-0 space-y-4 overflow-x-hidden overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <fieldset className="grid gap-2 sm:grid-cols-2" aria-describedby="format-hint">
              <legend className="sr-only">Select one or more formats</legend>
              {[
                "Standard",
                "Pioneer",
                "Modern",
                "Legacy",
                "Limited",
                "Commander",
              ].map((format) => (
                <label
                  key={format}
                  className="flex min-h-11 items-center gap-3 rounded-md border border-input px-3 text-sm text-foreground transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                >
                  <input
                    type="checkbox"
                    name="format"
                    value={format}
                    defaultChecked={event?.format.split("/").includes(format)}
                    className="size-4 accent-primary"
                  />
                  {format}
                </label>
              ))}
            </fieldset>
            <p id="format-hint" className="text-xs text-muted-foreground">
              Select one or more formats. Multiple formats are joined with a slash.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventType">Event type</Label>
            <Select
              name="eventType"
              required
              value={eventType}
              onValueChange={(value) => setEventType(value ?? "")}
            >
              <SelectTrigger id="eventType" className="h-10 w-full">
                {eventType ? (
                  <span className="flex flex-1 text-left">
                    {{
                      practice: "Practice",
                      weekly: "Weekly",
                      "store-championship": "Store Championship",
                      rcq: "RC Qualifier",
                      regional: "Regional Championship",
                      "pro-tour": "PT",
                      other: "Other",
                    }[eventType] ?? "select event"}
                  </span>
                ) : (
                  <SelectValue
                    placeholder="select event"
                    className="text-muted-foreground"
                  />
                )}
              </SelectTrigger>
              <SelectContent side="bottom" align="start" sideOffset={4}>
                <SelectItem value="practice">Practice</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="store-championship">Store Championship</SelectItem>
                <SelectItem value="rcq">RC Qualifier</SelectItem>
                <SelectItem value="regional">Regional Championship</SelectItem>
                <SelectItem value="pro-tour">PT</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {eventType === "other" && (
              <div className="space-y-2">
                <Label htmlFor="eventTypeDetail">Event type name</Label>
                <Input
                  id="eventTypeDetail"
                  name="eventTypeDetail"
                  placeholder="Qualifier, meetup, league night…"
                  required
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" placeholder="Miami, FL" defaultValue={event?.location ?? ""} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={event?.startDate ?? initialStartDate ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                value={multiDay ? "" : startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={multiDay}
                aria-describedby={multiDay ? "start-time-hint" : undefined}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={multiDay}
                onChange={(e) => {
                  const checked = e.target.checked
                  setMultiDay(checked)
                  if (checked) setStartTime("")
                }}
                className="size-4 rounded border-input accent-primary"
              />
              This event spans multiple days
            </label>
            {multiDay ? <p id="start-time-hint" className="text-xs text-muted-foreground">Start time is disabled for multi-day events.</p> : null}
            {multiDay && (
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={event?.endDate ?? initialEndDate ?? ""} />
              </div>
            )}
          </div>
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <input type="hidden" name="recurrenceType" value={recurrenceType} />
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="recurrenceToggle">This is a repeated event</Label>
              <Switch
                id="recurrenceToggle"
                checked={recurrenceType !== "none"}
                onCheckedChange={(checked) => setRecurrenceType(checked ? "weekly" : "none")}
              />
            </div>
            {recurrenceType !== "none" ? (
              <Select value={recurrenceType} onValueChange={(value) => setRecurrenceType(value ?? "weekly")}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Every week</SelectItem>
                  <SelectItem value="monthly">Every month</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            {recurrenceType !== "none" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="recurrenceWeekday">On</Label>
                  <Select name="recurrenceWeekday" value={recurrenceWeekday} onValueChange={(value) => setRecurrenceWeekday(value ?? "0")}>
                    <SelectTrigger id="recurrenceWeekday" className="h-10 w-full">
                      <span>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(recurrenceWeekday)]}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => (
                        <SelectItem key={day} value={String(index)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {recurrenceType === "monthly" ? (
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceOrdinal">Occurrence</Label>
                    <Select name="recurrenceOrdinal" defaultValue={event?.recurrenceOrdinal ?? "last"}>
                      <SelectTrigger id="recurrenceOrdinal" className="h-10 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first">First</SelectItem>
                        <SelectItem value="second">Second</SelectItem>
                        <SelectItem value="third">Third</SelectItem>
                        <SelectItem value="fourth">Fourth</SelectItem>
                        <SelectItem value="last">Last</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventUrl">Official event link (optional)</Label>
            <Input
              id="eventUrl"
              name="eventUrl"
              type="url"
              placeholder="https://…"
              defaultValue={event?.eventUrl ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Event details (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Format, entry, decklists, qualification, or practice goals…"
              rows={3}
              className="h-24 resize-none overflow-y-auto"
              defaultValue={event?.description ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="travelDetails">Travel notes (optional)</Label>
            <Textarea
              id="travelDetails"
              name="travelDetails"
              placeholder="Flights, hotel, carpool, meetup point…"
              rows={2}
              className="h-24 resize-none overflow-y-auto"
              defaultValue={event?.travelDetails ?? ""}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {event ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
