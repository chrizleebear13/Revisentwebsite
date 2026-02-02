'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Leaf, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('') // Can be email or username
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [processingToken, setProcessingToken] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Handle hash-based auth tokens (from invite links)
  useEffect(() => {
    const handleHashToken = async () => {
      const hash = window.location.hash
      if (!hash || !hash.includes('access_token')) return

      setProcessingToken(true)

      try {
        // Parse hash params
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        if (accessToken && refreshToken) {
          // Set the session
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) throw error

          // Get user to determine redirect
          const { data: { user } } = await supabase.auth.getUser()

          if (user) {
            // If this is an invite, redirect to set password first
            if (type === 'invite') {
              router.push('/auth/set-password?from=invite')
              return
            }

            // Get role from profile or metadata
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('role')
              .eq('id', user.id)
              .single()

            const role = profile?.role || user.user_metadata?.role || 'client'

            if (role === 'admin') {
              router.push('/admin/dashboard')
            } else {
              router.push('/client/dashboard')
            }
          }
        }
      } catch (err: any) {
        console.error('Error processing token:', err)
        setError(err.message || 'Failed to process invitation')
        setProcessingToken(false)
      }
    }

    handleHashToken()
  }, [supabase, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let email = identifier

      // Check if identifier is a username (doesn't contain @)
      if (!identifier.includes('@')) {
        // Look up email by username
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('username', identifier.toLowerCase())
          .single()

        if (profileError || !profile) {
          throw new Error('Username not found')
        }

        email = profile.email
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Redirect based on role
      const role = data.user?.user_metadata?.role
      if (role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/client/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider: 'google') => {
    setError(null)
    setOauthLoading(provider)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message || `An error occurred signing in with ${provider}`)
      setOauthLoading(null)
    }
  }

  // Show loading while processing invite token
  if (processingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-subtle">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center gradient-subtle px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Leaf className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your Revisent dashboard
          </p>
        </div>

        <Card className="space-y-4 rounded-xl gradient-card shadow-medium border-0 p-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 gap-2 bg-background hover:bg-success/10 hover:text-success hover:border-success/30 transition-colors text-sm"
            onClick={() => handleOAuthLogin('google')}
            disabled={oauthLoading !== null}
          >
            {oauthLoading === 'google' ? (
              'Connecting...'
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or sign in with credentials</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-sm">Username or Email</Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-10"
                placeholder="username or email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || oauthLoading !== null}
              className="w-full h-10 gradient-primary shadow-glow hover:shadow-strong transition-all gap-2 text-sm"
            >
              <Mail className="w-4 h-4" />
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{' '}
          <Link
            href="/signup"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
