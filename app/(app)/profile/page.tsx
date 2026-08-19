import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { requireUser } from "@/lib/session"
import { ProfileForm } from "@/components/profile-form"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to events
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-medium tracking-normal">Profile & settings</h1>
        {user.role === "superuser" ? <Badge>Superuser</Badge> : user.role === "admin" ? <Badge variant="secondary">Admin</Badge> : null}
      </div>

      <ProfileForm
        initialName={user.name}
        email={user.email}
        initialNotify={user.notifyEnabled}
      />
    </div>
  )
}
