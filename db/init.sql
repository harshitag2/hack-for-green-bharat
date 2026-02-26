-- GREEN LANTERN Database Schema
-- ========================
-- Integrated with real byufuel_app data

-- Users table for authentication (from real schema)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Warehouses (from real schema)
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    rent_type VARCHAR(50) DEFAULT 'WH Rent',
    address TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_warehouses_user_id ON warehouses(user_id);

-- Restaurants (from real schema)
CREATE TABLE IF NOT EXISTS restaurants (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area VARCHAR(255),
    city VARCHAR(100),
    pincode INTEGER,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    uco_pickup_history INTEGER[] DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restaurants_user_id ON restaurants(user_id);

-- Fleets (from real schema) - source for vehicles
CREATE TABLE IF NOT EXISTS fleets (
    id SERIAL PRIMARY KEY,
    vehicle VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    capacity DECIMAL(10, 2),
    fuel_type VARCHAR(50),
    warehouse_id VARCHAR(20) REFERENCES warehouses(id) ON DELETE SET NULL,
    available INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT available_check CHECK (available <= count)
);

CREATE INDEX IF NOT EXISTS idx_fleets_user_id ON fleets(user_id);
CREATE INDEX IF NOT EXISTS idx_fleets_warehouse_id ON fleets(warehouse_id);

-- Vehicles fleet (Green Lantern tracking)
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(20) PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'truck',
    capacity_kg FLOAT NOT NULL DEFAULT 500.0,
    fuel_type VARCHAR(20) NOT NULL DEFAULT 'diesel',
    fleet_id INTEGER REFERENCES fleets(id) ON DELETE SET NULL
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

-- Pickup requests
CREATE TABLE IF NOT EXISTS pickups (
    id VARCHAR(50) PRIMARY KEY,
    restaurant_id VARCHAR(20) REFERENCES restaurants(id),
    requested_load_kg DOUBLE PRECISION NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    assigned_vehicle VARCHAR(20) REFERENCES vehicles(id),
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
-- NOTE: Real data will be loaded via migrate_real_data.sql
-- Run that script after this initialization
-- ========================
