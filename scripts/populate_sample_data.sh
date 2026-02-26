#!/bin/bash
# Quick script to populate Green Lantern with sample real data

echo "=========================================="
echo "Green Lantern - Populating Sample Data"
echo "=========================================="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
sleep 5

# Connect to database and populate
docker exec -i greenlantern-postgres psql -U greenlantern -d greenlantern <<EOF

-- Clear existing data
TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE vehicle_state CASCADE;
TRUNCATE TABLE warehouses CASCADE;
TRUNCATE TABLE restaurants CASCADE;
TRUNCATE TABLE routes CASCADE;
TRUNCATE TABLE alerts CASCADE;
TRUNCATE TABLE emissions CASCADE;

-- Insert Real Warehouses (Delhi area)
INSERT INTO warehouses (id, name, state, rent_type, address, lat, lng, user_id) VALUES
    ('WH001', 'Central Delhi Warehouse', 'Delhi', 'WH Rent', 'Connaught Place, New Delhi', 28.6315, 77.2167, NULL),
    ('WH002', 'South Delhi Depot', 'Delhi', 'WH Rent', 'Nehru Place, South Delhi', 28.5494, 77.2501, NULL),
    ('WH003', 'East Delhi Hub', 'Delhi', 'WH Rent', 'Laxmi Nagar, East Delhi', 28.6358, 77.2778, NULL),
    ('WH004', 'West Delhi Center', 'Delhi', 'WH Rent', 'Rajouri Garden, West Delhi', 28.6415, 77.1214, NULL);

-- Insert Real Restaurants (Delhi area)
INSERT INTO restaurants (id, name, area, city, pincode, lat, lng, user_id, uco_pickup_history) VALUES
    ('R001', 'Spice Route Restaurant', 'Connaught Place', 'New Delhi', 110001, 28.6300, 77.2200, NULL, ARRAY[45, 52, 48, 50]),
    ('R002', 'Delhi Darbar', 'Karol Bagh', 'New Delhi', 110005, 28.6450, 77.2100, NULL, ARRAY[38, 42, 40, 45]),
    ('R003', 'Tandoori Nights', 'Hauz Khas', 'New Delhi', 110016, 28.6200, 77.2350, NULL, ARRAY[55, 60, 58, 62]),
    ('R004', 'Green Leaf Cafe', 'Saket', 'New Delhi', 110017, 28.5100, 77.2400, NULL, ARRAY[25, 30, 28, 32]),
    ('R005', 'Royal Kitchen', 'Dwarka', 'New Delhi', 110075, 28.5950, 77.0460, NULL, ARRAY[70, 75, 72, 78]),
    ('R006', 'Punjabi Rasoi', 'Lajpat Nagar', 'New Delhi', 110024, 28.5677, 77.2431, NULL, ARRAY[42, 48, 45, 50]),
    ('R007', 'Mughlai Zaika', 'Chandni Chowk', 'New Delhi', 110006, 28.6506, 77.2303, NULL, ARRAY[65, 70, 68, 72]),
    ('R008', 'South Indian Express', 'Nehru Place', 'New Delhi', 110019, 28.5495, 77.2501, NULL, ARRAY[35, 40, 38, 42]),
    ('R009', 'Chinese Wok', 'Rohini', 'New Delhi', 110085, 28.7495, 77.0736, NULL, ARRAY[50, 55, 52, 58]),
    ('R010', 'Italian Bistro', 'Greater Kailash', 'New Delhi', 110048, 28.5494, 77.2410, NULL, ARRAY[30, 35, 32, 38]);

-- Insert Real Vehicles (Mixed fleet)
INSERT INTO vehicles (id, type, capacity_kg, fuel_type) VALUES
    ('V001', 'truck', 500.0, 'diesel'),
    ('V002', 'van', 300.0, 'cng'),
    ('V003', 'truck', 600.0, 'diesel'),
    ('V004', 'mini-truck', 400.0, 'diesel'),
    ('V005', 'van', 350.0, 'electric'),
    ('V006', 'truck', 550.0, 'diesel'),
    ('V007', 'van', 280.0, 'cng'),
    ('V008', 'truck', 650.0, 'diesel');

-- Initialize vehicle states at warehouses
INSERT INTO vehicle_state (vehicle_id, lat, lng, speed, load_kg) VALUES
    ('V001', 28.6315, 77.2167, 0, 120),
    ('V002', 28.5494, 77.2501, 0, 80),
    ('V003', 28.6358, 77.2778, 0, 200),
    ('V004', 28.6415, 77.1214, 0, 150),
    ('V005', 28.6315, 77.2167, 0, 90),
    ('V006', 28.5494, 77.2501, 0, 180),
    ('V007', 28.6358, 77.2778, 0, 110),
    ('V008', 28.6415, 77.1214, 0, 220);

-- Initialize routes
INSERT INTO routes (vehicle_id, polyline_json) VALUES
    ('V001', '[[28.6315,77.2167],[28.6300,77.2200],[28.6200,77.2350],[28.5100,77.2400]]'),
    ('V002', '[[28.5494,77.2501],[28.5677,77.2431],[28.5494,77.2410],[28.5495,77.2501]]'),
    ('V003', '[[28.6358,77.2778],[28.6450,77.2100],[28.6506,77.2303],[28.6315,77.2167]]'),
    ('V004', '[[28.6415,77.1214],[28.5950,77.0460],[28.7495,77.0736],[28.6415,77.1214]]'),
    ('V005', '[[28.6315,77.2167],[28.6300,77.2200],[28.6450,77.2100]]'),
    ('V006', '[[28.5494,77.2501],[28.5677,77.2431],[28.5495,77.2501]]'),
    ('V007', '[[28.6358,77.2778],[28.6506,77.2303],[28.6315,77.2167]]'),
    ('V008', '[[28.6415,77.1214],[28.5950,77.0460],[28.7495,77.0736]]');

-- Summary
SELECT 
    (SELECT COUNT(*) FROM vehicles) as vehicles,
    (SELECT COUNT(*) FROM warehouses) as warehouses,
    (SELECT COUNT(*) FROM restaurants) as restaurants;

\echo '=========================================='
\echo 'Data Population Complete!'
\echo '=========================================='

EOF

echo ""
echo "✓ Populated 8 vehicles"
echo "✓ Populated 4 warehouses"
echo "✓ Populated 10 restaurants"
echo ""
echo "Restart the system to see new data:"
echo "  docker-compose restart"
echo ""
