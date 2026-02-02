import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is an admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Get invite details from request body
    const { email, organization_id, role = 'client' } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!organization_id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Fetch organization name
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single()

    const organizationName = orgData?.name || 'your organization'

    // Use admin client to invite user
    const adminClient = createAdminClient()

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        organization_id: organization_id,
        organization_name: organizationName,
        role: role
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dashboard.revisent.com'}/auth/callback`
    })

    if (error) {
      console.error('Invite error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      user: data.user
    })
  } catch (error: any) {
    console.error('Invite API error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
