"use client"

import { useState, useTransition } from "react"
import { Copy, Link2, RefreshCw, ShieldCheck, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createMemberInvite, revokeMemberInvite } from "@/app/actions/member-invites"

export function MemberInviteManager({ active }: { active: { expiresAt: string } | null }) {
  const [invite, setInvite] = useState<{ url: string; expiresAt: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const current = invite ?? active

  function createInvite() {
    startTransition(async () => {
      try {
        const next = await createMemberInvite()
        setInvite(next)
        toast.success("Invite link created")
      } catch {
        toast.error("Could not create invite link")
      }
    })
  }

  function revokeInvite() {
    startTransition(async () => {
      try {
        await revokeMemberInvite()
        setInvite(null)
        toast.success("Invite link revoked")
      } catch {
        toast.error("Could not revoke invite link")
      }
    })
  }

  async function copyInvite() {
    if (!invite?.url) return
    await navigator.clipboard.writeText(invite.url)
    toast.success("Invite link copied")
  }

  return (
    <section className="space-y-4 rounded-xl border border-accent/30 bg-accent/10 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-medium text-foreground">Direct member invite</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Share this link with trusted people. Anyone who signs up through it becomes an approved member immediately.
          </p>
        </div>
      </div>
      {invite ? (
        <div className="space-y-3">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{invite.url}</span>
            <Button type="button" size="sm" variant="outline" onClick={copyInvite} className="shrink-0 gap-1">
              <Copy className="size-3.5" /> Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={createInvite} disabled={isPending} className="gap-1">
              <RefreshCw className="size-3.5" /> Rotate link
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={revokeInvite} disabled={isPending} className="gap-1">
              <X className="size-3.5" /> Revoke
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" onClick={createInvite} disabled={isPending} className="gap-2">
          <Link2 className="size-4" /> Create invite link
        </Button>
      )}
    </section>
  )
}
