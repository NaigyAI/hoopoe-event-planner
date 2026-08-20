import { db } from "@/lib/db"
import { event, eventStanding, eventStandingEntry } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { requireApprovedUser, requireUser, type SessionUser } from "@/lib/session"

export async function requireTeamMember(): Promise<SessionUser> {
  const user = await requireApprovedUser()
  if (user.role === "external-member") throw new Error("Forbidden: team member access required")
  return user
}

export async function requireEvent(eventId: string) {
  const rows = await db.select().from(event).where(eq(event.id, eventId)).limit(1)
  if (!rows[0]) throw new Error("Event not found")
  return rows[0]
}

export async function requireEventAdmin(eventId: string) {
  const actor = await requireAdminForEvent()
  const target = await requireEvent(eventId)
  return { actor, event: target }
}

export async function requireAdminForEvent() {
  const actor = await requireApprovedUser()
  if (actor.role !== "admin" && actor.role !== "superuser") throw new Error("Forbidden: admin access required")
  return actor
}

export async function requireEventParticipant(eventId: string) {
  const actor = await requireApprovedUser()
  await requireEvent(eventId)
  return actor
}

export async function requireStandingAdmin(standingId: string) {
  const actor = await requireAdminForEvent()
  const rows = await db
    .select({ standing: eventStanding, event })
    .from(eventStanding)
    .innerJoin(event, eq(event.id, eventStanding.eventId))
    .where(eq(eventStanding.id, standingId))
    .limit(1)
  if (!rows[0]) throw new Error("Standings not found")
  return { actor, standing: rows[0].standing, event: rows[0].event }
}

export async function requireDecklistAccess(entryId: string) {
  const actor = await requireApprovedUser()
  const rows = await db
    .select({ entry: eventStandingEntry, standing: eventStanding, event })
    .from(eventStandingEntry)
    .innerJoin(eventStanding, eq(eventStanding.id, eventStandingEntry.standingId))
    .innerJoin(event, eq(event.id, eventStanding.eventId))
    .where(eq(eventStandingEntry.id, entryId))
    .limit(1)
  const row = rows[0]
  if (!row) throw new Error("Standing entry not found")
  const isAdmin = actor.role === "admin" || actor.role === "superuser"
  if (!isAdmin && row.entry.memberId !== actor.id) throw new Error("Only the listed member or an admin can manage this decklist")
  return { actor, ...row }
}

export async function requireCurrentUser() {
  return requireUser()
}
