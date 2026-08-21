import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { listMembers, listPendingMembers, listGuests } from "@/app/actions/members"
import { GuestsManager } from "@/components/guests-manager"
import { MembersManager } from "@/components/members-manager"
import { MemberInviteManager } from "@/components/member-invite-manager"
import { getActiveMemberInvite } from "@/app/actions/member-invites"

export const dynamic = "force-dynamic"

export default async function MembersPage() {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")
  if (user.role !== "admin" && user.role !== "superuser") redirect("/dashboard")

  const [members, pending, activeInvite, guests] = await Promise.all([
    listMembers(),
    listPendingMembers(),
    getActiveMemberInvite(),
    listGuests(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[30px] leading-[1.5] tracking-wide text-balance">Members</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Approve prospects who want to join the Hoopoe Boys and manage the roster.
        </p>
      </div>
      <MemberInviteManager active={activeInvite} />
      <MembersManager members={members} pending={pending} canManageAdmins={user.role === "superuser"} canManageRoles={user.role === "admin" || user.role === "superuser"} />
      <GuestsManager guests={guests} />
    </div>
  )
}
