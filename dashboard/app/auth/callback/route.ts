import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Get user to determine redirect
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Check if user_profiles exists for this user
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', user.id)
        .single()

      // If no profile exists (OAuth user without trigger), create one
      // Use upsert to handle race conditions with trigger
      if (!existingProfile) {
        const metadata = user.user_metadata || {}
        await supabase
          .from('user_profiles')
          .upsert({
            id: user.id,
            email: user.email,
            role: metadata.role || 'client',
            organization_id: metadata.organization_id || null,
          }, { onConflict: 'id', ignoreDuplicates: true })
      }

      // Get role from profile (or default to client for new users)
      const role = existingProfile?.role || 'client'

      // Redirect based on role
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', requestUrl.origin))
      } else {
        return NextResponse.redirect(new URL('/client/dashboard', requestUrl.origin))
      }
    }
  }

  // Redirect to login on error
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
