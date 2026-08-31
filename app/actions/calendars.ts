"use server"

import { and, eq, gte, lte } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { personalAvailability, event, user } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { notifyEventResponseReminder } from "@/lib/email"

export type MemberCalendar = { id: string; name: string; email: string; dates: { date: string; status: string }[]; missingDates: string[] }

function datesBetween(start: string, end: string) { const dates: string[] = []; for (let d = new Date(`${start}T12:00:00`); d <= new Date(`${end}T12:00:00`); d.setDate(d.getDate() + 1)) dates.push(d.toISOString().slice(0, 10)); return dates }

export async function getAdminCalendars(start: string, end: string): Promise<MemberCalendar[]> {
  await requireAdmin()
  const days = datesBetween(start, end)
  const members = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.approved, true)).orderBy(user.name)
  const rows = await db.select({ userId: personalAvailability.userId, date: personalAvailability.date, status: personalAvailability.status }).from(personalAvailability).where(and(gte(personalAvailability.date, start), lte(personalAvailability.date, end)))
  return members.map((member) => { const own = rows.filter((row) => row.userId === member.id); const dates = own.map((row) => ({ date: String(row.date), status: row.status })); return { ...member, dates, missingDates: days.filter((day) => !own.some((row) => String(row.date) === day)) } })
}

export async function remindMemberAvailability(memberId: string, start: string, end: string) {
  await requireAdmin()
  const [member] = await db.select({ name: user.name, email: user.email }).from(user).where(and(eq(user.id, memberId), eq(user.approved, true))).limit(1)
  if (!member) throw new Error("Member not found")
  const origin = process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  await notifyEventResponseReminder({ recipients: [{ ...member, notifyEnabled: true }], eventTitle: `availability from ${start} to ${end}`, eventLocation: "Hoopoe Event Planner", eventLink: `${origin}/availability`, creatorName: "Hoopoe Event Planner" })
  revalidatePath("/calendars")
  return { ok: true }
}

export async function getCalendarEvents() { await requireAdmin(); return db.select({ id: event.id, title: event.title, startDate: event.startDate, endDate: event.endDate }).from(event).orderBy(event.startDate) }
