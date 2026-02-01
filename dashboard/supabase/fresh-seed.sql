-- Drop existing tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.waste_items CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.stations CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Create groups table first (no dependencies)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stations table (references groups)
CREATE TABLE public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create waste_items table (references stations)
CREATE TABLE public.waste_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('recycle', 'compost', 'landfill')),
  weight_grams DECIMAL(10, 2),
  item_type TEXT,
  confidence DECIMAL(5, 4),
  detected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_profiles table (references auth.users and groups)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_waste_items_station_id ON public.waste_items(station_id);
CREATE INDEX idx_waste_items_detected_at ON public.waste_items(detected_at);
CREATE INDEX idx_waste_items_category ON public.waste_items(category);
CREATE INDEX idx_stations_group_id ON public.stations(group_id);
CREATE INDEX idx_user_profiles_group_id ON public.user_profiles(group_id);

-- Enable Row Level Security
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stations
CREATE POLICY "Admins can view all stations" ON public.stations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view stations in their group" ON public.stations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'client'
      AND user_profiles.group_id = stations.group_id
    )
  );

-- RLS Policies for groups
CREATE POLICY "Admins can view all groups" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view their group" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'client'
      AND user_profiles.group_id = groups.id
    )
  );

-- RLS Policies for waste_items
CREATE POLICY "Admins can view all waste items" ON public.waste_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Clients can view waste items from their group's stations" ON public.waste_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.stations s ON s.group_id = up.group_id
      WHERE up.id = auth.uid()
      AND up.role = 'client'
      AND waste_items.station_id = s.id
    )
  );

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'
    )
  );

-- Function to automatically create user profile on signup
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON public.stations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- SEED MOCK DATA
-- ========================================

-- Insert Groups
INSERT INTO public.groups (name, created_at) VALUES
  ('Acme Corporation', NOW() - INTERVAL '180 days'),
  ('Tech Innovations Inc.', NOW() - INTERVAL '150 days'),
  ('Green Earth Org', NOW() - INTERVAL '120 days');

-- Get group IDs for stations
DO $$
DECLARE
  group1_id UUID;
  group2_id UUID;
  group3_id UUID;
  station1_id UUID;
  station2_id UUID;
  station3_id UUID;
  station4_id UUID;
  station5_id UUID;
  station6_id UUID;
  i INT;
  item_date TIMESTAMPTZ;
  item_category TEXT;
  item_type TEXT;
  item_confidence DECIMAL(5,4);
BEGIN
  -- Get group IDs
  SELECT id INTO group1_id FROM public.groups WHERE name = 'Acme Corporation';
  SELECT id INTO group2_id FROM public.groups WHERE name = 'Tech Innovations Inc.';
  SELECT id INTO group3_id FROM public.groups WHERE name = 'Green Earth Org';

  -- Insert Stations
  INSERT INTO public.stations (name, location, group_id, status, created_at) VALUES
    ('Acme HQ Main Entrance', 'Building A - Lobby', group1_id, 'active', NOW() - INTERVAL '180 days'),
    ('Acme Cafeteria Station', 'Building A - Cafeteria', group1_id, 'active', NOW() - INTERVAL '175 days'),
    ('Tech Hub Commons', 'Building B - Commons', group2_id, 'active', NOW() - INTERVAL '150 days'),
    ('Tech Kitchen', 'Building B - Kitchen', group2_id, 'active', NOW() - INTERVAL '145 days'),
    ('Green Earth Reception', 'Building C - Entrance', group3_id, 'active', NOW() - INTERVAL '120 days'),
    ('Green Earth Courtyard', 'Outdoor - Courtyard', group3_id, 'maintenance', NOW() - INTERVAL '115 days');

  -- Get station IDs
  SELECT id INTO station1_id FROM public.stations WHERE name = 'Acme HQ Main Entrance';
  SELECT id INTO station2_id FROM public.stations WHERE name = 'Acme Cafeteria Station';
  SELECT id INTO station3_id FROM public.stations WHERE name = 'Tech Hub Commons';
  SELECT id INTO station4_id FROM public.stations WHERE name = 'Tech Kitchen';
  SELECT id INTO station5_id FROM public.stations WHERE name = 'Green Earth Reception';
  SELECT id INTO station6_id FROM public.stations WHERE name = 'Green Earth Courtyard';

  -- Generate waste items for each station (90 days of data)
  FOR i IN 1..500 LOOP
    -- Random date within last 90 days
    item_date := NOW() - (RANDOM() * INTERVAL '90 days');

    -- Random category with realistic distribution (45% recycle, 30% compost, 25% landfill)
    CASE
      WHEN RANDOM() < 0.45 THEN
        item_category := 'recycle';
        item_type := (ARRAY['Plastic Bottle', 'Aluminum Can', 'Glass Bottle', 'Cardboard Box', 'Paper', 'Newspaper'])[FLOOR(RANDOM() * 6 + 1)];
        item_confidence := 0.70 + (RANDOM() * 0.25);
      WHEN RANDOM() < 0.75 THEN
        item_category := 'compost';
        item_type := (ARRAY['Apple Core', 'Banana Peel', 'Coffee Grounds', 'Tea Bag', 'Orange Peel', 'Lettuce'])[FLOOR(RANDOM() * 6 + 1)];
        item_confidence := 0.65 + (RANDOM() * 0.30);
      ELSE
        item_category := 'landfill';
        item_type := (ARRAY['Plastic Bag', 'Styrofoam Cup', 'Chip Bag', 'Candy Wrapper', 'Straw', 'Plastic Utensils'])[FLOOR(RANDOM() * 6 + 1)];
        item_confidence := 0.75 + (RANDOM() * 0.20);
    END CASE;

    -- Add some low-confidence outliers (10% chance)
    IF RANDOM() < 0.10 THEN
      item_confidence := 0.35 + (RANDOM() * 0.30);
    END IF;

    -- Insert for station 1
    INSERT INTO public.waste_items (station_id, category, item_type, weight_grams, confidence, detected_at)
    VALUES (station1_id, item_category, item_type, 50 + (RANDOM() * 450), item_confidence, item_date);

    -- Insert for station 2 (different distribution)
    IF RANDOM() < 0.8 THEN
      INSERT INTO public.waste_items (station_id, category, item_type, weight_grams, confidence, detected_at)
      VALUES (station2_id, item_category, item_type, 50 + (RANDOM() * 450), item_confidence, item_date);
    END IF;

    -- Insert for station 3
    IF RANDOM() < 0.7 THEN
      INSERT INTO public.waste_items (station_id, category, item_type, weight_grams, confidence, detected_at)
      VALUES (station3_id, item_category, item_type, 50 + (RANDOM() * 450), item_confidence, item_date);
    END IF;

    -- Insert for station 4
    IF RANDOM() < 0.9 THEN
      INSERT INTO public.waste_items (station_id, category, item_type, weight_grams, confidence, detected_at)
      VALUES (station4_id, item_category, item_type, 50 + (RANDOM() * 450), item_confidence, item_date);
    END IF;

    -- Insert for station 5
    IF RANDOM() < 0.6 THEN
      INSERT INTO public.waste_items (station_id, category, item_type, weight_grams, confidence, detected_at)
      VALUES (station5_id, item_category, item_type, 50 + (RANDOM() * 450), item_confidence, item_date);
    END IF;

    -- Station 6 has fewer items (under maintenance)
    IF RANDOM() < 0.3 THEN
      INSERT INTO public.waste_items (station_id, category, item_type, weight_grams, confidence, detected_at)
      VALUES (station6_id, item_category, item_type, 50 + (RANDOM() * 450), item_confidence, item_date);
    END IF;
  END LOOP;
END $$;
