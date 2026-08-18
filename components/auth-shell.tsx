import type React from "react"
import { CalendarCheck } from "lucide-react"

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/15">
            <CalendarCheck className="size-4.5" />
          </div>
          <span className="text-lg tracking-tight">RCQ Planner</span>
        </div>

        <div className="max-w-md">
          <p className="text-2xl font-semibold leading-snug tracking-tight text-balance">
            Stop the back-and-forth. See everyone’s availability on one grid and
            lock in the day that works.
          </p>
          <MiniHeatmap />
        </div>

        <p className="text-sm text-primary-foreground/70">
          Create an event, gather votes, pick the winning date.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        {children}
      </div>
    </div>
  )
}

function MiniHeatmap() {
  // Static decorative preview of the availability heatmap concept.
  const rows = [
    [3, 4, 5, 2, 1],
    [2, 5, 5, 4, 2],
    [1, 3, 4, 5, 3],
  ]
  const shade = (v: number) => {
    const opacities = ["/10", "/25", "/40", "/60", "/85"]
    return `bg-primary-foreground${opacities[v - 1] ?? "/10"}`
  }
  return (
    <div className="mt-8 inline-grid grid-cols-5 gap-1.5 rounded-xl bg-primary-foreground/5 p-3">
      {rows.flatMap((row, ri) =>
        row.map((v, ci) => (
          <div
            key={`${ri}-${ci}`}
            className={`size-8 rounded-md ${shade(v)}`}
            aria-hidden="true"
          />
        )),
      )}
    </div>
  )
}
