import { auth } from "@/lib/auth"
import { enforceRateLimit } from "@/lib/rate-limit"
import { toNextJsHandler } from "better-auth/next-js"

const handler = toNextJsHandler(auth)

export const GET = handler.GET

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")
  await enforceRateLimit("auth", `ip:${forwarded || realIp || "unknown"}`)
  return handler.POST(request)
}
