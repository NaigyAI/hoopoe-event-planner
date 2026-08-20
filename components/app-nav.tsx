"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CalendarCheck, ClipboardList, History, LogOut, User, Users } from "lucide-react"

type NavUser = {
  name: string
  email: string
  role: string
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function AppNav({ user }: { user: NavUser }) {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-medium tracking-tight"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarCheck className="size-4" />
          </div>
          <span className="text-lg">Hoopoe Event Planner</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-auto gap-2 py-1.5 pl-1.5 pr-2.5"
              />
            }
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">
              {user.name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col gap-1 px-1.5 py-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                {user.name}
                {user.role === "superuser" ? (
                  <Badge className="text-[10px]">Superuser</Badge>
                ) : user.role === "admin" ? (
                  <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                ) : null}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </div>
            <DropdownMenuSeparator />
            {(user.role === "admin" || user.role === "superuser") && (
              <DropdownMenuItem render={<Link href="/members" />}>
                <Users className="size-4" />
                Members
              </DropdownMenuItem>
            )}
            <DropdownMenuItem render={<Link href="/past-events" />}>
              <History className="size-4" />
              Past events
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/report-standings" />}>
              <ClipboardList className="size-4" />
              Report standings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/profile" />}>
              <User className="size-4" />
              Profile &amp; settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
