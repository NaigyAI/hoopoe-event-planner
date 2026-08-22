"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { approveCurrentUserWithInvite } from "@/app/actions/member-invites"

type Mode = "sign-in" | "sign-up"

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void; theme: "auto" }) => string
      reset: (widgetId?: string) => void
    }
  }
}

export function AuthForm({
  mode,
  returnTo,
  inviteToken,
  captchaEnabled = false,
}: {
  mode: Mode
  returnTo?: string
  inviteToken?: string
  captchaEnabled?: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const captchaRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | undefined>(undefined)

  const isSignUp = mode === "sign-up"
  const siteKey = captchaEnabled ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY : undefined

  useEffect(() => {
    if (!siteKey || !captchaRef.current) return
    const render = () => {
      if (window.turnstile && captchaRef.current && !widgetRef.current) {
        widgetRef.current = window.turnstile.render(captchaRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: setCaptchaToken,
          "expired-callback": () => setCaptchaToken(null),
          "error-callback": () => setCaptchaToken(null),
        })
      }
    }
    if (window.turnstile) render()
    else {
      const script = document.createElement("script")
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      script.async = true
      script.defer = true
      script.onload = render
      document.head.appendChild(script)
    }
  }, [siteKey])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (captchaEnabled) {
      if (!captchaToken) {
        setError("Please complete the CAPTCHA verification.")
        return
      }
      setLoading(true)
    } else {
      setLoading(true)
    }
    try {
      if (captchaEnabled) {
        const captchaResponse = await fetch("/api/turnstile/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: captchaToken }),
        })
        if (!captchaResponse.ok) throw new Error("CAPTCHA verification failed. Please try again.")
      }
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ email, password, name })
        if (error) throw new Error(error.message ?? "Could not create account")
        if (inviteToken) {
          const approved = await approveCurrentUserWithInvite(inviteToken)
          if (!approved) throw new Error("This invite link is invalid or expired")
        }
      } else {
        const { error } = await authClient.signIn.email({ email, password })
        if (error) throw new Error(error.message ?? "Could not sign in")
      }
      const destination = returnTo?.startsWith("/") ? returnTo : "/dashboard"
      router.push(destination)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <img
          src="/favicon-hoopoe.png"
          alt="Hoopoe Event Planner"
          className="mb-4 size-20 object-contain"
        />
        <h1 className="text-2xl font-semibold tracking-[0.04em] text-balance">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
          {isSignUp
            ? "Start planning dates that work for your whole team."
            : "Sign in to plan and vote on your team’s events."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {isSignUp && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Rivera"
              autoComplete="name"
              required
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {!isSignUp && (
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={8}
            required
          />
          {isSignUp && (
            <p className="text-xs text-muted-foreground">
              At least 8 characters.
            </p>
          )}
        </div>

        {siteKey ? <div ref={captchaRef} className="min-h-[65px]" aria-label="CAPTCHA verification" /> : null}

        {error && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-1">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "New to Hoopoe Event Planner? "}
        <Link
          href={`${isSignUp ? "/sign-in" : "/sign-up"}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  )
}
