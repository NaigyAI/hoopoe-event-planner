import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()

const limiters = {
  auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "10 m"), prefix: "hoopoe:auth" }),
  invite: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), prefix: "hoopoe:invite" }),
  rsvp: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "hoopoe:rsvp" }),
  reminder: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "10 m"), prefix: "hoopoe:reminder" }),
  join: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "10 m"), prefix: "hoopoe:join" }),
}

export type RateLimitKind = keyof typeof limiters

export async function enforceRateLimit(kind: RateLimitKind, key: string) {
  const result = await limiters[kind].limit(key)
  if (!result.success) throw new Error("Too many requests. Please try again later.")
  return result
}

export async function requestKey(prefix: string) {
  const requestHeaders = await import("next/headers").then(({ headers }) => headers())
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = requestHeaders.get("x-real-ip")
  return `${prefix}:${forwarded || realIp || "unknown"}`
}
