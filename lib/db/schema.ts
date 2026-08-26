import {
  pgTable,
  text,
  timestamp,
  boolean,
  date,
  integer,
  unique,
} from "drizzle-orm/pg-core"

// ---- Better Auth tables (do not rename columns) ----

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("member"),
  approved: boolean("approved").notNull().default(false),
  notifyEnabled: boolean("notifyEnabled").notNull().default(true),
  notifyNewEvent: boolean("notifyNewEvent").notNull().default(true),
  notifyEventReminder: boolean("notifyEventReminder").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  issuer: text("issuer"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// ---- App tables ----

export const personalAvailability = pgTable("personalAvailability", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  date: date("date").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const event = pgTable("event", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  format: text("format").notNull().default("standard"),
  description: text("description"),
  location: text("location").notNull(),
  nextOccurrenceLocation: text("nextOccurrenceLocation"),
  seriesId: text("seriesId"),
  createdBy: text("createdBy").notNull(),
  createdByName: text("createdByName").notNull(),
  shareToken: text("shareToken").notNull(),
  eventType: text("eventType").notNull().default("rcq"),
  eventUrl: text("eventUrl"),
  travelDetails: text("travelDetails"),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  startTime: text("startTime"),
  endTime: text("endTime"),
  lockedDate: date("lockedDate"),
  status: text("status").notNull().default("planning"),
  recurrenceType: text("recurrenceType").notNull().default("none"),
  recurrenceWeekday: integer("recurrenceWeekday"),
  recurrenceOrdinal: text("recurrenceOrdinal"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const availability = pgTable(
  "availability",
  {
    id: text("id").primaryKey(),
    eventId: text("eventId").notNull(),
    userId: text("userId").notNull(),
    userName: text("userName").notNull(),
    date: date("date").notNull(),
    status: text("status").notNull().default("available"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    uniqueVote: unique().on(t.eventId, t.userId, t.date),
  }),
)

export const memberInvite = pgTable("memberInvite", {
  id: text("id").primaryKey(),
  tokenHash: text("tokenHash").notNull().unique(),
  createdBy: text("createdBy").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const eventStanding = pgTable("eventStanding", {
  id: text("id").primaryKey(),
  eventId: text("eventId").notNull(),
  reportedBy: text("reportedBy").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const eventStandingEntry = pgTable("eventStandingEntry", {
  id: text("id").primaryKey(),
  standingId: text("standingId").notNull(),
  placement: integer("placement").notNull(),
  memberId: text("memberId"),
  playerName: text("playerName").notNull(),
  deckName: text("deckName").notNull(),
  decklistPathname: text("decklistPathname"),
  decklistFilename: text("decklistFilename"),
  decklistUrl: text("decklistUrl"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const scoringSession = pgTable("scoring_session", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  trackerId: text("tracker_id").notNull(),
  trackerName: text("tracker_name").notNull(),
  playerCount: integer("player_count").notNull(),
  roundCount: integer("round_count").notNull(),
  currentRound: integer("current_round").notNull().default(0),
  status: text("status").notNull().default("setup"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const scoringRound = pgTable("scoring_round", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({ uniqueRound: unique().on(t.sessionId, t.roundNumber) }))

export const scoringMatch = pgTable("scoring_match", {
  id: text("id").primaryKey(),
  roundId: text("round_id").notNull(),
  playerOneId: text("player_one_id"),
  playerOneName: text("player_one_name").notNull(),
  playerTwoId: text("player_two_id"),
  playerTwoName: text("player_two_name").notNull(),
  playerOneScore: integer("player_one_score").notNull().default(0),
  playerTwoScore: integer("player_two_score").notNull().default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const rsvp = pgTable(
  "rsvp",
  {
    id: text("id").primaryKey(),
    eventId: text("eventId").notNull(),
    userId: text("userId").notNull(),
    userName: text("userName").notNull(),
    status: text("status").notNull().default("going"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    uniqueRsvp: unique().on(t.eventId, t.userId),
  }),
)
