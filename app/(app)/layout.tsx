import { requireUser } from "@/lib/session"
import { AppNav } from "@/components/app-nav"
import { PendingApproval } from "@/components/pending-approval"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  // Only approved members (and admins) may use the app. Everyone else waits.
  if (user.role !== "admin" && user.role !== "superuser" && !user.approved) {
    return <PendingApproval name={user.name} />
  }

  return (
    <div className="min-h-dvh max-w-full overflow-x-hidden bg-background">
      <AppNav user={{ name: user.name, email: user.email, role: user.role }} />
      <main className="mx-auto max-w-5xl min-w-0 overflow-x-hidden px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
