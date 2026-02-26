import React, { useEffect, useState } from 'react'
import { Polygon, Tooltip, useMap } from 'react-leaflet'
import { Delaunay } from 'd3-delaunay'

function VoronoiLayer({ warehouses, restaurants }) {
    const [voronoiCells, setVoronoiCells] = useState([])
    const map = useMap()

    useEffect(() => {
        if (!warehouses || warehouses.length === 0) return

        // Get map bounds
        const bounds = map.getBounds()
        const north = bounds.getNorth()
        const south = bounds.getSouth()
        const east = bounds.getEast()
        const west = bounds.getWest()

        // Prepare warehouse points
        const points = warehouses.map(w => [w.lng, w.lat])
        
        if (points.length < 2) return

        // Create Delaunay triangulation
        const delaunay = Delaunay.from(points)
        
        // Create Voronoi diagram with bounds
        const voronoi = delaunay.voronoi([west, south, east, north])

        // Generate cells with warehouse info
        const cells = warehouses.map((warehouse, i) => {
            const cell = voronoi.cellPolygon(i)
            if (!cell) return null

            // Convert to lat/lng format for Leaflet
            const positions = cell.map(([lng, lat]) => [lat, lng])

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
    }, [warehouses, restaurants, map])

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
        </>
    )
}

export default VoronoiLayer
