import React from 'react'

const typeConfig = {
    route_deviation: {
        label: 'Route Deviation',
        detail: (p) => `${(p.deviation_deg * 111).toFixed(2)} km off route`,
        cls: 'deviation',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        ),
    },
    overspeed: {
        label: 'Overspeed',
        detail: (p) => `${(p.speed || 0).toFixed(1)} km/h (limit: ${p.threshold || 80})`,
        cls: 'overspeed',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 12l4.5-4.5" />
                <circle cx="12" cy="12" r="1.5" />
            </svg>
        ),
    },
    idling: {
        label: 'Vehicle Idling',
        detail: (p) => `Speed: ${(p.speed || 0).toFixed(1)} km/h`,
        cls: 'idling',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    abnormal_driving: {
        label: 'Abnormal Driving',
        detail: (p) => `DTW score: ${(p.dtw_distance || 0).toFixed(1)}`,
        cls: 'abnormal',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
    },
}

export default function AlertsPanel({ alerts = [], fullWidth = false }) {
    const style = fullWidth ? { width: '100%' } : {}

    return (
        <div className="card alerts-panel" style={style}>
            <div className="card-header">
                <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: 'var(--green-600)' }}>
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    Live Alerts
                </h3>
                <span className="card-badge">{alerts.length}</span>
            </div>
            {alerts.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <p>No alerts — all vehicles operating normally</p>
                </div>
            ) : (
                <div className="alerts-list">
                    {alerts.slice(0, 80).map((alert, i) => {
                        const type = alert.type || 'route_deviation'
                        const cfg = typeConfig[type] || typeConfig.route_deviation
                        const payload = alert.payload || {}
                        return (
                            <div key={alert.id || i} className="alert-item">
                                <div className={`alert-icon ${cfg.cls}`}>{cfg.icon}</div>
                                <div className="alert-content">
                                    <div className="alert-title">
                                        <span className="alert-vid">{alert.vehicle_id}</span>
                                        {cfg.label}
                                    </div>
                                    <div className="alert-detail">{cfg.detail(payload)}</div>
                                </div>
                                <div className="alert-time">
                                    {alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : '—'}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
