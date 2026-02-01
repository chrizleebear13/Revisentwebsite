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

async function checkUser(email: string) {
  console.log(`\nChecking user: ${email}\n`)

  // Find user in auth
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const user = users.users.find(u => u.email === email)

  if (!user) {
    console.error(`❌ User not found in auth.users with email: ${email}`)
    console.log('\nAvailable users:')
    users.users.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`))
    return
  }

  console.log(`✅ Found user in auth.users:`)
  console.log(`   Email: ${user.email}`)
  console.log(`   ID: ${user.id}`)
  console.log(`   Created: ${user.created_at}`)

  // Check user_profiles table
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('\n❌ Error fetching user profile:', profileError)
    console.error('   This means user_profiles entry does not exist!')
    return
  }

  if (!profile) {
    console.error('\n❌ No profile found in user_profiles table')
    return
  }

  console.log(`\n✅ Found profile in user_profiles:`)
  console.log(`   Role: ${profile.role}`)
  console.log(`   Email: ${profile.email}`)
  console.log(`   Group ID: ${profile.group_id || 'None'}`)
  console.log(`   Created: ${profile.created_at}`)

  if (profile.role === 'admin') {
    console.log('\n✅ User is an ADMIN')
  } else {
    console.log('\n⚠️  User is NOT an admin, role is:', profile.role)
  }
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.error('Please provide an email address')
  console.error('Usage: npm run check-user <email>')
  process.exit(1)
}

checkUser(email)
