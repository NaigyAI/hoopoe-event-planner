"use server"

import { db } from "@/lib/db"
import { event, availability, personalAvailability, rsvp, user } from "@/lib/db/schema"
import { and, desc, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm"
import { requireApprovedUser, requireUser, requireAdmin } from "@/lib/session"
import { requireEvent, requireEventAdmin, requireEventParticipant } from "@/lib/authorization"
import { notifyEventCreated, notifyEventResponseReminder, notifyDateLocked } from "@/lib/email"
import { dateRange, getRecurringDates } from "@/lib/dates"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { enforceRateLimit } from "@/lib/rate-limit"
import { dateSchema, eventIdSchema, eventInputSchema, rsvpStatusSchema } from "@/lib/validation"

export type AvailabilityStatus = "available" | "maybe" | "unavailable"
export type RsvpStatus = "going" | "maybe" | "not_going"

async function allRecipients() {
  return db
    .select({
      email: user.email,
      name: user.name,
      notifyEnabled: user.notifyEnabled,
      notifyNewEvent: user.notifyNewEvent,
      notifyEventReminder: user.notifyEventReminder,
    })
    .from(user)
}

export async function setAdminAttendance(eventId: string, userId: string, dateValue: string, status: "available" | "maybe" | "unavailable") {
  const actor = await requireAdmin()
  const selected = await db.select().from(event).where(eq(event.id, eventId)).limit(1)
  if (!selected[0]) throw new Error("Event not found")
  const target = await db.select({ id: user.id, name: user.name }).from(user).where(and(eq(user.id, userId), eq(user.approved, true))).limit(1)
  if (!target[0]) throw new Error("Member not found")
  await db.insert(availability).values({ id: randomUUID(), eventId, userId: target[0].id, userName: target[0].name, date: dateValue, status, updatedAt: new Date() }).onConflictDoUpdate({ target: [availability.eventId, availability.userId, availability.date], set: { userName: target[0].name, status, updatedAt: new Date() } })
  revalidatePath(`/events/${eventId}`)
  return { actorId: actor.id }
}

export async function resetAdminAttendance(eventId: string, userId: string, dateValue: string) {
  await requireAdmin()
  // Resetting a member from the attendance roster means they are awaiting
  // a response for this event again, across all dates.
  await db.delete(availability).where(and(eq(availability.eventId, eventId), eq(availability.userId, userId)))
  revalidatePath(`/events/${eventId}`)
}

export async function remindAwaitingMembers(eventId: string) {
  const actor = await requireAdmin()
  await enforceRateLimit("reminder", `admin:${actor.id}:event:${eventId}`)
  const selected = await db.select().from(event).where(eq(event.id, eventId)).limit(1)
  if (!selected[0]) throw new Error("Event not found")
  const today = new Date().toISOString().slice(0, 10)
  if (selected[0].startDate < today) {
    return { count: 0, failed: 0, error: "Reminders cannot be sent for events that have already passed." }
  }
  const responders = await db.select({ userId: availability.userId }).from(availability).where(eq(availability.eventId, eventId))
  const responded = new Set(responders.map((row) => row.userId))
  const recipients = await db.select({ id: user.id, email: user.email, name: user.name, notifyEnabled: user.notifyEnabled, notifyNewEvent: user.notifyNewEvent, notifyEventReminder: user.notifyEventReminder }).from(user).where(and(eq(user.approved, true), ne(user.id, actor.id)))
  const awaiting = recipients.filter((recipient) => !responded.has(recipient.id))
  const origin = process.env.BETTER_AUTH_URL ? process.env.BETTER_AUTH_URL : process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.V0_RUNTIME_URL ?? "http://localhost:3000"
  const eligibleCount = awaiting.filter((recipient) => recipient.notifyEnabled && recipient.notifyEventReminder).length
  try {
    const result = await notifyEventResponseReminder({ recipients: awaiting, eventTitle: selected[0].title, eventLocation: selected[0].location ?? "", eventTime: selected[0].startTime ?? undefined, eventLink: `${origin}/join/${selected[0].shareToken}`, creatorName: actor.name })
    if (result.failed > 0 && result.sent === 0) {
      return { count: 0, error: "No reminder emails were accepted. Check that RESEND_FROM_EMAIL uses your verified domain." }
    }
    return { count: result.sent, failed: result.failed }
  } catch (error) {
    console.log("[v0] reminder email failed:", error instanceof Error ? error.message : error)
    return { count: 0, error: "The reminder could not be sent. Check your email configuration and try again." }
  }
}

/** Dashboard: every event with a small summary. */
export async function listEvents() {
  await requireUser()
  const events = await db.select().from(event).orderBy(desc(event.startDate), desc(event.createdAt))

  const dashboardEvents = events.filter(
    (candidate) => !candidate.seriesId || candidate.seriesId === candidate.id,
  )

  const availabilityRows = await db
    .select({ eventId: availability.eventId, userId: availability.userId, date: availability.date })
    .from(availability)
  const countMap = new Map<string, number>()
  for (const currentEvent of dashboardEvents) {
    const displayedDate = currentEvent.recurrenceType !== "none"
      ? getRecurringDates(currentEvent.recurrenceType, currentEvent.startDate, currentEvent.recurrenceWeekday, currentEvent.recurrenceOrdinal, 1)[0] ?? currentEvent.startDate
      : currentEvent.startDate
    const responders = new Set(
      availabilityRows
        .filter((row) => row.eventId === currentEvent.id && row.date === displayedDate)
        .map((row) => row.userId),
    )
    countMap.set(currentEvent.id, responders.size)
  }

  const goingCounts = await db
    .select({
      eventId: rsvp.eventId,
      going: sql<number>`count(*) filter (where ${rsvp.status} = 'going')`,
    })
    .from(rsvp)
    .innerJoin(event, eq(event.id, rsvp.eventId))
    .groupBy(rsvp.eventId)

  const goingMap = new Map(
    goingCounts.map((c) => [c.eventId, Number(c.going)]),
  )
  return dashboardEvents.map((e) => ({
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
  nextOccurrenceLocation?: string
  eventUrl?: string
  travelDetails?: string
  startDate: string
  endDate?: string
  startTime?: string
  recurrenceType?: "none" | "weekly" | "monthly"
  recurrenceWeekday?: number
  recurrenceOrdinal?: "first" | "second" | "third" | "fourth" | "last"
}) {
  const creator = await requireAdmin()
  input = eventInputSchema.parse(input)
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
  const recurrenceType = input.recurrenceType ?? "none"
  if (!["none", "weekly", "monthly"].includes(recurrenceType)) throw new Error("Invalid recurrence")
  if (recurrenceType !== "none" && (input.recurrenceWeekday == null || input.recurrenceWeekday < 0 || input.recurrenceWeekday > 6)) {
    throw new Error("Choose a valid recurrence day")
  }
  if (recurrenceType === "monthly" && !["first", "second", "third", "fourth", "last"].includes(input.recurrenceOrdinal ?? "")) {
    throw new Error("Choose a monthly occurrence")
  }

  const normalizedEventType = eventType === "training" ? "practice" : eventType
  const eventTypeLabel: Record<string, string> = {
    practice: "Practice",
    training: "Practice",
    weekly: "Weekly",
    "store-championship": "Store Championship",
    rcq: "RC Qualifier",
    regional: "Regional Championships",
    "pro-tour": "PT",
    other: eventTypeDetail ?? "Other",
  }
  const formatLabel = formats.join("/")
  const title = `${formatLabel} ${eventTypeLabel[normalizedEventType] ?? normalizedEventType}`
  const days = dateRange(input.startDate, endDate)
  if (days.length > 60) throw new Error("Date range cannot exceed 60 days")

  const id = randomUUID()
  const seriesId = recurrenceType === "none" ? null : id
  const shareToken = randomUUID().replace(/-/g, "")
  const occurrenceDates = recurrenceType === "none"
    ? [input.startDate]
    : getRecurringDates(recurrenceType, input.startDate, input.recurrenceWeekday ?? null, input.recurrenceOrdinal ?? null, 3)
  const occurrences = occurrenceDates.length ? occurrenceDates : [input.startDate]
  await db.insert(event).values(occurrences.map((occurrenceDate, index) => ({
    id: index === 0 ? id : randomUUID(),
    title,
    format: formatLabel,
    description: input.description?.trim() || null,
    location,
    nextOccurrenceLocation: index === 0 ? input.nextOccurrenceLocation?.trim() || null : null,
    seriesId,
    eventType,
    eventUrl: input.eventUrl?.trim() || null,
    travelDetails: input.travelDetails?.trim() || null,
    createdBy: creator.id,
    createdByName: creator.name,
    shareToken: index === 0 ? shareToken : randomUUID().replace(/-/g, ""),
    startDate: occurrenceDate,
    endDate: occurrenceDate,
    startTime: input.startTime?.trim() || null,
    endTime: null,
    status: "planning",
    recurrenceType: index === 0 ? recurrenceType : "none",
    recurrenceWeekday: index === 0 && recurrenceType !== "none" ? input.recurrenceWeekday : null,
    recurrenceOrdinal: index === 0 && recurrenceType === "monthly" ? input.recurrenceOrdinal : null,
  })))

  try {
    await notifyEventCreated({
      recipients: await allRecipients(),
      eventTitle: title,
      eventLocation: location,
      eventLink: `${process.env.BETTER_AUTH_URL ? process.env.BETTER_AUTH_URL : process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.V0_RUNTIME_URL ?? "http://localhost:3000"}/join/${shareToken}`,
      creatorName: creator.name,
    })
  } catch (err) {
    console.error("[v0] notifyEventCreated failed:", err)
  }

  revalidatePath("/dashboard")
  return { id }
}

export async function confirmEventDate(eventId: string, date: string) {
  eventId = eventIdSchema.parse(eventId)
  date = dateSchema.parse(date)
  const { event: ev } = await requireEventAdmin(eventId)
  if (!ev) throw new Error("Event not found")
  await db.update(event).set({ startDate: date, endDate: date, lockedDate: null, status: "planning", updatedAt: new Date() }).where(eq(event.id, eventId))
  revalidatePath(`/events/${eventId}`)
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function updateEvent(eventId: string, input: {
  formats: string[]
  eventType: string
  eventTypeDetail?: string
  description?: string
  location: string
  nextOccurrenceLocation?: string
  eventUrl?: string
  travelDetails?: string
  startDate: string
  endDate?: string
  startTime?: string
  recurrenceType?: "none" | "weekly" | "monthly"
  recurrenceWeekday?: number
  recurrenceOrdinal?: "first" | "second" | "third" | "fourth" | "last"
}) {
  eventId = eventIdSchema.parse(eventId)
  await requireEventAdmin(eventId)
  input = eventInputSchema.parse(input)
  const formats = input.formats.map((format) => format.trim()).filter(Boolean)
  const eventType = input.eventType.trim()
  const location = input.location.trim()
  const eventTypeDetail = input.eventTypeDetail?.trim()
  if (!formats.length || !eventType || !location || !input.startDate)
    throw new Error("Format, event type, location, and start date are required")
  if (eventType === "other" && !eventTypeDetail)
    throw new Error("Enter a name for the event type")
  const endDate = input.endDate?.trim() || input.startDate
  if (endDate < input.startDate) throw new Error("End date must be on or after the start date")
  const recurrenceType = input.recurrenceType ?? "none"
  if (!["none", "weekly", "monthly"].includes(recurrenceType)) throw new Error("Invalid recurrence")
  if (recurrenceType !== "none" && (input.recurrenceWeekday == null || input.recurrenceWeekday < 0 || input.recurrenceWeekday > 6)) throw new Error("Choose a valid recurrence day")
  if (recurrenceType === "monthly" && !["first", "second", "third", "fourth", "last"].includes(input.recurrenceOrdinal ?? "")) throw new Error("Choose a monthly occurrence")
  const normalizedEventType = eventType === "training" ? "practice" : eventType
  const labels: Record<string, string> = {
    practice: "Practice", training: "Practice", weekly: "Weekly",
    "store-championship": "Store Championship", rcq: "RC Qualifier", regional: "Regional Championships", "pro-tour": "PT",
    other: eventTypeDetail ?? "Other",
  }
  const title = `${formats.join("/")} ${labels[normalizedEventType] ?? normalizedEventType}`
  await db.update(event).set({
    title, format: formats.join("/"), eventType: normalizedEventType,
    description: input.description?.trim() || null, location,
    nextOccurrenceLocation: recurrenceType === "none" ? null : input.nextOccurrenceLocation?.trim() || null,
    eventUrl: input.eventUrl?.trim() || null, travelDetails: input.travelDetails?.trim() || null,
    startDate: input.startDate, endDate, startTime: input.startTime?.trim() || null,
    endTime: null,
    recurrenceType,
    recurrenceWeekday: recurrenceType === "none" ? null : input.recurrenceWeekday,
    recurrenceOrdinal: recurrenceType === "monthly" ? input.recurrenceOrdinal : null,
    updatedAt: new Date(),
  }).where(eq(event.id, eventId))
  revalidatePath(`/events/${eventId}`)
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function getEvent(eventId: string) {
  await requireApprovedUser()
  const rows = await db.select().from(event).where(eq(event.id, eventId)).limit(1)
  return rows[0] ?? null
}

/**
 * Make sure a recurring series has a dedicated event record for each of its
 * upcoming occurrence dates. Without this, some visible dates have their own
 * page (so a click navigates) while others don't (so a click does nothing),
 * which reads as a bug. Creating the missing records makes every date behave
 * identically and carries over matching personal-calendar responses.
 */
async function ensureUpcomingOccurrences(seriesId: string) {
  const [parent] = await db.select().from(event).where(eq(event.id, seriesId)).limit(1)
  if (!parent || parent.recurrenceType === "none") return

  const upcoming = getRecurringDates(
    parent.recurrenceType,
    parent.startDate.slice(0, 10),
    parent.recurrenceWeekday,
    parent.recurrenceOrdinal,
    3,
  )
  if (upcoming.length === 0) return

  const existing = await db.select({ startDate: event.startDate }).from(event).where(eq(event.seriesId, seriesId))
  const existingDates = new Set([parent.startDate.slice(0, 10), ...existing.map((row) => row.startDate.slice(0, 10))])
  const missing = upcoming.filter((date) => !existingDates.has(date))
  if (missing.length === 0) return

  const newRecords = missing.map((date) => ({
    id: randomUUID(),
    title: parent.title,
    format: parent.format,
    description: parent.description,
    location: parent.location,
    nextOccurrenceLocation: null,
    seriesId,
    eventType: parent.eventType,
    eventUrl: parent.eventUrl,
    travelDetails: parent.travelDetails,
    createdBy: parent.createdBy,
    createdByName: parent.createdByName,
    shareToken: randomUUID().replace(/-/g, ""),
    startDate: date,
    endDate: date,
    startTime: parent.startTime,
    endTime: parent.endTime,
    status: parent.status,
    recurrenceType: "none" as const,
    recurrenceWeekday: null,
    recurrenceOrdinal: null,
  }))
  await db.insert(event).values(newRecords)

  // Carry over any matching personal-calendar responses for the new dates.
  for (const record of newRecords) {
    const personalRows = await db
      .select({ userId: personalAvailability.userId, userName: user.name, status: personalAvailability.status })
      .from(personalAvailability)
      .innerJoin(user, eq(user.id, personalAvailability.userId))
      .where(eq(personalAvailability.date, record.startDate))
    if (personalRows.length === 0) continue
    await db.insert(availability).values(personalRows.map((row) => ({
      id: randomUUID(),
      eventId: record.id,
      userId: row.userId,
      userName: row.userName,
      date: record.startDate,
      status: row.status,
    }))).onConflictDoNothing()
  }
}

export async function getEventOccurrences(eventId: string) {
  await requireApprovedUser()
  const [current] = await db.select({ seriesId: event.seriesId }).from(event).where(eq(event.id, eventId)).limit(1)
  const seriesId = current?.seriesId ?? eventId
  if (!current) return []
  if (current.seriesId) await ensureUpcomingOccurrences(current.seriesId)
  return db.select({ id: event.id, startDate: event.startDate, location: event.location, shareToken: event.shareToken, recurrenceType: event.recurrenceType, recurrenceWeekday: event.recurrenceWeekday, recurrenceOrdinal: event.recurrenceOrdinal })
    .from(event)
    .where(or(eq(event.id, seriesId), eq(event.seriesId, seriesId)))
    .orderBy(event.startDate)
}

/** All availability votes for an event. */
export async function getMyEventAvailability(eventIds: string[]) {
  const current = await requireUser()
  if (eventIds.length === 0) return []
  return db
    .select({ eventId: availability.eventId, date: availability.date, status: availability.status })
    .from(availability)
    .where(and(eq(availability.userId, current.id), inArray(availability.eventId, eventIds)))
}

export async function getEventAvailability(eventId: string) {
  await requireUser()
  const [eventRow] = await db.select({ startDate: event.startDate, endDate: event.endDate }).from(event).where(eq(event.id, eventId)).limit(1)
  const votes = await db.select().from(availability).where(eq(availability.eventId, eventId))
  if (!eventRow) return votes

  const personalRows = await db
    .select({ userId: personalAvailability.userId, userName: user.name, date: personalAvailability.date, status: personalAvailability.status })
    .from(personalAvailability)
    .innerJoin(user, eq(user.id, personalAvailability.userId))
    .where(
      and(
        gte(personalAvailability.date, eventRow.startDate),
        lte(personalAvailability.date, eventRow.endDate ?? eventRow.startDate),
      ),
    )

  const normalizedVotes = votes.map((vote) => ({ ...vote, date: String(vote.date).slice(0, 10) }))
  const normalizedPersonalRows = personalRows.map((row) => ({ ...row, date: String(row.date).slice(0, 10) }))
  const personalByUserDate = new Map(normalizedPersonalRows.map((row) => [`${row.userId}:${row.date}`, row]))
  const merged = normalizedVotes.map((vote) => {
    const personalStatus = personalByUserDate.get(`${vote.userId}:${vote.date}`)
    return personalStatus ? { ...vote, status: personalStatus.status, userName: personalStatus.userName } : vote
  })
  const existingKeys = new Set(normalizedVotes.map((vote) => `${vote.userId}:${vote.date}`))
  return [
    ...merged,
    ...normalizedPersonalRows
      .filter((row) => !existingKeys.has(`${row.userId}:${row.date}`))
      .map((row) => ({ id: randomUUID(), eventId, userId: row.userId, userName: row.userName, date: row.date, status: row.status, createdAt: new Date(), updatedAt: new Date() })),
  ]
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
  input = { eventId: eventIdSchema.parse(input.eventId), status: rsvpStatusSchema.parse(input.status) }
  const current = await requireEventParticipant(input.eventId)
  await enforceRateLimit("rsvp", `user:${current.id}:event:${input.eventId}`)

  const ev = await requireEvent(input.eventId)
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
export async function setAvailabilityForDates(input: {
  eventId: string
  dates: string[]
  status: AvailabilityStatus
}) {
  const clearedEvents = new Set<string>()
  for (const date of input.dates) {
    const result = await setAvailability({ eventId: input.eventId, date, status: input.status })
    result.clearedEvents.forEach((title) => clearedEvents.add(title))
  }
  revalidatePath(`/events/${input.eventId}`)
  revalidatePath("/dashboard")
  return { ok: true, clearedEvents: [...clearedEvents] }
}

export async function setAvailability(input: {
  eventId: string
  date: string
  status: AvailabilityStatus
}) {
  const current = await requireEventParticipant(input.eventId)

  const ev = await requireEvent(input.eventId)
  if (!ev) throw new Error("Event not found")
  if (ev.status === "locked")
    throw new Error("This event is locked and can no longer be edited")

  const competing = input.status === "available"
    ? await db
        .select({ id: availability.id, eventId: availability.eventId, title: event.title })
        .from(availability)
        .innerJoin(event, eq(event.id, availability.eventId))
        .where(and(
          eq(availability.userId, current.id),
          eq(availability.date, input.date),
          eq(availability.status, "available"),
          ne(availability.eventId, input.eventId),
        ))
    : []

  if (competing.length > 0) {
    await db.delete(availability).where(inArray(availability.id, competing.map((row) => row.id)))
    for (const row of competing) revalidatePath(`/events/${row.eventId}`)
  }

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
  return { ok: true, clearedEvents: competing.map((row) => row.title) }
}

/** Admin locks a winning date. */
export async function lockDate(input: { eventId: string; date: string }) {
  const { actor: admin, event: ev } = await requireEventAdmin(input.eventId)
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
  await requireEventAdmin(eventId)
  await db
    .update(event)
    .set({ lockedDate: null, status: "planning", updatedAt: new Date() })
    .where(eq(event.id, eventId))
  revalidatePath(`/events/${eventId}`)
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function deleteEvent(eventId: string) {
  await requireEventAdmin(eventId)
  await db.delete(availability).where(eq(availability.eventId, eventId))
  await db.delete(rsvp).where(eq(rsvp.eventId, eventId))
  await db.delete(event).where(eq(event.id, eventId))
  revalidatePath("/dashboard")
  return { ok: true }
}
