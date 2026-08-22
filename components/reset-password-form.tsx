"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound } from "lucide-react"

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) throw new Error(result.error.message ?? "Could not reset password")
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset password")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><KeyRound /></div>
        <h1 className="text-2xl font-semibold">Password updated</h1>
        <p className="text-sm text-muted-foreground">Your password has been changed successfully.</p>
        <Button onClick={() => router.push("/sign-in")}>Back to sign in</Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"><KeyRound /></div>
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">Use at least 8 characters.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="confirm">Confirm password</Label><Input id="confirm" type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></div>
        {error ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : null}Update password</Button>
      </form>
    </div>
  )
}

export default ResetPasswordForm

