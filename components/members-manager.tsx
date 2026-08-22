"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ArrowRightLeft, Check, X, UserPlus, Users, Trash2, ShieldCheck } from "lucide-react"
import { capitalizeName, capitalizeFirstName } from "@/lib/names"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { approveMember, deleteMember, rejectMember, setMemberAdmin, setMemberRole, type MemberRow } from "@/app/actions/members"

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function MembersManager({
  members,
  pending,
  canManageAdmins,
  canManageRoles,
}: {
  members: MemberRow[]
  pending: MemberRow[]
  canManageAdmins: boolean
  canManageRoles: boolean
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="size-4 text-accent" />
          <h2 className="text-lg font-medium text-foreground">
            Prospects awaiting approval
          </h2>
          {pending.length > 0 ? (
            <Badge variant="secondary" className="text-[11px]">
              {pending.length}
            </Badge>
          ) : null}
        </div>

        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No pending requests. New sign-ups will show up here for you to approve.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((m) => (
              <PendingRow key={m.id} member={m} />
            ))}
          </ul>
        )}
      </section>

      {(["team", "external"] as const).map((role) => {
        const sectionMembers = members.filter((m) => role === "team" ? m.role === "member" || m.role === "team-member" || m.role === "admin" || m.role === "superuser" : m.role === "external-member")
        const title = role === "team" ? "Team members" : "External members"
        return (
          <section key={role} className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-accent" />
              <h2 className="text-lg font-medium text-foreground">{title}</h2>
              <Badge variant="secondary" className="text-[11px]">{sectionMembers.length}</Badge>
            </div>

            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {sectionMembers.map((m) => (
            <li key={m.id} className="flex items-center gap-3 bg-card px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {initials(m.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{capitalizeName(m.name)}</p>
                <div className="mt-1">
                  {m.role === "superuser" ? (
                    <Badge className="gap-1 text-[10px]"><ShieldCheck className="size-3" />Superuser</Badge>
                  ) : m.role === "admin" ? (
                    <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      {m.role === "external-member" ? "External member" : "Team member"}
                    </Badge>
                  )}
                </div>
              </div>
              {m.role === "superuser" ? null : m.role === "admin" ? (
                canManageAdmins ? <RoleButton member={m} isAdmin /> : null
              ) : (
                <div className="flex items-center gap-1">
                  {canManageRoles ? <RoleButton member={m} /> : null}
                  <DeleteMemberButton member={m} />
                </div>
              )}
            </li>
          ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function RoleButton({ member, isAdmin = false }: { member: MemberRow; isAdmin?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const isExternal = member.role === "external-member"

  function handleRoleChange() {
    if (isAdmin) {
      if (!window.confirm(`Are you sure you want to remove admin access from ${member.name}?`)) return
      startTransition(async () => {
        try { await setMemberAdmin(member.id, false); toast.success(`${capitalizeFirstName(member.name)} is now a team member`) }
        catch { toast.error("Could not update this member's role") }
      })
      return
    }
    const nextRole = isExternal ? "team-member" : "external-member"
    if (!window.confirm(`Are you sure you want to make ${member.name} an ${isExternal ? "team" : "external"} member?`)) return
    startTransition(async () => {
      try { await setMemberRole(member.id, nextRole); toast.success(`${capitalizeFirstName(member.name)} role updated`) }
      catch { toast.error("Could not update this member's role") }
    })
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="outline"
      onClick={handleRoleChange}
      disabled={isPending}
      aria-label={isAdmin ? `Remove admin from ${member.name}` : isExternal ? `Make ${member.name} a team member` : `Make ${member.name} external`}
      title={isAdmin ? "Remove admin" : isExternal ? "Make team member" : "Make external"}
    >
      <ArrowRightLeft data-icon="inline-start" />
    </Button>
  )
}

function DeleteMemberButton({ member }: { member: MemberRow }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${member.name}'s profile? This will permanently remove all of their data.`,
    )
    if (!confirmed) return

    startTransition(async () => {
      try {
        await deleteMember(member.id)
        toast.success(`${capitalizeFirstName(member.name)} deleted`)
      } catch {
        toast.error("Could not delete this member")
      }
    })
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={`Delete ${member.name}`}
      className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="size-4" />
    </Button>
  )
}

function PendingRow({ member }: { member: MemberRow }) {
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState<"team-member" | "external-member">("team-member")

  function handleApprove() {
    startTransition(async () => {
      try {
        await approveMember(member.id, role)
        toast.success(`${capitalizeFirstName(member.name)} approved`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not approve this member")
      }
    })
  }

  function handleReject() {
    startTransition(async () => {
      try {
        await rejectMember(member.id)
        toast.success(`${capitalizeFirstName(member.name)} removed`)
      } catch {
        toast.error("Could not remove this request")
      }
    })
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent-foreground">
        {initials(member.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as "team-member" | "external-member")}
          disabled={isPending}
          aria-label={`Role for ${member.name}`}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground"
        >
          <option value="team-member">Team member</option>
          <option value="external-member">External member</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReject}
          disabled={isPending}
          className="gap-1"
        >
          <X className="size-4" />
          <span className="hidden sm:inline">Reject</span>
        </Button>
        <Button size="sm" onClick={handleApprove} disabled={isPending} className="gap-1">
          <Check className="size-4" />
          <span className="hidden sm:inline">Approve</span>
        </Button>
      </div>
    </li>
  )
}
