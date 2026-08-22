"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { user, availability, personalAvailability, rsvp, event } from "@/lib/db/schema"
import { and, desc, eq, inArray, like, sql } from "drizzle-orm"
import { requireAdmin, requireSuperuser, requireUser } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { userIdSchema } from "@/lib/validation"
import { notifyMemberApproved } from "@/lib/email"

function getAppOrigin() {
  const base = process.env.BETTER_AUTH_URL
    ? process.env.BETTER_AUTH_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL ?? "http://localhost:3000"
  return base.replace(/\/$/, "")
}

export type MemberRole = "member" | "team-member" | "external-member" | "admin" | "superuser"

export type MemberRow = {
  id: string
  name: string
  email: string
  role: MemberRole
  approved: boolean
  createdAt: Date
}

export type GuestRow = {
  id: string
  name: string
  events: { id: string; title: string; shareToken: string; responses: number }[]
}

export async function listGuests(): Promise<GuestRow[]> {
  await requireAdmin()
  const [availabilityRows, rsvpRows] = await Promise.all([
    db.select({ userId: availability.userId, userName: availability.userName, eventId: availability.eventId }).from(availability).where(like(availability.userId, "guest:%")),
    db.select({ userId: rsvp.userId, userName: rsvp.userName, eventId: rsvp.eventId }).from(rsvp).where(like(rsvp.userId, "guest:%")),
  ])
  const eventIds = [...new Set([...availabilityRows, ...rsvpRows].map((row) => row.eventId))]
  if (eventIds.length === 0) return []
  const events = await db.select({ id: event.id, title: event.title, shareToken: event.shareToken }).from(event).where(inArray(event.id, eventIds))
  const eventMap = new Map(events.map((item) => [item.id, item]))
  const guests = new Map<string, GuestRow>()
  for (const row of [...availabilityRows, ...rsvpRows]) {
    const item = eventMap.get(row.eventId)
    if (!item) continue
    const guest = guests.get(row.userId) ?? { id: row.userId.replace(/^guest:/, ""), name: row.userName, events: [] }
    guest.name = row.userName
    let guestEvent = guest.events.find((entry) => entry.id === item.id)
    if (!guestEvent) {
      guestEvent = { ...item, responses: 0 }
      guest.events.push(guestEvent)
    }
    guestEvent.responses += 1
    guests.set(row.userId, guest)
  }
  return [...guests.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Approved members (admins + approved members), newest first. */
export async function listAttendanceMembers(): Promise<Pick<MemberRow, "id" | "name">[]> {
  const sessionUser = await requireUser()
  return db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.approved, true))
    .orderBy(user.name)
}

export async function listMembers(): Promise<MemberRow[]> {
  await requireAdmin()
  return (await db
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
    .orderBy(desc(user.createdAt))) as MemberRow[]
}

/** People who signed up but are still waiting for an admin to approve them. */
export async function listPendingMembers(): Promise<MemberRow[]> {
  await requireAdmin()
  return (await db
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
    .orderBy(desc(user.createdAt))) as MemberRow[]
}

/** Superusers promote or demote non-superuser members as admins. */
export async function setMemberRole(userId: string, role: "team-member" | "external-member") {
  userId = userIdSchema.parse(userId)
  await requireAdmin()
  await db.update(user).set({ role, updatedAt: new Date() }).where(and(eq(user.id, userId), eq(user.approved, true), inArray(user.role, ["member", "team-member", "external-member"])))
  revalidatePath("/members")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function setMemberAdmin(userId: string, isAdmin: boolean) {
  userId = userIdSchema.parse(userId)
  const actor = await requireSuperuser()
  if (actor.id === userId) throw new Error("You cannot change your own role")

  await db
    .update(user)
    .set({ role: isAdmin ? "admin" : "team-member", updatedAt: new Date() })
    .where(and(eq(user.id, userId), eq(user.role, isAdmin ? "team-member" : "admin")))

  revalidatePath("/members")
  revalidatePath("/dashboard")
  return { ok: true }
}

/** Admin approves a pending sign-up into a full member. */
export async function approveMember(userId: string, role: "team-member" | "external-member") {
  userId = userIdSchema.parse(userId)
  await requireAdmin()
  const approved = await db
    .update(user)
    .set({ approved: true, role, updatedAt: new Date() })
    .where(and(eq(user.id, userId), eq(user.approved, false)))
    .returning({ email: user.email, name: user.name })
  revalidatePath("/members")
  revalidatePath("/dashboard")

  // Welcome email must never block or fail the approval itself.
  if (approved[0]) {
    try {
      await notifyMemberApproved({ recipient: approved[0], role, appLink: `${getAppOrigin()}/dashboard` })
    } catch (err) {
      console.log("[v0] welcome email failed:", err instanceof Error ? err.message : err)
    }
  }

  return { ok: true }
}

/** Admin removes an approved member and all member-owned records. */
export async function deleteMember(userId: string) {
  userId = z.string().trim().min(1).max(200).parse(userId)
  const admin = await requireAdmin()
  if (admin.id === userId) throw new Error("You cannot remove your own account")

  const [target] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1)
  if (!target) throw new Error("Member not found")
  if (target.role === "admin" || target.role === "superuser") throw new Error("Admin accounts cannot be removed")

  await db.transaction(async (tx) => {
    await tx.delete(availability).where(eq(availability.userId, userId))
    await tx.delete(personalAvailability).where(eq(personalAvailability.userId, userId))
    await tx.delete(rsvp).where(eq(rsvp.userId, userId))
    await tx.delete(user).where(and(eq(user.id, userId), inArray(user.role, ["member", "team-member", "external-member"])))
  })

  revalidatePath("/members")
  revalidatePath("/dashboard")
  return { ok: true }
}

/** Admin rejects a pending sign-up, removing the account entirely. */
export async function rejectMember(userId: string) {
  userId = userIdSchema.parse(userId)
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
      external: sql<number>`count(*) filter (where ${user.approved} = true and ${user.role} = 'external-member')`,
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
    activeMembers: Number(members?.active ?? 0) - Number(members?.external ?? 0),
    externalMembers: Number(members?.external ?? 0),
    pendingMembers: Number(members?.pending ?? 0),
    guests: guestRows.length,
  }
}
