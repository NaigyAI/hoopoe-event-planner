import { CalendarX } from "lucide-react"

export default function JoinNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarX className="size-6" />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Link not found</h1>
        <p className="max-w-sm text-pretty text-sm text-muted-foreground">
          This event link is invalid or has been removed. Ask the organizer for
          an up-to-date link.
        </p>
      </div>
    </main>
  )
}
