import { requireUser } from "@/lib/session"
import { AppNav } from "@/components/app-nav"
import { PendingApproval } from "@/components/pending-approval"
import packageJson from "../../package.json"

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
      <main className="mx-auto max-w-5xl min-w-0 overflow-x-hidden px-3 pt-4 pb-12 sm:px-6 sm:pt-4 sm:pb-12">{children}</main>
      <footer className="mx-auto max-w-5xl px-3 pb-5 text-center text-xs text-muted-foreground sm:px-6">
        Hoopoe v{packageJson.version}
      </footer>
    </div>
  )
}
