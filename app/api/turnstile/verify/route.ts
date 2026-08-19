import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { token } = await request.json().catch(() => ({}))

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ success: false, error: "CAPTCHA verification is required" }, { status: 400 })
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY ?? "",
    response: token,
  })

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })
  const result = (await response.json()) as { success?: boolean }

  if (!result.success) {
    return NextResponse.json({ success: false, error: "CAPTCHA verification failed" }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
