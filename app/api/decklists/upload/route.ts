import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

const allowed = new Set(["application/pdf", "text/plain", "text/csv"])

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const formData = await request.formData()
  const entryId = formData.get("entryId")
  if (typeof entryId !== "string") return NextResponse.json({ error: "Missing standing entry" }, { status: 400 })
  const { db } = await import("@/lib/db")
  const { eventStandingEntry } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")
  const entry = await db.select({ memberId: eventStandingEntry.memberId }).from(eventStandingEntry).where(eq(eventStandingEntry.id, entryId)).limit(1)
  if (!entry[0] || entry[0].memberId !== session.user.id) return NextResponse.json({ error: "Only the listed member can upload this decklist" }, { status: 403 })
  const file = formData.get("file")
  if (!(file instanceof File) || !allowed.has(file.type)) return NextResponse.json({ error: "Only PDF, TXT, or CSV files are supported" }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Decklists must be 5 MB or smaller" }, { status: 400 })
  const blob = await put(`decklists/${session.user.id}/${crypto.randomUUID()}-${file.name}`, file, { access: "private", addRandomSuffix: false })
  return NextResponse.json({ pathname: blob.pathname, filename: file.name })
}
