"use server"

import { randomUUID } from "crypto"
import { and, asc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { event, rsvp, scoringMatch, scoringRound, scoringSession } from "@/lib/db/schema"
import { requireApprovedUser } from "@/lib/session"
import { requireEvent } from "@/lib/authorization"
import { todayISO } from "@/lib/dates"

function ensureToday(target: string) {
  if (target !== todayISO()) throw new Error("Only events scheduled for today can be tracked")
}

export async function listScoringEvents() {
  const actor = await requireApprovedUser()
  const today = todayISO()
  const events = await db.select().from(event).where(eq(event.startDate, today)).orderBy(asc(event.startTime))
  const sessions = events.length ? await db.select().from(scoringSession).where(inArray(scoringSession.eventId, events.map((item) => item.id))) : []
  return { actor, events, sessions }
}

export async function claimScoring(eventId: string) {
  const actor = await requireApprovedUser()
  const target = await requireEvent(eventId)
  ensureToday(target.startDate)
  const existing = await db.select().from(scoringSession).where(eq(scoringSession.eventId, eventId)).limit(1)
  if (existing[0]) throw new Error(`This event is currently tracked by ${existing[0].trackerName}. Ask them to transfer tracking.`)
  const session = { id: randomUUID(), eventId, trackerId: actor.id, trackerName: actor.name, playerCount: 0, roundCount: 0, currentRound: 0, status: "claimed" }
  await db.insert(scoringSession).values(session)
  revalidatePath("/scoring")
  return session
}

export async function transferScoring(eventId: string, userId: string, userName: string) {
  const actor = await requireApprovedUser()
  const session = await db.select().from(scoringSession).where(eq(scoringSession.eventId, eventId)).limit(1)
  if (!session[0] || session[0].trackerId !== actor.id) throw new Error("Only the current tracker can transfer tracking")
  await db.update(scoringSession).set({ trackerId: userId, trackerName: userName, updatedAt: new Date() }).where(eq(scoringSession.id, session[0].id))
  revalidatePath("/scoring")
}

export async function setupScoring(eventId: string, playerCount: number, roundCount: number) {
  const actor = await requireApprovedUser()
  const target = await requireEvent(eventId)
  ensureToday(target.startDate)
  if (playerCount < 1 || playerCount > 256 || roundCount < 1 || roundCount > 32) throw new Error("Invalid player or round count")
  const session = await db.select().from(scoringSession).where(eq(scoringSession.eventId, eventId)).limit(1)
  if (!session[0] || session[0].trackerId !== actor.id) throw new Error("Only the current tracker can set up scoring")
  await db.update(scoringSession).set({ playerCount, roundCount, currentRound: 1, status: "active", updatedAt: new Date() }).where(eq(scoringSession.id, session[0].id))
  await createRound(session[0].id, eventId, 1)
  revalidatePath("/scoring")
}

async function createRound(sessionId: string, eventId: string, roundNumber: number) {
  const attendees = await db.select({ id: rsvp.userId, name: rsvp.userName }).from(rsvp).where(and(eq(rsvp.eventId, eventId), eq(rsvp.status, "going"))).orderBy(asc(rsvp.userName))
  const round = { id: randomUUID(), sessionId, roundNumber }
  await db.insert(scoringRound).values(round)
  const matches = []
  for (let index = 0; index < attendees.length; index += 2) {
    const one = attendees[index]
    const two = attendees[index + 1]
    matches.push({ id: randomUUID(), roundId: round.id, playerOneId: one.id, playerOneName: one.name, playerTwoId: two?.id ?? null, playerTwoName: two?.name ?? "Opponent" })
  }
  if (matches.length) await db.insert(scoringMatch).values(matches)
}

export async function getScoringSession(eventId: string) {
  const actor = await requireApprovedUser()
  const target = await requireEvent(eventId)
  ensureToday(target.startDate)
  const session = await db.select().from(scoringSession).where(eq(scoringSession.eventId, eventId)).limit(1)
  if (!session[0]) return { actor, event: target, session: null, round: null, matches: [] }
  const round = await db.select().from(scoringRound).where(and(eq(scoringRound.sessionId, session[0].id), eq(scoringRound.roundNumber, session[0].currentRound))).limit(1)
  const matches = round[0] ? await db.select().from(scoringMatch).where(eq(scoringMatch.roundId, round[0].id)).orderBy(asc(scoringMatch.createdAt)) : []
  return { actor, event: target, session: session[0], round: round[0] ?? null, matches }
}

export async function saveMatchScore(eventId: string, matchId: string, playerOneScore: number, playerTwoScore: number) {
  const actor = await requireApprovedUser()
  const session = await db.select().from(scoringSession).where(eq(scoringSession.eventId, eventId)).limit(1)
  if (!session[0] || session[0].trackerId !== actor.id) throw new Error("Only the current tracker can save scores")
  if (!Number.isInteger(playerOneScore) || !Number.isInteger(playerTwoScore) || playerOneScore < 0 || playerTwoScore < 0 || playerOneScore > 99 || playerTwoScore > 99) throw new Error("Invalid score")
  await db.update(scoringMatch).set({ playerOneScore, playerTwoScore, completedAt: new Date() }).where(eq(scoringMatch.id, matchId))
  revalidatePath("/scoring")
}

export async function nextScoringRound(eventId: string) {
  const actor = await requireApprovedUser()
  const session = await db.select().from(scoringSession).where(eq(scoringSession.eventId, eventId)).limit(1)
  if (!session[0] || session[0].trackerId !== actor.id) throw new Error("Only the current tracker can start the next round")
  const matches = await db.select().from(scoringMatch).innerJoin(scoringRound, eq(scoringRound.id, scoringMatch.roundId)).where(eq(scoringRound.sessionId, session[0].id))
  if (matches.some((match) => match.scoring_match.completedAt === null)) throw new Error("Complete every match before starting the next round")
  if (session[0].currentRound >= session[0].roundCount) {
    await db.update(scoringSession).set({ status: "completed", updatedAt: new Date() }).where(eq(scoringSession.id, session[0].id))
  } else {
    await db.update(scoringSession).set({ currentRound: session[0].currentRound + 1, updatedAt: new Date() }).where(eq(scoringSession.id, session[0].id))
    await createRound(session[0].id, eventId, session[0].currentRound + 1)
  }
  revalidatePath("/scoring")
}
