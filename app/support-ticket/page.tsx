import { Suspense } from "react"
import SupportTicketClient from "./SupportTicketClient"

export const dynamic = "force-dynamic"

export default function SupportTicketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <SupportTicketClient />
    </Suspense>
  )
}
