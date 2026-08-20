"use client"

import { ChevronDown, Clock3, UserRoundCheck, UserRoundX } from "lucide-react"

export type AttendanceMember = {
  id: string
  name: string
  status: "attending" | "unavailable" | "awaiting"
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

export function AttendanceRoster({ members }: { members: AttendanceMember[] }) {
  const groups = [
    { key: "attending", label: "Attending", icon: UserRoundCheck, members: members.filter((m) => m.status === "attending"), tone: "text-available" },
    { key: "unavailable", label: "Not attending", icon: UserRoundX, members: members.filter((m) => m.status === "unavailable"), tone: "text-unavailable" },
    { key: "awaiting", label: "Awaiting response", icon: Clock3, members: members.filter((m) => m.status === "awaiting"), tone: "text-muted-foreground" },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {groups.map((group) => {
        const Icon = group.icon
        return (
          <details key={group.key} open className="group rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon className={`size-4 ${group.tone}`} />
                {group.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {group.members.length}
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="border-t border-border px-4 py-3">
              {group.members.length > 0 ? (
                <ul className="flex flex-wrap gap-2" aria-label={group.label}>
                  {group.members.map((member) => (
                    <li key={member.id} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                      {firstName(member.name)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No members in this group.</p>
              )}
            </div>
          </details>
        )
      })}
    </div>
  )
}
