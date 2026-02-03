'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Trash2,
  BarChart3,
  Leaf,
  Settings,
  Menu,
  X,
  ChevronRight,
  ExternalLink
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

export function DemoSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      label: 'Overview',
      href: '/demo/dashboard',
      icon: LayoutDashboard,
      description: 'Dashboard overview'
    },
    {
      label: 'Stations',
      href: '/demo/stations',
      icon: Trash2,
      description: 'Individual station stats'
    },
    {
      label: 'Analytics',
      href: '/demo/analytics',
      icon: BarChart3,
      description: 'Reports & insights'
    },
    {
      label: 'Impact',
      href: '/demo/impact',
      icon: Leaf,
      description: 'Environmental metrics'
    },
    {
      label: 'Settings',
      href: '/demo/settings',
      icon: Settings,
      description: 'Preferences & config'
    }
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-card/80 backdrop-blur-sm border border-border/50"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-card/50 backdrop-blur-xl border-r border-border/50
          transition-transform duration-300 z-40
          w-64 p-6 space-y-6
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="mb-2">
          <Image
            src="/assets/Revisentlogo.png"
            alt="Revisent"
            width={150}
            height={45}
            className="h-10 w-auto"
            priority
          />
          <div className="mt-2 px-2 py-1 bg-primary/10 rounded-full inline-flex items-center gap-1.5">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-primary">Demo Mode</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${active
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-primary' : ''}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.label}</span>
                    {active && <ChevronRight className="w-4 h-4" />}
                  </div>
                  {item.description && !active && (
                    <span className="text-xs text-muted-foreground/70 line-clamp-1">
                      {item.description}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Back to Website */}
        <div className="absolute bottom-6 left-6 right-6">
          <a
            href="https://revisent.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Back to Website
          </a>
        </div>
      </aside>
    </>
  )
}
