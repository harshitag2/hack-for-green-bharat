-- BYUFUEL Database Schema
-- ========================

-- Vehicles fleet
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(20) PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'truck',
    capacity_kg FLOAT NOT NULL DEFAULT 500.0,
    fuel_type VARCHAR(20) NOT NULL DEFAULT 'diesel'
);

-- Latest vehicle state
CREATE TABLE IF NOT EXISTS vehicle_state (
    vehicle_id VARCHAR(20) PRIMARY KEY REFERENCES vehicles(id),
    lat DOUBLE PRECISION NOT NULL DEFAULT 0,
    lng DOUBLE PRECISION NOT NULL DEFAULT 0,
    speed DOUBLE PRECISION NOT NULL DEFAULT 0,
    load_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL
);

-- Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL
);

-- Pickup requests
CREATE TABLE IF NOT EXISTS pickups (
    id VARCHAR(50) PRIMARY KEY,
    restaurant_id VARCHAR(20),
    requested_load_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    assigned_vehicle VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Routes
CREATE TABLE IF NOT EXISTS routes (
    vehicle_id VARCHAR(20) PRIMARY KEY REFERENCES vehicles(id),
    polyline_json TEXT NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Emissions
CREATE TABLE IF NOT EXISTS emissions (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL,
    co2_est DOUBLE PRECISION NOT NULL DEFAULT 0,
    fuel_est DOUBLE PRECISION NOT NULL DEFAULT 0,
    load_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    speed DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================
-- SEED DATA
-- ========================

-- 3 Vehicles
INSERT INTO vehicles (id, type, capacity_kg, fuel_type) VALUES
    ('V001', 'truck', 500.0, 'diesel'),
    ('V002', 'van', 300.0, 'cng'),
    ('V003', 'truck', 600.0, 'diesel')
ON CONFLICT (id) DO NOTHING;

-- Initial vehicle states (Delhi area)
INSERT INTO vehicle_state (vehicle_id, lat, lng, speed, load_kg) VALUES
    ('V001', 28.6139, 77.2090, 0, 0),
    ('V002', 28.6280, 77.2190, 0, 0),
    ('V003', 28.6350, 77.2250, 0, 0)
ON CONFLICT (vehicle_id) DO NOTHING;

-- 2 Warehouses
INSERT INTO warehouses (id, name, lat, lng) VALUES
    ('W001', 'Central Warehouse', 28.6139, 77.2090),
    ('W002', 'South Warehouse', 28.5500, 77.2500)
ON CONFLICT (id) DO NOTHING;

-- 5 Restaurants
INSERT INTO restaurants (id, name, lat, lng) VALUES
    ('R001', 'Spice Garden', 28.6300, 77.2200),
    ('R002', 'Delhi Darbar', 28.6450, 77.2100),
    ('R003', 'Tandoori Nights', 28.6200, 77.2350),
    ('R004', 'Green Leaf Cafe', 28.6100, 77.2400),
    ('R005', 'Royal Kitchen', 28.6500, 77.2300)
ON CONFLICT (id) DO NOTHING;

-- Initial routes (simple polylines around Delhi)
INSERT INTO routes (vehicle_id, polyline_json) VALUES
    ('V001', '[[28.6139,77.2090],[28.6200,77.2150],[28.6300,77.2200],[28.6350,77.2250]]'),
    ('V002', '[[28.6280,77.2190],[28.6350,77.2250],[28.6450,77.2100],[28.6500,77.2300]]'),
    ('V003', '[[28.6350,77.2250],[28.6200,77.2350],[28.6100,77.2400],[28.6139,77.2090]]')
ON CONFLICT (vehicle_id) DO NOTHING;
