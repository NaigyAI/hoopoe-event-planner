"use server"

import { db } from "@/lib/db"
import { event, availability, rsvp, user } from "@/lib/db/schema"
import { and, desc, eq, sql } from "drizzle-orm"
import { requireUser, requireAdmin } from "@/lib/session"
import { notifyEventCreated, notifyDateLocked } from "@/lib/email"
import { dateRange } from "@/lib/dates"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

export type AvailabilityStatus = "available" | "maybe" | "unavailable"
export type RsvpStatus = "going" | "maybe" | "not_going"

async function allRecipients() {
  return db
    .select({
      email: user.email,
      name: user.name,
      notifyEnabled: user.notifyEnabled,
    })
    .from(user)
}

/** Dashboard: every event with a small summary. */
export async function listEvents() {
  await requireUser()
  const events = await db.select().from(event).orderBy(desc(event.createdAt))

  const counts = await db
    .select({
      eventId: availability.eventId,
      responders: sql<number>`count(distinct ${availability.userId})`,
    })
    .from(availability)
    .groupBy(availability.eventId)

  const goingCounts = await db
    .select({
      eventId: rsvp.eventId,
      going: sql<number>`count(*) filter (where ${rsvp.status} = 'going')`,
    })
    .from(rsvp)
    .groupBy(rsvp.eventId)

  const countMap = new Map(counts.map((c) => [c.eventId, Number(c.responders)]))
  const goingMap = new Map(
    goingCounts.map((c) => [c.eventId, Number(c.going)]),
  )
  return events.map((e) => ({
    ...e,
    responderCount: countMap.get(e.id) ?? 0,
    goingCount: goingMap.get(e.id) ?? 0,
  }))
}

export async function createEvent(input: {
  formats: string[]
  eventType: string
  eventTypeDetail?: string
  description?: string
  location: string
  eventUrl?: string
  travelDetails?: string
  startDate: string
  endDate?: string
  startTime?: string
}) {
  const admin = await requireAdmin()
  const formats = input.formats.map((format) => format.trim()).filter(Boolean)
  const eventType = input.eventType.trim()
  const location = input.location.trim()
  const eventTypeDetail = input.eventTypeDetail?.trim()
  if (!formats.length || !eventType || !location)
    throw new Error("Format, event type, and location are required")
  if (eventType === "other" && !eventTypeDetail)
    throw new Error("Enter a name for the event type")
  if (!input.startDate) throw new Error("Start date is required")
  const endDate = input.endDate?.trim() || input.startDate
  if (endDate < input.startDate)
    throw new Error("End date must be on or after the start date")

  const eventTypeLabel: Record<string, string> = {
    training: "Training",
    rcq: "RCQ",
    regional: "Regional Championship",
    "pro-tour": "PT",
    other: eventTypeDetail ?? "Other",
  }
  const formatLabel = formats.join("/")
  const title = `${formatLabel} ${eventTypeLabel[eventType] ?? eventType}`
  const days = dateRange(input.startDate, endDate)
  if (days.length > 60) throw new Error("Date range cannot exceed 60 days")

  const id = randomUUID()
  const shareToken = randomUUID().replace(/-/g, "")
  await db.insert(event).values({
    id,
    title,
    format: formatLabel,
    description: input.description?.trim() || null,
    location,
    eventType,

    eventUrl: input.eventUrl?.trim() || null,
    travelDetails: input.travelDetails?.trim() || null,
    createdBy: admin.id,
    createdByName: admin.name,
    shareToken,
    startDate: input.startDate,
    endDate,
    startTime: input.startTime?.trim() || null,
    endTime: null,
    status: "planning",
  })

  try {
    await notifyEventCreated({
      recipients: await allRecipients(),
      eventTitle: title,
      creatorName: admin.name,
    })
  } catch (err) {
    console.log("[v0] notifyEventCreated failed (stub):", err)
  }

  revalidatePath("/dashboard")
  return { id }
}

export async function getEvent(eventId: string) {
  await requireUser()
  const rows = await db.select().from(event).where(eq(event.id, eventId)).limit(1)
  return rows[0] ?? null
}

/** All availability votes for an event. */
export async function getEventAvailability(eventId: string) {
  await requireUser()
  return db
    .select()
    .from(availability)
    .where(eq(availability.eventId, eventId))
}

/** All attendance RSVPs for an event (used once a date is locked). */
export async function getEventRsvps(eventId: string) {
  await requireUser()
  return db.select().from(rsvp).where(eq(rsvp.eventId, eventId))
}

/**
 * Upsert the current user's attendance RSVP for a locked event.
 * Scoped by userId — a user can only ever write their own row.
 */
export async function setRsvp(input: {
  eventId: string
  status: RsvpStatus
}) {
  const current = await requireUser()

  const ev = await getEvent(input.eventId)
  if (!ev) throw new Error("Event not found")
  if (ev.status !== "locked")
    throw new Error("A date must be locked before you can register attendance")

  const existing = await db
    .select({ id: rsvp.id })
    .from(rsvp)
    .where(and(eq(rsvp.eventId, input.eventId), eq(rsvp.userId, current.id)))
    .limit(1)

  if (existing[0]) {
    await db
      .update(rsvp)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(rsvp.id, existing[0].id))
  } else {
    await db.insert(rsvp).values({
      id: randomUUID(),
      eventId: input.eventId,
      userId: current.id,
      userName: current.name,
      status: input.status,
    })
  }

  revalidatePath(`/events/${input.eventId}`)
  return { ok: true }
}

/**
 * Upsert the current user's vote for a single date.
 * Scoped by userId — a user can only ever write their own rows.
 */
export async function setAvailability(input: {
  eventId: string
  date: string
  status: AvailabilityStatus
}) {
  const current = await requireUser()

  const ev = await getEvent(input.eventId)
  if (!ev) throw new Error("Event not found")
  if (ev.status === "locked")
    throw new Error("This event is locked and can no longer be edited")

  const existing = await db
    .select({ id: availability.id })
    .from(availability)
    .where(
      and(
        eq(availability.eventId, input.eventId),
        eq(availability.userId, current.id),
        eq(availability.date, input.date),
      ),
    )
    .limit(1)

  if (existing[0]) {
    await db
      .update(availability)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(availability.id, existing[0].id))
  } else {
    await db.insert(availability).values({
      id: randomUUID(),
      eventId: input.eventId,
      userId: current.id,
      userName: current.name,
      date: input.date,
      status: input.status,
    })
  }

  revalidatePath(`/events/${input.eventId}`)
  return { ok: true }
}

/** Admin locks a winning date. */
export async function lockDate(input: { eventId: string; date: string }) {
  const admin = await requireAdmin()
  const ev = await getEvent(input.eventId)
  if (!ev) throw new Error("Event not found")

  await db
    .update(event)
    .set({
      lockedDate: input.date,
      status: "locked",
      updatedAt: new Date(),
    })
    .where(eq(event.id, input.eventId))

  try {
    await notifyDateLocked({
      recipients: await allRecipients(),
      eventTitle: ev.title,
      lockedDate: input.date,
    })
  } catch (err) {
    console.log("[v0] notifyDateLocked failed (stub):", err)
  }

  revalidatePath(`/events/${input.eventId}`)
  revalidatePath("/dashboard")
  return { ok: true }
}

/** Admin re-opens a locked event. */
export async function unlockEvent(eventId: string) {
  await requireAdmin()
  await db
    .update(event)
    .set({ lockedDate: null, status: "planning", updatedAt: new Date() })
    .where(eq(event.id, eventId))
  revalidatePath(`/events/${eventId}`)
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function deleteEvent(eventId: string) {
  await requireAdmin()
  await db.delete(availability).where(eq(availability.eventId, eventId))
  await db.delete(rsvp).where(eq(rsvp.eventId, eventId))
  await db.delete(event).where(eq(event.id, eventId))
  revalidatePath("/dashboard")
  return { ok: true }
}
