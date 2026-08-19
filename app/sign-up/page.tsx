import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"
import { AuthShell } from "@/components/auth-shell"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; invite?: string }>
}) {
  const user = await getSessionUser()
  const { returnTo, invite } = await searchParams
  if (user) redirect("/dashboard")
  return (
    <AuthShell>
      <AuthForm mode="sign-up" returnTo={returnTo} inviteToken={invite} />
    </AuthShell>
  )
}
