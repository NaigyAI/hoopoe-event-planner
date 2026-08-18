"use server"

import { db } from "@/lib/db"
import { personalAvailability } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { and, eq, gte, lt } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

export type PersonalAvailabilityStatus = "available" | "unavailable" | "maybe"

function nextMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const next = new Date(Date.UTC(year, monthNumber, 1))
  return next.toISOString().slice(0, 10)
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
