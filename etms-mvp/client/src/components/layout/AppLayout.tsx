import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface Props {
  children: ReactNode
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed sidebar */}
      <aside className="w-64 flex-shrink-0 h-full border-r border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <Sidebar />
      </aside>

      {/* Scrollable main content */}
      <main className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8" role="main">
        {children}
      </main>
    </div>
  )
}
