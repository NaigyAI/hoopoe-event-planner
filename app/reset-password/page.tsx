import { AuthShell } from "@/components/auth-shell"
import { ResetPasswordForm } from "@/components/reset-password-form"

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const params = await searchParams
  return (
    <AuthShell>
      {params.token ? (
        <ResetPasswordForm token={params.token} />
      ) : (
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold">Invalid reset link</h1>
          <p className="mt-2 text-sm text-muted-foreground">This link is missing or has expired. Request a new one from the sign-in page.</p>
        </div>
      )}
    </AuthShell>
  )
}
