-- Mock Data Seeding Script for Revisent Dashboard
-- Run this in your Supabase SQL Editor

-- First, get your user's group_id
-- Replace 'YOUR_USER_EMAIL' with your actual email
DO $$
DECLARE
  v_group_id UUID;
  v_station_1 UUID;
  v_station_2 UUID;
  v_station_3 UUID;
  v_date TIMESTAMP;
  v_hour INT;
  v_minute INT;
  v_category TEXT;
  v_item_name TEXT;
  v_weight INT;
  v_rand FLOAT;
BEGIN
  -- Get the group_id from user_profiles (adjust the email to match your user)
  SELECT group_id INTO v_group_id
  FROM user_profiles
  LIMIT 1;

  RAISE NOTICE 'Using group_id: %', v_group_id;

  -- Create 3 mock stations one by one
  INSERT INTO stations (name, location, status, group_id)
  VALUES ('Cafeteria Station', 'Building A - Floor 1', 'active', v_group_id)
  RETURNING id INTO v_station_1;

  INSERT INTO stations (name, location, status, group_id)
  VALUES ('Office Station', 'Building B - Floor 3', 'active', v_group_id)
  RETURNING id INTO v_station_2;

  INSERT INTO stations (name, location, status, group_id)
  VALUES ('Lab Station', 'Research Wing', 'maintenance', v_group_id)
  RETURNING id INTO v_station_3;

  RAISE NOTICE 'Created 3 stations';

  -- Generate waste items for the past 30 days
  FOR day IN 0..29 LOOP
    FOR item IN 1..50 LOOP  -- 50 items per day
      v_date := NOW() - (day || ' days')::INTERVAL;
      v_hour := 7 + FLOOR(RANDOM() * 11);  -- 7am to 6pm
      v_minute := FLOOR(RANDOM() * 60);
      v_date := v_date + (v_hour || ' hours')::INTERVAL + (v_minute || ' minutes')::INTERVAL;
      
      -- Weighted category selection
      v_rand := RANDOM();
      IF v_rand < 0.25 THEN
        v_category := 'landfill';
        v_item_name := (ARRAY['Plastic Wrapper', 'Styrofoam Cup', 'Chip Bag', 'Candy Wrapper', 'Straw'])[FLOOR(RANDOM() * 5 + 1)];
      ELSIF v_rand < 0.6 THEN
        v_category := 'recycle';
        v_item_name := (ARRAY['Water Bottle', 'Soda Can', 'Paper', 'Cardboard Box', 'Glass Bottle'])[FLOOR(RANDOM() * 5 + 1)];
      ELSE
        v_category := 'compost';
        v_item_name := (ARRAY['Apple Core', 'Banana Peel', 'Coffee Grounds', 'Salad', 'Orange Peel'])[FLOOR(RANDOM() * 5 + 1)];
      END IF;
      
      v_weight := 50 + FLOOR(RANDOM() * 450);

      INSERT INTO waste_items (station_id, category, item_type, weight_grams, detected_at, confidence)
      VALUES (
        (ARRAY[v_station_1, v_station_2, v_station_3])[FLOOR(RANDOM() * 3 + 1)],
        v_category,
        v_item_name,
        v_weight,
        v_date,
        0.85 + RANDOM() * 0.15
      );
    END LOOP;
    
    IF day % 5 = 0 THEN
      RAISE NOTICE 'Generated data for day %', day;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Successfully seeded mock data!';
  RAISE NOTICE '- Stations: 3';
  RAISE NOTICE '- Waste Items: ~1500 (50 items/day for 30 days)';
END $$;
