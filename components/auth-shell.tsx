import type React from "react"
import { CalendarCheck } from "lucide-react"

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden grid-rows-[auto_1fr_auto] overflow-hidden bg-primary p-10 text-primary-foreground lg:grid">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/15">
            <CalendarCheck className="size-4" />
          </div>
          <span className="text-lg tracking-tight">Hoopoe Event Planner</span>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-col justify-center text-center">
          <div className="mx-auto mb-8 w-full max-w-[260px]">
            <img
              src="/favicon-hoopoe.png"
              alt="Hoopoe Event Planner"
              className="h-auto w-full object-contain pt-[35px] text-center"
            />
          </div>
          <p className="text-2xl font-semibold leading-snug tracking-tight text-balance">
            Stop holding priority on your plans. Pull up the grid, see who&apos;s
            untapped, and lock in the day.
          </p>
        </div>

        <p className="text-center text-sm text-primary-foreground/70">
          Create an event, see who&apos;s available, pick the winning date.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        {children}
      </div>
    </div>
  )
}
