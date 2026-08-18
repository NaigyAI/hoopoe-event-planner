import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await getSessionUser()
  redirect(user ? "/dashboard" : "/sign-in")
}
