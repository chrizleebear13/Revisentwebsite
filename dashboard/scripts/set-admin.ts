import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setAdmin(email: string) {
  console.log(`Looking for user with email: ${email}`)

  // Find user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const user = users.users.find(u => u.email === email)

  if (!user) {
    console.error(`User not found with email: ${email}`)
    console.log('Available users:')
    users.users.forEach(u => console.log(`  - ${u.email}`))
    return
  }

  console.log(`Found user: ${user.email} (ID: ${user.id})`)

  // Update user profile to admin
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)
    .select()

  if (error) {
    console.error('Error updating user role:', error)
    return
  }

  console.log('✅ Successfully set user as admin!')
  console.log('User profile:', data)
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.error('Please provide an email address')
  console.error('Usage: npm run set-admin <email>')
  process.exit(1)
}

setAdmin(email)
