import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import PageErrorBoundary from './PageErrorBoundary'
import { Menu } from 'lucide-react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-page transition-colors duration-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="md:ml-60 min-h-screen flex flex-col">
        {/* Topbar */}
        <div
          className="sticky top-0 z-10 flex items-center gap-3 px-4 md:px-8 border-b border-line bg-page"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
            paddingBottom: '0.75rem',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 text-body/50 hover:text-body transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="md:hidden flex items-center">
            <img src="/logo-light.png" alt="C&F Studio" className="h-5 w-auto dark:hidden" />
            <img src="/logo-dark.png" alt="C&F Studio" className="h-5 w-auto hidden dark:block" />
          </div>
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
