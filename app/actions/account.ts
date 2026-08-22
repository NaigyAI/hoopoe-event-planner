"use server"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireUser } from "@/lib/session"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

export async function updateProfile(input: { name: string }) {
  const current = await requireUser()
  const name = input.name.trim()
  if (!name) throw new Error("Name is required")
  await db
    .update(user)
    .set({ name, updatedAt: new Date() })
    .where(eq(user.id, current.id))
  revalidatePath("/profile")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function updateNotificationPreference(
  preference: "newEvent" | "eventReminder" | "all",
  enabled: boolean,
) {
  const current = await requireUser()
  const values = preference === "newEvent"
    ? { notifyNewEvent: enabled, updatedAt: new Date() }
    : preference === "eventReminder"
      ? { notifyEventReminder: enabled, updatedAt: new Date() }
      : { notifyEnabled: enabled, notifyNewEvent: enabled, notifyEventReminder: enabled, updatedAt: new Date() }
  await db.update(user).set(values).where(eq(user.id, current.id))
  revalidatePath("/profile")
  return { ok: true }
}

export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase()
  await auth.api.requestPasswordReset({
    body: {
      email: normalized,
      redirectTo: `${getAppOrigin()}/reset-password`,
    },
    headers: await headers(),
  })
  return { ok: true }
}

function getAppOrigin() {
  const origin = process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    process.env.V0_RUNTIME_URL ??
    "https://eventplanner.hoopoeboys.com"
  return origin.replace(/\/$/, "")
}
