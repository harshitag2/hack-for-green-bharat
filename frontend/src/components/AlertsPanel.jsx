import React from 'react'

const ALERT_CONFIG = {
    route_deviation: { icon: '🔴', cls: 'deviation', label: 'Route Deviation' },
    overspeed: { icon: '⚡', cls: 'overspeed', label: 'Overspeed' },
    idling: { icon: '⏸️', cls: 'idling', label: 'Vehicle Idling' },
    abnormal_driving: { icon: '🎯', cls: 'behavior', label: 'Abnormal Driving' },
}

function AlertsPanel({ alerts, fullWidth }) {
    const formatTime = (ts) => {
        try {
            return new Date(ts).toLocaleTimeString()
        } catch {
            return '--'
        }
    }

    const getAlertDetail = (alert) => {
        const p = alert.payload || {}
        switch (alert.type) {
            case 'route_deviation':
                return `Deviation: ${(p.deviation_deg * 111).toFixed(0)}m from route`
            case 'overspeed':
                return `Speed: ${p.speed?.toFixed(1)} km/h (limit: ${p.threshold} km/h)`
            case 'idling':
                return `Vehicle idle at (${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)})`
            case 'abnormal_driving':
                return `DTW distance: ${p.dtw_distance?.toFixed(1)} | Avg: ${p.pattern_summary?.avg_speed?.toFixed(1)} km/h`
            default:
                return JSON.stringify(p).slice(0, 80)
        }
    }

    return (
        <div className="card" style={fullWidth ? { maxHeight: '600px' } : {}}>
            <div className="card-header">
                <h3>🔔 Real-time Alerts</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {alerts.length} events
                </span>
            </div>
            <div className="alerts-list">
                {alerts.length === 0 ? (
                    <div className="loading">
                        <div className="spinner" />
                        Waiting for alerts...
                    </div>
                ) : (
                    alerts.slice(0, 100).map((alert, idx) => {
                        const config = ALERT_CONFIG[alert.type] || { icon: '⚠️', cls: 'deviation', label: alert.type }
                        return (
                            <div className="alert-item" key={alert.id || idx}>
                                <div className={`alert-icon ${config.cls}`}>
                                    {config.icon}
                                </div>
                                <div className="alert-content">
                                    <div className="title">
                                        {config.label}
                                        <span style={{ marginLeft: '8px', color: '#06b6d4', fontFamily: 'monospace', fontSize: '12px' }}>
                                            {alert.vehicle_id}
                                        </span>
                                    </div>
                                    <div className="detail">{getAlertDetail(alert)}</div>
                                    <div className="time">{formatTime(alert.created_at)}</div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default AlertsPanel
