import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect based on role
  if (user) {
    const role = user.user_metadata?.role
    if (role === 'admin') {
      redirect('/admin/dashboard')
    } else {
      redirect('/client/dashboard')
    }
  }

  // If not logged in, redirect to login
  redirect('/login')
}
