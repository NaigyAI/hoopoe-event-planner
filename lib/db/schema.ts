import {
  pgTable,
  text,
  timestamp,
  boolean,
  date,
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
  notifyEnabled: boolean("notifyEnabled").notNull().default(true),
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
