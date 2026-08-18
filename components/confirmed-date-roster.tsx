import { Check, HelpCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatFullDate } from "@/lib/dates"

export function ConfirmedDateRoster({ date, people }: { date: string; people: { name: string; status: string }[] }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="font-medium">Team availability</h2>
        <p className="text-sm text-muted-foreground">Availability for {formatFullDate(date)}.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {people.map((person) => {
          const available = person.status === "available"
          const maybe = person.status === "maybe"
          const Icon = available ? Check : maybe ? HelpCircle : X
          return (
            <div key={person.name} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span>{person.name}</span>
              <span className={cn("flex items-center gap-1 text-xs font-medium", available ? "text-available-foreground" : maybe ? "text-maybe-foreground" : "text-unavailable-foreground")}>
                <Icon className="size-3.5" />
                {available ? "Available" : maybe ? "Maybe" : "Unavailable"}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
