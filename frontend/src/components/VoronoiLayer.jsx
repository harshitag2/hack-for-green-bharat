import { useEffect, useState } from 'react'
import { Polygon, Tooltip, useMap, GeoJSON, Marker, Popup } from 'react-leaflet'
import { Delaunay } from 'd3-delaunay'
import polygonClipping from 'polygon-clipping'
import L from 'leaflet'

// Warehouse icon
const warehouseIcon = L.divIcon({
    html: `
        <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
            font-size: 20px;
        ">
            🏭
        </div>
    `,
    className: 'warehouse-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
})

function VoronoiLayer({ warehouses, restaurants }) {
    const [voronoiCells, setVoronoiCells] = useState([])
    const [delhiBoundary, setDelhiBoundary] = useState(null)
    const map = useMap()

    // Load Delhi GeoJSON if available
    useEffect(() => {
        fetch('/delhi_boundary.geojson')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    console.log('Loaded Delhi boundary GeoJSON')
                    setDelhiBoundary(data)
                }
            })
            .catch((error) => {
                console.error('Failed to load Delhi boundary', error)
            })
    }, [])

    useEffect(() => {
        if (!warehouses || warehouses.length === 0 || !delhiBoundary) return

        // Get Delhi boundary coordinates
        const boundaryCoords = delhiBoundary.features[0].geometry.coordinates[0]
        const lngs = boundaryCoords.map(c => c[0])
        const lats = boundaryCoords.map(c => c[1])
        const west = Math.min(...lngs)
        const east = Math.max(...lngs)
        const south = Math.min(...lats)
        const north = Math.max(...lats)

        // Prepare warehouse points
        const points = warehouses.map(w => [w.lng, w.lat])
        
        if (points.length < 2) return

        // Create Delaunay triangulation
        const delaunay = Delaunay.from(points)
        
        // Create Voronoi diagram with bounds
        const voronoi = delaunay.voronoi([west, south, east, north])

        // Delhi boundary polygon for clipping (in [lng, lat] format)
        const delhiPolygon = [boundaryCoords]

        // Generate cells with warehouse info
        const cells = warehouses.map((warehouse, i) => {
            const cell = voronoi.cellPolygon(i)
            if (!cell) return null

            // Clip Voronoi cell to Delhi boundary
            const voronoiPolygon = [cell]
            let clippedPolygon
            
            try {
                // Perform polygon intersection
                const intersection = polygonClipping.intersection(voronoiPolygon, delhiPolygon)
                
                if (!intersection || intersection.length === 0) return null
                
                // Get the first polygon from intersection result
                clippedPolygon = intersection[0][0]
            } catch (error) {
                console.warn('Polygon clipping failed for warehouse', warehouse.id, error)
                clippedPolygon = cell // Fallback to unclipped
            }

            // Convert to lat/lng format for Leaflet
            const positions = clippedPolygon.map(([lng, lat]) => [lat, lng])

            // Find restaurants in this cell
            const restaurantsInCell = restaurants.filter(restaurant => {
                // Check if restaurant is closest to this warehouse
                let minDist = Infinity
                let closestIdx = -1
                
                warehouses.forEach((wh, idx) => {
                    const dist = Math.sqrt(
                        Math.pow(restaurant.lat - wh.lat, 2) + 
                        Math.pow(restaurant.lng - wh.lng, 2)
                    )
                    if (dist < minDist) {
                        minDist = dist
                        closestIdx = idx
                    }
                })
                
                return closestIdx === i
            })

            // Calculate total UCO volume (if available)
            const totalUCO = restaurantsInCell.reduce((sum, r) => {
                if (r.uco_pickup_history && Array.isArray(r.uco_pickup_history)) {
                    const avgUCO = r.uco_pickup_history.reduce((a, b) => a + b, 0) / r.uco_pickup_history.length
                    return sum + avgUCO
                }
                return sum + 50 // Default estimate
            }, 0)

            return {
                id: warehouse.id,
                name: warehouse.name,
                positions,
                restaurantCount: restaurantsInCell.length,
                restaurants: restaurantsInCell,
                totalUCO: Math.round(totalUCO),
                warehouse
            }
        }).filter(Boolean)

        setVoronoiCells(cells)
    }, [warehouses, restaurants, map, delhiBoundary])

    // Color palette for different warehouses
    const colors = [
        'rgba(59, 130, 246, 0.15)',   // blue
        'rgba(34, 197, 94, 0.15)',    // green
        'rgba(245, 158, 11, 0.15)',   // orange
        'rgba(139, 92, 246, 0.15)',   // purple
        'rgba(236, 72, 153, 0.15)',   // pink
    ]

    const borderColors = [
        '#3b82f6',
        '#22c55e',
        '#f59e0b',
        '#8b5cf6',
        '#ec4899',
    ]

    return (
        <>
            {/* Delhi Boundary Overlay - Only show if loaded */}
            {delhiBoundary && (
                <GeoJSON
                    data={delhiBoundary}
                    style={{
                        fillColor: 'transparent',
                        color: '#1e293b',
                        weight: 3,
                        opacity: 0.8,
                        dashArray: '10, 5'
                    }}
                />
            )}

            {voronoiCells.map((cell, idx) => (
                <Polygon
                    key={cell.id}
                    positions={cell.positions}
                    pathOptions={{
                        fillColor: colors[idx % colors.length],
                        fillOpacity: 0.3,
                        color: borderColors[idx % borderColors.length],
                        weight: 2,
                        opacity: 0.6,
                        dashArray: '5, 5'
                    }}
                    eventHandlers={{
                        mouseover: (e) => {
                            e.target.setStyle({
                                fillOpacity: 0.5,
                                weight: 3,
                                opacity: 0.9
                            })
                        },
                        mouseout: (e) => {
                            e.target.setStyle({
                                fillOpacity: 0.3,
                                weight: 2,
                                opacity: 0.6
                            })
                        }
                    }}
                >
                    <Tooltip direction="center" permanent={false} opacity={0.95}>
                        <div style={{ 
                            fontFamily: 'Inter, sans-serif', 
                            minWidth: '220px',
                            padding: '4px'
                        }}>
                            <div style={{ 
                                fontSize: '14px', 
                                fontWeight: 700, 
                                color: '#1e293b',
                                marginBottom: '8px',
                                paddingBottom: '8px',
                                borderBottom: '2px solid ' + borderColors[idx % borderColors.length]
                            }}>
                                🏭 {cell.name}
                            </div>
                            
                            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.8 }}>
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    marginBottom: '4px'
                                }}>
                                    <span>📍 Service Area:</span>
                                    <strong style={{ color: borderColors[idx % borderColors.length] }}>
                                        Zone {idx + 1}
                                    </strong>
                                </div>
                                
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    marginBottom: '4px'
                                }}>
                                    <span>🍽️ Restaurants:</span>
                                    <strong>{cell.restaurantCount}</strong>
                                </div>
                                
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    marginBottom: '4px'
                                }}>
                                    <span>🛢️ Est. UCO Volume:</span>
                                    <strong>{cell.totalUCO} kg/day</strong>
                                </div>

                                {cell.restaurantCount > 0 && (
                                    <div style={{ 
                                        marginTop: '8px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{ 
                                            fontSize: '11px', 
                                            fontWeight: 600,
                                            color: '#64748b',
                                            marginBottom: '4px'
                                        }}>
                                            Top Restaurants:
                                        </div>
                                        {cell.restaurants.slice(0, 3).map((r, i) => (
                                            <div key={i} style={{ 
                                                fontSize: '11px',
                                                color: '#64748b',
                                                marginLeft: '8px'
                                            }}>
                                                • {r.name}
                                            </div>
                                        ))}
                                        {cell.restaurantCount > 3 && (
                                            <div style={{ 
                                                fontSize: '11px',
                                                color: '#94a3b8',
                                                marginLeft: '8px',
                                                fontStyle: 'italic'
                                            }}>
                                                +{cell.restaurantCount - 3} more...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tooltip>
                </Polygon>
            ))}

            {/* Warehouse Markers */}
            {warehouses.map((warehouse, idx) => (
                <Marker
                    key={warehouse.id}
                    position={[warehouse.lat, warehouse.lng]}
                    icon={warehouseIcon}
                    zIndexOffset={1000}
                >
                    <Popup>
                        <div style={{ 
                            fontFamily: 'Inter, sans-serif',
                            minWidth: '200px'
                        }}>
                            <div style={{ 
                                fontSize: '14px', 
                                fontWeight: 700,
                                color: '#8b5cf6',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{ fontSize: '18px' }}>🏭</span>
                                {warehouse.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                                <div><strong>ID:</strong> {warehouse.id}</div>
                                <div><strong>Location:</strong> {warehouse.address || warehouse.state}</div>
                                <div style={{ marginTop: '6px', color: '#8b5cf6', fontWeight: 600 }}>
                                    Service Zone {idx + 1}
                                </div>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    )
}

export default VoronoiLayer
