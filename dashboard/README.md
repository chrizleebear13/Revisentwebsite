# Revisent Dashboard

A Next.js 16 dashboard with admin and client portals for real-time waste tracking and analytics, powered by Supabase.

## Features

- **Role-Based Access Control**: Separate dashboards for admins and clients
- **Supabase Authentication**: Secure login/signup with email/password
- **Real-time Updates**: Built-in support for Supabase real-time subscriptions
- **Protected Routes**: Middleware-based route protection
- **TypeScript**: Fully typed with TypeScript
- **Tailwind CSS**: Utility-first CSS framework

## Tech Stack

- **Frontend**: Next.js 16 (App Router)
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Deployment**: Vercel (recommended)

## Project Structure

```
dashboard/
├── app/
│   ├── admin/
│   │   ├── dashboard/          # Admin dashboard page
│   │   └── layout.tsx          # Admin-only layout with auth check
│   ├── client/
│   │   ├── dashboard/          # Client dashboard page
│   │   └── layout.tsx          # Client-only layout with auth check
│   ├── login/                  # Login page
│   ├── signup/                 # Signup page
│   ├── api/
│   │   └── auth/
│   │       └── signout/        # Sign out API route
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page (redirects based on auth)
├── lib/
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       ├── server.ts           # Server Supabase client
│       └── middleware.ts       # Supabase middleware helper
├── middleware.ts               # Next.js middleware for route protection
├── .env.local                  # Environment variables (DO NOT commit)
└── .env.local.example          # Environment variables template
```

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to be ready
4. Go to **Project Settings** → **API**
5. Copy your **Project URL** and **anon/public key**

### 2. Configure Environment Variables

1. Open `dashboard/.env.local`
2. Replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Supabase Database

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Create profiles table to store user roles
create table profiles (
  id uuid references auth.users primary key,
  email text,
  role text check (role in ('admin', 'client')) default 'client',
  organization_id uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Create a trigger to automatically create a profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Policies
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Example: Create waste_items table for tracking
create table waste_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  organization_id uuid,
  item_type text not null,
  weight_lbs decimal not null,
  station_id uuid,
  processed_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

alter table waste_items enable row level security;

-- Clients can only see their own items
create policy "Clients can view their own items"
  on waste_items for select
  using (auth.uid() = user_id);

-- Admins can see all items
create policy "Admins can view all items"
  on waste_items for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
```

### 4. Create an Admin User

After running the SQL setup, you need to create your first admin user:

```sql
-- First, sign up a user through the app at /signup
-- Then, update their role to admin:
update profiles
set role = 'admin'
where email = 'your-admin-email@example.com';
```

### 5. Install Dependencies & Run

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Sign Up / Login

1. Go to `/signup` to create a new account (default role: client)
2. Go to `/login` to sign in
3. Based on your role, you'll be redirected to:
   - `/admin/dashboard` - for admin users
   - `/client/dashboard` - for client users

### Admin Dashboard

- View all users and waste tracking data
- Manage waste stations
- View analytics across all organizations
- Quick actions for common admin tasks

### Client Dashboard

- View real-time waste tracking for your organization
- See CO2 savings and metrics
- Track recent activity
- Connect Revi stations

## Adding Real-Time Features

To add real-time waste tracking, use Supabase subscriptions:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function WasteTracker() {
  const [items, setItems] = useState([])
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to new waste items
    const channel = supabase
      .channel('waste-items')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'waste_items'
        },
        (payload) => {
          setItems(prev => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.item_type} - {item.weight_lbs} lbs</div>
      ))}
    </div>
  )
}
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [https://vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

### Environment Variables

Make sure to add these in Vercel's project settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-dashboard.vercel.app
```

## Next Steps

1. **Add shadcn/ui components** for better UI:
   ```bash
   npx shadcn@latest init
   npx shadcn@latest add button card table
   ```

2. **Create organization management**:
   - Add organizations table
   - Link users to organizations
   - Filter data by organization

3. **Add analytics dashboard**:
   - Use Recharts for charts
   - Add date range filters
   - Export reports

4. **Implement station management**:
   - CRUD for waste stations
   - Real-time station status
   - Station-to-organization mapping

5. **Add email notifications**:
   - Use Supabase Edge Functions
   - Send alerts for important events
   - Weekly summary emails

## Troubleshooting

### "Invalid credentials" on login
- Make sure your Supabase credentials are correct in `.env.local`
- Restart the dev server after changing `.env.local`

### Redirects not working
- Check middleware.ts is in the root of the dashboard folder
- Verify user_metadata.role is set correctly in Supabase

### Can't access admin dashboard
- Make sure the user's role in the profiles table is set to 'admin'
- Check browser console for errors

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
