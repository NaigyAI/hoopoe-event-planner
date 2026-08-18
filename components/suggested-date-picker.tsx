"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarCheck, Loader2 } from "lucide-react"
import { confirmEventDate } from "@/app/actions/events"
import { formatFullDate } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type SuggestedDate = { date: string; available: number; maybe: number; unavailable: number; score: number }

export function SuggestedDatePicker({ eventId, suggestions }: { eventId: string; suggestions: SuggestedDate[] }) {
  const router = useRouter()
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  if (!suggestions.length) return null
  function choose(date: string) {
    setPendingDate(date)
    startTransition(async () => {
      try {
        await confirmEventDate(eventId, date)
        toast.success("Event date confirmed")
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not confirm date")
      } finally {
        setPendingDate(null)
      }
    })
  }
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <CalendarCheck className="mt-0.5 size-5 text-primary" />
        <div>
          <h2 className="font-medium">Suggested dates</h2>
          <p className="text-sm text-muted-foreground">Choose the date with the best team availability.</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {suggestions.slice(0, 3).map((suggestion) => (
          <Button key={suggestion.date} variant="outline" className="h-auto justify-between gap-3 py-3 text-left" onClick={() => choose(suggestion.date)} disabled={isPending}>
            <span>
              <span className="block font-medium">{formatFullDate(suggestion.date)}</span>
              <span className="block text-xs text-muted-foreground">{suggestion.available} available · {suggestion.maybe} maybe</span>
            </span>
            {pendingDate === suggestion.date && isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          </Button>
        ))}
      </div>
    </section>
  )
}
