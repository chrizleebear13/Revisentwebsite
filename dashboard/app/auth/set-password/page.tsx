'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { KeyRound, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  useEffect(() => {
    const verifyToken = async () => {
      if (!token_hash || !type) {
        setError('Invalid or missing token')
        setVerifying(false)
        return
      }

      try {
        // Verify the OTP token
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'invite' | 'recovery',
        })

        if (error) {
          setError(error.message)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to verify token')
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token_hash, type, supabase.auth])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)

      // Get user role and redirect
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        setTimeout(() => {
          if (profile?.role === 'admin') {
            router.push('/admin/dashboard')
          } else {
            router.push('/client/dashboard')
          }
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-subtle">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your invitation...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-subtle">
        <Card className="w-full max-w-md p-8 text-center gradient-card border-0">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Password Set!</h1>
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-subtle px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-2xl bg-primary/10">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Set Your Password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a password to complete your account setup
          </p>
        </div>

        <Card className="space-y-4 rounded-xl gradient-card shadow-medium border-0 p-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">New Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-sm">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !!error}
              className="w-full h-10 gradient-primary shadow-glow hover:shadow-strong transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting password...
                </>
              ) : (
                'Set Password & Continue'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
