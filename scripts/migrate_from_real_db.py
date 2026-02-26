#!/usr/bin/env python3
"""
Green Lantern - Real Data Migration Script
==========================================
Migrates data from existing byufuel_app database to Green Lantern system.

Usage:
    python migrate_from_real_db.py --source-db "postgresql://user:pass@host:port/byufuel_app"
"""

import psycopg2
import os
import sys
import argparse
from datetime import datetime

# Default connection strings
DEFAULT_SOURCE_DB = os.environ.get("SOURCE_DATABASE_URL", "postgresql://user:pass@localhost:5432/byufuel_app")
DEFAULT_TARGET_DB = os.environ.get("DATABASE_URL", "postgresql://greenlantern:greenlantern123@localhost:5432/greenlantern")


def connect_db(connection_string, name):
    """Connect to database with retries."""
    print(f"[INFO] Connecting to {name} database...")
    try:
        conn = psycopg2.connect(connection_string)
        conn.autocommit = True
        print(f"[SUCCESS] Connected to {name} database")
        return conn
    except Exception as e:
        print(f"[ERROR] Failed to connect to {name} database: {e}")
        sys.exit(1)


def migrate_warehouses(source_conn, target_conn):
    """Migrate warehouses from source to target."""
    print("\n[STEP 1] Migrating warehouses...")
    
    source_cur = source_conn.cursor()
    target_cur = target_conn.cursor()
    
    # Fetch warehouses from source
    source_cur.execute("""
        SELECT id, name, state, rent_type, address, latitude, longitude, user_id
        FROM warehouses
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY id
    """)
    
    warehouses = source_cur.fetchall()
    count = 0
    
    for row in warehouses:
        wh_id = f"WH{str(row[0]).zfill(3)}"
        name = row[1]
        state = row[2]
        rent_type = row[3]
        address = row[4]
        lat = float(row[5])
        lng = float(row[6])
        user_id = row[7]
        
        target_cur.execute("""
            INSERT INTO warehouses (id, name, state, rent_type, address, lat, lng, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                state = EXCLUDED.state,
                rent_type = EXCLUDED.rent_type,
                address = EXCLUDED.address
        """, (wh_id, name, state, rent_type, address, lat, lng, user_id))
        count += 1
    
    source_cur.close()
    target_cur.close()
    print(f"[SUCCESS] Migrated {count} warehouses")
    return count


def migrate_restaurants(source_conn, target_conn):
    """Migrate restaurants from source to target."""
    print("\n[STEP 2] Migrating restaurants...")
    
    source_cur = source_conn.cursor()
    target_cur = target_conn.cursor()
    
    # Fetch restaurants from source
    source_cur.execute("""
        SELECT id, outlet_name, area, city, pincode, latitude, longitude, user_id, uco_pickup_history
        FROM restaurants
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY id
    """)
    
    restaurants = source_cur.fetchall()
    count = 0
    
    for row in restaurants:
        rest_id = f"R{str(row[0]).zfill(3)}"
        name = row[1]
        area = row[2]
        city = row[3]
        pincode = row[4]
        lat = float(row[5])
        lng = float(row[6])
        user_id = row[7]
        uco_history = row[8]
        
        target_cur.execute("""
            INSERT INTO restaurants (id, name, area, city, pincode, lat, lng, user_id, uco_pickup_history)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                lat = EXCLUDED.lat,
                lng = EXCLUDED.lng,
                area = EXCLUDED.area,
                city = EXCLUDED.city,
                pincode = EXCLUDED.pincode,
                uco_pickup_history = EXCLUDED.uco_pickup_history
        """, (rest_id, name, area, city, pincode, lat, lng, user_id, uco_history))
        count += 1
    
    source_cur.close()
    target_cur.close()
    print(f"[SUCCESS] Migrated {count} restaurants")
    return count


def migrate_fleets(source_conn, target_conn):
    """Migrate fleets to vehicles."""
    print("\n[STEP 3] Migrating fleets to vehicles...")
    
    source_cur = source_conn.cursor()
    target_cur = target_conn.cursor()
    
    # Fetch fleets from source
    source_cur.execute("""
        SELECT id, vehicle, vehicle_type, count, capacity, fuel_type, warehouse_id, available, user_id
        FROM fleets
        WHERE available > 0
        ORDER BY id
    """)
    
    fleets = source_cur.fetchall()
    vehicle_count = 0
    vehicle_num = 1
    
    for row in fleets:
        fleet_id = row[0]
        vehicle_name = row[1]
        vehicle_type = row[2].lower() if row[2] else 'truck'
        count = row[3]
        capacity = float(row[4]) if row[4] else 500.0
        fuel_type = row[5].lower() if row[5] else 'diesel'
        warehouse_id = row[6]
        available = row[7]
        user_id = row[8]
        
        # Create vehicles based on available count
        for i in range(available):
            vehicle_id = f"V{str(vehicle_num).zfill(3)}"
            
            target_cur.execute("""
                INSERT INTO vehicles (id, type, capacity_kg, fuel_type, fleet_id)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    type = EXCLUDED.type,
                    capacity_kg = EXCLUDED.capacity_kg,
                    fuel_type = EXCLUDED.fuel_type
            """, (vehicle_id, vehicle_type, capacity, fuel_type, fleet_id))
            
            # Get warehouse location
            wh_lat, wh_lng = 28.6139, 77.2090  # Default Delhi location
            if warehouse_id:
                wh_id = f"WH{str(warehouse_id).zfill(3)}"
                target_cur.execute("SELECT lat, lng FROM warehouses WHERE id = %s", (wh_id,))
                wh_result = target_cur.fetchone()
                if wh_result:
                    wh_lat, wh_lng = wh_result
            
            # Initialize vehicle state at warehouse
            target_cur.execute("""
                INSERT INTO vehicle_state (vehicle_id, lat, lng, speed, load_kg)
                VALUES (%s, %s, %s, 0, 0)
                ON CONFLICT (vehicle_id) DO UPDATE SET
                    lat = EXCLUDED.lat,
                    lng = EXCLUDED.lng
            """, (vehicle_id, wh_lat, wh_lng))
            
            # Initialize empty route
            target_cur.execute("""
                INSERT INTO routes (vehicle_id, polyline_json)
                VALUES (%s, '[]')
                ON CONFLICT (vehicle_id) DO UPDATE SET
                    polyline_json = '[]'
            """, (vehicle_id,))
            
            vehicle_count += 1
            vehicle_num += 1
    
    source_cur.close()
    target_cur.close()
    print(f"[SUCCESS] Migrated {vehicle_count} vehicles from {len(fleets)} fleet entries")
    return vehicle_count


def main():
    parser = argparse.ArgumentParser(description='Migrate data from byufuel_app to Green Lantern')
    parser.add_argument('--source-db', default=DEFAULT_SOURCE_DB, help='Source database connection string')
    parser.add_argument('--target-db', default=DEFAULT_TARGET_DB, help='Target database connection string')
    parser.add_argument('--clear', action='store_true', help='Clear existing data before migration')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("GREEN LANTERN - Real Data Migration")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Source DB: {args.source_db.split('@')[1] if '@' in args.source_db else 'localhost'}")
    print(f"Target DB: {args.target_db.split('@')[1] if '@' in args.target_db else 'localhost'}")
    print("=" * 60)
    
    # Connect to databases
    source_conn = connect_db(args.source_db, "source")
    target_conn = connect_db(args.target_db, "target")
    
    # Clear existing data if requested
    if args.clear:
        print("\n[WARNING] Clearing existing data...")
        target_cur = target_conn.cursor()
        target_cur.execute("TRUNCATE TABLE vehicles CASCADE")
        target_cur.execute("TRUNCATE TABLE warehouses CASCADE")
        target_cur.execute("TRUNCATE TABLE restaurants CASCADE")
        target_cur.execute("TRUNCATE TABLE alerts CASCADE")
        target_cur.execute("TRUNCATE TABLE emissions CASCADE")
        target_cur.close()
        print("[SUCCESS] Existing data cleared")
    
    # Run migrations
    try:
        wh_count = migrate_warehouses(source_conn, target_conn)
        rest_count = migrate_restaurants(source_conn, target_conn)
        veh_count = migrate_fleets(source_conn, target_conn)
        
        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        print(f"✓ Warehouses: {wh_count}")
        print(f"✓ Restaurants: {rest_count}")
        print(f"✓ Vehicles: {veh_count}")
        print("=" * 60)
        print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Start Green Lantern: docker-compose up")
        print("2. View dashboard: http://localhost:3000")
        print("3. Check API: http://localhost:8000/api/vehicles")
        
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        source_conn.close()
        target_conn.close()


if __name__ == "__main__":
    main()
