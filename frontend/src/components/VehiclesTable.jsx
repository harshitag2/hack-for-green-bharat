import React from 'react'

// Helper function to calculate distance between two points (in km)
function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

// Determine vehicle status based on location and speed
function getVehicleStatus(vehicle, warehouses = [], restaurants = []) {
    const speed = vehicle.speed || 0
    
    // Check if vehicle is near a warehouse (within 0.5 km)
    for (const warehouse of warehouses) {
        const dist = getDistance(vehicle.lat, vehicle.lng, warehouse.lat, warehouse.lng)
        if (dist < 0.5) {
            return { label: 'At Warehouse', cls: 'warehouse' }
        }
    }
    
    // Check if vehicle is near a restaurant (within 0.5 km)
    for (const restaurant of restaurants) {
        const dist = getDistance(vehicle.lat, vehicle.lng, restaurant.lat, restaurant.lng)
        if (dist < 0.5) {
            return { label: 'At Restaurant', cls: 'restaurant' }
        }
    }
    
    // If moving, it's in transit
    if (speed > 5) {
        return { label: 'In Transit', cls: 'transit' }
    }
    
    // If stopped but not at a location
    if (speed < 2) {
        return { label: 'Idling', cls: 'idling' }
    }
    
    // Default
    return { label: 'In Transit', cls: 'transit' }
}

function StatusBadge({ vehicle, warehouses, restaurants }) {
    const status = getVehicleStatus(vehicle, warehouses, restaurants)
    return (
        <span className={`status-pill ${status.cls}`}>
            <span className="status-dot" />
            {status.label}
        </span>
    )
}

function CapacityBar({ pct = 0 }) {
    const p = Math.min(100, Math.max(0, pct))
    const cls = p >= 80 ? 'high' : p >= 50 ? 'med' : ''
    return (
        <div className="capacity-bar-wrap">
            <div className="capacity-bar">
                <div className="capacity-bar-fill" style={{ width: `${p}%` }} />
            </div>
            <span className="capacity-text">{p.toFixed(0)}%</span>
        </div>
    )
}

export default function VehiclesTable({ vehicles = [], warehouses = [], restaurants = [] }) {
    if (vehicles.length === 0) {
        return (
            <div className="vehicles-container">
                <div className="card vehicles-card">
                    <div className="card-header">
                        <h3>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                                <rect x="1" y="3" width="15" height="13" />
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                            </svg>
                            Fleet Vehicles
                        </h3>
                        <button className="btn-add-vehicle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Vehicle
                        </button>
                    </div>
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="1" y="3" width="15" height="13" />
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                            <circle cx="5.5" cy="18.5" r="2.5" />
                            <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                        <p>Waiting for vehicle data...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="vehicles-container">
            <div className="card vehicles-card">
                <div className="card-header">
                    <div className="card-header-left">
                        <h3>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                                <rect x="1" y="3" width="15" height="13" />
                                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                <circle cx="5.5" cy="18.5" r="2.5" />
                                <circle cx="18.5" cy="18.5" r="2.5" />
                            </svg>
                            Fleet Vehicles
                        </h3>
                        <span className="card-badge">{vehicles.length} total</span>
                    </div>
                    <button className="btn-add-vehicle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Vehicle
                    </button>
                </div>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Vehicle ID</th>
                                <th>Status</th>
                                <th>Speed</th>
                                <th>Location</th>
                                <th>Capacity</th>
                                <th>Fuel Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vehicles.map((v) => (
                                <tr key={v.id}>
                                    <td><span className="vehicle-id">{v.id}</span></td>
                                    <td><StatusBadge vehicle={v} warehouses={warehouses} restaurants={restaurants} /></td>
                                    <td>
                                        <div className="speed-cell">
                                            <span className="speed-value">{(v.speed || 0).toFixed(1)}</span>
                                            <span className="speed-unit">km/h</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="location-cell">
                                            {v.lat ? (
                                                <>
                                                    <span>{v.lat.toFixed(4)}</span>
                                                    <span className="location-separator">,</span>
                                                    <span>{v.lng.toFixed(4)}</span>
                                                </>
                                            ) : '—'}
                                        </div>
                                    </td>
                                    <td style={{ minWidth: 160 }}>
                                        <CapacityBar pct={v.capacity_pct || 0} />
                                    </td>
                                    <td>
                                        <span className={`fuel-badge ${(v.fuel_type || 'diesel').toLowerCase()}`}>
                                            {v.fuel_type || 'Diesel'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" title="Edit">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            <button className="btn-icon btn-icon-danger" title="Remove">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
