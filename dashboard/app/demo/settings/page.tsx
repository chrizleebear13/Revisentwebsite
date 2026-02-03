'use client'

import { DemoSidebar } from '@/components/DemoSidebar'
import { Card } from '@/components/ui/card'
import { Settings, Bell, User, Building2, Palette } from 'lucide-react'

export default function DemoSettings() {
  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DemoSidebar />
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your preferences</p>
        </div>

        <div className="grid gap-4 max-w-2xl">
          <Card className="p-5 gradient-card shadow-sm border-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Profile</h3>
                <p className="text-sm text-muted-foreground">Manage your account details</p>
              </div>
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                Edit
              </button>
            </div>
          </Card>

          <Card className="p-5 gradient-card shadow-sm border-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Organization</h3>
                <p className="text-sm text-muted-foreground">Demo Organization Inc.</p>
              </div>
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                View
              </button>
            </div>
          </Card>

          <Card className="p-5 gradient-card shadow-sm border-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-sm text-muted-foreground">Configure alert preferences</p>
              </div>
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                Configure
              </button>
            </div>
          </Card>

          <Card className="p-5 gradient-card shadow-sm border-0">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Appearance</h3>
                <p className="text-sm text-muted-foreground">Theme and display settings</p>
              </div>
              <button className="px-4 py-2 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                Customize
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
