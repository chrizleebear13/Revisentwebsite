-- Re-enable Row Level Security
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can view all stations" ON public.stations;
DROP POLICY IF EXISTS "Clients can view stations in their group" ON public.stations;
DROP POLICY IF EXISTS "Admins can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Clients can view their group" ON public.groups;
DROP POLICY IF EXISTS "Admins can view all waste items" ON public.waste_items;
DROP POLICY IF EXISTS "Clients can view waste items from their group's stations" ON public.waste_items;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- ====================
-- STATIONS POLICIES
-- ====================

-- Allow all authenticated users to view all stations (simplified for now)
CREATE POLICY "Authenticated users can view stations" ON public.stations
  FOR SELECT USING (auth.role() = 'authenticated');

-- ====================
-- GROUPS POLICIES
-- ====================

-- Allow all authenticated users to view all groups (simplified for now)
CREATE POLICY "Authenticated users can view groups" ON public.groups
  FOR SELECT USING (auth.role() = 'authenticated');

-- ====================
-- WASTE ITEMS POLICIES
-- ====================

-- Allow all authenticated users to view all waste items (simplified for now)
CREATE POLICY "Authenticated users can view waste items" ON public.waste_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- ====================
-- USER PROFILES POLICIES
-- ====================

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow all authenticated users to view all profiles (needed for admin checks)
CREATE POLICY "Authenticated users can view profiles" ON public.user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');
