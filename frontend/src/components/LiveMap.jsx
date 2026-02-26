import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

// Custom vehicle icon factory
function createVehicleIcon(vehicle) {
    const { speed } = vehicle
    let color = '#3b82f6' // normal blue
    let label = '🚛'

    if (speed === 0) {
        color = '#8b5cf6' // idle - purple
        label = '⏸️'
    } else if (speed > 80) {
        color = '#ef4444' // overspeed - red
        label = '⚡'
    } else if (speed > 60) {
        color = '#f59e0b' // fast - orange
        label = '🚛'
    }

    return L.divIcon({
        className: 'vehicle-marker',
        html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      cursor: pointer;
      transition: transform 0.2s;
    ">${label}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
    })
}

function warehouseIcon() {
    return L.divIcon({
        className: 'warehouse-marker',
        html: `<div style="
      background: #10b981;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">🏭</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    })
}

function restaurantIcon() {
    return L.divIcon({
        className: 'restaurant-marker',
        html: `<div style="
      background: #f59e0b;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">🍽️</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
    })
}

// Auto-fit map bounds
function FitBounds({ vehicles }) {
    const map = useMap()
    useEffect(() => {
        if (vehicles.length > 0) {
            const validVehicles = vehicles.filter(v => v.lat && v.lng && v.lat !== 0)
            if (validVehicles.length > 0) {
                const bounds = validVehicles.map(v => [v.lat, v.lng])
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
            }
        }
    }, []) // Only on mount
    return null
}

const ROUTE_COLORS = {
    V001: '#3b82f6',
    V002: '#10b981',
    V003: '#f59e0b',
}

function LiveMap({ vehicles, routes, warehouses, restaurants, selectedVehicle, onSelectVehicle }) {
    const center = [28.6139, 77.2190] // Delhi

    return (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <FitBounds vehicles={vehicles} />

            {/* Route polylines */}
            {routes.map(route => (
                <Polyline
                    key={route.vehicle_id}
                    positions={route.polyline.map(p => [p[0], p[1]])}
                    color={ROUTE_COLORS[route.vehicle_id] || '#3b82f6'}
                    weight={selectedVehicle === route.vehicle_id ? 5 : 3}
                    opacity={selectedVehicle && selectedVehicle !== route.vehicle_id ? 0.3 : 0.8}
                    dashArray={selectedVehicle === route.vehicle_id ? '' : '10 5'}
                />
            ))}

            {/* Vehicle markers */}
            {vehicles.map(v => (
                v.lat && v.lng && v.lat !== 0 ? (
                    <Marker
                        key={v.id}
                        position={[v.lat, v.lng]}
                        icon={createVehicleIcon(v)}
                        eventHandlers={{
                            click: () => onSelectVehicle(v.id),
                        }}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '180px' }}>
                                <strong style={{ fontSize: '14px', color: '#1e293b' }}>{v.id}</strong>
                                <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748b' }}>{v.type}</span>
                                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '6px 0' }} />
                                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>
                                    🏎️ Speed: <strong>{v.speed?.toFixed(1)} km/h</strong><br />
                                    📦 Load: <strong>{v.load_kg?.toFixed(1)} / {v.capacity_kg} kg</strong><br />
                                    📊 Capacity: <strong>{v.capacity_pct?.toFixed(1)}%</strong><br />
                                    ⛽ Fuel: <strong>{v.fuel_type}</strong>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ) : null
            ))}

            {/* Warehouse markers */}
            {warehouses.map(w => (
                <Marker key={w.id} position={[w.lat, w.lng]} icon={warehouseIcon()}>
                    <Popup>
                        <div style={{ fontFamily: 'Inter, sans-serif' }}>
                            <strong>🏭 {w.name}</strong><br />
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{w.id}</span>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* Restaurant markers */}
            {restaurants.map(r => (
                <Marker key={r.id} position={[r.lat, r.lng]} icon={restaurantIcon()}>
                    <Popup>
                        <div style={{ fontFamily: 'Inter, sans-serif' }}>
                            <strong>🍽️ {r.name}</strong><br />
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{r.id}</span>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}

export default LiveMap
