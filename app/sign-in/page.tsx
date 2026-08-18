import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { AuthForm } from "@/components/auth-form"
import { AuthShell } from "@/components/auth-shell"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const user = await getSessionUser()
  const { returnTo } = await searchParams
  if (user) redirect("/dashboard")
  return (
    <AuthShell>
      <AuthForm mode="sign-in" returnTo={returnTo} />
    </AuthShell>
  )
}
