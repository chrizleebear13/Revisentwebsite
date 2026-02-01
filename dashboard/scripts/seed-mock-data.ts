import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedMockData() {
  try {
    console.log('Starting to seed mock data...')

    // Get the first user's group_id (you'll need to be logged in)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, group_id')
      .limit(1)
      .single()

    if (!profiles) {
      console.error('No user profile found. Please create a user first.')
      return
    }

    const groupId = profiles.group_id
    console.log('Using group_id:', groupId)

    // Create 3 mock stations
    const stations = [
      {
        name: 'Cafeteria Station',
        location: 'Building A - Floor 1',
        status: 'active',
        group_id: groupId
      },
      {
        name: 'Office Station',
        location: 'Building B - Floor 3',
        status: 'active',
        group_id: groupId
      },
      {
        name: 'Lab Station',
        location: 'Research Wing',
        status: 'maintenance',
        group_id: groupId
      }
    ]

    const { data: createdStations, error: stationsError } = await supabase
      .from('stations')
      .insert(stations)
      .select()

    if (stationsError) {
      console.error('Error creating stations:', stationsError)
      return
    }

    console.log('Created', createdStations.length, 'stations')

    // Create mock waste items for the past 30 days
    const wasteItems = []
    const categories = ['landfill', 'recycle', 'compost']
    const itemNames = {
      landfill: ['Plastic Wrapper', 'Styrofoam Cup', 'Chip Bag', 'Candy Wrapper', 'Straw'],
      recycle: ['Water Bottle', 'Soda Can', 'Paper', 'Cardboard Box', 'Glass Bottle'],
      compost: ['Apple Core', 'Banana Peel', 'Coffee Grounds', 'Salad', 'Orange Peel']
    }

    const now = new Date()

    // Generate data for the past 30 days
    for (let day = 0; day < 30; day++) {
      const date = new Date(now)
      date.setDate(date.getDate() - day)

      // Generate 20-80 items per day
      const itemsPerDay = Math.floor(Math.random() * 60) + 20

      for (let i = 0; i < itemsPerDay; i++) {
        // Random hour between 7am and 6pm
        const hour = Math.floor(Math.random() * 11) + 7
        const minute = Math.floor(Math.random() * 60)

        date.setHours(hour, minute, 0, 0)

        // Weighted category selection (more recycle/compost than landfill)
        const rand = Math.random()
        let category: 'landfill' | 'recycle' | 'compost'
        if (rand < 0.25) {
          category = 'landfill'
        } else if (rand < 0.6) {
          category = 'recycle'
        } else {
          category = 'compost'
        }

        const names = itemNames[category]
        const itemName = names[Math.floor(Math.random() * names.length)]

        // Random station
        const station = createdStations[Math.floor(Math.random() * createdStations.length)]

        wasteItems.push({
          station_id: station.id,
          category,
          item_name: itemName,
          weight_grams: Math.floor(Math.random() * 500) + 50,
          detected_at: date.toISOString(),
          confidence: 0.85 + Math.random() * 0.15
        })
      }
    }

    console.log('Inserting', wasteItems.length, 'waste items...')

    // Insert waste items in batches of 1000
    const batchSize = 1000
    for (let i = 0; i < wasteItems.length; i += batchSize) {
      const batch = wasteItems.slice(i, i + batchSize)
      const { error: itemsError } = await supabase
        .from('waste_items')
        .insert(batch)

      if (itemsError) {
        console.error('Error inserting waste items batch:', itemsError)
        return
      }

      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(wasteItems.length / batchSize)}`)
    }

    console.log('✅ Successfully seeded mock data!')
    console.log(`- Stations: ${createdStations.length}`)
    console.log(`- Waste Items: ${wasteItems.length}`)

  } catch (error) {
    console.error('Error seeding data:', error)
  }
}

seedMockData()
