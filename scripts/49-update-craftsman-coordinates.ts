// Script to geocode The Craftsman location and update coordinates
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

async function geocodeAndUpdate() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const locationId = '3478db47-7509-43c7-b908-fdc247db4692'
  const address = '3155 Broadway, New York, NY 10027'
  
  console.log('Geocoding:', address)
  
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsKey}`
  )
  const data = await response.json()
  
  if (data.status === 'OK' && data.results[0]) {
    const { lat, lng } = data.results[0].geometry.location
    console.log('Coordinates:', lat, lng)
    
    const { error } = await supabase
      .from('locations')
      .update({ latitude: lat, longitude: lng })
      .eq('id', locationId)
    
    if (error) {
      console.error('Error updating location:', error)
    } else {
      console.log('Successfully updated The Craftsman with coordinates')
    }
  } else {
    console.error('Geocoding failed:', data.status)
  }
}

geocodeAndUpdate()
