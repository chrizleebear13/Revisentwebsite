-- Disable Row Level Security on all tables
ALTER TABLE public.stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (optional, but cleaner)
DROP POLICY IF EXISTS "Admins can view all stations" ON public.stations;
DROP POLICY IF EXISTS "Clients can view stations in their group" ON public.stations;
DROP POLICY IF EXISTS "Admins can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Clients can view their group" ON public.groups;
DROP POLICY IF EXISTS "Admins can view all waste items" ON public.waste_items;
DROP POLICY IF EXISTS "Clients can view waste items from their group's stations" ON public.waste_items;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
