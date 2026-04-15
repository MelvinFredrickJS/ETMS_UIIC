import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface Props {
  children: ReactNode
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Fixed sidebar */}
      <div className="w-60 flex-shrink-0 h-full bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Scrollable main content */}
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
