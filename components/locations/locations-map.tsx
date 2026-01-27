'use client'

import { useCallback, useState, useEffect } from 'react'
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, MapPin, Phone, User, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'

interface Location {
  id: string
  name: string
  description?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  latitude?: number
  longitude?: number
  contact_person?: string
  phone_number?: string
  status: 'active' | 'inactive'
  _count?: {
    screens: number
  }
  user_id: string
}

interface LocationsMapProps {
  locations: Location[]
  isActive: boolean
  onLocationClick?: (location: Location) => void
}

const containerStyle = {
  width: '100%',
  height: '600px',
}

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795,
}

// Static libraries array to prevent re-renders
const libraries: ('places')[] = ['places']

export function LocationsMap({ locations, isActive, onLocationClick }: LocationsMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [center, setCenter] = useState(defaultCenter)
  const [zoom, setZoom] = useState(4)
  const [localLocations, setLocalLocations] = useState<Location[]>(locations)
  const [isGeocoding, setIsGeocoding] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  useEffect(() => {
    if (!isActive) return
    
    setLocalLocations(locations)
    
    const locationsWithCoords = locations.filter((loc) => loc.latitude && loc.longitude)
    
    if (locationsWithCoords.length > 0) {
      const firstLocation = locationsWithCoords[0]
      setCenter({
        lat: firstLocation.latitude!,
        lng: firstLocation.longitude!,
      })
      setZoom(locationsWithCoords.length === 1 ? 12 : 8)
    } else {
      // If no locations have coords, trigger geocoding
      geocodeLocations(locations)
    }
  }, [locations, isActive])

  const geocodeLocations = async (locs: Location[]) => {
    if (isGeocoding) return
    
    const supabase = createClient()
    const locationsWithoutCoords = locs.filter((loc) => !loc.latitude || !loc.longitude)

    if (locationsWithoutCoords.length === 0) return

    setIsGeocoding(true)
    console.log(`[v0] Geocoding ${locationsWithoutCoords.length} locations...`)

    for (const location of locationsWithoutCoords) {
      if (!location.address || !location.city || !location.state) {
        console.log(`[v0] Skipping ${location.name} - missing address fields`)
        continue
      }

      try {
        const address = `${location.address}, ${location.city}, ${location.state} ${location.zip_code || ''}`
        console.log(`[v0] Geocoding: ${address}`)
        
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        )
        const data = await response.json()
        
        console.log(`[v0] API Response for ${location.name}:`, data)

        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location
          console.log(`[v0] Geocoded ${location.name}: ${lat}, ${lng}`)

          // Update the location in the database
          const { error } = await supabase
            .from('locations')
            .update({ latitude: lat, longitude: lng })
            .eq('id', location.id)

          if (error) {
            console.error(`[v0] Database update error:`, error)
            continue
          }

          // Update local state to show marker immediately
          setLocalLocations((prev) => {
            const updated = prev.map((loc) =>
              loc.id === location.id ? { ...loc, latitude: lat, longitude: lng } : loc
            )
            console.log(`[v0] Updated local locations:`, updated)
            return updated
          })
          
          // Update center to show the first geocoded location
          if (locationsWithoutCoords[0].id === location.id) {
            setCenter({ lat, lng })
            setZoom(12)
          }
        } else {
          console.log(`[v0] No results for ${location.name}. Status: ${data.status}, Error: ${data.error_message || 'None'}`)
        }
      } catch (error) {
        console.error(`[v0] Failed to geocode ${location.name}:`, error)
      }
    }
    
    setIsGeocoding(false)
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
    console.log('[v0] Map loaded successfully')
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleMarkerClick = (location: Location) => {
    setSelectedLocation(location)
  }

  const handleInfoWindowClose = () => {
    setSelectedLocation(null)
  }

  const handleViewDetails = () => {
    if (selectedLocation && onLocationClick) {
      onLocationClick(selectedLocation)
      setSelectedLocation(null)
    }
  }

  // Filter locations that have coordinates
  const mappableLocations = localLocations.filter((loc) => loc.latitude && loc.longitude)
  console.log(`[v0] Rendering - Total locations: ${localLocations.length}, Mappable: ${mappableLocations.length}`)
  console.log(`[v0] Mappable locations:`, mappableLocations)

  if (!apiKey) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24">
          <MapPin className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Google Maps API Key Required</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Please add your Google Maps API key to the environment variables to enable the map view.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <LoadScript googleMapsApiKey={apiKey} libraries={libraries}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={zoom}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              streetViewControl: false,
              mapTypeControl: true,
              fullscreenControl: true,
            }}
          >
            {mappableLocations.map((location) => (
              <Marker
                key={location.id}
                position={{
                  lat: location.latitude!,
                  lng: location.longitude!,
                }}
                onClick={() => handleMarkerClick(location)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: location.status === 'active' ? '#10b981' : '#6b7280',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
              />
            ))}

            {selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
              <InfoWindow
                position={{
                  lat: selectedLocation.latitude,
                  lng: selectedLocation.longitude,
                }}
                onCloseClick={handleInfoWindowClose}
              >
                <div className="p-2 max-w-xs">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-base">{selectedLocation.name}</h3>
                    <Badge variant={selectedLocation.status === 'active' ? 'default' : 'secondary'}>
                      {selectedLocation.status}
                    </Badge>
                  </div>

                  {selectedLocation.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {selectedLocation.address}
                        {selectedLocation.city && `, ${selectedLocation.city}`}
                        {selectedLocation.state && `, ${selectedLocation.state}`}
                        {selectedLocation.zip_code && ` ${selectedLocation.zip_code}`}
                      </span>
                    </div>
                  )}

                  {selectedLocation.contact_person && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span>{selectedLocation.contact_person}</span>
                    </div>
                  )}

                  {selectedLocation.phone_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{selectedLocation.phone_number}</span>
                    </div>
                  )}

                  {selectedLocation._count && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Monitor className="w-4 h-4 flex-shrink-0" />
                      <span>{selectedLocation._count.screens} screen(s)</span>
                    </div>
                  )}

                  <Button onClick={handleViewDetails} size="sm" className="w-full">
                    View Details
                  </Button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
      </CardContent>
    </Card>
  )
}
