import React from 'react'

function VehiclesTable({ vehicles }) {
    const getSpeedColor = (speed) => {
        if (speed === 0) return '#8b5cf6'
        if (speed > 80) return '#ef4444'
        if (speed > 60) return '#f59e0b'
        return '#10b981'
    }

    const getCapacityClass = (pct) => {
        if (pct > 80) return 'red'
        if (pct > 50) return 'orange'
        return 'green'
    }

    const getEmissionScore = (speed, loadPct) => {
        // Simple emission score: lower is better
        const score = Math.round(50 + speed * 0.3 + loadPct * 0.2)
        return Math.min(100, score)
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3>🚛 Fleet Vehicles</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {vehicles.length} vehicles tracked
                </span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
                <table className="vehicles-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Type</th>
                            <th>Speed</th>
                            <th>Load</th>
                            <th>Capacity</th>
                            <th>Fuel</th>
                            <th>Emission Score</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vehicles.map(v => {
                            const capPct = v.capacity_pct || 0
                            const emScore = getEmissionScore(v.speed || 0, capPct)
                            return (
                                <tr key={v.id}>
                                    <td className="vid">{v.id}</td>
                                    <td>{v.type}</td>
                                    <td>
                                        <span style={{ color: getSpeedColor(v.speed), fontWeight: 600 }}>
                                            {v.speed?.toFixed(1)} km/h
                                        </span>
                                    </td>
                                    <td>{v.load_kg?.toFixed(1)} kg</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className="capacity-bar">
                                                <div
                                                    className={`fill ${getCapacityClass(capPct)}`}
                                                    style={{ width: `${Math.min(100, capPct)}%` }}
                                                />
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                {capPct.toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            background: v.fuel_type === 'diesel'
                                                ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                            color: v.fuel_type === 'diesel' ? '#ef4444' : '#10b981',
                                        }}>
                                            {v.fuel_type?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            fontWeight: 700,
                                            color: emScore > 75 ? '#ef4444' : emScore > 55 ? '#f59e0b' : '#10b981',
                                        }}>
                                            {emScore}
                                        </span>
                                    </td>
                                    <td>
                                        {v.speed === 0 ? (
                                            <span style={{ color: '#8b5cf6', fontWeight: 600, fontSize: '12px' }}>⏸ Idle</span>
                                        ) : v.speed > 80 ? (
                                            <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '12px' }}>⚡ Overspeed</span>
                                        ) : (
                                            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '12px' }}>✓ Moving</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default VehiclesTable
