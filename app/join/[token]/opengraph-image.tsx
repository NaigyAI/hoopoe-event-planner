import { ImageResponse } from "next/og"
import { getEventByToken } from "@/app/actions/guest"
import { formatDateRange, formatTime } from "@/lib/dates"

export const runtime = "nodejs"
export const alt = "Hoopoe Event Planner shared event"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const themes: Record<string, { background: string; accent: string; glow: string; symbol: string }> = {
  rcq: { background: "#102a43", accent: "#f6c453", glow: "#2f80ed", symbol: "CROWN" },
  regional: { background: "#172554", accent: "#93c5fd", glow: "#4f46e5", symbol: "FORTRESS" },
  "store-championship": { background: "#3b1d12", accent: "#f59e0b", glow: "#dc2626", symbol: "FLAME" },
  practice: { background: "#123326", accent: "#86efac", glow: "#16a34a", symbol: "LEAF" },
  weekly: { background: "#241b4b", accent: "#c4b5fd", glow: "#7c3aed", symbol: "ARCANE" },
  other: { background: "#202124", accent: "#f3f4f6", glow: "#6b7280", symbol: "STAR" },
}

export default async function OpenGraphImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const event = await getEventByToken(token)
  if (!event) return new ImageResponse(<div style={{ display: "flex", background: "#111827", color: "white", padding: 80, fontSize: 52 }}>Event not found</div>, size)

  const theme = themes[event.eventType] ?? themes.other
  const date = formatDateRange(event.startDate, event.endDate ?? event.startDate)
  const time = event.startTime ? `${formatTime(event.startTime)}${event.endTime ? `–${formatTime(event.endTime)}` : ""}` : "Time to be confirmed"

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: theme.background, color: "white", padding: 52, position: "relative", fontFamily: "sans-serif" }}>
      <div style={{ position: "absolute", right: 70, top: 58, width: 390, height: 510, border: `3px solid ${theme.accent}`, borderRadius: 28, display: "flex", flexDirection: "column", padding: 22, background: `linear-gradient(145deg, ${theme.glow}, ${theme.background} 58%)`, boxShadow: `0 0 80px ${theme.glow}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: theme.accent }}><span>HOOPOE</span><span>{theme.symbol}</span></div>
        <div style={{ marginTop: 18, height: 245, borderRadius: 16, border: `2px solid ${theme.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, color: theme.accent }}>{theme.symbol}</div>
        <div style={{ marginTop: 20, fontSize: 24, color: theme.accent }}>FORMAT CHAMPION</div>
        <div style={{ marginTop: 12, fontSize: 18, lineHeight: 1.35, color: "#e5e7eb" }}>A gathering is being planned. Rally your team and find the best date.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: 680, justifyContent: "center" }}>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: theme.accent }}>HOOPOE EVENT PLANNER</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 64, lineHeight: 1.05, fontWeight: 700 }}>{event.title}</div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 30, color: "#f9fafb" }}>{date}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 27, color: "#d1d5db" }}>{time}</div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 27, color: "#d1d5db" }}>{event.location}</div>
        <div style={{ display: "flex", marginTop: 38, fontSize: 20, color: theme.accent }}>MARK YOUR AVAILABILITY</div>
      </div>
    </div>,
    size,
  )
}
