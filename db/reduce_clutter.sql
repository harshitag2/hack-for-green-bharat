-- Reduce map clutter by keeping only essential locations
-- ========================================================

-- Clean up orphaned records first
DELETE FROM vehicle_state WHERE vehicle_id NOT IN (
    SELECT id FROM vehicles ORDER BY id LIMIT 4
);
DELETE FROM routes WHERE vehicle_id NOT IN (
    SELECT id FROM vehicles ORDER BY id LIMIT 4
);
DELETE FROM pickups WHERE assigned_vehicle NOT IN (
    SELECT id FROM vehicles ORDER BY id LIMIT 4
);

-- Keep only 3 warehouses (well distributed)
DELETE FROM warehouses 
WHERE id NOT IN (
    SELECT id FROM warehouses 
    ORDER BY id 
    LIMIT 3
);

-- Keep only 5 restaurants (spread across the map)
DELETE FROM restaurants 
WHERE id NOT IN (
    SELECT id FROM restaurants 
    ORDER BY id 
    LIMIT 5
);

-- Keep only 4 vehicles
DELETE FROM vehicles 
WHERE id NOT IN (
    SELECT id FROM vehicles 
    ORDER BY id 
    LIMIT 4
);

-- Clean up any remaining orphaned records
DELETE FROM pickups WHERE restaurant_id NOT IN (SELECT id FROM restaurants);

-- Summary
SELECT 
    (SELECT COUNT(*) FROM warehouses) as warehouses,
    (SELECT COUNT(*) FROM restaurants) as restaurants,
    (SELECT COUNT(*) FROM vehicles) as vehicles;
