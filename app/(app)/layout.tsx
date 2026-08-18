import { requireUser } from "@/lib/session"
import { AppNav } from "@/components/app-nav"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()
  return (
    <div className="min-h-dvh bg-background">
      <AppNav user={{ name: user.name, email: user.email, role: user.role }} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
