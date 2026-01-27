'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Monitor, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'

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
  onLocationClick?: (location: Location) => void
}

export function LocationsMap({ locations, onLocationClick }: LocationsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [markers, setMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const markerClustererRef = useRef<any>(null)

  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        console.log('[v0] Google Maps API Key exists:', !!apiKey)
        console.log('[v0] API Key length:', apiKey?.length || 0)
        
        if (!apiKey) {
          throw new Error('Google Maps API key is missing')
        }
        
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['marker', 'geocoding'],
        })

        const { Map } = await loader.importLibrary('maps')
        const { AdvancedMarkerElement } = await loader.importLibrary('marker')

        if (!mapRef.current) return

        // Create map centered on US (or first location with coordinates)
        const firstLocationWithCoords = locations.find((loc) => loc.latitude && loc.longitude)
        const center = firstLocationWithCoords
          ? { lat: firstLocationWithCoords.latitude, lng: firstLocationWithCoords.longitude }
          : { lat: 39.8283, lng: -98.5795 } // Center of US

        const mapInstance = new Map(mapRef.current, {
          center,
          zoom: firstLocationWithCoords ? 12 : 4,
          mapId: 'LOCATIONS_MAP_ID',
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        })

        setMap(mapInstance)

        // Geocode locations without coordinates
        await geocodeLocations(locations)

        setLoading(false)
      } catch (err) {
        console.error('[v0] Error initializing map:', err)
        setError('Failed to load map. Please check your Google Maps API key.')
        setLoading(false)
      }
    }

    initMap()
  }, [])

  useEffect(() => {
    if (!map) return

    // Clear existing markers
    markers.forEach((marker) => (marker.map = null))
    setMarkers([])

    // Clear existing clusterer
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers()
    }

    const createMarkers = async () => {
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker') as any
      const { MarkerClusterer } = await google.maps.importLibrary('markerClusterer') as any

      const newMarkers: google.maps.marker.AdvancedMarkerElement[] = []
      const bounds = new google.maps.LatLngBounds()

      for (const location of locations) {
        if (!location.latitude || !location.longitude) continue

        const position = { lat: location.latitude, lng: location.longitude }
        bounds.extend(position)

        // Custom pin color based on status
        const pinColor = location.status === 'active' ? '#10b981' : '#6b7280'
        const pinGlyph = new PinElement({
          background: pinColor,
          borderColor: '#ffffff',
          glyphColor: '#ffffff',
        })

        const marker = new AdvancedMarkerElement({
          map,
          position,
          title: location.name,
          content: pinGlyph.element,
        })

        // Create info window
        const infoWindow = new google.maps.InfoWindow({
          content: createInfoWindowContent(location),
        })

        marker.addListener('click', () => {
          // Close all other info windows
          newMarkers.forEach((m: any) => {
            if (m.infoWindow) m.infoWindow.close()
          })
          infoWindow.open(map, marker)
          if (onLocationClick) {
            onLocationClick(location)
          }
        })

        // Store info window reference on marker
        ;(marker as any).infoWindow = infoWindow

        newMarkers.push(marker)
      }

      setMarkers(newMarkers)

      // Add marker clustering
      if (newMarkers.length > 0) {
        markerClustererRef.current = new MarkerClusterer({
          map,
          markers: newMarkers,
        })

        // Fit map to show all markers
        if (newMarkers.length > 1) {
          map.fitBounds(bounds)
        }
      }
    }

    createMarkers()
  }, [map, locations, onLocationClick])

  const geocodeLocations = async (locs: Location[]) => {
    const locationsToGeocode = locs.filter((loc) => !loc.latitude || !loc.longitude)
    if (locationsToGeocode.length === 0) return

    try {
      const { Geocoder } = await google.maps.importLibrary('geocoding') as any
      const geocoder = new Geocoder()

      for (const location of locationsToGeocode) {
        const address = [
          location.address,
          location.city,
          location.state,
          location.zip_code,
          location.country,
        ]
          .filter(Boolean)
          .join(', ')

        if (!address) continue

        try {
          const result = await geocoder.geocode({ address })
          if (result.results[0]) {
            const { lat, lng } = result.results[0].geometry.location
            console.log(`[v0] Geocoded ${location.name}: ${lat()}, ${lng()}`)
            // You could update the location in the database here
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
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; background: ${location.status === 'active' ? '#d1fae5' : '#e5e7eb'}; color: ${location.status === 'active' ? '#065f46' : '#374151'};">
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
        <a href="/dashboard/locations" 
           style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #3b82f6; color: white; border-radius: 6px; font-size: 13px; font-weight: 500; text-decoration: none;">
          View Details
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
        </a>
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
        <div ref={mapRef} className="w-full h-[calc(100vh-280px)] min-h-[500px] rounded-lg" />
      </CardContent>
    </Card>
  )
}
