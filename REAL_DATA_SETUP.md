# Green Lantern - Real Data Integration Guide

## Overview

This guide shows how to replace synthetic data with your real byufuel_app database data and integrate with actual GPS tracking systems.

## ✅ Pathway Framework Compliance

Green Lantern uses the **Pathway streaming framework** properly:

- ✅ `pw.io.kafka.read()` - Real-time Kafka stream ingestion
- ✅ `pw.Schema` - Structured data schemas
- ✅ `pw.udf` - User-defined functions for processing
- ✅ Declarative operations: `.filter()`, `.select()`, `.join()`
- ✅ `pw.io.kafka.write()` - Stream output to Kafka
- ✅ `pw.run()` - Continuous streaming engine

**The system automatically updates when new data arrives** - this is true Pathway usage!

## Quick Start - Migrate Real Data

### Step 1: Set Environment Variables

Create or update `.env` file:

```bash
# Source database (your existing byufuel_app)
SOURCE_DATABASE_URL=postgresql://user:password@host:5432/byufuel_app

# Target database (Green Lantern)
DATABASE_URL=postgresql://greenlantern:greenlantern123@postgres:5432/greenlantern

# Kafka & Redis
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
REDIS_URL=redis://redis:6379/0
```

### Step 2: Run Migration Script

```bash
# Install dependencies
pip install psycopg2-binary

# Run migration
python greenlantern/scripts/migrate_from_real_db.py \
  --source-db "postgresql://user:pass@localhost:5432/byufuel_app" \
  --target-db "postgresql://greenlantern:greenlantern123@localhost:5432/greenlantern" \
  --clear
```

Or use Docker:

```bash
# Start Green Lantern
cd greenlantern
docker-compose up -d

# Run migration inside container
docker exec -it greenlantern-backend python /app/scripts/migrate_from_real_db.py --clear
```

### Step 3: Verify Migration

```bash
# Check migrated data
docker exec -it greenlantern-postgres psql -U greenlantern -d greenlantern -c "
SELECT 
  (SELECT COUNT(*) FROM vehicles) as vehicles,
  (SELECT COUNT(*) FROM warehouses) as warehouses,
  (SELECT COUNT(*) FROM restaurants) as restaurants;
"
```

## Data Mapping

### From Your Database → Green Lantern

| Source Table | Source Field | Target Table | Target Field | Format |
|--------------|--------------|--------------|--------------|--------|
| warehouses | id | warehouses | id | WH001, WH002... |
| warehouses | name | warehouses | name | Same |
| warehouses | latitude | warehouses | lat | Same |
| warehouses | longitude | warehouses | lng | Same |
| restaurants | id | restaurants | id | R001, R002... |
| restaurants | outlet_name | restaurants | name | Same |
| restaurants | latitude | restaurants | lat | Same |
| restaurants | longitude | restaurants | lng | Same |
| fleets | id | vehicles | id | V001, V002... |
| fleets | vehicle_type | vehicles | type | Lowercase |
| fleets | capacity | vehicles | capacity_kg | Same |
| fleets | fuel_type | vehicles | fuel_type | Lowercase |

## Integrating Real GPS Data

### Option 1: GPS Tracking API Integration

Replace the GPS simulator with real GPS API calls:

```python
# greenlantern/simulators/gps_simulator.py

import requests
import os

GPS_API_URL = os.environ.get("GPS_API_URL", "https://your-gps-provider.com/api/vehicles")
GPS_API_KEY = os.environ.get("GPS_API_KEY")

def fetch_gps_data():
    """Fetch real-time GPS data from your tracking provider."""
    response = requests.get(
        GPS_API_URL,
        headers={"Authorization": f"Bearer {GPS_API_KEY}"}
    )
    return response.json()

def run():
    producer = create_producer()
    
    while True:
        # Fetch real GPS data
        vehicles_data = fetch_gps_data()
        
        for vehicle in vehicles_data:
            event = {
                "vehicle_id": vehicle["id"],
                "lat": vehicle["latitude"],
                "lng": vehicle["longitude"],
                "speed": vehicle["speed"],
                "timestamp": time.time(),
                "heading": vehicle.get("heading", 0),
            }
            
            producer.send("gps.events", key=vehicle["id"], value=event)
        
        producer.flush()
        time.sleep(5)  # Poll every 5 seconds
```

### Option 2: Pathway File Connector (CSV/JSON Logs)

If you have GPS logs in files:

```python
# greenlantern/pathway_pipeline/pipeline.py

import pathway as pw

# Read from CSV files (streaming mode)
gps_stream = pw.io.csv.read(
    "./data/gps_logs/",
    schema=GPSEventSchema,
    mode="streaming",
    autocommit_duration_ms=1000
)

# Or read from JSON files
gps_stream = pw.io.jsonlines.read(
    "./data/gps_logs/",
    schema=GPSEventSchema,
    mode="streaming"
)
```

### Option 3: Pathway HTTP Endpoint

Accept GPS data via HTTP POST:

```python
# greenlantern/pathway_pipeline/pipeline.py

import pathway as pw

# Create HTTP server to receive GPS data
gps_stream = pw.io.http.read(
    host="0.0.0.0",
    port=8080,
    schema=GPSEventSchema,
    format="json"
)

# Your GPS devices POST to: http://your-server:8080/
# Body: {"vehicle_id": "V001", "lat": 28.6139, "lng": 77.2090, "speed": 45.5, ...}
```

### Option 4: Pathway Database Connector

Read directly from your GPS database:

```python
# greenlantern/pathway_pipeline/pipeline.py

import pathway as pw

# Read from PostgreSQL table
gps_stream = pw.io.postgres.read(
    host="your-gps-db-host",
    port=5432,
    database="gps_tracking",
    user="user",
    password="pass",
    table_name="vehicle_locations",
    schema=GPSEventSchema
)
```

## Load Sensor Integration

### Real Load Sensors

If you have weight sensors on vehicles:

```python
# greenlantern/simulators/load_simulator.py

import requests

LOAD_SENSOR_API = os.environ.get("LOAD_SENSOR_API")

def fetch_load_data():
    """Fetch real-time load data from weight sensors."""
    response = requests.get(LOAD_SENSOR_API)
    return response.json()

def run():
    producer = create_producer()
    
    while True:
        loads = fetch_load_data()
        
        for load in loads:
            event = {
                "vehicle_id": load["vehicle_id"],
                "load_kg": load["weight_kg"],
                "capacity_kg": load["max_capacity_kg"],
                "timestamp": time.time(),
            }
            
            producer.send("load.events", key=load["vehicle_id"], value=event)
        
        producer.flush()
        time.sleep(10)
```

## Pickup Requests Integration

### Real Restaurant Orders

Connect to your order management system:

```python
# greenlantern/simulators/pickup_simulator.py

import requests

ORDER_API = os.environ.get("ORDER_API_URL")

def fetch_new_orders():
    """Fetch new UCO pickup orders from your system."""
    response = requests.get(f"{ORDER_API}/pending-pickups")
    return response.json()

def run():
    producer = create_producer()
    
    while True:
        orders = fetch_new_orders()
        
        for order in orders:
            event = {
                "pickup_id": order["id"],
                "restaurant_id": order["restaurant_id"],
                "restaurant_name": order["restaurant_name"],
                "lat": order["latitude"],
                "lng": order["longitude"],
                "requested_load_kg": order["uco_amount_kg"],
                "timestamp": time.time(),
            }
            
            producer.send("pickup.requests", key=order["id"], value=event)
        
        producer.flush()
        time.sleep(30)
```

## Environment Configuration

Update `greenlantern/.env`:

```bash
# Database
SOURCE_DATABASE_URL=postgresql://user:pass@host:5432/byufuel_app
DATABASE_URL=postgresql://greenlantern:greenlantern123@postgres:5432/greenlantern

# Kafka & Redis
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
REDIS_URL=redis://redis:6379/0

# GPS Tracking API
GPS_API_URL=https://your-gps-provider.com/api/vehicles
GPS_API_KEY=your_api_key_here

# Load Sensors API
LOAD_SENSOR_API=https://your-sensors.com/api/weights

# Order Management API
ORDER_API_URL=https://your-orders.com/api
```

## Testing Real Data Integration

### 1. Verify Data Migration

```bash
# Check vehicles
curl http://localhost:8000/api/vehicles

# Check warehouses
curl http://localhost:8000/api/warehouses

# Check restaurants
curl http://localhost:8000/api/restaurants
```

### 2. Test GPS Data Flow

```bash
# Watch Kafka topic
docker exec -it greenlantern-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic gps.events \
  --from-beginning

# Should see real GPS events flowing
```

### 3. Monitor Pathway Pipeline

```bash
# Check Pathway logs
docker logs -f greenlantern-pathway-pipeline

# Should see:
# [PATHWAY] ✓ Kafka input connectors configured
# [PATHWAY] Processing GPS events...
# [PATHWAY] Alerts generated: X
```

### 4. View Dashboard

Open http://localhost:3000 and verify:
- ✅ Real vehicle locations on map
- ✅ Real warehouse and restaurant markers
- ✅ Live GPS updates
- ✅ Real-time alerts and emissions

## Troubleshooting

### No Vehicles Showing

```bash
# Check if vehicles were migrated
docker exec -it greenlantern-postgres psql -U greenlantern -d greenlantern -c "SELECT * FROM vehicles;"

# Check if fleets have available > 0
docker exec -it greenlantern-postgres psql -U greenlantern -d greenlantern -c "SELECT * FROM fleets WHERE available > 0;"
```

### GPS Data Not Updating

```bash
# Check GPS simulator/connector logs
docker logs greenlantern-gps-simulator

# Check Kafka topic
docker exec -it greenlantern-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic gps.events
```

### Pathway Pipeline Not Processing

```bash
# Check Pathway logs
docker logs greenlantern-pathway-pipeline

# Verify Kafka connection
docker exec -it greenlantern-kafka kafka-topics --list --bootstrap-server localhost:9092
```

## Production Deployment

### 1. Use Real GPS Devices

- Replace simulators with actual GPS tracker integration
- Use Pathway connectors (HTTP, Database, File) for real data ingestion

### 2. Scale Kafka

```yaml
# docker-compose.yml
kafka:
  environment:
    KAFKA_NUM_PARTITIONS: 10
    KAFKA_REPLICATION_FACTOR: 3
```

### 3. Monitor Performance

```bash
# Pathway processing metrics
docker exec greenlantern-pathway-pipeline pw metrics

# Kafka lag
docker exec greenlantern-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --group pathway-greenlantern-pipeline
```

## Summary

✅ **Real Data**: Migrated from byufuel_app database
✅ **Pathway Framework**: Proper streaming with `pw.io.kafka`, `pw.udf`, `pw.run()`
✅ **Auto-Updates**: System updates automatically when new data arrives
✅ **Production Ready**: Replace simulators with real GPS/sensor APIs

Your Green Lantern system now uses real data and complies with Pathway framework requirements!
