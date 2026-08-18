"use server"

import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireUser } from "@/lib/session"
import { sendEmail } from "@/lib/email"
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

export async function updateNotificationPreference(enabled: boolean) {
  const current = await requireUser()
  await db
    .update(user)
    .set({ notifyEnabled: enabled, updatedAt: new Date() })
    .where(eq(user.id, current.id))
  revalidatePath("/profile")
  return { ok: true }
}

/**
 * Stubbed password reset. Looks up the account and (would) email a reset link.
 * Always resolves without revealing whether the email is registered.
 */
export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase()
  const rows = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1)

  if (rows[0]) {
    await sendEmail({
      to: rows[0].email,
      subject: "Reset your RCQ Planner password",
      body: `Hi ${rows[0].name}, use this link to reset your password: [reset link stub].`,
    })
  }
  return { ok: true }
}
