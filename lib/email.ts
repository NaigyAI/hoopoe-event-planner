type EmailPayload = {
  to: string
  subject: string
  body: string
  html?: string
}

export async function sendEmail({ to, subject, body, html }: EmailPayload) {
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
      ...(html ? { html } : {}),
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
  recipients: { email: string; name: string; notifyEnabled: boolean; notifyNewEvent?: boolean; notifyEventReminder?: boolean }[]
  eventTitle: string
  eventLocation: string
  eventLink: string
  creatorName: string
}) {
  const targets = opts.recipients.filter((r) => r.notifyEnabled && (r.notifyNewEvent ?? true))
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
Hoopoe Event Planner`,
      })
    }),
  )
}

export async function notifyEventResponseReminder(opts: {
  recipients: { email: string; name: string; notifyEnabled: boolean; notifyNewEvent?: boolean; notifyEventReminder?: boolean }[]
  eventTitle: string
  eventLocation: string
  eventTime?: string
  eventLink: string
  creatorName: string
}) {
  const targets = opts.recipients.filter((r) => r.notifyEnabled && (r.notifyEventReminder ?? true))
  const results = await Promise.allSettled(
    targets.map((r) => {
      const firstName = r.name.trim().split(/\s+/)[0] || "there"
      return sendEmail({
        to: r.email,
        subject: `Reminder - ${opts.eventTitle} @ ${opts.eventLocation}`,
        body: `Hey ${firstName},

Just a reminder to let us know if you are joining us for:

${opts.eventTitle}
Where: ${opts.eventLocation}
Time: ${opts.eventTime || "TBC"}

${opts.eventLink}

Hope to see you there. The reps you put in today are the reason you're ready at your next event!

Cheers,
Hoopoe Event Planner`,
        html: `<p>Hey ${firstName},</p><p>Just a reminder to let us know if you are joining us for:</p><p><strong>${opts.eventTitle}</strong><br>Where: ${opts.eventLocation}<br>Time: ${opts.eventTime || "TBC"}</p><p><a href="${opts.eventLink}">${opts.eventLink}</a></p><p>Hope to see you there. The reps you put in today are the reason you're ready at your next event!</p><p>Cheers,<br>Hoopoe Event Planner</p>`,
      })
    }),
  )
  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  }
}

/**
 * One-time welcome email sent when an admin approves a pending sign-up.
 * Intentionally ignores the new-event / reminder toggles: this is an account
 * email, not an event notification. External members get a version without the
 * Report standings and Scoring sections, which they cannot access.
 */
export async function notifyMemberApproved(opts: {
  recipient: { email: string; name: string }
  role: "team-member" | "external-member"
  appLink: string
}) {
  const firstName = opts.recipient.name.trim().split(/\s+/)[0] || "there"
  const standingsSection =
    opts.role === "team-member"
      ? `Report standings & Scoring - after an event, log your results so
the team keeps track of how everyone is doing.

Past events - look back at previous events and their standings.

`
      : ""

  return sendEmail({
    to: opts.recipient.email,
    subject: "You're in - welcome to Hoopoe Event Planner",
    body: `Hey ${firstName},

Your account has been approved. Welcome to the Hoopoe Event Planner.

Here is how it works:

Dashboard - every upcoming event lives here. Open one to see the
date, time and location, and mark whether you are in.

Availability - add the dates you can play, and the team uses that
to find the date that works for the most people. Your status
updates automatically on events you cannot make.

${standingsSection}Profile & settings - update your name and choose which emails you
want: new events, reminders, or both.

Open the app here:
${opts.appLink}

Good luck out there. May your draws be kind!

Cheers,
Hoopoe Event Planner`,
  })
}

export async function notifyDateLocked(opts: {
  recipients: { email: string; name: string; notifyEnabled: boolean; notifyNewEvent?: boolean; notifyEventReminder?: boolean }[]
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
