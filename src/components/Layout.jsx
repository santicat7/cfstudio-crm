import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import PageErrorBoundary from './PageErrorBoundary'
import { Menu } from 'lucide-react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="md:ml-60 min-h-screen flex flex-col">
        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 md:px-8 py-3 border-b border-[#E8E8E8] bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 text-[#666] hover:text-[#111] transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="md:hidden text-sm font-semibold text-[#111]">C&amp;F Studio</span>
          <div className="hidden md:flex flex-1 justify-end">
            <GlobalSearch />
          </div>
        </div>

        <main className="flex-1 p-6 md:p-8">
          <PageErrorBoundary>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  )
}
