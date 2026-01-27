'use client'

import { useEffect, useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, MapPin } from 'lucide-react'

interface Location {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  status: string
  screen_count?: number
}

interface LocationsMapProps {
  locations: Location[]
  isActive: boolean
  onLocationClick?: (location: Location) => void
}

export function LocationsMap({ locations, isActive, onLocationClick }: LocationsMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load Google Maps script
  useEffect(() => {
    const loadGoogleMaps = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      
      if (!apiKey) {
        setError('Google Maps API key is missing')
        setLoading(false)
        return
      }

      if (window.google?.maps) {
        console.log('[v0] Google Maps already loaded')
        return
      }

      console.log('[v0] Loading Google Maps script...')
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        console.log('[v0] Google Maps script loaded successfully')
      }
      
      script.onerror = () => {
        console.error('[v0] Failed to load Google Maps script')
        setError('Failed to load Google Maps')
        setLoading(false)
      }
      
      document.head.appendChild(script)
    }

    loadGoogleMaps()
  }, [])

  // Callback ref that initializes map when div is actually mounted
  const mapContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || !isActive || !window.google?.maps) {
      console.log('[v0] Map container callback - not ready:', {
        hasNode: !!node,
        isActive,
        hasGoogle: !!window.google?.maps
      })
      return
    }

    console.log('[v0] Map container is ready, initializing map...')

    try {
      // Create map centered on first location with coordinates or US center
      const firstLocationWithCoords = locations.find((loc) => loc.latitude && loc.longitude)
      const center = firstLocationWithCoords
        ? { lat: firstLocationWithCoords.latitude, lng: firstLocationWithCoords.longitude }
        : { lat: 39.8283, lng: -98.5795 }

      const mapInstance = new google.maps.Map(node, {
        center,
        zoom: firstLocationWithCoords ? 12 : 4,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })

      console.log('[v0] Map instance created successfully')
      setMap(mapInstance)
      setLoading(false)

      // Geocode locations without coordinates
      geocodeLocations(locations)
    } catch (err) {
      console.error('[v0] Error creating map:', err)
      setError('Failed to initialize map')
      setLoading(false)
    }
  }, [isActive, locations])

  // Create markers when map or locations change
  useEffect(() => {
    if (!map || !window.google) return

    console.log('[v0] Creating markers for', locations.length, 'locations')

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null))

    const newMarkers: any[] = []
    const bounds = new google.maps.LatLngBounds()

    for (const location of locations) {
      if (!location.latitude || !location.longitude) {
        console.log('[v0] Skipping location without coordinates:', location.name)
        continue
      }

      const position = { lat: location.latitude, lng: location.longitude }
      bounds.extend(position)

      const markerColor = location.status === 'active' ? '#10b981' : '#6b7280'

      const marker = new google.maps.Marker({
        map,
        position,
        title: location.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })

      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(location),
      })

      marker.addListener('click', () => {
        newMarkers.forEach((m: any) => m.infoWindow?.close())
        infoWindow.open(map, marker)
        onLocationClick?.(location)
      })

      ;(marker as any).infoWindow = infoWindow
      newMarkers.push(marker)
    }

    setMarkers(newMarkers)

    // Fit map to show all markers
    if (newMarkers.length > 1) {
      map.fitBounds(bounds)
    } else if (newMarkers.length === 1) {
      map.setCenter(newMarkers[0].getPosition()!)
      map.setZoom(12)
    }

    console.log('[v0] Created', newMarkers.length, 'markers')
  }, [map, locations, onLocationClick])

  const geocodeLocations = async (locs: Location[]) => {
    const locationsToGeocode = locs.filter((loc) => !loc.latitude || !loc.longitude)
    if (locationsToGeocode.length === 0) return

    console.log('[v0] Geocoding', locationsToGeocode.length, 'locations')

    try {
      const geocoder = new google.maps.Geocoder()

      for (const location of locationsToGeocode) {
        const address = [location.address, location.city, location.state, location.zip_code, location.country]
          .filter(Boolean)
          .join(', ')

        if (!address) continue

        try {
          const result = await geocoder.geocode({ address })
          if (result.results[0]) {
            const lat = result.results[0].geometry.location.lat()
            const lng = result.results[0].geometry.location.lng()
            console.log(`[v0] Geocoded ${location.name}: ${lat}, ${lng}`)

            await fetch(`/api/locations/${location.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...location,
                latitude: lat,
                longitude: lng,
              }),
            })
          }
        } catch (err) {
          console.error(`[v0] Geocoding failed for ${location.name}:`, err)
        }
      }
    } catch (err) {
      console.error('[v0] Geocoding service error:', err)
    }
  }

  const createInfoWindowContent = (location: Location): string => {
    const address = [location.address, location.city, location.state, location.zip_code]
      .filter(Boolean)
      .join(', ')

    return `
      <div style="padding: 12px; min-width: 250px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">
          ${location.name}
        </h3>
        ${
          address
            ? `<p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280; display: flex; align-items: start; gap: 6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="flex-shrink: 0; margin-top: 2px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span>${address}</span>
        </p>`
            : ''
        }
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; background: ${
            location.status === 'active' ? '#d1fae5' : '#e5e7eb'
          }; color: ${location.status === 'active' ? '#065f46' : '#374151'};">
            ${location.status === 'active' ? 'Active' : 'Inactive'}
          </span>
          ${
            location.screen_count !== undefined
              ? `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #6b7280;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="2" y="3" width="20" height="14" rx="2" stroke-width="2"/>
              <line x1="8" y1="21" x2="16" y2="21" stroke-width="2" stroke-linecap="round"/>
              <line x1="12" y1="17" x2="12" y2="21" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${location.screen_count} screen${location.screen_count !== 1 ? 's' : ''}
          </span>`
              : ''
          }
        </div>
        <button onclick="window.location.href='/dashboard/locations'" 
           style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #3b82f6; color: white; border-radius: 6px; font-size: 13px; font-weight: 500; text-decoration: none; border: none; cursor: pointer;">
          View Details
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </button>
      </div>
    `
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading map...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24">
          <MapPin className="w-16 h-16 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Map Unavailable</h3>
          <p className="text-muted-foreground text-center max-w-md">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div ref={mapContainerRef} className="w-full h-[calc(100vh-280px)] min-h-[500px] rounded-lg" />
      </CardContent>
    </Card>
  )
}
