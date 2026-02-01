-- Run this in your Supabase SQL Editor
-- Go to: https://app.supabase.com/project/xyfhvxovruqfealplzws/editor/sql

-- Create profiles table to store user roles
create table if not exists profiles (
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

-- Drop trigger if it exists and recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Policies for profiles
drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Create waste_items table for tracking
create table if not exists waste_items (
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
drop policy if exists "Clients can view their own items" on waste_items;
create policy "Clients can view their own items"
  on waste_items for select
  using (auth.uid() = user_id);

-- Admins can see all items
drop policy if exists "Admins can view all items" on waste_items;
create policy "Admins can view all items"
  on waste_items for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Success message
select 'Database setup complete! You can now sign up at http://localhost:3000/signup' as message;
