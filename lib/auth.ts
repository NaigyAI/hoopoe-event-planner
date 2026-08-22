import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// The very first person to sign up becomes the admin so the workspace
// is usable out of the box. Everyone after them is a regular member.
async function isFirstUser() {
  const res = await pool.query('SELECT COUNT(*)::int AS count FROM "user"')
  return (res.rows[0]?.count ?? 0) === 0
}

function getBaseURL() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return process.env.V0_RUNTIME_URL ?? "https://eventplanner.hoopoeboys.com"
}

const isDev = process.env.NODE_ENV === "development"

function asOrigin(value?: string) {
  if (!value) return null
  return value.startsWith("http://") || value.startsWith("https://")
    ? value.replace(/\/$/, "")
    : `https://${value}`
}

function getTrustedOrigins() {
  if (isDev) {
    const origins = [
      "http://localhost:3000",
      "https://*.vusercontent.net",
      "https://*.vercel.run",
      "https://*.v0.build",
    ]
    const runtimeOrigin = asOrigin(process.env.V0_RUNTIME_URL)
    if (runtimeOrigin) origins.push(runtimeOrigin)
    return origins
  }
  return [
    asOrigin(process.env.BETTER_AUTH_URL),
    asOrigin(process.env.VERCEL_URL),
    asOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    "https://eventplanner.hoopoeboys.com",
  ].filter((origin): origin is string => Boolean(origin))
}

export const auth = betterAuth({
  baseURL: getBaseURL(),
  trustedOrigins: getTrustedOrigins(),
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const first = await isFirstUser()
          return {
            data: {
              ...user,
              role: first ? "admin" : "member",
              // The first user (the admin) is auto-approved. Everyone after
              // them stays pending until an admin approves them.
              approved: first,
            },
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "member",
        input: false,
      },
      approved: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      notifyEnabled: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      notifyNewEvent: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      notifyEventReminder: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  ...(isDev
    ? {
        advanced: {
          // Required by the cross-site v0 preview iframe. Without these
          // attributes, login succeeds but the next request appears signed out.
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
  plugins: [nextCookies()],
})
