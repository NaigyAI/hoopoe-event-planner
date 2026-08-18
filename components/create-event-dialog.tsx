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
}

export function CreateEventDialog({
  event,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: {
  event?: EventEditData
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [pending, setPending] = useState(false)
  const [multiDay, setMultiDay] = useState(Boolean(event?.endDate && event.endDate !== event.startDate))
  const [eventType, setEventType] = useState(event?.eventType === "training" ? "practice" : event?.eventType ?? "")

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
    }
    setPending(true)
    try {
      const id = event?.id
      if (id) await updateEvent(id, payload)
      else await createEvent(payload)
      toast.success(event ? "Event updated" : "Event created")
      setOpen(false)
      if (!event) router.push(`/events/${id}`)
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">{event ? "Edit event" : "Create an event"}</DialogTitle>
          <DialogDescription>
            Choose a confirmed date for the event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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
                      rcq: "RCQ",
                      regional: "RC",
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
                <SelectItem value="rcq">RCQ</SelectItem>
                <SelectItem value="regional">RC</SelectItem>
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
              <Input id="startDate" name="startDate" type="date" defaultValue={event?.startDate ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input id="startTime" name="startTime" type="time" defaultValue={event?.startTime ?? "00:00"} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={multiDay}
                onChange={(e) => setMultiDay(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              This event spans multiple days
            </label>
            {multiDay && (
              <div className="space-y-2">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={event?.endDate ?? ""} />
              </div>
            )}
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
