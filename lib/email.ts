type EmailPayload = {
  to: string
  subject: string
  body: string
}

export async function sendEmail({ to, subject, body }: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Resend email failed (${response.status}): ${details}`)
  }

  return { ok: true }
}

export async function notifyEventCreated(opts: {
  recipients: { email: string; name: string; notifyEnabled: boolean }[]
  eventTitle: string
  eventLocation: string
  eventLink: string
  creatorName: string
}) {
  const targets = opts.recipients.filter((r) => r.notifyEnabled)
  await Promise.all(
    targets.map((r) => {
      const firstName = r.name.trim().split(/\s+/)[0] || "there"
      return sendEmail({
        to: r.email,
        subject: `New event planned - ${opts.eventTitle} @ ${opts.eventLocation}`,
        body: `Hey ${firstName},

${opts.creatorName} just added a new event for the team:

${opts.eventTitle}
Where: ${opts.eventLocation}

Check out the details and let us know if you are joining us:
${opts.eventLink}

Hope to see you there. May your draws be kind!

Cheers,
Hoopoe`,
      })
    }),
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
