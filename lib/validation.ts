import { z } from "zod"

const trimmedText = (max: number) => z.string().trim().min(1).max(max)

export const idSchema = z.string().uuid()
export const eventIdSchema = idSchema
export const inviteTokenSchema = z.string().trim().regex(/^[a-zA-Z0-9_-]{16,128}$/)
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const optionalDateSchema = z.preprocess((value) => value === "" ? undefined : value, dateSchema.optional())
export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/)
export const optionalTimeSchema = z.preprocess((value) => value === "" ? undefined : value, timeSchema.optional())
export const emailSchema = z.string().trim().email().max(320)
export const nameSchema = z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M}.'-]+(?:\s+[\p{L}\p{M}.'-]+)*$/u)
export const urlSchema = z.string().trim().url().max(2048)
export const optionalUrlSchema = urlSchema.optional().or(z.literal(""))
export const statusSchema = z.enum(["available", "maybe", "unavailable"])
export const rsvpStatusSchema = z.enum(["going", "maybe", "not_going"])

export const eventInputSchema = z.object({
  formats: z.array(trimmedText(40)).min(1).max(5),
  eventType: trimmedText(40),
  eventTypeDetail: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  location: trimmedText(160),
  eventUrl: optionalUrlSchema,
  travelDetails: z.string().trim().max(2000).optional(),
  startDate: dateSchema,
  endDate: optionalDateSchema,
  startTime: optionalTimeSchema,
  recurrenceType: z.enum(["none", "weekly", "monthly"]).optional(),
  recurrenceWeekday: z.number().int().min(0).max(6).optional(),
  recurrenceOrdinal: z.enum(["first", "second", "third", "fourth", "last"]).optional(),
}).strict()

export const standingsEntrySchema = z.object({
  placement: z.number().int().min(1).max(8),
  memberId: idSchema.optional(),
  playerName: nameSchema,
  deckName: trimmedText(120),
}).strict()

export const standingsInputSchema = z.object({
  eventId: eventIdSchema,
  entries: z.array(standingsEntrySchema).min(4).max(8),
}).strict()

export const guestInputSchema = z.object({
  token: inviteTokenSchema,
  name: nameSchema,
}).strict()

export function normalizeText(value: string | undefined, max: number) {
  return value?.trim().replace(/\s+/g, " ").slice(0, max)
}
