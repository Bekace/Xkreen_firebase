'use client'

// Interactive map component with custom styling, auto-geocoding, geolocation, and dynamic screen-based markers
import { useCallback, useState, useEffect } from 'react'
import { GoogleMap, LoadScript, Marker, InfoWindow, OverlayView } from '@react-google-maps/api'
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

// Custom minimal map styling
const mapStyles = [
  // Background
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#D9D9D9' }],
  },
  {
    featureType: 'all',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#D9D9D9' }],
  },
  {
    featureType: 'all',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#666666' }],
  },
  // Water
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0E3D46' }],
  },
  {
    featureType: 'water',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  // Roads
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#EBEEEF' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#CCCCCC' }],
  },
  {
    featureType: 'road',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },
  // Hide highway markers/shields
  {
    featureType: 'road.highway',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  // Hide all POI (Points of Interest)
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  // Hide transit stations
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  // Simplify administrative labels
  {
    featureType: 'administrative',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },
]

export function LocationsMap({ locations, isActive, onLocationClick }: LocationsMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null)
  const [center, setCenter] = useState(defaultCenter)
  const [zoom, setZoom] = useState(11)
  const [localLocations, setLocalLocations] = useState<Location[]>(locations)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  // Get user's geolocation
  useEffect(() => {
    if (!isActive || userLocation) return

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(userPos)
          setCenter(userPos)
          setZoom(11)
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }, [isActive, userLocation])

  useEffect(() => {
    if (!isActive) return
    
    setLocalLocations(locations)
    
    const locationsWithCoords = locations.filter((loc) => loc.latitude && loc.longitude)
    
    // Only update center if we don't have user location yet
    if (!userLocation && locationsWithCoords.length > 0) {
      const firstLocation = locationsWithCoords[0]
      setCenter({
        lat: firstLocation.latitude!,
        lng: firstLocation.longitude!,
      })
      setZoom(11)
    } else if (locationsWithCoords.length === 0) {
      geocodeLocations(locations)
    }
  }, [locations, isActive])

  const geocodeLocations = async (locs: Location[]) => {
    if (isGeocoding) return
    
    const supabase = createClient()
    const locationsWithoutCoords = locs.filter((loc) => !loc.latitude || !loc.longitude)

    if (locationsWithoutCoords.length === 0) return

    setIsGeocoding(true)

    for (const location of locationsWithoutCoords) {
      if (!location.address || !location.city || !location.state) {
        continue
      }

      try {
        const address = `${location.address}, ${location.city}, ${location.state} ${location.zip_code || ''}`
        
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        )
        const data = await response.json()

        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location

          // Update the location in the database
          const { error } = await supabase
            .from('locations')
            .update({ latitude: lat, longitude: lng })
            .eq('id', location.id)

          if (error) {
            continue
          }

          // Update local state to show marker immediately
          setLocalLocations((prev) =>
            prev.map((loc) =>
              loc.id === location.id ? { ...loc, latitude: lat, longitude: lng } : loc
            )
          )
        }
      } catch (error) {
        console.error(`Failed to geocode ${location.name}:`, error)
      }
    }
    
    setIsGeocoding(false)
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  // Auto-fit bounds to 25-mile radius from user location
  useEffect(() => {
    if (!map || typeof google === 'undefined' || !userLocation) return
    
    const locationsWithCoords = localLocations.filter((loc) => loc.latitude && loc.longitude)
    if (locationsWithCoords.length === 0) return

    // Filter locations within 25 miles of user
    const nearbyLocations = locationsWithCoords.filter((loc) => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        loc.latitude!,
        loc.longitude!
      )
      return distance <= 25
    })

    // Fit bounds based on nearby locations
    if (nearbyLocations.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      
      // Add user location
      bounds.extend(new google.maps.LatLng(userLocation.lat, userLocation.lng))
      
      // Add nearby locations
      nearbyLocations.forEach((loc) => {
        bounds.extend(new google.maps.LatLng(loc.latitude!, loc.longitude!))
      })
      
      map.fitBounds(bounds)
      
      // Set closer zoom for single nearby location
      if (nearbyLocations.length === 1) {
        setTimeout(() => map.setZoom(11), 100)
      }
    } else {
      // No locations within 25 miles - show all locations
      const bounds = new google.maps.LatLngBounds()
      locationsWithCoords.forEach((loc) => {
        bounds.extend(new google.maps.LatLng(loc.latitude!, loc.longitude!))
      })
      map.fitBounds(bounds)
    }
  }, [map, userLocation, localLocations])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleMarkerClick = (location: Location) => {
    setSelectedLocation(location)
    setHoveredLocation(null)
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

  // Calculate distance between two coordinates in miles (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLng = (lng2 - lng1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Calculate marker size based on screen count
  const getMarkerSize = (screenCount: number) => {
    const baseSize = 45
    const sizeIncrement = Math.min(screenCount * 4, 40) // Max 85px diameter
    return baseSize + sizeIncrement
  }

  // Filter locations that have coordinates
  const mappableLocations = localLocations.filter((loc) => loc.latitude && loc.longitude)
  console.log('[v0] Total locations:', localLocations.length)
  console.log('[v0] Mappable locations:', mappableLocations.length)
  console.log('[v0] All locations data:', localLocations)

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
              mapTypeControl: false,
              fullscreenControl: true,
              styles: mapStyles,
              zoomControl: true,
              scaleControl: true,
            }}
          >
            {typeof google !== 'undefined' && mappableLocations.map((location) => {
              const screenCount = location._count?.screens || 0
              const size = getMarkerSize(screenCount)
              
              return (
                <OverlayView
                  key={location.id}
                  position={{
                    lat: location.latitude!,
                    lng: location.longitude!,
                  }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div
                    style={{
                      transform: 'translate(-50%, -50%)',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleMarkerClick(location)}
                    onMouseEnter={() => setHoveredLocation(location)}
                    onMouseLeave={() => setHoveredLocation(null)}
                  >
                    {/* Custom circular marker */}
                    <div
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: screenCount > 99 ? '12px' : screenCount > 9 ? '14px' : '16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      {screenCount}
                    </div>
                    
                    {/* Hover tooltip */}
                    {hoveredLocation?.id === location.id && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: `${size / 2 + 10}px`,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'rgba(0, 0, 0, 0.85)',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                          fontSize: '13px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          pointerEvents: 'none',
                          zIndex: 1000,
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                          {screenCount} screen{screenCount !== 1 ? 's' : ''} here.
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.9 }}>
                          Click to see details
                        </div>
                      </div>
                    )}
                  </div>
                </OverlayView>
              )
            })}

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
