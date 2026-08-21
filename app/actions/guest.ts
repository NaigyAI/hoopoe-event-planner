"use server"

import { db } from "@/lib/db"
import { event, availability, rsvp } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/session"
import { requireEvent } from "@/lib/authorization"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"
import type { AvailabilityStatus, RsvpStatus } from "@/app/actions/events"
import { enforceRateLimit, requestKey } from "@/lib/rate-limit"
import { dateSchema, guestInputSchema, inviteTokenSchema, rsvpStatusSchema, statusSchema } from "@/lib/validation"

const GUEST_ID_COOKIE = "rcq_guest_id"
const GUEST_NAME_COOKIE = "rcq_guest_name"
const ONE_YEAR = 60 * 60 * 24 * 365

export type GuestSession = { id: string; name: string | null }

/** Read the current guest identity from cookies (does not create one). */
export async function getGuestSession(): Promise<GuestSession | null> {
  const jar = await cookies()
  const id = jar.get(GUEST_ID_COOKIE)?.value
  if (!id) return null
  const name = jar.get(GUEST_NAME_COOKIE)?.value ?? null
  return { id, name: name ? decodeURIComponent(name) : null }
}

/** Ensure a guest id cookie exists, returning the id. */
async function ensureGuestId(): Promise<string> {
  const jar = await cookies()
  let id = jar.get(GUEST_ID_COOKIE)?.value
  if (!id) {
    id = randomUUID()
    jar.set(GUEST_ID_COOKIE, id, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: ONE_YEAR,
      path: "/",
    })
  }
  return id
}

/** Look up a public event by its share token. */
export async function getEventByToken(token: string) {
  const rows = await db
    .select()
    .from(event)
    .where(eq(event.shareToken, token))
    .limit(1)
  return rows[0] ?? null
}

/** Everything the guest join page needs: event, all votes, and guest identity. */
export async function getGuestContext(token: string) {
  const ev = await getEventByToken(token)
  if (!ev)
    return {
      event: null as null,
      votes: [],
      rsvps: [] as (typeof rsvp.$inferSelect)[],
      guest: null as GuestSession | null,
    }
  const votes = await db
    .select()
    .from(availability)
    .where(eq(availability.eventId, ev.id))
  const rsvps = await db.select().from(rsvp).where(eq(rsvp.eventId, ev.id))
  const guest = await getGuestSession()
  return { event: ev, votes, rsvps, guest }
}

/** Guest enters (or updates) their display name. */
export async function joinAsGuest(input: { token: string; name: string }) {
  input = guestInputSchema.parse(input)
  await enforceRateLimit("join", await requestKey(`token:${input.token}`))
  const name = input.name.trim()
  if (name.length < 2) throw new Error("Please enter your name (at least 2 characters)")
  if (name.length > 60) throw new Error("Name is too long")

  const ev = await getEventByToken(input.token)
  if (!ev) throw new Error("This event link is invalid or has expired")

  const guestId = await ensureGuestId()
  const jar = await cookies()
  jar.set(GUEST_NAME_COOKIE, encodeURIComponent(name), {
    sameSite: "none",
    secure: true,
    maxAge: ONE_YEAR,
    path: "/",
  })

  // Keep the name in sync on any existing rows for this guest.
  await db
    .update(availability)
    .set({ userName: name, updatedAt: new Date() })
    .where(
      and(
        eq(availability.eventId, ev.id),
        eq(availability.userId, `guest:${guestId}`),
      ),
    )
  await db
    .update(rsvp)
    .set({ userName: name, updatedAt: new Date() })
    .where(
      and(eq(rsvp.eventId, ev.id), eq(rsvp.userId, `guest:${guestId}`)),
    )

  revalidatePath(`/join/${input.token}`)
  return { ok: true }
}

/** Guest upserts their attendance RSVP for a locked event. */
export async function setGuestRsvp(input: {
  token: string
  status: RsvpStatus
}) {
  input = { token: inviteTokenSchema.parse(input.token), status: rsvpStatusSchema.parse(input.status) }
  await enforceRateLimit("rsvp", await requestKey(`guest:${input.token}`))
  const ev = await getEventByToken(input.token)
  if (!ev) throw new Error("This event link is invalid or has expired")
  if (ev.status !== "locked")
    throw new Error("A date must be locked before you can register attendance")

  const session = await getGuestSession()
  if (!session?.name) throw new Error("Please enter your name first")

  const scopedId = `guest:${session.id}`

  const existing = await db
    .select({ id: rsvp.id })
    .from(rsvp)
    .where(and(eq(rsvp.eventId, ev.id), eq(rsvp.userId, scopedId)))
    .limit(1)

  if (existing[0]) {
    await db
      .update(rsvp)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(rsvp.id, existing[0].id))
  } else {
    await db.insert(rsvp).values({
      id: randomUUID(),
      eventId: ev.id,
      userId: scopedId,
      userName: session.name,
      status: input.status,
    })
  }

  revalidatePath(`/join/${input.token}`)
  return { ok: true }
}

/** Guest upserts their availability for a single date. */
export async function removeGuestFromEvent(input: { eventId: string; guestId: string }) {
  await requireAdmin()
  await requireEvent(input.eventId)
  const scopedId = `guest:${input.guestId}`
  await db.transaction(async (tx) => {
    await tx.delete(availability).where(and(eq(availability.eventId, input.eventId), eq(availability.userId, scopedId)))
    await tx.delete(rsvp).where(and(eq(rsvp.eventId, input.eventId), eq(rsvp.userId, scopedId)))
  })
  revalidatePath("/members")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function removeSelfFromGuestEvent(token: string) {
  const ev = await getEventByToken(token)
  if (!ev) throw new Error("This event link is invalid or has expired")
  const session = await getGuestSession()
  if (!session) throw new Error("Guest session not found")
  const scopedId = `guest:${session.id}`
  await db.transaction(async (tx) => {
    await tx.delete(availability).where(and(eq(availability.eventId, ev.id), eq(availability.userId, scopedId)))
    await tx.delete(rsvp).where(and(eq(rsvp.eventId, ev.id), eq(rsvp.userId, scopedId)))
  })
  revalidatePath(`/join/${token}`)
  revalidatePath("/members")
  return { ok: true }
}

export async function setGuestAvailability(input: {
  token: string
  date: string
  status: AvailabilityStatus
}) {
  input = { token: inviteTokenSchema.parse(input.token), date: dateSchema.parse(input.date), status: statusSchema.parse(input.status) }
  await enforceRateLimit("join", await requestKey(`guest:${input.token}`))
  const ev = await getEventByToken(input.token)
  if (!ev) throw new Error("This event link is invalid or has expired")
  if (ev.status === "locked")
    throw new Error("This event is locked and can no longer be edited")

  const session = await getGuestSession()
  if (!session?.name) throw new Error("Please enter your name first")

  const scopedId = `guest:${session.id}`

  const existing = await db
    .select({ id: availability.id })
    .from(availability)
    .where(
      and(
        eq(availability.eventId, ev.id),
        eq(availability.userId, scopedId),
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
      eventId: ev.id,
      userId: scopedId,
      userName: session.name,
      date: input.date,
      status: input.status,
    })
  }

  revalidatePath(`/join/${input.token}`)
  return { ok: true }
}
