-- Create impact_factors table
CREATE TABLE IF NOT EXISTS public.impact_factors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key TEXT UNIQUE NOT NULL,
  co2_saved_kg DECIMAL DEFAULT 0,
  water_saved_gal DECIMAL DEFAULT 0,
  energy_saved_kwh DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.impact_factors ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read impact factors
CREATE POLICY "Authenticated users can view impact factors" ON public.impact_factors
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert common recyclable items with environmental impact data
-- Values are estimates per item based on EPA and recycling industry data

INSERT INTO public.impact_factors (item_key, co2_saved_kg, water_saved_gal, energy_saved_kwh) VALUES
  -- Plastics
  ('plastic bottle', 0.08, 1.5, 0.12),
  ('plastic container', 0.05, 1.0, 0.08),
  ('plastic bag', 0.02, 0.3, 0.03),
  ('plastic cup', 0.03, 0.5, 0.04),
  ('plastic wrapper', 0.01, 0.2, 0.02),

  -- Paper/Cardboard
  ('cardboard', 0.15, 3.5, 0.25),
  ('paper', 0.05, 2.0, 0.10),
  ('newspaper', 0.04, 1.5, 0.08),
  ('magazine', 0.06, 2.0, 0.12),
  ('cardboard box', 0.20, 4.0, 0.30),

  -- Glass
  ('glass bottle', 0.12, 0.5, 0.08),
  ('glass jar', 0.10, 0.4, 0.07),
  ('glass container', 0.11, 0.45, 0.075),

  -- Aluminum/Metal
  ('aluminum can', 0.18, 2.0, 0.35),
  ('metal can', 0.15, 1.5, 0.28),
  ('tin can', 0.14, 1.4, 0.26),
  ('aluminum foil', 0.05, 0.5, 0.10),

  -- Food/Compost
  ('food waste', 0.03, 0.1, 0.01),
  ('food scraps', 0.03, 0.1, 0.01),
  ('fruit', 0.02, 0.08, 0.01),
  ('vegetable', 0.02, 0.08, 0.01),
  ('coffee grounds', 0.01, 0.05, 0.005),
  ('tea bag', 0.01, 0.03, 0.003),
  ('eggshell', 0.005, 0.02, 0.002),
  ('banana peel', 0.015, 0.05, 0.008),
  ('apple core', 0.01, 0.04, 0.006),

  -- Electronics (higher impact)
  ('battery', 0.50, 5.0, 1.0),
  ('electronics', 1.20, 10.0, 2.5),
  ('phone', 2.00, 15.0, 4.0),
  ('charger', 0.30, 2.0, 0.5),

  -- Textiles
  ('clothing', 0.25, 8.0, 0.40),
  ('fabric', 0.20, 6.0, 0.30),
  ('shoes', 0.35, 10.0, 0.50),

  -- Common generic items
  ('bottle', 0.10, 1.2, 0.10),
  ('can', 0.16, 1.8, 0.30),
  ('box', 0.12, 2.5, 0.18),
  ('container', 0.08, 1.0, 0.10),
  ('wrapper', 0.02, 0.3, 0.03),
  ('bag', 0.03, 0.4, 0.04),
  ('cup', 0.04, 0.6, 0.05),
  ('lid', 0.02, 0.3, 0.03),
  ('straw', 0.01, 0.1, 0.01)

ON CONFLICT (item_key) DO UPDATE SET
  co2_saved_kg = EXCLUDED.co2_saved_kg,
  water_saved_gal = EXCLUDED.water_saved_gal,
  energy_saved_kwh = EXCLUDED.energy_saved_kwh;

-- Verify data
SELECT COUNT(*) as total_items FROM public.impact_factors;
