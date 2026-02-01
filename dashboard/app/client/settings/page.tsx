'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { Settings, User, Mail, Building2, Calendar, LogOut, Check, AlertCircle, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface UserProfile {
  id: string
  email: string
  role: string
  organization_id: string | null
  created_at: string
  organizationName?: string
}

export default function ClientSettings() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [passwordResetStatus, setPasswordResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [passwordResetMessage, setPasswordResetMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
            // Fetch organization name if organization_id exists
            if (profileData.organization_id) {
              const { data: orgData } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', profileData.organization_id)
                .single()

              setProfile({
                ...profileData,
                organizationName: orgData?.name || 'Unknown Organization'
              })
            } else {
              setProfile(profileData)
            }
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

  const handleSave = () => {
    // Show saved indicator
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DashboardSidebar isAdmin={false} />
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
          <div className="flex items-center gap-2">
            {saved && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 rounded-full border border-success/20">
                <Check className="w-3 h-3 text-success" />
                <span className="text-xs font-medium text-success">Saved</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5 h-8"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Sign out</span>
            </Button>
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
                    <Building2 className="w-3 h-3" />
                    Organization
                  </label>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium">{profile?.organizationName || 'No organization assigned'}</p>
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

            {/* Security - Change Password */}
            <Card className="p-4 gradient-card shadow-sm border-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Change Password
                </h3>
              </div>

              {/* Password Change Status Message */}
              {passwordResetStatus === 'success' && (
                <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-600">Password Updated!</p>
                    <p className="text-xs text-green-600/80 mt-0.5">{passwordResetMessage}</p>
                  </div>
                </div>
              )}

              {passwordResetStatus === 'error' && (
                <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-xs text-destructive/80 mt-0.5">{passwordResetMessage}</p>
                  </div>
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault()

                  if (newPassword.length < 6) {
                    setPasswordResetStatus('error')
                    setPasswordResetMessage('Password must be at least 6 characters')
                    setTimeout(() => setPasswordResetStatus('idle'), 5000)
                    return
                  }

                  if (newPassword !== confirmPassword) {
                    setPasswordResetStatus('error')
                    setPasswordResetMessage('Passwords do not match')
                    setTimeout(() => setPasswordResetStatus('idle'), 5000)
                    return
                  }

                  setPasswordResetStatus('loading')

                  try {
                    const { error } = await supabase.auth.updateUser({
                      password: newPassword
                    })
                    if (error) throw error

                    setPasswordResetStatus('success')
                    setPasswordResetMessage('Your password has been changed successfully')
                    setNewPassword('')
                    setConfirmPassword('')

                    setTimeout(() => setPasswordResetStatus('idle'), 5000)
                  } catch (error: any) {
                    setPasswordResetStatus('error')
                    setPasswordResetMessage(error.message || 'Failed to update password')
                    setTimeout(() => setPasswordResetStatus('idle'), 5000)
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="h-9 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="h-9 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-9"
                  disabled={passwordResetStatus === 'loading' || !newPassword || !confirmPassword}
                >
                  {passwordResetStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
