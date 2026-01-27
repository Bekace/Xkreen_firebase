'use client'

import { useEffect, useRef, useState } from 'react'
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
  _count?: {
    screens: number
  }
}

interface LocationsMapProps {
  locations: Location[]
  isActive: boolean
  onLocationClick?: (location: Location) => void
}

export function LocationsMap({ locations, isActive, onLocationClick }: LocationsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapInstance = useRef<google.maps.Map | null>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initializingRef = useRef(false)

  // Step 1: Load Google Maps script once
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API key is missing')
      return
    }

    if (window.google?.maps) {
      console.log('[v0] Google Maps already loaded')
      setIsScriptLoaded(true)
      return
    }

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      console.log('[v0] Google Maps script already in DOM')
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          console.log('[v0] Google Maps loaded via existing script')
          setIsScriptLoaded(true)
          clearInterval(checkInterval)
        }
      }, 100)
      return () => clearInterval(checkInterval)
    }

    console.log('[v0] Loading Google Maps script...')
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true

    script.onload = () => {
      console.log('[v0] Google Maps script loaded')
      setIsScriptLoaded(true)
    }

    script.onerror = () => {
      console.error('[v0] Failed to load Google Maps')
      setError('Failed to load Google Maps')
    }

    document.head.appendChild(script)
  }, [])

  // Step 2: Initialize map when tab is active and script is loaded
  useEffect(() => {
    if (!isActive || !isScriptLoaded || !window.google?.maps || initializingRef.current) {
      return
    }

    if (!mapRef.current) {
      console.log('[v0] Map container not ready yet')
      return
    }

    initializingRef.current = true
    console.log('[v0] Initializing map...')

    try {
      const firstLocationWithCoords = locations.find((loc) => loc.latitude && loc.longitude)
      const center = firstLocationWithCoords
        ? { lat: firstLocationWithCoords.latitude!, lng: firstLocationWithCoords.longitude! }
        : { lat: 39.8283, lng: -98.5795 }

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: firstLocationWithCoords ? 12 : 4,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })

      googleMapInstance.current = map
      console.log('[v0] Map created successfully')

      // Add markers
      const bounds = new google.maps.LatLngBounds()
      let markerCount = 0

      locations.forEach((location) => {
        if (!location.latitude || !location.longitude) return

        const position = { lat: location.latitude, lng: location.longitude }
        bounds.extend(position)

        const marker = new google.maps.Marker({
          map,
          position,
          title: location.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: location.status === 'active' ? '#10b981' : '#6b7280',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        })

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${location.name}</h3>
              <div style="margin-bottom: 8px;">
                <span style="padding: 2px 8px; background: ${
                  location.status === 'active' ? '#d1fae5' : '#e5e7eb'
                }; color: ${
            location.status === 'active' ? '#065f46' : '#374151'
          }; border-radius: 4px; font-size: 12px; font-weight: 500;">
                  ${location.status}
                </span>
              </div>
              ${location.address ? `<p style="margin: 4px 0; font-size: 14px;">${location.address}</p>` : ''}
              ${
                location.city || location.state
                  ? `<p style="margin: 4px 0; font-size: 14px;">${location.city || ''}${
                      location.city && location.state ? ', ' : ''
                    }${location.state || ''} ${location.zip_code || ''}</p>`
                  : ''
              }
              <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Screens:</strong> ${
                location._count?.screens || 0
              }</p>
            </div>
          `,
        })

        marker.addListener('click', () => {
          infoWindow.open(map, marker)
          if (onLocationClick) {
            onLocationClick(location)
          }
        })

        markerCount++
      })

      if (markerCount > 1) {
        map.fitBounds(bounds)
      }

      console.log('[v0] Added', markerCount, 'markers')
      setIsMapReady(true)
    } catch (err) {
      console.error('[v0] Map initialization error:', err)
      setError('Failed to initialize map')
      initializingRef.current = false
    }
  }, [isActive, isScriptLoaded, locations, onLocationClick])

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

  if (!isMapReady) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading map...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div ref={mapRef} className="w-full h-[600px] rounded-lg" />
      </CardContent>
    </Card>
  )
}
