import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  CalendarCheck,
  CalendarDays,
  ExternalLink,
  Lock,
  LogIn,
  UserRound,
  MapPin,
  Trophy,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getEventByToken, getGuestContext } from "@/app/actions/guest"
import { dateRange, formatDateRange, formatFullDate, formatTime } from "@/lib/dates"
import { AvailabilityGrid, type DateTally } from "@/components/availability-grid"
import { AttendancePanel } from "@/components/attendance-panel"
import { GuestJoinForm } from "@/components/guest-join-form"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const event = await getEventByToken(token)
  if (!event) return { title: "Shared event | Hoopoe Event Planner" }

  const date = formatDateRange(event.startDate, event.endDate ?? event.startDate)
  const time = event.startTime ? ` · ${formatTime(event.startTime)}${event.endTime ? `–${formatTime(event.endTime)}` : ""}` : ""
  const details = `${date}${time} · ${event.location}`
  return {
    title: event.title,
    description: `${details}. ${event.description ?? "Plan and share your availability with the team."}`,
    openGraph: {
      title: event.title,
      description: details,
      type: "website",
      url: `/join/${token}`,
      images: [{ url: `/join/${token}/opengraph-image`, width: 1200, height: 630, alt: `${event.title} event details` }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: details,
      images: [`/join/${token}/opengraph-image`],
    },
  }
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ edit?: string; continue?: string }>
}) {
  const { token } = await params
  const { edit, continue: continueMode } = await searchParams
  const { event, votes, rsvps, guest } = await getGuestContext(token)

  if (!event) notFound()

  const needsName = !guest?.name || edit === "1"

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4 sm:px-6">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CalendarCheck className="size-4" />
          </span>
          <span className="font-semibold tracking-tight">Hoopoe Event Planner</span>
          <Badge variant="secondary" className="ml-1 text-[10px]">
            Guest
          </Badge>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {needsName && continueMode !== "guest" && edit !== "1" ? (
          <JoinChoiceCard token={token} eventTitle={event.title} />
        ) : needsName ? (
          <Card className="mx-auto max-w-md p-6 sm:p-8">
            <GuestJoinForm
              token={token}
              eventTitle={event.title}
              defaultName={guest?.name ?? ""}
            />
          </Card>
        ) : (
          <GuestEventView
            token={token}
            event={event}
            votes={votes}
            rsvps={rsvps}
            guestId={guest!.id}
            guestName={guest!.name!}
          />
        )}
      </div>
    </main>
  )
}

function JoinChoiceCard({
  token,
  eventTitle,
}: {
  token: string
  eventTitle: string
}) {
  const returnTo = `/join/${token}`
  const signInHref = `/sign-in?returnTo=${encodeURIComponent(returnTo)}`
  const signUpHref = `/sign-up?returnTo=${encodeURIComponent(returnTo)}`

  return (
    <Card className="mx-auto max-w-md p-6 sm:p-8">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Hoopoe team event</p>
        <h1 className="text-2xl font-semibold tracking-normal text-balance">Choose how to respond</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          You&apos;re viewing <span className="font-medium text-foreground">{eventTitle}</span>. Sign in to use your team account, or continue as a guest to share availability without an account.
        </p>
      </div>
      <div className="mt-6 grid gap-3">
        <Link
          href={signInHref}
          className="flex min-h-12 items-center gap-3 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogIn className="size-4" />
          Sign in to respond
        </Link>
        <Link
          href={`/join/${token}?continue=guest`}
          className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserRound className="size-4 text-primary" />
          Continue as a guest
        </Link>
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
        New to Hoopoe? <Link href={signUpHref} className="font-medium text-foreground underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </Card>
  )
}

function GuestEventView({
  token,
  event,
  votes,
  rsvps,
  guestId,
  guestName,
}: {
  token: string
  event: Awaited<ReturnType<typeof getGuestContext>>["event"]
  votes: Awaited<ReturnType<typeof getGuestContext>>["votes"]
  rsvps: Awaited<ReturnType<typeof getGuestContext>>["rsvps"]
  guestId: string
  guestName: string
}) {
  if (!event) return null
  const isLocked = event.status === "locked"
  const isMultiDay = event.endDate != null && event.endDate !== event.startDate
  const days = isMultiDay ? [event.startDate] : dateRange(event.startDate, event.endDate ?? event.startDate)
  const scopedId = `guest:${guestId}`

  const totalRespondents = new Set(votes.map((v) => v.userId)).size

  const tallies: DateTally[] = days.map((date) => {
    const dayVotes = isMultiDay
      ? votes.filter((v) => v.date >= event.startDate && v.date <= (event.endDate ?? event.startDate))
      : votes.filter((v) => v.date === date)
    const available = dayVotes.filter((v) => v.status === "available").length
    const maybe = dayVotes.filter((v) => v.status === "maybe").length
    const unavailable = dayVotes.filter((v) => v.status === "unavailable").length
    const mine = dayVotes.find((v) => v.userId === scopedId)
    return {
      date,
      available,
      maybe,
      unavailable,
      score: available * 2 + maybe,
      responders: dayVotes.map((v) => v.userName),
      myStatus: (mine?.status as DateTally["myStatus"]) ?? null,
    }
  })

  let bestDate: string | null = null
  if (totalRespondents > 0) {
    const ranked = [...tallies].sort(
      (a, b) => b.score - a.score || a.unavailable - b.unavailable,
    )
    if (ranked[0] && ranked[0].score > 0) bestDate = ranked[0].date
  }
  const highlightDate = event.lockedDate ?? bestDate

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            {(event.eventType === "practice" || event.eventType === "training")
              ? "Practice"
              : event.eventType === "weekly"
                ? "Weekly"
                : event.eventType === "store-championship"
                  ? "Store Championship"
                  : event.eventType === "rcq"
                    ? "RC Qualifier"
                    : event.eventType === "regional"
                      ? "Regional Championship"
                      : event.eventType === "pro-tour"
                        ? "PT"
                        : event.eventType === "travel"
                          ? "Travel / logistics"
                          : "Team event"}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {event.title}
          </h1>
          {isLocked ? (
            <Badge className="gap-1 bg-accent text-accent-foreground hover:bg-accent">
              <Lock className="size-3" />
              Finalized
            </Badge>
          ) : (
            <Badge variant="secondary">Planning</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {formatDateRange(event.startDate, event.endDate ?? event.startDate)}
            {event.startTime ? ` · ${formatTime(event.startTime)}` : ""}
          </span>
          {event.location ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {event.location}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <Users className="size-4" />
            {totalRespondents} responded
          </span>
        </div>
        {event.description ? (
          <p className="max-w-2xl whitespace-pre-line text-pretty text-sm leading-6 text-muted-foreground">
            {event.description}
          </p>
        ) : null}
        {event.eventUrl ? (
          <a
            href={event.eventUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/30 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="size-4" />
            Official event details
          </a>
        ) : null}
        {event.travelDetails ? (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm leading-6">
            <p className="font-bold text-foreground">Travel notes</p>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{event.travelDetails}</p>
          </div>
        ) : null}
      </div>

      {/* Responding-as bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Responding as{" "}
          <span className="font-medium text-foreground">{guestName}</span>
        </p>
        <Link
          href={`/join/${token}?edit=1`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Change name
        </Link>
      </div>

      {/* Highlight banner */}
      {highlightDate ? (
        <div
          className={
            isLocked
              ? "flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3"
              : "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
          }
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
            {isLocked ? <Lock className="size-4" /> : <Trophy className="size-4" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isLocked ? "Confirmed date" : "Best date so far"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatFullDate(highlightDate)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Attendance / RSVP phase — only once a date is locked */}
      {isLocked && event.lockedDate ? (
        <AttendancePanel
          eventId={event.id}
          token={token}
          variant="guest"
          lockedDate={event.lockedDate}
          rsvps={rsvps}
          myUserId={scopedId}
        />
      ) : null}

      {/* Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">
            {isLocked ? "How the date was chosen" : "Mark your availability"}
          </h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-available" /> Yes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-maybe" /> Maybe
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-unavailable" /> No
            </span>
          </div>
        </div>

        <AvailabilityGrid
          eventId={event.id}
          eventEndDate={isMultiDay ? event.endDate : null}
          tallies={tallies}
          totalRespondents={totalRespondents}
          bestDate={bestDate}
          lockedDate={event.lockedDate}
          isAdmin={false}
          isLocked={isLocked}
          variant="guest"
          token={token}
        />
      </section>
    </div>
  )
}
