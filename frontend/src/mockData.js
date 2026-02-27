// Mock data for Vercel deployment (no backend needed)

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
