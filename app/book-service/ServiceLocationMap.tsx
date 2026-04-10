"use client"

import { useEffect } from "react"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"

type LatLng = {
  lat: number
  lng: number
}

type ServiceLocationMapProps = {
  center: LatLng
  markerPosition: LatLng | null
  onPickLocation: (lat: number, lng: number) => void
}

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function MapCenterUpdater({ center }: { center: LatLng }) {
  const map = useMap()

  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true })
  }, [center, map])

  return null
}

function LocationClickHandler({ onPickLocation }: { onPickLocation: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (event) => {
      const { lat, lng } = event.latlng
      onPickLocation(lat, lng)
    }
  })

  return null
}

export default function ServiceLocationMap({ center, markerPosition, onPickLocation }: ServiceLocationMapProps) {
  return (
    <div className="relative z-0 overflow-hidden rounded-xl border border-gray-200">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        scrollWheelZoom
        className="service-location-map h-72 w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenterUpdater center={center} />
        <LocationClickHandler onPickLocation={onPickLocation} />
        {markerPosition && <Marker position={[markerPosition.lat, markerPosition.lng]} icon={markerIcon} />}
      </MapContainer>
    </div>
  )
}
