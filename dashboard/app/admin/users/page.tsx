'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { Users, Mail, Building2, UserPlus, Check, AlertCircle, Loader2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Image from 'next/image'

interface UserProfile {
  id: string
  email: string
  role: string
  organization_id: string | null
  created_at: string
  organization?: {
    name: string
  }
}

interface Organization {
  id: string
  name: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteOrgId, setInviteOrgId] = useState('')
  const [inviteRole, setInviteRole] = useState('client')
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [inviteMessage, setInviteMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch users with their organizations
        const { data: usersData } = await supabase
          .from('user_profiles')
          .select(`
            *,
            organization:organizations(name)
          `)
          .order('created_at', { ascending: false })

        if (usersData) {
          setUsers(usersData)
        }

        // Fetch organizations for the invite dropdown
        const { data: orgsData } = await supabase
          .from('organizations')
          .select('id, name')
          .order('name')

        if (orgsData) {
          setOrganizations(orgsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteEmail || !inviteOrgId) {
      setInviteStatus('error')
      setInviteMessage('Please fill in all fields')
      return
    }

    setInviteStatus('loading')

    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          organization_id: inviteOrgId,
          role: inviteRole
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      setInviteStatus('success')
      setInviteMessage(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteOrgId('')
      setInviteRole('client')

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowInviteModal(false)
        setInviteStatus('idle')
        setInviteMessage('')
      }, 2000)
    } catch (error: any) {
      setInviteStatus('error')
      setInviteMessage(error.message || 'Failed to send invitation')
    }
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
              <h1 className="text-sm font-semibold">User Management</h1>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowInviteModal(true)}
            className="gap-1.5 h-8 text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite User
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-3 gradient-card shadow-sm border-0">
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </Card>
              <Card className="p-3 gradient-card shadow-sm border-0">
                <p className="text-xs text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'client').length}</p>
              </Card>
              <Card className="p-3 gradient-card shadow-sm border-0">
                <p className="text-xs text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              </Card>
              <Card className="p-3 gradient-card shadow-sm border-0">
                <p className="text-xs text-muted-foreground">Organizations</p>
                <p className="text-2xl font-bold">{organizations.length}</p>
              </Card>
            </div>

            {/* Users List */}
            <Card className="p-4 gradient-card shadow-sm border-0">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" />
                All Users
              </h3>
              <div className="space-y-2">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              user.role === 'admin'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {user.role}
                            </span>
                            {user.organization && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {user.organization.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-6 gradient-card shadow-lg border-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Invite User
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteStatus('idle')
                    setInviteMessage('')
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {inviteStatus === 'success' && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-green-600">{inviteMessage}</p>
                </div>
              )}

              {inviteStatus === 'error' && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{inviteMessage}</p>
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="h-9"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Organization
                  </label>
                  <select
                    value={inviteOrgId}
                    onChange={(e) => setInviteOrgId(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    required
                  >
                    <option value="">Select an organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  className="w-full h-9"
                  disabled={inviteStatus === 'loading'}
                >
                  {inviteStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Invitation'
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
