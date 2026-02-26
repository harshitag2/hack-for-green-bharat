import React from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'

const ROUTE_COLORS = {
    V001: '#3b82f6',
    V002: '#10b981',
    V003: '#f59e0b',
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

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', minHeight: '500px' }}>
            <div className="card">
                <div className="card-header">
                    <h3>📍 Routes Overview</h3>
                    <select
                        className="routes-select"
                        value={selectedVehicle || ''}
                        onChange={(e) => onSelectVehicle(e.target.value || null)}
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
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />

                        {/* Route polylines */}
                        {routes
                            .filter(r => !selectedVehicle || r.vehicle_id === selectedVehicle)
                            .map(route => (
                                <Polyline
                                    key={route.vehicle_id}
                                    positions={route.polyline.map(p => [p[0], p[1]])}
                                    color={ROUTE_COLORS[route.vehicle_id] || '#3b82f6'}
                                    weight={4}
                                    opacity={0.9}
                                />
                            ))}

                        {/* Vehicle positions */}
                        {vehicles
                            .filter(v => v.lat && v.lng && v.lat !== 0)
                            .filter(v => !selectedVehicle || v.id === selectedVehicle)
                            .map(v => (
                                <Marker key={v.id} position={[v.lat, v.lng]} icon={vehicleIcon(v.id)}>
                                    <Popup>
                                        <strong>{v.id}</strong> — {v.speed?.toFixed(1)} km/h
                                    </Popup>
                                </Marker>
                            ))}
                    </MapContainer>
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
                                {selectedRoute.polyline.map((point, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        fontSize: '12px',
                                    }}>
                                        <span style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            background: idx === 0 ? '#10b981' : idx === selectedRoute.polyline.length - 1 ? '#ef4444' : '#3b82f6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '10px', color: 'white', fontWeight: 700, flexShrink: 0,
                                        }}>
                                            {idx + 1}
                                        </span>
                                        <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                                            {point[0].toFixed(4)}, {point[1].toFixed(4)}
                                        </span>
                                    </div>
                                ))}
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
