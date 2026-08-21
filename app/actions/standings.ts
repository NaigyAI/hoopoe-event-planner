"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { event, eventStanding, eventStandingEntry, user } from "@/lib/db/schema"
import { and, asc, eq } from "drizzle-orm"
import { requireDecklistAccess, requireStandingAdmin, requireTeamMember } from "@/lib/authorization"
import { eventIdSchema, idSchema, standingsInputSchema, urlSchema } from "@/lib/validation"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export async function listStandingData(eventId?: string) {
  await getUserId()
  const rows = await db.select({ standing: eventStanding, entry: eventStandingEntry })
    .from(eventStanding)
    .leftJoin(eventStandingEntry, eq(eventStandingEntry.standingId, eventStanding.id))
    .where(eventId ? eq(eventStanding.eventId, eventId) : undefined)
    .orderBy(asc(eventStandingEntry.placement))
  return rows
}

export async function listStandingMembers() {
  await getUserId()
  return db.select({ id: user.id, name: user.name }).from(user).where(eq(user.approved, true)).orderBy(asc(user.name))
}

export async function saveStandings(input: {
  eventId: string
  entries: Array<{ placement: number; memberId?: string; playerName: string; deckName: string; decklistPathname?: string; decklistFilename?: string }>
}) {
  const reporter = await requireTeamMember()
  input = standingsInputSchema.parse(input)
  const reporterId = reporter.id
  const submittedEntries = input.entries.filter((entry) => entry.playerName.trim() || entry.deckName.trim() || entry.memberId)
  if (submittedEntries.length < 4 || submittedEntries.length > 8 || submittedEntries.some((entry, index) => entry.placement !== index + 1 || !entry.playerName.trim() || !entry.deckName.trim())) {
    throw new Error("Please complete at least the Top 4 entries, with optional placements through Top 8")
  }
  const target = await db.select({ id: event.id }).from(event).where(eq(event.id, input.eventId)).limit(1)
  if (!target[0]) throw new Error("Event not found")
  const existing = await db.select({ id: eventStanding.id }).from(eventStanding).where(eq(eventStanding.eventId, input.eventId)).limit(1)
  const standingId = existing[0]?.id ?? crypto.randomUUID()
  if (!existing[0]) await db.insert(eventStanding).values({ id: standingId, eventId: input.eventId, reportedBy: reporterId })
  await db.delete(eventStandingEntry).where(eq(eventStandingEntry.standingId, standingId))
  await db.insert(eventStandingEntry).values(submittedEntries.map((entry) => ({ ...entry, id: crypto.randomUUID(), standingId, playerName: entry.playerName.trim(), deckName: entry.deckName.trim() })))
  revalidatePath("/past-events")
  revalidatePath("/report-standings")
  return standingId
}

export async function saveDecklistUrl(entryId: string, value: string) {
  entryId = idSchema.parse(entryId)
  await requireDecklistAccess(entryId)
  let url: string
  try {
    url = urlSchema.parse(value).toString()
    if (!["http:", "https:"].includes(new URL(url).protocol)) throw new Error()
  } catch {
    throw new Error("Enter a valid external http or https link")
  }
  await db.update(eventStandingEntry).set({ decklistUrl: url }).where(eq(eventStandingEntry.id, entryId))
  revalidatePath("/past-events")
  return url
}

export async function deleteDecklist(entryId: string) {
  entryId = idSchema.parse(entryId)
  const { entry } = await requireDecklistAccess(entryId)
  if (entry.decklistPathname) {
    const { del } = await import("@vercel/blob")
    await del(entry.decklistPathname)
  }
  await db.update(eventStandingEntry).set({ decklistPathname: null, decklistFilename: null, decklistUrl: null }).where(eq(eventStandingEntry.id, entryId))
  revalidatePath("/past-events")
}

export async function deleteStandings(standingId: string) {
  standingId = idSchema.parse(standingId)
  await requireStandingAdmin(standingId)
  const entries = await db.select({ pathname: eventStandingEntry.decklistPathname }).from(eventStandingEntry).where(eq(eventStandingEntry.standingId, standingId))
  const pathnames = entries.flatMap((entry) => entry.pathname ? [entry.pathname] : [])
  if (pathnames.length) {
    const { del } = await import("@vercel/blob")
    await del(pathnames)
  }
  await db.delete(eventStandingEntry).where(eq(eventStandingEntry.standingId, standingId))
  await db.delete(eventStanding).where(eq(eventStanding.id, standingId))
  revalidatePath("/past-events")
}
