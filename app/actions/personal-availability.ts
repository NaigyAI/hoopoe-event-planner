"use server"

import { db } from "@/lib/db"
import { personalAvailability, user } from "@/lib/db/schema"
import { requireApprovedUser, requireUser } from "@/lib/session"
import { and, eq, gte, lte, lt } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

export type PersonalAvailabilityStatus = "available" | "unavailable" | "maybe"

function nextMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const next = new Date(Date.UTC(year, monthNumber, 1))
  return next.toISOString().slice(0, 10)
}

export async function listPersonalAvailabilityFrom(date: string) {
  const currentUser = await requireUser()
  return db
    .select({ date: personalAvailability.date, status: personalAvailability.status })
    .from(personalAvailability)
    .where(
      and(
        eq(personalAvailability.userId, currentUser.id),
        gte(personalAvailability.date, date),
      ),
    )
}

export async function findBestAvailabilityDates(startDate: string, endDate: string) {
  await requireApprovedUser()
  const rows = await db
    .select({ date: personalAvailability.date, userId: personalAvailability.userId, status: personalAvailability.status })
    .from(personalAvailability)
    .innerJoin(user, eq(user.id, personalAvailability.userId))
    .where(and(
      eq(user.approved, true),
      gte(personalAvailability.date, startDate),
      lte(personalAvailability.date, endDate),
    ))

  const byDate = new Map<string, Map<string, string>>()
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, new Map())
    byDate.get(row.date)!.set(row.userId, row.status)
  }

  return Array.from(byDate, ([date, statuses]) => ({
    date,
    available: Array.from(statuses.values()).filter((status) => status === "available").length,
    maybe: Array.from(statuses.values()).filter((status) => status === "maybe").length,
    unavailable: Array.from(statuses.values()).filter((status) => status === "unavailable").length,
    total: statuses.size,
  })).sort((a, b) => (b.available - a.available) || (b.maybe - a.maybe) || a.date.localeCompare(b.date))
}

export async function listPersonalAvailability(month: string) {
  const currentUser = await requireUser()
  return db
    .select({ date: personalAvailability.date, status: personalAvailability.status })
    .from(personalAvailability)
    .where(
      and(
        eq(personalAvailability.userId, currentUser.id),
        gte(personalAvailability.date, `${month}-01`),
        lt(personalAvailability.date, nextMonth(month)),
      ),
    )
}

export async function getSuggestedDates(startDate: string, endDate: string) {
  await requireUser()
  const rows = await db
    .select({
      date: personalAvailability.date,
      userId: personalAvailability.userId,
      userName: user.name,
      status: personalAvailability.status,
    })
    .from(personalAvailability)
    .innerJoin(user, eq(personalAvailability.userId, user.id))
    .where(
      and(
        gte(personalAvailability.date, startDate),
        lt(personalAvailability.date, `${endDate}T00:00:00.000Z`),
      ),
    )

  const dates = new Map<string, { available: number; maybe: number; unavailable: number; total: number }>()
  for (const row of rows) {
    const current = dates.get(row.date) ?? { available: 0, maybe: 0, unavailable: 0, total: 0 }
    current.total += 1
    if (row.status === "available") current.available += 1
    else if (row.status === "maybe") current.maybe += 1
    else current.unavailable += 1
    dates.set(row.date, current)
  }
  return [...dates.entries()]
    .map(([date, counts]) => ({ date, ...counts, score: counts.available * 2 + counts.maybe - counts.unavailable * 2 }))
    .sort((a, b) => b.score - a.score || b.available - a.available || a.date.localeCompare(b.date))
}

export async function setPersonalAvailabilityForDates(
  dates: string[],
  status: PersonalAvailabilityStatus,
) {
  await requireUser()
  for (const date of dates) {
    await setPersonalAvailability(date, status)
  }
  revalidatePath("/dashboard")
}

export async function setPersonalAvailability(
  date: string,
  status: PersonalAvailabilityStatus | null,
) {
  const currentUser = await requireUser()
  const existing = await db
    .select({ id: personalAvailability.id })
    .from(personalAvailability)
    .where(
      and(
        eq(personalAvailability.userId, currentUser.id),
        eq(personalAvailability.date, date),
      ),
    )
    .limit(1)

  if (existing[0] && status === null) {
    await db.delete(personalAvailability).where(eq(personalAvailability.id, existing[0].id))
  } else if (existing[0]) {
    await db
      .update(personalAvailability)
      .set({ status: status as PersonalAvailabilityStatus })
      .where(eq(personalAvailability.id, existing[0].id))
  } else if (status) {
    await db.insert(personalAvailability).values({
      id: randomUUID(),
      userId: currentUser.id,
      date,
      status,
    })
  }

  revalidatePath("/dashboard")
}
