import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import VoronoiLayer from './VoronoiLayer'

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
    const [showVoronoi, setShowVoronoi] = useState(true)

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            {/* Voronoi Toggle Button */}
            <button
                onClick={() => setShowVoronoi(!showVoronoi)}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    padding: '8px 12px',
                    background: showVoronoi ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#fff',
                    color: showVoronoi ? '#fff' : '#374151',
                    border: showVoronoi ? 'none' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
                onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                {showVoronoi ? 'Hide' : 'Show'} Service Areas
            </button>

            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                <FitBounds vehicles={vehicles} />

                {/* Voronoi diagram for warehouse service areas */}
                {showVoronoi && <VoronoiLayer warehouses={warehouses} restaurants={restaurants} />}

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
                    >
                        <Tooltip direction="top" offset={[0, -20]} opacity={0.95} permanent={false}>
                            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '200px' }}>
                                <strong style={{ fontSize: '14px', color: '#1e293b' }}>{v.id}</strong>
                                <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748b' }}>{v.type}</span>
                                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '6px 0' }} />
                                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>
                                    🏎️ Speed: <strong>{v.speed?.toFixed(1)} km/h</strong><br />
                                    📦 Load: <strong>{v.load_kg?.toFixed(1)} / {v.capacity_kg} kg</strong><br />
                                    📊 Capacity Utilization: <strong>{v.capacity_pct?.toFixed(1)}%</strong><br />
                                    ⛽ Fuel: <strong>{v.fuel_type}</strong><br />
                                    📍 <a 
                                        href={`https://www.google.com/maps?q=${v.lat},${v.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}
                                    >
                                        View on Google Maps
                                    </a>
                                </div>
                            </div>
                        </Tooltip>
                    </Marker>
                ) : null
            ))}

            {/* Warehouse markers */}
            {warehouses.map(w => (
                <Marker key={w.id} position={[w.lat, w.lng]} icon={warehouseIcon()}>
                    <Tooltip direction="top" offset={[0, -15]} opacity={0.95}>
                        <div style={{ fontFamily: 'Inter, sans-serif' }}>
                            <strong>🏭 {w.name}</strong><br />
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{w.id}</span>
                        </div>
                    </Tooltip>
                </Marker>
            ))}

            {/* Restaurant markers */}
            {restaurants.map(r => (
                <Marker key={r.id} position={[r.lat, r.lng]} icon={restaurantIcon()}>
                    <Tooltip direction="top" offset={[0, -13]} opacity={0.95}>
                        <div style={{ fontFamily: 'Inter, sans-serif' }}>
                            <strong>🍽️ {r.name}</strong><br />
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{r.id}</span>
                        </div>
                    </Tooltip>
                </Marker>
            ))}
        </MapContainer>

        {/* Map Legend */}
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            zIndex: 1000,
            minWidth: '200px'
        }}>
            <div style={{ fontWeight: 700, marginBottom: '8px', color: '#1e293b', fontSize: '13px' }}>
                Map Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        border: '2px solid white',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                    }}>🚛</div>
                    <span style={{ color: '#475569' }}>Vehicle (Normal)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: '#8b5cf6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        border: '2px solid white',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                    }}>⏸️</div>
                    <span style={{ color: '#475569' }}>Vehicle (Idle)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        border: '2px solid white',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                    }}>🏭</div>
                    <span style={{ color: '#475569' }}>Warehouse</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        border: '2px solid white',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                    }}>🍽️</div>
                    <span style={{ color: '#475569' }}>Restaurant</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ 
                        width: '24px', 
                        height: '3px', 
                        background: 'linear-gradient(90deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.8) 100%)',
                        borderRadius: '2px'
                    }}></div>
                    <span style={{ color: '#475569' }}>Route Path</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        width: '24px', 
                        height: '3px', 
                        background: '#1e293b',
                        borderRadius: '2px',
                        border: '1px dashed #1e293b'
                    }}></div>
                    <span style={{ color: '#475569' }}>Delhi Boundary</span>
                </div>
            </div>
        </div>
        </div>
    )
}

export default LiveMap
