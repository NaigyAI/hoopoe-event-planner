import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
  approved: boolean
  notifyEnabled: boolean
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const u = session.user as unknown as SessionUser
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? "member",
    approved: u.approved ?? false,
    notifyEnabled: u.notifyEnabled ?? true,
  }
}

/** Require a logged-in user or redirect to sign-in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")
  return user
}

/** Require an admin user or throw. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== "admin" && user.role !== "superuser") {
    throw new Error("Forbidden: admin access required")
  }
  return user
}

/** Require the elevated superuser role. */
export async function requireSuperuser(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== "superuser") {
    throw new Error("Forbidden: superuser access required")
  }
  return user
}

/** Require a logged-in AND approved user (admins are always approved). */
export async function requireApprovedUser(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== "admin" && user.role !== "superuser" && !user.approved) {
    throw new Error("Forbidden: your account is pending approval")
  }
  return user
}
