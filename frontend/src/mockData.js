// Mock data for Vercel deployment (no backend needed)

// Helper function to generate random movement
const randomMove = (value, delta = 0.001) => {
    return value + (Math.random() - 0.5) * delta
}

// Helper function to generate random speed
const randomSpeed = (current, min = 0, max = 60) => {
    const change = (Math.random() - 0.5) * 10
    return Math.max(min, Math.min(max, current + change))
}

export const mockVehicles = [
    {
        id: "V001",
        type: "truck",
        capacity_kg: 500.0,
        fuel_type: "diesel",
        lat: 28.6315,
        lng: 77.2167,
        speed: 35.5,
        load_kg: 120.0,
        capacity_pct: 24.0,
        updated_at: new Date().toISOString()
    },
    {
        id: "V002",
        type: "van",
        capacity_kg: 300.0,
        fuel_type: "cng",
        lat: 28.5494,
        lng: 77.2501,
        speed: 42.0,
        load_kg: 80.0,
        capacity_pct: 26.7,
        updated_at: new Date().toISOString()
    },
    {
        id: "V003",
        type: "truck",
        capacity_kg: 600.0,
        fuel_type: "diesel",
        lat: 28.6358,
        lng: 77.2778,
        speed: 28.3,
        load_kg: 200.0,
        capacity_pct: 33.3,
        updated_at: new Date().toISOString()
    },
    {
        id: "V004",
        type: "mini-truck",
        capacity_kg: 400.0,
        fuel_type: "electric",
        lat: 28.6415,
        lng: 77.1214,
        speed: 0,
        load_kg: 150.0,
        capacity_pct: 37.5,
        updated_at: new Date().toISOString()
    }
];

export const mockWarehouses = [
    {
        id: "WH001",
        name: "Central Delhi Warehouse",
        lat: 28.6315,
        lng: 77.2167,
        state: "Delhi",
        address: "Central Delhi"
    },
    {
        id: "WH002",
        name: "South Delhi Depot",
        lat: 28.5494,
        lng: 77.2501,
        state: "Delhi",
        address: "South Delhi"
    },
    {
        id: "WH003",
        name: "East Delhi Hub",
        lat: 28.6358,
        lng: 77.2778,
        state: "Delhi",
        address: "East Delhi"
    }
];

export const mockRestaurants = [
    {
        id: "R001",
        name: "Spice Route Restaurant",
        lat: 28.63,
        lng: 77.22,
        area: "Connaught Place",
        city: "Delhi",
        uco_pickup_history: [45, 50, 48, 52, 47]
    },
    {
        id: "R002",
        name: "Delhi Darbar",
        lat: 28.645,
        lng: 77.21,
        area: "Karol Bagh",
        city: "Delhi",
        uco_pickup_history: [60, 65, 58, 62, 61]
    },
    {
        id: "R003",
        name: "Tandoori Nights",
        lat: 28.62,
        lng: 77.235,
        area: "Nehru Place",
        city: "Delhi",
        uco_pickup_history: [35, 40, 38, 42, 36]
    },
    {
        id: "R004",
        name: "Green Leaf Cafe",
        lat: 28.51,
        lng: 77.24,
        area: "Saket",
        city: "Delhi",
        uco_pickup_history: [25, 30, 28, 32, 27]
    },
    {
        id: "R005",
        name: "Royal Kitchen",
        lat: 28.595,
        lng: 77.046,
        area: "Dwarka",
        city: "Delhi",
        uco_pickup_history: [55, 58, 52, 60, 56]
    }
];

export const mockRoutes = [
    {
        vehicle_id: "V001",
        polyline: [
            [28.6315, 77.2167],
            [28.63, 77.22],
            [28.645, 77.21],
            [28.6315, 77.2167]
        ],
        updated_at: new Date().toISOString()
    },
    {
        vehicle_id: "V002",
        polyline: [
            [28.5494, 77.2501],
            [28.51, 77.24],
            [28.595, 77.046],
            [28.5494, 77.2501]
        ],
        updated_at: new Date().toISOString()
    },
    {
        vehicle_id: "V003",
        polyline: [
            [28.6358, 77.2778],
            [28.62, 77.235],
            [28.63, 77.22],
            [28.6358, 77.2778]
        ],
        updated_at: new Date().toISOString()
    },
    {
        vehicle_id: "V004",
        polyline: [
            [28.6415, 77.1214],
            [28.645, 77.21],
            [28.6315, 77.2167]
        ],
        updated_at: new Date().toISOString()
    }
];

export const mockAlerts = [
    {
        id: 1,
        vehicle_id: "V002",
        type: "overspeed",
        payload_json: JSON.stringify({ speed: 85, limit: 80 }),
        created_at: new Date(Date.now() - 300000).toISOString()
    },
    {
        id: 2,
        vehicle_id: "V001",
        type: "maintenance_due",
        payload_json: JSON.stringify({ km: 9500, next_service: 10000 }),
        created_at: new Date(Date.now() - 600000).toISOString()
    }
];

export const mockEmissions = [
    {
        id: 1,
        vehicle_id: "V001",
        co2_est: 2.5,
        fuel_est: 1.2,
        load_kg: 120,
        speed: 35.5,
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        vehicle_id: "V002",
        co2_est: 1.8,
        fuel_est: 0.9,
        load_kg: 80,
        speed: 42.0,
        created_at: new Date().toISOString()
    },
    {
        id: 3,
        vehicle_id: "V003",
        co2_est: 3.2,
        fuel_est: 1.5,
        load_kg: 200,
        speed: 28.3,
        created_at: new Date().toISOString()
    }
];


// Function to simulate live vehicle updates
export const simulateVehicleUpdate = (vehicles, warehouses = [], restaurants = []) => {
    return vehicles.map(vehicle => {
        // Randomly update position (simulate movement)
        const newLat = randomMove(vehicle.lat, 0.002)
        const newLng = randomMove(vehicle.lng, 0.002)
        
        // Check if vehicle is near a warehouse or restaurant (within 0.5 km)
        let isAtLocation = false
        
        // Helper function to calculate distance
        const getDistance = (lat1, lng1, lat2, lng2) => {
            const R = 6371 // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180
            const dLng = (lng2 - lng1) * Math.PI / 180
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLng / 2) * Math.sin(dLng / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return R * c
        }
        
        // Check warehouses
        for (const warehouse of warehouses) {
            if (getDistance(newLat, newLng, warehouse.lat, warehouse.lng) < 0.5) {
                isAtLocation = true
                break
            }
        }
        
        // Check restaurants if not at warehouse
        if (!isAtLocation) {
            for (const restaurant of restaurants) {
                if (getDistance(newLat, newLng, restaurant.lat, restaurant.lng) < 0.5) {
                    isAtLocation = true
                    break
                }
            }
        }
        
        // Set speed based on location
        let newSpeed
        if (isAtLocation) {
            newSpeed = 0 // Stopped at warehouse/restaurant for loading/unloading
        } else {
            newSpeed = randomSpeed(vehicle.speed, 5, 65) // Moving between locations
        }
        
        // Randomly update load (simulate pickups/dropoffs)
        let newLoad = vehicle.load_kg
        if (Math.random() > 0.95) { // 5% chance of load change
            newLoad = Math.max(0, Math.min(vehicle.capacity_kg, newLoad + (Math.random() - 0.5) * 50))
        }
        
        const newCapacityPct = (newLoad / vehicle.capacity_kg) * 100
        
        return {
            ...vehicle,
            lat: newLat,
            lng: newLng,
            speed: parseFloat(newSpeed.toFixed(1)),
            load_kg: parseFloat(newLoad.toFixed(1)),
            capacity_pct: parseFloat(newCapacityPct.toFixed(1)),
            updated_at: new Date().toISOString()
        }
    })
}

// Function to generate new emission data
export const generateEmissionData = (vehicles) => {
    return vehicles.map(vehicle => ({
        id: Date.now() + Math.random(),
        vehicle_id: vehicle.id,
        co2_est: parseFloat((vehicle.speed * 0.05 + Math.random() * 0.5).toFixed(3)),
        fuel_est: parseFloat((vehicle.speed * 0.025 + Math.random() * 0.3).toFixed(3)),
        load_kg: vehicle.load_kg,
        speed: vehicle.speed,
        created_at: new Date().toISOString()
    }))
}

// Function to randomly generate alerts
export const generateRandomAlert = (vehicles) => {
    if (Math.random() > 0.9) { // 10% chance per update
        const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)]
        const alertTypes = [
            { type: 'overspeed', payload: { speed: 85, limit: 80 } },
            { type: 'route_deviation', payload: { deviation_km: 2.5 } },
            { type: 'harsh_braking', payload: { deceleration: -8.5 } },
            { type: 'idle_time', payload: { idle_minutes: 15 } }
        ]
        const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)]
        
        return {
            id: Date.now() + Math.random(),
            vehicle_id: vehicle.id,
            type: alert.type,
            payload_json: JSON.stringify(alert.payload),
            created_at: new Date().toISOString()
        }
    }
    return null
}

// Function to update routes based on vehicle positions
export const updateRoutes = (vehicles, warehouses, restaurants) => {
    return vehicles.map(vehicle => {
        // Create a route from current position through some restaurants back to warehouse
        const nearbyRestaurants = restaurants.slice(0, 2)
        const warehouse = warehouses[0]
        
        const polyline = [
            [vehicle.lat, vehicle.lng],
            ...nearbyRestaurants.map(r => [r.lat, r.lng]),
            [warehouse.lat, warehouse.lng]
        ]
        
        return {
            vehicle_id: vehicle.id,
            polyline,
            updated_at: new Date().toISOString()
        }
    })
}
