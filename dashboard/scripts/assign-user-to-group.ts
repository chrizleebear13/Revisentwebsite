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

async function assignUserToGroup(email: string) {
  console.log(`\n🔍 Looking for user: ${email}\n`)

  // Find user in auth
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const user = users.users.find(u => u.email === email)

  if (!user) {
    console.error(`❌ User not found with email: ${email}`)
    console.log('\nAvailable users:')
    users.users.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`))
    return
  }

  console.log(`✅ Found user: ${user.email} (ID: ${user.id})`)

  // Get the first group
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('*')
    .limit(1)

  if (groupsError || !groups || groups.length === 0) {
    console.error('❌ No groups found. Run seed script first.')
    return
  }

  const group = groups[0]
  console.log(`\n📦 Assigning to group: ${group.name} (ID: ${group.id})`)

  // Update user profile with group_id
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ group_id: group.id })
    .eq('id', user.id)

  if (updateError) {
    console.error('❌ Error updating user profile:', updateError)
    return
  }

  console.log(`\n✅ Successfully assigned user to group!`)
  console.log(`   User: ${user.email}`)
  console.log(`   Group: ${group.name}`)
  console.log('\n🎉 You can now view data in the dashboard!')
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.error('Please provide an email address')
  console.error('Usage: tsx scripts/assign-user-to-group.ts <email>')
  process.exit(1)
}

assignUserToGroup(email)
