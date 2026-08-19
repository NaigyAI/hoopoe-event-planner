"use server"

import { db } from "@/lib/db"
import { user, availability, rsvp } from "@/lib/db/schema"
import { and, desc, eq, like, sql } from "drizzle-orm"
import { requireAdmin } from "@/lib/session"
import { revalidatePath } from "next/cache"

export type MemberRow = {
  id: string
  name: string
  email: string
  role: string
  approved: boolean
  createdAt: Date
}

/** Approved members (admins + approved members), newest first. */
export async function listMembers(): Promise<MemberRow[]> {
  await requireAdmin()
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approved: user.approved,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.approved, true))
    .orderBy(desc(user.createdAt))
}

/** People who signed up but are still waiting for an admin to approve them. */
export async function listPendingMembers(): Promise<MemberRow[]> {
  await requireAdmin()
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      approved: user.approved,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.approved, false))
    .orderBy(desc(user.createdAt))
}

/** Admin approves a pending sign-up into a full member. */
export async function approveMember(userId: string) {
  await requireAdmin()
  await db.update(user).set({ approved: true, updatedAt: new Date() }).where(eq(user.id, userId))
  revalidatePath("/members")
  revalidatePath("/dashboard")
  return { ok: true }
}

/** Admin rejects a pending sign-up, removing the account entirely. */
export async function rejectMember(userId: string) {
  const admin = await requireAdmin()
  if (admin.id === userId) throw new Error("You cannot remove your own account")
  await db.delete(user).where(and(eq(user.id, userId), eq(user.approved, false)))
  revalidatePath("/members")
  revalidatePath("/dashboard")
  return { ok: true }
}

/**
 * Team + guest counts for the dashboard.
 * - activeMembers: approved accounts (the Hoopoe Boys roster).
 * - pendingMembers: sign-ups awaiting approval.
 * - guests: distinct share-link visitors who engaged with an event
 *   (prospective members interested in a practice or RCQ). Guest identities
 *   are stored with a `guest:` prefixed userId.
 */
export async function getTeamStats() {
  const [members] = await db
    .select({
      active: sql<number>`count(*) filter (where ${user.approved} = true)`,
      pending: sql<number>`count(*) filter (where ${user.approved} = false)`,
    })
    .from(user)

  const guestRows = await db
    .select({ userId: availability.userId })
    .from(availability)
    .where(like(availability.userId, "guest:%"))
    .union(
      db
        .select({ userId: rsvp.userId })
        .from(rsvp)
        .where(like(rsvp.userId, "guest:%")),
    )

  return {
    activeMembers: Number(members?.active ?? 0),
    pendingMembers: Number(members?.pending ?? 0),
    guests: guestRows.length,
  }
}
