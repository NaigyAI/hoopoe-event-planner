"use client"

import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PersonalAvailabilityCalendar } from "@/components/personal-availability-calendar"
import type { PersonalAvailabilityStatus } from "@/app/actions/personal-availability"

export function PersonalAvailabilityDialog({ initialStatuses }: { initialStatuses: Record<string, PersonalAvailabilityStatus> }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-2" />
        }
      >
        <CalendarDays className="size-4" />
        <span>+ Date availability</span>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Your dates</DialogTitle>
          <DialogDescription>Mark the dates you are available or unavailable for future team plans.</DialogDescription>
        </DialogHeader>
        <PersonalAvailabilityCalendar initialStatuses={initialStatuses} />
      </DialogContent>
    </Dialog>
  )
}
