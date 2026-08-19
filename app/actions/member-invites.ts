"use server"

import { createHash, randomBytes } from "node:crypto"
import { and, desc, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { memberInvite, user as userTable } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function getInviteUrl(token: string) {
  const base = process.env.BETTER_AUTH_URL ? process.env.BETTER_AUTH_URL : process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.V0_RUNTIME_URL ?? "http://localhost:3000"
  return `${base.replace(/\/$/, "")}/sign-up?invite=${encodeURIComponent(token)}`
}

export async function getActiveMemberInvite() {
  await requireAdmin()
  const [invite] = await db.select({ expiresAt: memberInvite.expiresAt }).from(memberInvite).where(and(isNull(memberInvite.revokedAt), isNull(memberInvite.usedAt))).orderBy(desc(memberInvite.createdAt)).limit(1)
  if (!invite || invite.expiresAt <= new Date()) return null
  return { expiresAt: invite.expiresAt.toISOString() }
}

export async function createMemberInvite() {
  const admin = await requireAdmin()
  const token = randomBytes(32).toString("base64url")
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  await db.update(memberInvite).set({ revokedAt: now }).where(and(isNull(memberInvite.revokedAt), isNull(memberInvite.usedAt)))
  await db.insert(memberInvite).values({ id: crypto.randomUUID(), tokenHash: hashToken(token), createdBy: admin.id, expiresAt })
  revalidatePath("/members")
  return { url: getInviteUrl(token), expiresAt: expiresAt.toISOString() }
}

export async function revokeMemberInvite() {
  await requireAdmin()
  await db.update(memberInvite).set({ revokedAt: new Date() }).where(and(isNull(memberInvite.revokedAt), isNull(memberInvite.usedAt)))
  revalidatePath("/members")
}

export async function approveCurrentUserWithInvite(token: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user || !token || token.length > 200) return false
  const [invite] = await db.select({ id: memberInvite.id, expiresAt: memberInvite.expiresAt }).from(memberInvite).where(and(eq(memberInvite.tokenHash, hashToken(token)), isNull(memberInvite.revokedAt), isNull(memberInvite.usedAt))).limit(1)
  if (!invite || invite.expiresAt <= new Date()) return false
  const now = new Date()
  await db.update(memberInvite).set({ usedAt: now }).where(and(eq(memberInvite.id, invite.id), isNull(memberInvite.usedAt)))
  await db.update(userTable).set({ approved: true }).where(eq(userTable.id, session.user.id))
  revalidatePath("/members")
  revalidatePath("/dashboard")
  return true
}
