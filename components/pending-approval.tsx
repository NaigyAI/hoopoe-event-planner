"use client"

import { useRouter } from "next/navigation"
import { Clock, LogOut } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function PendingApproval({ name }: { name: string }) {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-foreground">
        <Clock className="size-7" />
      </div>
      <h1 className="mt-6 text-2xl tracking-wide text-balance">
        Hang tight, {name.trim().split(/\s+/)[0]}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground text-pretty">
        Your account is waiting for a Hoopoe Boys admin to approve it. Once
        you&apos;re in, you can mark availability and RSVP to team events.
      </p>
      <Button variant="outline" onClick={handleSignOut} className="mt-8 gap-2">
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  )
}
