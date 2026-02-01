'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { User, Mail, Calendar, LogOut, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface UserProfile {
  id: string
  email: string
  role: string
  created_at: string
}

export default function AdminSettings() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileData) {
            setProfile(profileData)
          }
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching profile:', error)
        setLoading(false)
      }
    }

    fetchProfile()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DashboardSidebar isAdmin={true} />
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-3 md:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/Revisentlogo.png"
              alt="Revisent"
              width={120}
              height={36}
              className="h-8 w-auto"
              priority
            />
            <div className="hidden sm:block w-px h-6 bg-border/50"></div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold">Settings</h1>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="max-w-3xl space-y-3">
            {/* Profile Information */}
            <Card className="p-4 gradient-card shadow-sm border-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Profile Information
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    Email Address
                  </label>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium">{user?.email || profile?.email || 'Not available'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    Role
                  </label>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium capitalize">{profile?.role || 'Unknown'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Account Created
                  </label>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString('en-US', {
                            month: '2-digit',
                            day: '2-digit',
                            year: 'numeric'
                          })
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Account Actions */}
            <Card className="p-4 gradient-card shadow-sm border-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Account Actions</h3>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs h-9"
                  onClick={() => {
                    alert('Password reset functionality would be implemented here')
                  }}
                >
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs h-9"
                  onClick={() => {
                    alert('Data export functionality would be implemented here')
                  }}
                >
                  Export Platform Data
                </Button>
              </div>
            </Card>

            {/* Help & Support */}
            <Card className="p-4 gradient-card shadow-sm border-0 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
              <h3 className="text-sm font-semibold mb-2">Need Help?</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Contact support for assistance with your admin account or platform management.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  window.location.href = 'mailto:support@revisent.com'
                }}
              >
                Contact Support
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
