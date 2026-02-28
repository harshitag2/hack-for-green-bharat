import React, { useState, useEffect, useRef, useCallback } from 'react'
import LiveMap from './components/LiveMap'
import VehiclesTable from './components/VehiclesTable'
import AlertsPanel from './components/AlertsPanel'
import RoutesView from './components/RoutesView'
import { 
    mockVehicles, 
    mockWarehouses, 
    mockRestaurants, 
    mockRoutes, 
    mockAlerts, 
    mockEmissions,
    simulateVehicleUpdate,
    generateEmissionData,
    generateRandomAlert,
    updateRoutes
} from './mockData'
import './App.css'

// Check if we're on Vercel (no backend available)
const IS_VERCEL = window.location.hostname.includes('vercel.app')

const API_URL = IS_VERCEL 
    ? null  // No backend on Vercel
    : (window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : `http://${window.location.hostname}:8000`)

const WS_URL = IS_VERCEL
    ? null  // No WebSocket on Vercel
    : (window.location.hostname === 'localhost'
        ? 'ws://localhost:8000/ws/live'
        : `ws://${window.location.hostname}:8000/ws/live`)

// ── SVG Icon Components ─────────────────────────────
const Icon = {
    Truck: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    ),
    Map: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
        </svg>
    ),
    Bell: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    ),
    Route: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
            <circle cx="18" cy="5" r="3" />
        </svg>
    ),
    Leaf: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
    ),
    Zap: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    ),
    Activity: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    ),
    AlertTriangle: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    Gauge: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 12l4.5-4.5" />
            <circle cx="12" cy="12" r="1.5" />
        </svg>
    ),
    Database: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    ),
    Signal: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="2" y1="20" x2="2" y2="14" /><line x1="7" y1="20" x2="7" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" /><line x1="17" y1="20" x2="17" y2="8" />
            <line x1="22" y1="20" x2="22" y2="2" />
        </svg>
    ),
    TrendingDown: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            <polyline points="17 18 23 18 23 12" />
        </svg>
    ),
    ChevronRight: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    ),
}

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

    // ── Fetch initial data ──────────────────────────
    const fetchData = useCallback(async () => {
        // Use mock data on Vercel (no backend)
        if (IS_VERCEL) {
            setVehicles(mockVehicles)
            setAlerts(mockAlerts)
            setEmissions(mockEmissions.map(e => ({
                ...e,
                co2_est: parseFloat(e.co2_est) || 0,
                fuel_est: parseFloat(e.fuel_est) || 0,
                load_kg: parseFloat(e.load_kg) || 0,
                speed: parseFloat(e.speed) || 0,
            })))
            setRoutes(mockRoutes)
            setWarehouses(mockWarehouses)
            setRestaurants(mockRestaurants)
            return
        }

        // Fetch from backend when available
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
            setEmissions((eRes.emissions || []).map(e => ({
                ...e,
                co2_est: parseFloat(e.co2_est) || 0,
                fuel_est: parseFloat(e.fuel_est) || 0,
                load_kg: parseFloat(e.load_kg) || 0,
                speed: parseFloat(e.speed) || 0,
            })))
            setRoutes(rRes.routes || [])
            setWarehouses(wRes.warehouses || [])
            setRestaurants(restRes.restaurants || [])
        } catch (err) {
            console.error('Fetch error:', err)
        }
    }, [])

    useEffect(() => {
        fetchData()
        
        // For backend: regular polling
        if (!IS_VERCEL) {
            const interval = setInterval(fetchData, 10000)
            return () => clearInterval(interval)
        }
    }, [fetchData])

    // Separate effect for Vercel simulation to avoid stale closures
    useEffect(() => {
        if (!IS_VERCEL) return

        const simulationInterval = setInterval(() => {
            // Update vehicle positions and stats using callback to get latest state
            setVehicles(prev => {
                const updated = simulateVehicleUpdate(prev)
                
                // Generate new emission data based on updated vehicles
                setEmissions(prevEmissions => {
                    const newEmissions = generateEmissionData(updated)
                    return [...newEmissions, ...prevEmissions].slice(0, 200)
                })
                
                // Randomly generate alerts based on updated vehicles
                const newAlert = generateRandomAlert(updated)
                if (newAlert) {
                    setAlerts(prevAlerts => [newAlert, ...prevAlerts].slice(0, 100))
                }
                
                // Update routes based on updated vehicles
                setRoutes(updateRoutes(updated, warehouses, restaurants))
                
                return updated
            })
        }, 1000) // Update every 1 second like localhost
        
        return () => clearInterval(simulationInterval)
    }, [warehouses, restaurants]) // Add dependencies

    // ── WebSocket ───────────────────────────────────
    const connectWs = useCallback(() => {
        // Skip WebSocket on Vercel (no backend)
        if (IS_VERCEL) {
            setWsConnected(false)
            return
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return
        try {
            const ws = new WebSocket(WS_URL)
            wsRef.current = ws
            ws.onopen = () => { setWsConnected(true) }
            ws.onmessage = (event) => {
                try {
                    const { topic, data } = JSON.parse(event.data)

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
                        setAlerts(prev => [{
                            id: Date.now() + Math.random(),
                            vehicle_id: data.vehicle_id,
                            type: data.type,
                            payload: data,
                            created_at: new Date().toISOString(),
                        }, ...prev].slice(0, 100))
                    }

                    if (topic === 'emissions.metrics') {
                        let em = data
                        if (data.emission_json) {
                            try { em = JSON.parse(data.emission_json) } catch (e) { em = data }
                        }
                        setEmissions(prev => [{
                            id: Date.now() + Math.random(),
                            vehicle_id: em.vehicle_id || data.vehicle_id || 'N/A',
                            co2_est: parseFloat(em.co2_est) || 0,
                            fuel_est: parseFloat(em.fuel_est) || 0,
                            load_kg: parseFloat(em.load_kg) || 0,
                            speed: parseFloat(em.speed) || 0,
                            created_at: new Date().toISOString(),
                        }, ...prev].slice(0, 200))
                    }

                    if (topic === 'routes.updated') {
                        setRoutes(prev => {
                            const rest = prev.filter(r => r.vehicle_id !== data.vehicle_id)
                            return [...rest, { vehicle_id: data.vehicle_id, polyline: data.polyline, updated_at: new Date().toISOString() }]
                        })
                    }
                } catch (e) { console.error('[WS] Parse error:', e) }
            }
            ws.onclose = () => {
                setWsConnected(false)
                reconnectTimer.current = setTimeout(connectWs, 3000)
            }
            ws.onerror = () => ws.close()
        } catch (err) {
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

    const handleOptimize = async () => {
        // Skip API call on Vercel
        if (IS_VERCEL) {
            console.log('Optimize routes (mock mode - no backend)')
            return
        }

        try {
            await fetch(`${API_URL}/api/optimize`, { method: 'POST' })
        } catch (err) { console.error('Optimize error:', err) }
    }

    // ── Derived stats ───────────────────────────────
    const activeVehicles = vehicles.filter(v => v.speed > 0).length
    const totalAlerts = alerts.length
    const avgSpeed = vehicles.length > 0
        ? Math.round(vehicles.reduce((s, v) => s + (v.speed || 0), 0) / vehicles.length) : 0
    const totalCo2 = emissions.slice(0, 30).reduce((s, e) => s + (parseFloat(e.co2_est) || 0), 0).toFixed(2)
    const avgCapacity = vehicles.length > 0
        ? Math.round(vehicles.reduce((s, v) => s + (v.capacity_pct || 0), 0) / vehicles.length) : 0

    const tabs = [
        { key: 'map', label: 'Live Map', icon: Icon.Map },
        { key: 'vehicles', label: 'Vehicles', icon: Icon.Truck },
        { key: 'alerts', label: `Alerts (${totalAlerts})`, icon: Icon.Bell },
        { key: 'routes', label: 'Routes', icon: Icon.Route },
        { key: 'emissions', label: 'Emissions', icon: Icon.Leaf },
        { key: 'config', label: 'Configuration', icon: Icon.Database },
    ]

    return (
        <div className="app">
            {/* ── Header ── */}
            <header className="app-header">
                <div className="app-logo">
                    <div className="icon">
                        <Icon.Truck />
                    </div>
                    <div>
                        <h1>GREEN LANTERN</h1>
                        <div className="tagline">Fleet Monitoring &amp; Route Optimization</div>
                    </div>
                </div>
                <div className="header-actions">
                    <div className={`status-badge ${wsConnected || IS_VERCEL ? '' : 'disconnected'}`}>
                        <span className="dot" />
                        {IS_VERCEL ? 'Live Simulation' : (wsConnected ? 'Connected' : 'Connecting')}
                    </div>
                    <button className="btn-optimize" onClick={handleOptimize}>
                        <Icon.Zap />
                        Optimize Routes
                    </button>
                </div>
            </header>

            <div className="app-body">
                {/* ── Left Sidebar Navigation ── */}
                <aside className="sidebar">
                    <nav className="sidebar-nav">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                className={`sidebar-nav-item ${activeTab === tab.key ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                <tab.icon />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* ── Dashboard ── */}
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
                        <div className="sub">km / h</div>
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
                        <div className="label">CO&#x2082; Est.</div>
                        <div className="value">{totalCo2}</div>
                        <div className="sub">kg (recent 30)</div>
                    </div>
                </div>

                {/* ── Tab Content ── */}
                {activeTab === 'map' && (
                    <div className="dashboard-grid">
                        <div className="card">
                            <div className="card-header">
                                <h3><Icon.Signal /> Live Fleet Map</h3>
                                <span className="card-badge">{vehicles.length} vehicles</span>
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
                    <VehiclesTable vehicles={vehicles} warehouses={warehouses} restaurants={restaurants} />
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
                        {/* Live Metrics - Real-time updating */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <div className="card-header">
                                <h3><Icon.Activity /> Live Emissions Monitor</h3>
                                <span className="card-badge" style={{ 
                                    background: '#10b981', 
                                    color: 'white',
                                    animation: 'pulse 2s infinite'
                                }}>● LIVE</span>
                            </div>
                            <div className="emissions-grid" style={{ padding: '20px' }}>
                                <div className="emission-card">
                                    <div className="emission-icon co2"><Icon.Leaf /></div>
                                    <div className="emission-info">
                                        <div className="metric">
                                            {emissions.length > 0 
                                                ? emissions.slice(0, 4).reduce((s, e) => s + (parseFloat(e.co2_est) || 0), 0).toFixed(3)
                                                : '0.000'
                                            }
                                        </div>
                                        <div className="metric-label">Current CO₂ (kg/sec)</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                            Last 4 vehicles
                                        </div>
                                    </div>
                                </div>
                                <div className="emission-card">
                                    <div className="emission-icon fuel"><Icon.Activity /></div>
                                    <div className="emission-info">
                                        <div className="metric">
                                            {emissions.length > 0
                                                ? emissions.slice(0, 4).reduce((s, e) => s + (parseFloat(e.fuel_est) || 0), 0).toFixed(3)
                                                : '0.000'
                                            }
                                        </div>
                                        <div className="metric-label">Current Fuel (L/sec)</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                            Last 4 vehicles
                                        </div>
                                    </div>
                                </div>
                                <div className="emission-card">
                                    <div className="emission-icon data"><Icon.Gauge /></div>
                                    <div className="emission-info">
                                        <div className="metric">
                                            {vehicles.length > 0
                                                ? (vehicles.reduce((s, v) => s + (v.speed || 0), 0) / vehicles.length).toFixed(1)
                                                : '0.0'
                                            }
                                        </div>
                                        <div className="metric-label">Avg Fleet Speed (km/h)</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                            All vehicles
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Monthly Average - Static values */}
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <div className="card-header">
                                <h3><Icon.TrendingDown /> Monthly Average (Past 30 Days)</h3>
                                <span className="card-badge">Historical Data</span>
                            </div>
                            <div className="emissions-grid" style={{ padding: '20px' }}>
                                <div className="emission-card">
                                    <div className="emission-icon co2"><Icon.Leaf /></div>
                                    <div className="emission-info">
                                        <div className="metric">1,245.8</div>
                                        <div className="metric-label">Avg CO₂ (kg/day)</div>
                                        <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                                            ↓ 12% vs last month
                                        </div>
                                    </div>
                                </div>
                                <div className="emission-card">
                                    <div className="emission-icon fuel"><Icon.Activity /></div>
                                    <div className="emission-info">
                                        <div className="metric">485.2</div>
                                        <div className="metric-label">Avg Fuel (L/day)</div>
                                        <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                                            ↓ 8% vs last month
                                        </div>
                                    </div>
                                </div>
                                <div className="emission-card">
                                    <div className="emission-icon data"><Icon.Database /></div>
                                    <div className="emission-info">
                                        <div className="metric">2,850</div>
                                        <div className="metric-label">Total Trips</div>
                                        <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px' }}>
                                            95 trips/day avg
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Data Stream Table */}
                        <div className="card">
                            <div className="card-header">
                                <h3><Icon.Signal /> Live Emission Stream</h3>
                                <span className="card-badge">{emissions.length} records</span>
                            </div>
                            <div className="card-body" style={{ maxHeight: '440px', overflowY: 'auto', padding: 0 }}>
                                {emissions.length === 0 ? (
                                    <div className="empty-state">
                                        <Icon.Activity />
                                        <p>No emission data yet. Data streams in every second.</p>
                                    </div>
                                ) : (
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
                                            {emissions.slice(0, 100).map((e, i) => (
                                                <tr key={e.id || i}>
                                                    <td><span className="vehicle-id">{e.vehicle_id}</span></td>
                                                    <td>{(parseFloat(e.co2_est) || 0).toFixed(3)}</td>
                                                    <td>{(parseFloat(e.fuel_est) || 0).toFixed(3)}</td>
                                                    <td>{(parseFloat(e.load_kg) || 0).toFixed(1)}</td>
                                                    <td>{(parseFloat(e.speed) || 0).toFixed(1)} km/h</td>
                                                    <td style={{ color: 'var(--gray-400)', fontSize: '11px' }}>
                                                        {new Date(e.created_at).toLocaleTimeString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'config' && (
                    <div>
                        <div className="config-section">
                            <div className="card">
                                <div className="card-header">
                                    <h3><Icon.Database /> Restaurant Configuration</h3>
                                    <span className="card-badge">Day Start Planning</span>
                                </div>
                                <div className="card-body">
                                    <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '20px' }}>
                                        Configure restaurants to be served with their locations and probable pickup volumes at the start of the day.
                                    </p>
                                    
                                    <div className="config-grid">
                                        {restaurants.map((restaurant) => (
                                            <div key={restaurant.id} className="config-card">
                                                <div className="config-card-header">
                                                    <span className="restaurant-icon">🍽️</span>
                                                    <div>
                                                        <div className="config-card-title">{restaurant.name}</div>
                                                        <div className="config-card-id">{restaurant.id}</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="config-form">
                                                    <div className="form-group">
                                                        <label>Location (Latitude)</label>
                                                        <input 
                                                            type="number" 
                                                            step="0.0001"
                                                            defaultValue={restaurant.lat}
                                                            className="form-input"
                                                            placeholder="28.6300"
                                                        />
                                                    </div>
                                                    
                                                    <div className="form-group">
                                                        <label>Location (Longitude)</label>
                                                        <input 
                                                            type="number" 
                                                            step="0.0001"
                                                            defaultValue={restaurant.lng}
                                                            className="form-input"
                                                            placeholder="77.2200"
                                                        />
                                                    </div>
                                                    
                                                    <div className="form-group">
                                                        <label>Probable Pickup Volume (kg)</label>
                                                        <input 
                                                            type="number" 
                                                            step="1"
                                                            defaultValue="50"
                                                            className="form-input"
                                                            placeholder="50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                                        <button className="btn-primary">
                                            <Icon.Zap />
                                            Save Configuration
                                        </button>
                                        <button className="btn-secondary">
                                            Add Restaurant
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="config-section" style={{ marginTop: '20px' }}>
                            <div className="card">
                                <div className="card-header">
                                    <h3><Icon.Truck /> Fleet Configuration</h3>
                                    <span className="card-badge">Already Configured</span>
                                </div>
                                <div className="card-body">
                                    <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '16px' }}>
                                        Vehicle mix and capacities are already configured in the system.
                                    </p>
                                    <div className="fleet-summary">
                                        {vehicles.map((vehicle) => (
                                            <div key={vehicle.id} className="fleet-item">
                                                <span className="vehicle-id">{vehicle.id}</span>
                                                <span style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
                                                    {vehicle.type} • {vehicle.capacity_kg}kg • {vehicle.fuel_type}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="config-section" style={{ marginTop: '20px' }}>
                            <div className="card">
                                <div className="card-header">
                                    <h3><Icon.Activity /> Time Windows</h3>
                                    <span className="card-badge">Not in use</span>
                                </div>
                                <div className="card-body">
                                    <p style={{ fontSize: '13px', color: 'var(--gray-600)' }}>
                                        Time window configuration is available but not currently being used in route optimization.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </main>
            </div>
        </div>
    )
}

export default App
