import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import VoronoiLayer from './VoronoiLayer'

const ROUTE_COLORS = {
    V001: '#3b82f6',
    V002: '#10b981',
    V003: '#f59e0b',
}

// Component to auto-center map on selected route
function MapCenterController({ route }) {
    const map = useMap()
    
    useEffect(() => {
        if (route && route.polyline && route.polyline.length > 0) {
            // Create bounds from all points in the route
            const bounds = L.latLngBounds(route.polyline.map(p => [p[0], p[1]]))
            // Fit map to show entire route with padding
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
        }
    }, [route, map])
    
    return null
}

function vehicleIcon(vid) {
    const color = ROUTE_COLORS[vid] || '#3b82f6'
    return L.divIcon({
        className: 'route-vehicle-marker',
        html: `<div style="
      background: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
    ">🚛</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    })
}

function RoutesView({ vehicles, routes, warehouses, restaurants, selectedVehicle, onSelectVehicle }) {
    const center = [28.6139, 77.2190]

    const selectedRoute = routes.find(r => r.vehicle_id === selectedVehicle)
    
    // Debug logging
    console.log('RoutesView - routes:', routes)
    console.log('RoutesView - selectedVehicle:', selectedVehicle)
    console.log('RoutesView - selectedRoute:', selectedRoute)

    // Helper function to find location name from coordinates
    const getLocationName = (lat, lng) => {
        // Check warehouses with more lenient tolerance
        const warehouse = warehouses.find(w => 
            Math.abs(w.lat - lat) < 0.01 && Math.abs(w.lng - lng) < 0.01
        )
        if (warehouse) return warehouse.name

        // Check restaurants with more lenient tolerance
        const restaurant = restaurants.find(r => 
            Math.abs(r.lat - lat) < 0.01 && Math.abs(r.lng - lng) < 0.01
        )
        if (restaurant) return restaurant.name

        // Default to "Unknown Location"
        return 'Unknown Location'
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', minHeight: '500px' }}>
            <div className="card">
                <div className="card-header">
                    <h3>📍 Routes Overview</h3>
                    <select
                        className="routes-select"
                        value={selectedVehicle || ''}
                        onChange={(e) => {
                            const value = e.target.value
                            onSelectVehicle(value === '' ? null : value)
                        }}
                    >
                        <option value="">All Vehicles</option>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.id} — {v.type}</option>
                        ))}
                    </select>
                </div>
                <div className="map-container">
                    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; CARTO'
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />

                        {/* Auto-center map on selected route */}
                        <MapCenterController route={selectedRoute} />

                        {/* Voronoi diagram for warehouse service areas */}
                        <VoronoiLayer warehouses={warehouses} restaurants={restaurants} />

                        {/* Route polylines */}
                        {routes
                            .filter(r => !selectedVehicle || r.vehicle_id === selectedVehicle)
                            .map(route => {
                                const isSelected = route.vehicle_id === selectedVehicle
                                return (
                                    <Polyline
                                        key={route.vehicle_id}
                                        positions={route.polyline.map(p => [p[0], p[1]])}
                                        color={ROUTE_COLORS[route.vehicle_id] || '#3b82f6'}
                                        weight={isSelected ? 6 : 4}
                                        opacity={isSelected ? 1 : 0.7}
                                    />
                                )
                            })}

                        {/* Vehicle positions */}
                        {vehicles
                            .filter(v => v.lat && v.lng && v.lat !== 0)
                            .filter(v => !selectedVehicle || v.id === selectedVehicle)
                            .map(v => (
                                <Marker key={v.id} position={[v.lat, v.lng]} icon={vehicleIcon(v.id)}>
                                    <Tooltip direction="top" offset={[0, -16]} opacity={0.95}>
                                        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '200px' }}>
                                            <strong style={{ fontSize: '13px' }}>{v.id}</strong>
                                            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '6px 0' }} />
                                            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>
                                                🏎️ Speed: <strong>{v.speed?.toFixed(1)} km/h</strong><br />
                                                📊 Capacity Utilization: <strong>{v.capacity_pct?.toFixed(1)}%</strong><br />
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
                                <span style={{ color: '#475569' }}>Vehicle</span>
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Route Details Panel */}
            <div className="card">
                <div className="card-header">
                    <h3>📋 Route Details</h3>
                </div>
                <div className="card-body">
                    {selectedVehicle && selectedRoute ? (
                        <div>
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                                    Vehicle
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: ROUTE_COLORS[selectedVehicle] || '#3b82f6', fontFamily: 'monospace' }}>
                                    {selectedVehicle}
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '8px' }}>
                                    Waypoints ({selectedRoute.polyline.length})
                                </div>
                                {selectedRoute.polyline.map((point, idx) => {
                                    const locationName = getLocationName(point[0], point[1])
                                    return (
                                        <div key={idx} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '8px 0', borderBottom: '1px solid #e2e8f0',
                                            fontSize: '12px',
                                        }}>
                                            <span style={{
                                                width: '22px', height: '22px', borderRadius: '50%',
                                                background: idx === 0 ? '#10b981' : idx === selectedRoute.polyline.length - 1 ? '#ef4444' : '#3b82f6',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '10px', color: 'white', fontWeight: 700, flexShrink: 0,
                                            }}>
                                                {idx + 1}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                                                    {locationName}
                                                </div>
                                                <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px' }}>
                                                    ({point[0].toFixed(4)}, {point[1].toFixed(4)})
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                Updated: {new Date(selectedRoute.updated_at).toLocaleString()}
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📍</div>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                Select a vehicle to view its route details
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default RoutesView
