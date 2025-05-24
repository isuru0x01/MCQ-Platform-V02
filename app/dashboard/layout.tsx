'use client'

import { ReactNode, useState } from "react"
import DashboardSideBar from "./_components/dashboard-side-bar"
import DashboardTopNav from "./_components/dashbord-top-nav"
import { Analytics } from "@vercel/analytics/react"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Sidebar is collapsed by default
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className={`grid min-h-screen w-full transition-all duration-300 ${
      sidebarCollapsed ? 'lg:grid-cols-[80px_1fr]' : 'lg:grid-cols-[280px_1fr]'
    }`}>
      <DashboardSideBar collapsed={sidebarCollapsed} />
      <DashboardTopNav onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed}>
        <main className="flex flex-col gap-4 p-4 lg:gap-6">
          {children}
          <Analytics />
        </main>
      </DashboardTopNav>
    </div>
  )
}
