import React, { useState, useEffect, useRef, useCallback } from 'react'
import LiveMap from './components/LiveMap'
import VehiclesTable from './components/VehiclesTable'
import AlertsPanel from './components/AlertsPanel'
import RoutesView from './components/RoutesView'

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : `http://${window.location.hostname}:8000`

const WS_URL = window.location.hostname === 'localhost'
    ? 'ws://localhost:8000/ws/live'
    : `ws://${window.location.hostname}:8000/ws/live`

function App() {
    const [activeTab, setActiveTab] = useState('map')
    const [vehicles, setVehicles] = useState([])
    const [alerts, setAlerts] = useState([])
    const [emissions, setEmissions] = useState([])
    const [routes, setRoutes] = useState([])
    const [warehouses, setWarehouses] = useState([])
    const [restaurants, setRestaurants] = useState([])
    const [wsConnected, setWsConnected] = useState(false)
    const [selectedVehicle, setSelectedVehicle] = useState(null)
    const wsRef = useRef(null)
    const reconnectTimer = useRef(null)

    // ─── Fetch initial data ─────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            const [vRes, aRes, eRes, rRes, wRes, restRes] = await Promise.all([
                fetch(`${API_URL}/api/vehicles`).then(r => r.json()).catch(() => ({ vehicles: [] })),
                fetch(`${API_URL}/api/alerts?limit=50`).then(r => r.json()).catch(() => ({ alerts: [] })),
                fetch(`${API_URL}/api/emissions?limit=100`).then(r => r.json()).catch(() => ({ emissions: [] })),
                fetch(`${API_URL}/api/routes/current`).then(r => r.json()).catch(() => ({ routes: [] })),
                fetch(`${API_URL}/api/warehouses`).then(r => r.json()).catch(() => ({ warehouses: [] })),
                fetch(`${API_URL}/api/restaurants`).then(r => r.json()).catch(() => ({ restaurants: [] })),
            ])
            setVehicles(vRes.vehicles || [])
            setAlerts(aRes.alerts || [])
            setEmissions(eRes.emissions || [])
            setRoutes(rRes.routes || [])
            setWarehouses(wRes.warehouses || [])
            setRestaurants(restRes.restaurants || [])
        } catch (err) {
            console.error('Failed to fetch data:', err)
        }
    }, [])

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 10000)
        return () => clearInterval(interval)
    }, [fetchData])

    // ─── WebSocket connection ───────────────────────────
    const connectWs = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

        try {
            const ws = new WebSocket(WS_URL)
            wsRef.current = ws

            ws.onopen = () => {
                setWsConnected(true)
                console.log('[WS] Connected')
            }

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data)
                    const { topic, data } = msg

                    if (topic === 'gps.events' && data.lat !== 0 && data.lng !== 0) {
                        setVehicles(prev => prev.map(v =>
                            v.id === data.vehicle_id
                                ? { ...v, lat: data.lat, lng: data.lng, speed: data.speed }
                                : v
                        ))
                    }

                    if (topic === 'load.events') {
                        setVehicles(prev => prev.map(v =>
                            v.id === data.vehicle_id
                                ? { ...v, load_kg: data.load_kg, capacity_pct: Math.round((data.load_kg / (v.capacity_kg || 500)) * 1000) / 10 }
                                : v
                        ))
                    }

                    if (topic === 'alerts.route_deviation' || topic === 'driving.behavior') {
                        const newAlert = {
                            id: Date.now(),
                            vehicle_id: data.vehicle_id,
                            type: data.type,
                            payload: data,
                            created_at: new Date().toISOString(),
                        }
                        setAlerts(prev => [newAlert, ...prev].slice(0, 100))
                    }

                    if (topic === 'emissions.metrics') {
                        const newEmission = {
                            id: Date.now(),
                            vehicle_id: data.vehicle_id,
                            co2_est: data.co2_est,
                            fuel_est: data.fuel_est,
                            load_kg: data.load_kg,
                            speed: data.speed,
                            created_at: new Date().toISOString(),
                        }
                        setEmissions(prev => [newEmission, ...prev].slice(0, 200))
                    }

                    if (topic === 'routes.updated') {
                        setRoutes(prev => {
                            const updated = prev.filter(r => r.vehicle_id !== data.vehicle_id)
                            updated.push({
                                vehicle_id: data.vehicle_id,
                                polyline: data.polyline,
                                updated_at: new Date().toISOString(),
                            })
                            return updated
                        })
                    }
                } catch (e) {
                    console.error('[WS] Parse error:', e)
                }
            }

            ws.onclose = () => {
                setWsConnected(false)
                console.log('[WS] Disconnected, reconnecting...')
                reconnectTimer.current = setTimeout(connectWs, 3000)
            }

            ws.onerror = () => {
                ws.close()
            }
        } catch (err) {
            console.error('[WS] Connection error:', err)
            reconnectTimer.current = setTimeout(connectWs, 3000)
        }
    }, [])

    useEffect(() => {
        connectWs()
        return () => {
            if (wsRef.current) wsRef.current.close()
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
        }
    }, [connectWs])

    // ─── Manual optimize ───────────────────────────────
    const handleOptimize = async () => {
        try {
            const res = await fetch(`${API_URL}/api/optimize`, { method: 'POST' })
            const data = await res.json()
            console.log('Optimize result:', data)
        } catch (err) {
            console.error('Optimize error:', err)
        }
    }

    // ─── Stats ─────────────────────────────────────────
    const activeVehicles = vehicles.filter(v => v.speed > 0).length
    const totalAlerts = alerts.length
    const avgSpeed = vehicles.length > 0
        ? Math.round(vehicles.reduce((s, v) => s + v.speed, 0) / vehicles.length)
        : 0
    const totalCo2 = emissions.slice(0, 30).reduce((s, e) => s + e.co2_est, 0).toFixed(2)
    const avgCapacity = vehicles.length > 0
        ? Math.round(vehicles.reduce((s, v) => s + (v.capacity_pct || 0), 0) / vehicles.length)
        : 0

    return (
        <div className="app">
            {/* ─── Header ─── */}
            <header className="app-header">
                <div className="app-logo">
                    <div className="icon">🚛</div>
                    <div>
                        <h1>BYUFUEL</h1>
                        <div className="tagline">Fleet Monitoring & Route Optimization</div>
                    </div>
                </div>
                <div className="header-actions">
                    <div className={`status-badge ${wsConnected ? '' : 'disconnected'}`}>
                        <span className="dot" style={{ background: wsConnected ? '#10b981' : '#ef4444' }} />
                        {wsConnected ? 'Live' : 'Connecting...'}
                    </div>
                    <button className="btn-optimize" onClick={handleOptimize}>
                        ⚡ Optimize Routes
                    </button>
                </div>
            </header>

            {/* ─── Nav Tabs ─── */}
            <nav className="nav-tabs">
                {[
                    { key: 'map', label: '🗺️ Live Map' },
                    { key: 'vehicles', label: '🚛 Vehicles' },
                    { key: 'alerts', label: `🔔 Alerts (${totalAlerts})` },
                    { key: 'routes', label: '📍 Routes' },
                    { key: 'emissions', label: '🌿 Emissions' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {/* ─── Dashboard ─── */}
            <main className="dashboard">
                {/* Stats Bar */}
                <div className="stats-bar">
                    <div className="stat-card blue">
                        <div className="label">Total Vehicles</div>
                        <div className="value">{vehicles.length}</div>
                        <div className="sub">{activeVehicles} active</div>
                    </div>
                    <div className="stat-card green">
                        <div className="label">Avg Speed</div>
                        <div className="value">{avgSpeed}</div>
                        <div className="sub">km/h</div>
                    </div>
                    <div className="stat-card orange">
                        <div className="label">Avg Capacity</div>
                        <div className="value">{avgCapacity}%</div>
                        <div className="sub">load utilization</div>
                    </div>
                    <div className="stat-card red">
                        <div className="label">Alerts</div>
                        <div className="value">{totalAlerts}</div>
                        <div className="sub">recent events</div>
                    </div>
                    <div className="stat-card purple">
                        <div className="label">CO₂ (recent)</div>
                        <div className="value">{totalCo2}</div>
                        <div className="sub">kg estimated</div>
                    </div>
                </div>

                {/* ─── Tab Content ─── */}
                {activeTab === 'map' && (
                    <div className="dashboard-grid">
                        <div className="card">
                            <div className="card-header">
                                <h3>📡 Live Fleet Map</h3>
                            </div>
                            <div className="map-container">
                                <LiveMap
                                    vehicles={vehicles}
                                    routes={routes}
                                    warehouses={warehouses}
                                    restaurants={restaurants}
                                    selectedVehicle={selectedVehicle}
                                    onSelectVehicle={setSelectedVehicle}
                                />
                            </div>
                        </div>
                        <AlertsPanel alerts={alerts} />
                    </div>
                )}

                {activeTab === 'vehicles' && (
                    <VehiclesTable vehicles={vehicles} />
                )}

                {activeTab === 'alerts' && (
                    <AlertsPanel alerts={alerts} fullWidth />
                )}

                {activeTab === 'routes' && (
                    <RoutesView
                        vehicles={vehicles}
                        routes={routes}
                        warehouses={warehouses}
                        restaurants={restaurants}
                        selectedVehicle={selectedVehicle}
                        onSelectVehicle={setSelectedVehicle}
                    />
                )}

                {activeTab === 'emissions' && (
                    <div>
                        <div className="emissions-grid">
                            <div className="emission-card">
                                <div className="emoji">🌍</div>
                                <div className="metric">{totalCo2}</div>
                                <div className="metric-label">Total CO₂ (kg)</div>
                            </div>
                            <div className="emission-card">
                                <div className="emoji">⛽</div>
                                <div className="metric">
                                    {emissions.slice(0, 30).reduce((s, e) => s + e.fuel_est, 0).toFixed(2)}
                                </div>
                                <div className="metric-label">Fuel Est. (L)</div>
                            </div>
                            <div className="emission-card">
                                <div className="emoji">📊</div>
                                <div className="metric">{emissions.length}</div>
                                <div className="metric-label">Data Points</div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="card-header">
                                <h3>📈 Recent Emission Metrics</h3>
                            </div>
                            <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="emission-table">
                                    <thead>
                                        <tr>
                                            <th>Vehicle</th>
                                            <th>CO₂ (kg)</th>
                                            <th>Fuel (L)</th>
                                            <th>Load (kg)</th>
                                            <th>Speed</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emissions.slice(0, 50).map((e, i) => (
                                            <tr key={e.id || i}>
                                                <td style={{ color: '#06b6d4', fontFamily: 'monospace', fontWeight: 700 }}>{e.vehicle_id}</td>
                                                <td>{e.co2_est.toFixed(3)}</td>
                                                <td>{e.fuel_est.toFixed(3)}</td>
                                                <td>{e.load_kg.toFixed(1)}</td>
                                                <td>{e.speed.toFixed(1)} km/h</td>
                                                <td style={{ color: '#64748b', fontSize: '11px' }}>
                                                    {new Date(e.created_at).toLocaleTimeString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default App
