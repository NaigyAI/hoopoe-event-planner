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
import { createEvent } from "@/app/actions/events"

export function CreateEventDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = {
      format: String(form.get("format") ?? ""),
      eventType: String(form.get("eventType") ?? ""),
      description: String(form.get("description") ?? ""),
      location: String(form.get("location") ?? ""),
      eventUrl: String(form.get("eventUrl") ?? ""),
      travelDetails: String(form.get("travelDetails") ?? ""),
      startDate: String(form.get("startDate") ?? ""),
      endDate: String(form.get("endDate") ?? ""),
      startTime: String(form.get("startTime") ?? ""),
      endTime: String(form.get("endTime") ?? ""),
    }
    setPending(true)
    try {
      const { id } = await createEvent(payload)
      toast.success("Event created")
      setOpen(false)
      router.push(`/events/${id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create event")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" />
        New event
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create an event</DialogTitle>
          <DialogDescription>
            Set a date range for the team to mark their availability.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select name="format" required>
                <SelectTrigger id="format" className="h-10 w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Pioneer">Pioneer</SelectItem>
                  <SelectItem value="Modern">Modern</SelectItem>
                  <SelectItem value="Legacy">Legacy</SelectItem>
                  <SelectItem value="Limited">Limited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
            <Label htmlFor="eventType">Event type</Label>
            <Select name="eventType" required>
              <SelectTrigger id="eventType" className="h-10 w-full">
                <SelectValue
                  placeholder="Select event"
                  className="text-muted-foreground"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="training">Training session</SelectItem>
                <SelectItem value="rcq">RCQ</SelectItem>
                <SelectItem value="regional">RC</SelectItem>
                <SelectItem value="pro-tour">PT</SelectItem>
                <SelectItem value="other">Other team event</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" placeholder="Miami, FL" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date (optional)</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start time (optional)</Label>
              <Input id="startTime" name="startTime" type="time" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End time (optional)</Label>
              <Input id="endTime" name="endTime" type="time" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventUrl">Official event link (optional)</Label>
            <Input
              id="eventUrl"
              name="eventUrl"
              type="url"
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Event details (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Format, entry, decklists, qualification, or training goals…"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="travelDetails">Travel notes (optional)</Label>
            <Textarea
              id="travelDetails"
              name="travelDetails"
              placeholder="Flights, hotel, carpool, meetup point…"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
