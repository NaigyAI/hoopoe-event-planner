import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { requireUser } from "@/lib/session"
import { ProfileForm } from "@/components/profile-form"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-3 py-4 sm:px-0 sm:py-0">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col items-start gap-2">
        <h1 className="text-[30px] font-medium leading-[1.5] tracking-normal">Profile & settings</h1>
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
