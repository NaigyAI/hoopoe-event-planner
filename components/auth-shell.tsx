import type React from "react"
import { CalendarCheck } from "lucide-react"

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/15">
            <CalendarCheck className="size-4" />
          </div>
          <span className="text-lg tracking-tight">Hoopoe Event Planner</span>
        </div>

        <div className="max-w-md text-center">
          <div className="mb-8 w-full max-w-[260px]">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Hoopoe%20Miami%20logo%20merged-YSRoHnDO8YM00dNhspve0WHTNhjTm6.png"
              alt="Hoopoe Boys Miami team logo"
              className="h-auto w-full pt-[35px] text-center"
            />
          </div>
          <p className="text-2xl font-semibold leading-snug tracking-tight text-balance">
            Stop the back-and-forth. See everyone’s availability on one grid and
            lock in the day that works.
          </p>
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
