import Link from "next/link"
import { notFound } from "next/navigation"
import {
  CalendarCheck,
  CalendarDays,
  Lock,
  MapPin,
  Trophy,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getGuestContext } from "@/app/actions/guest"
import { dateRange, formatDateRange, formatFullDate } from "@/lib/dates"
import { AvailabilityGrid, type DateTally } from "@/components/availability-grid"
import { AttendancePanel } from "@/components/attendance-panel"
import { GuestJoinForm } from "@/components/guest-join-form"

export const dynamic = "force-dynamic"

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { token } = await params
  const { edit } = await searchParams
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
        {needsName ? (
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
  const days = dateRange(event.startDate, event.endDate)
  const scopedId = `guest:${guestId}`

  const totalRespondents = new Set(votes.map((v) => v.userId)).size

  const tallies: DateTally[] = days.map((date) => {
    const dayVotes = votes.filter((v) => v.date === date)
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
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {event.title}
          </h1>
          {isLocked ? (
            <Badge className="gap-1 bg-accent text-accent-foreground hover:bg-accent">
              <Lock className="size-3" />
              Locked
            </Badge>
          ) : (
            <Badge variant="secondary">Planning</Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {formatDateRange(event.startDate, event.endDate)}
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
          <p className="max-w-2xl text-pretty text-sm text-muted-foreground">
            {event.description}
          </p>
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
