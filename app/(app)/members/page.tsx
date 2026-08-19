import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { listMembers, listPendingMembers } from "@/app/actions/members"
import { MembersManager } from "@/components/members-manager"

export const dynamic = "force-dynamic"

export default async function MembersPage() {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")
  if (user.role !== "admin") redirect("/dashboard")

  const [members, pending] = await Promise.all([
    listMembers(),
    listPendingMembers(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl tracking-wide text-balance">Members</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Approve prospects who want to join the Hoopoe Boys and manage the roster.
        </p>
      </div>
      <MembersManager members={members} pending={pending} />
    </div>
  )
}
