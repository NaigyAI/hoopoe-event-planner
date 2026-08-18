"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { joinAsGuest } from "@/app/actions/guest"

export function GuestJoinForm({
  token,
  eventTitle,
  defaultName = "",
}: {
  token: string
  eventTitle: string
  defaultName?: string
}) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await joinAsGuest({ token, name })
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not continue")
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-balance">
          You&apos;re invited to respond
        </h1>
        <p className="text-pretty text-sm text-muted-foreground">
          Add your name to mark which days you&apos;re available for{" "}
          <span className="font-medium text-foreground">{eventTitle}</span>.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="guest-name">Your name</Label>
        <Input
          id="guest-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jordan Lee"
          autoFocus
          maxLength={60}
        />
      </div>
      <Button type="submit" className="w-full gap-2" disabled={isPending}>
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            Continue
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No account needed. Your response is saved to this event only.
      </p>
    </form>
  )
}
