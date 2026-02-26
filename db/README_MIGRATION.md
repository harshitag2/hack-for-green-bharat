# Green Lantern - Real Data Migration Guide

## Overview

This guide explains how to migrate real data from your existing byufuel_app database to the Green Lantern fleet tracking system.

## Prerequisites

- Existing byufuel_app database with:
  - `users` table
  - `warehouses` table (with latitude/longitude)
  - `fleets` table (vehicle information)
  - `restaurants` table (with latitude/longitude)

## Migration Steps

### 1. Initialize Green Lantern Database

The `init.sql` script creates the necessary schema:

```bash
# This runs automatically when Docker starts
docker-compose up -d postgres
```

### 2. Run Data Migration

Execute the migration script to populate Green Lantern with real data:

```bash
# Connect to the PostgreSQL container
docker exec -it greenlantern-postgres psql -U greenlantern -d greenlantern

# Run the migration script
\i /docker-entrypoint-initdb.d/migrate_real_data.sql
```

Or from the host:

```bash
docker exec -i greenlantern-postgres psql -U greenlantern -d greenlantern < greenlantern/db/migrate_real_data.sql
```

### 3. Verify Migration

Check that data was migrated successfully:

```sql
-- Check vehicles
SELECT COUNT(*) as vehicle_count FROM vehicles;
SELECT * FROM vehicles LIMIT 5;

-- Check warehouses
SELECT COUNT(*) as warehouse_count FROM warehouses;
SELECT * FROM warehouses LIMIT 5;

-- Check restaurants
SELECT COUNT(*) as restaurant_count FROM restaurants;
SELECT * FROM restaurants LIMIT 5;

-- Check vehicle states
SELECT * FROM vehicle_state LIMIT 5;
```

## Data Mapping

### Warehouses
- **Source**: `public.warehouses`
- **Target**: `warehouses`
- **ID Format**: `WH001`, `WH002`, etc.
- **Fields**: name, latitude → lat, longitude → lng

### Restaurants
- **Source**: `public.restaurants`
- **Target**: `restaurants`
- **ID Format**: `R001`, `R002`, etc.
- **Fields**: outlet_name → name, latitude → lat, longitude → lng

### Vehicles
- **Source**: `public.fleets`
- **Target**: `vehicles`
- **ID Format**: `V001`, `V002`, etc.
- **Fields**: 
  - vehicle_type → type
  - capacity → capacity_kg
  - fuel_type → fuel_type
  - Creates one vehicle per available fleet unit

### Vehicle States
- **Initial Position**: Placed at assigned warehouse location
- **Initial Values**: speed=0, load_kg=0

## Using Real GPS Data

Instead of simulators, you can connect real GPS tracking devices:

### Option 1: GPS Tracker Integration

Update `simulators/gps_simulator.py` to read from your GPS API:

```python
# Example: Read from GPS tracking API
import requests

GPS_API_URL = "https://your-gps-provider.com/api/vehicles"
API_KEY = os.environ.get("GPS_API_KEY")

def fetch_real_gps_data():
    response = requests.get(
        GPS_API_URL,
        headers={"Authorization": f"Bearer {API_KEY}"}
    )
    return response.json()
```

### Option 2: Pathway File Connector

Use Pathway's file connector to read GPS logs:

```python
import pathway as pw

gps_stream = pw.io.csv.read(
    "./data/gps_logs/",
    schema=GPSEventSchema,
    mode="streaming"
)
```

### Option 3: Pathway HTTP Connector

Accept GPS data via HTTP endpoint:

```python
gps_stream = pw.io.http.read(
    host="0.0.0.0",
    port=8080,
    schema=GPSEventSchema,
    format="json"
)
```

## Environment Variables

Update `.env` file with your database connection:

```env
DATABASE_URL=postgresql://greenlantern:greenlantern123@postgres:5432/greenlantern
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
REDIS_URL=redis://redis:6379/0

# Optional: GPS API credentials
GPS_API_KEY=your_api_key_here
GPS_API_URL=https://your-gps-provider.com/api
```

## Troubleshooting

### Migration Fails

If migration fails, check:
1. Source database has data with valid lat/long
2. PostgreSQL container is running
3. Database credentials are correct

### No Vehicles Showing

Ensure fleets table has `available > 0`:

```sql
SELECT * FROM public.fleets WHERE available > 0;
```

### Coordinates Not Showing

Verify lat/long are not NULL:

```sql
SELECT * FROM public.warehouses WHERE latitude IS NULL OR longitude IS NULL;
SELECT * FROM public.restaurants WHERE latitude IS NULL OR longitude IS NULL;
```

## Next Steps

After migration:

1. **Start the system**: `docker-compose up`
2. **View dashboard**: http://localhost:3000
3. **Check API**: http://localhost:8000/api/vehicles
4. **Monitor Pathway pipeline**: Check logs for `[PATHWAY]` messages

## Pathway Compliance

✅ This system uses **real Pathway streaming**:
- `pw.io.kafka.read()` - Reads from Kafka streams
- `pw.udf` - User-defined functions for processing
- Declarative operations: `.filter()`, `.select()`, `.join()`
- `pw.io.kafka.write()` - Writes to output streams
- `pw.run()` - Continuous streaming engine

The system automatically updates when new GPS/load data arrives via Kafka topics.
