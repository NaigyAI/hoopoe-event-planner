"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import { updateProfile, updateNotificationPreference } from "@/app/actions/account"

export function ProfileForm({
  initialName,
  email,
  initialNotify,
}: {
  initialName: string
  email: string
  initialNotify: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [notify, setNotify] = useState(initialNotify)
  const [isPending, startTransition] = useTransition()

  function saveName(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await updateProfile({ name })
        toast.success("Profile updated")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update profile")
      }
    })
  }

  function toggleNotify(value: boolean) {
    setNotify(value)
    startTransition(async () => {
      try {
        await updateNotificationPreference(value)
        toast.success(value ? "Email notifications on" : "Email notifications off")
      } catch (err) {
        setNotify(!value)
        toast.error(err instanceof Error ? err.message : "Could not update preference")
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={saveName} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="max-w-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="max-w-sm" />
            <p className="text-xs text-muted-foreground">
              Your email address can&apos;t be changed.
            </p>
          </div>
          <Button type="submit" disabled={isPending || name.trim() === initialName} className="gap-2">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </form>
      </Card>

      <Card className="flex items-center justify-between gap-4 p-6">
        <div className="space-y-1">
          <Label htmlFor="notify" className="text-base">
            Email notifications
          </Label>
          <p className="text-sm text-muted-foreground text-pretty">
            Get an email when a new event is created or a date is locked in.
          </p>
        </div>
        <Switch id="notify" checked={notify} onCheckedChange={toggleNotify} />
      </Card>
    </div>
  )
}
