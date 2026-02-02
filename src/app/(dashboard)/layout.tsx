'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/navigation/sidebar'
import { Header } from '@/components/navigation/header'
import { ThemeToggleButton } from '@/components/ui/theme-toggle-button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem('dc.sidebar.compact')
    if (stored) {
      setIsCollapsed(stored === 'true')
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('dc.sidebar.compact', String(isCollapsed))
  }, [isCollapsed])

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b border-border/50 bg-background/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 -ml-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar
                isCollapsed={false}
                onToggleCollapse={() => {}}
                onCloseMobile={() => setSidebarOpen(false)}
                isMobile
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">D</span>
            </div>
            <span className="font-semibold text-sm">Decora Agent</span>
          </div>
        </div>
        <ThemeToggleButton className="h-8 w-8" />
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden md:block md:fixed md:inset-y-0 transition-all duration-300 ease-out z-40 overflow-visible",
            isCollapsed ? "md:w-16" : "md:w-64"
          )}
        >
          <Sidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          />
        </aside>

        {/* Main content */}
        <main
          className={cn(
            "flex-1 min-h-screen transition-all duration-300 ease-out",
            isCollapsed ? "md:pl-16" : "md:pl-64"
          )}
        >
          {/* Desktop Header */}
          <div className="hidden md:block sticky top-0 z-30">
            <Header />
          </div>
          
          {/* Page Content */}
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
