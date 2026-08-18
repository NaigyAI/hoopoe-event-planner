/**
 * Email notification stub.
 *
 * This is a no-op placeholder that logs instead of sending. To wire up real
 * transactional email, install `resend`, set RESEND_API_KEY, and replace the
 * body of `sendEmail` with a Resend call. The rest of the app calls these
 * helpers and does not need to change.
 */

type EmailPayload = {
  to: string
  subject: string
  body: string
}

export async function sendEmail({ to, subject, body }: EmailPayload) {
  // TODO: integrate Resend (or another provider) here.
  console.log("[v0] [email stub] would send email:", { to, subject, body })
  return { ok: true, stubbed: true }
}

export async function notifyEventCreated(opts: {
  recipients: { email: string; name: string; notifyEnabled: boolean }[]
  eventTitle: string
  creatorName: string
}) {
  const targets = opts.recipients.filter((r) => r.notifyEnabled)
  await Promise.all(
    targets.map((r) =>
      sendEmail({
        to: r.email,
        subject: `New event to plan: ${opts.eventTitle}`,
        body: `${opts.creatorName} created "${opts.eventTitle}". Add your availability in RCQ Planner.`,
      }),
    ),
  )
}

export async function notifyDateLocked(opts: {
  recipients: { email: string; name: string; notifyEnabled: boolean }[]
  eventTitle: string
  lockedDate: string
}) {
  const targets = opts.recipients.filter((r) => r.notifyEnabled)
  await Promise.all(
    targets.map((r) =>
      sendEmail({
        to: r.email,
        subject: `Date locked for ${opts.eventTitle}`,
        body: `The date ${opts.lockedDate} has been locked for "${opts.eventTitle}".`,
      }),
    ),
  )
}
