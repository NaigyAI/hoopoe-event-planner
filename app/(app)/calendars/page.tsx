import { redirect } from "next/navigation"
import { AdminCalendars } from "@/components/admin-calendars"
import { getAdminCalendars } from "@/app/actions/calendars"
import { getSessionUser } from "@/lib/session"

export default async function CalendarsPage() {
  const member = await getSessionUser()
  if (!member || !member.approved || !["admin", "superuser"].includes(member.role)) redirect("/dashboard")
  const start = new Date().toISOString().slice(0, 10)
  const endDate = new Date(); endDate.setDate(endDate.getDate() + 30)
  const calendars = await getAdminCalendars(start, endDate.toISOString().slice(0, 10))
  return <AdminCalendars initialCalendars={calendars} />
}
