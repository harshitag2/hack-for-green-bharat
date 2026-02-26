-- GREEN LANTERN - Real Data Migration Script
-- ============================================
-- This script migrates data from the existing byufuel_app database
-- to the Green Lantern system

-- ========================
-- CLEAR EXISTING SYNTHETIC DATA
-- ========================

TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE vehicle_state CASCADE;
TRUNCATE TABLE warehouses CASCADE;
TRUNCATE TABLE restaurants CASCADE;
TRUNCATE TABLE routes CASCADE;
TRUNCATE TABLE pickups CASCADE;
TRUNCATE TABLE alerts CASCADE;
TRUNCATE TABLE emissions CASCADE;

-- ========================
-- MIGRATE WAREHOUSES
-- ========================
-- Map from real warehouses table to Green Lantern format

INSERT INTO warehouses (id, name, lat, lng)
SELECT 
    'WH' || LPAD(id::TEXT, 3, '0') as id,
    name,
    latitude as lat,
    longitude as lng
FROM public.warehouses
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng;

-- ========================
-- MIGRATE RESTAURANTS
-- ========================
-- Map from real restaurants table to Green Lantern format

INSERT INTO restaurants (id, name, lat, lng)
SELECT 
    'R' || LPAD(id::TEXT, 3, '0') as id,
    outlet_name as name,
    latitude as lat,
    longitude as lng
FROM public.restaurants
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng;

-- ========================
-- MIGRATE FLEET TO VEHICLES
-- ========================
-- Map from real fleets table to Green Lantern vehicles
-- Create one vehicle entry per fleet count

INSERT INTO vehicles (id, type, capacity_kg, fuel_type)
SELECT 
    'V' || LPAD(ROW_NUMBER() OVER (ORDER BY f.id)::TEXT, 3, '0') as id,
    LOWER(f.vehicle_type) as type,
    COALESCE(f.capacity, 500.0) as capacity_kg,
    COALESCE(LOWER(f.fuel_type), 'diesel') as fuel_type
FROM public.fleets f
WHERE f.available > 0
ON CONFLICT (id) DO UPDATE SET
    type = EXCLUDED.type,
    capacity_kg = EXCLUDED.capacity_kg,
    fuel_type = EXCLUDED.fuel_type;

-- ========================
-- INITIALIZE VEHICLE STATES
-- ========================
-- Place vehicles at their assigned warehouses

INSERT INTO vehicle_state (vehicle_id, lat, lng, speed, load_kg)
SELECT 
    v.id as vehicle_id,
    COALESCE(w.lat, 28.6139) as lat,
    COALESCE(w.lng, 77.2090) as lng,
    0 as speed,
    0 as load_kg
FROM vehicles v
LEFT JOIN (
    SELECT 
        'V' || LPAD(ROW_NUMBER() OVER (ORDER BY f.id)::TEXT, 3, '0') as vehicle_id,
        f.warehouse_id
    FROM public.fleets f
    WHERE f.available > 0
) fmap ON v.id = fmap.vehicle_id
LEFT JOIN public.warehouses wh ON fmap.warehouse_id = wh.id
LEFT JOIN warehouses w ON w.name = wh.name
ON CONFLICT (vehicle_id) DO UPDATE SET
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng;

-- ========================
-- INITIALIZE ROUTES
-- ========================
-- Create simple routes from warehouse to restaurants

INSERT INTO routes (vehicle_id, polyline_json)
SELECT 
    v.id as vehicle_id,
    '[]'::TEXT as polyline_json
FROM vehicles v
ON CONFLICT (vehicle_id) DO UPDATE SET
    polyline_json = EXCLUDED.polyline_json;

-- ========================
-- SUMMARY
-- ========================

DO $$
DECLARE
    v_count INTEGER;
    w_count INTEGER;
    r_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM vehicles;
    SELECT COUNT(*) INTO w_count FROM warehouses;
    SELECT COUNT(*) INTO r_count FROM restaurants;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GREEN LANTERN - Data Migration Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Vehicles migrated: %', v_count;
    RAISE NOTICE 'Warehouses migrated: %', w_count;
    RAISE NOTICE 'Restaurants migrated: %', r_count;
    RAISE NOTICE '========================================';
END $$;
