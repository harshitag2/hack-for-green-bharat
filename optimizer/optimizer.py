"""
Optimizer Service — VRP / Assignment
=====================================
Consumes pickup.requests from Kafka, reads current vehicle states from Redis/Postgres,
runs a basic VRP assignment (nearest vehicle with remaining capacity), and publishes
updated routes to routes.updated.
"""

import json
import math
import time
import os
import threading
from kafka import KafkaConsumer, KafkaProducer
import psycopg2
import redis

KAFKA = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://greenlantern:greenlantern123@postgres:5432/greenlantern")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

# Vehicle capacities
VEHICLE_IDS = ["V001", "V002", "V003"]


def connect_kafka_producer():
    for attempt in range(30):
        try:
            p = KafkaProducer(
                bootstrap_servers=KAFKA,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
            )
            print("[OPTIMIZER] Producer connected")
            return p
        except Exception as e:
            print(f"[OPTIMIZER] Producer retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect Kafka producer")


def connect_kafka_consumer():
    for attempt in range(30):
        try:
            c = KafkaConsumer(
                "pickup.requests",
                bootstrap_servers=KAFKA,
                group_id="optimizer-group",
                auto_offset_reset="latest",
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                consumer_timeout_ms=1000,
            )
            print("[OPTIMIZER] Consumer connected")
            return c
        except Exception as e:
            print(f"[OPTIMIZER] Consumer retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect Kafka consumer")


def connect_db():
    for attempt in range(30):
        try:
            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = True
            print("[OPTIMIZER] DB connected")
            return conn
        except Exception as e:
            print(f"[OPTIMIZER] DB retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to DB")


def connect_redis():
    for attempt in range(30):
        try:
            r = redis.from_url(REDIS_URL, decode_responses=True)
            r.ping()
            print("[OPTIMIZER] Redis connected")
            return r
        except Exception as e:
            print(f"[OPTIMIZER] Redis retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to Redis")


def haversine_km(lat1, lon1, lat2, lon2):
    """Haversine distance in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_vehicle_states(redis_client, db_conn):
    """Get latest vehicle states from Redis (fast path) or Postgres (fallback)."""
    states = {}
    for vid in VEHICLE_IDS:
        try:
            data = redis_client.hgetall(f"vehicle:{vid}")
            if data and "lat" in data:
                states[vid] = {
                    "lat": float(data["lat"]),
                    "lng": float(data["lng"]),
                    "speed": float(data.get("speed", 0)),
                    "load_kg": float(data.get("load_kg", 0)),
                    "capacity_kg": float(data.get("capacity_kg", 500)),
                }
                continue
        except Exception:
            pass
        # Fallback to DB
        try:
            cur = db_conn.cursor()
            cur.execute("""
                SELECT vs.lat, vs.lng, vs.speed, vs.load_kg, v.capacity_kg
                FROM vehicle_state vs JOIN vehicles v ON vs.vehicle_id = v.id
                WHERE vs.vehicle_id = %s
            """, (vid,))
            row = cur.fetchone()
            cur.close()
            if row:
                states[vid] = {
                    "lat": float(row[0]),
                    "lng": float(row[1]),
                    "speed": float(row[2]),
                    "load_kg": float(row[3]),
                    "capacity_kg": float(row[4]),
                }
        except Exception as e:
            print(f"[OPTIMIZER] DB read error for {vid}: {e}")

    return states


def assign_pickup(pickup, vehicle_states):
    """
    Basic VRP Assignment:
    Choose the nearest vehicle that has enough remaining capacity.
    Returns (vehicle_id, distance_km) or None.
    """
    plat = pickup.get("lat", 0)
    plng = pickup.get("lng", 0)
    req_load = pickup.get("requested_load_kg", 0)

    best_vid = None
    best_dist = float("inf")

    for vid, state in vehicle_states.items():
        remaining_capacity = state["capacity_kg"] - state["load_kg"]
        if remaining_capacity < req_load:
            continue
        dist = haversine_km(plat, plng, state["lat"], state["lng"])
        if dist < best_dist:
            best_dist = dist
            best_vid = vid

    # If no vehicle has capacity, pick nearest anyway
    if best_vid is None:
        for vid, state in vehicle_states.items():
            dist = haversine_km(plat, plng, state["lat"], state["lng"])
            if dist < best_dist:
                best_dist = dist
                best_vid = vid

    return best_vid, best_dist


def generate_route_polyline(vehicle_state, pickup):
    """Generate a simple route polyline from vehicle to pickup location."""
    vlat, vlng = vehicle_state["lat"], vehicle_state["lng"]
    plat, plng = pickup["lat"], pickup["lng"]

    # Create a simple route with intermediate points
    steps = 5
    polyline = []
    for i in range(steps + 1):
        t = i / steps
        lat = vlat + (plat - vlat) * t
        lng = vlng + (plng - vlng) * t
        polyline.append([round(lat, 6), round(lng, 6)])

    return polyline


def process_pickup(pickup, producer, db_conn, redis_client):
    """Process a pickup request: assign vehicle, generate route, publish."""
    vehicle_states = get_vehicle_states(redis_client, db_conn)
    if not vehicle_states:
        print("[OPTIMIZER] No vehicle states available, skipping")
        return

    assigned_vid, distance = assign_pickup(pickup, vehicle_states)
    if not assigned_vid:
        print("[OPTIMIZER] No vehicle available for pickup")
        return

    pickup_id = pickup.get("pickup_id", "unknown")
    req_load = pickup.get("requested_load_kg", 0)

    print(f"[OPTIMIZER] Assigned {pickup_id} to {assigned_vid} (dist={distance:.1f}km, load={req_load}kg)")

    # Generate route
    polyline = generate_route_polyline(vehicle_states[assigned_vid], pickup)

    # Save pickup assignment to DB
    try:
        cur = db_conn.cursor()
        cur.execute("""
            INSERT INTO pickups (id, restaurant_id, requested_load_kg, status, assigned_vehicle)
            VALUES (%s, %s, %s, 'assigned', %s)
            ON CONFLICT (id) DO UPDATE SET status = 'assigned', assigned_vehicle = EXCLUDED.assigned_vehicle
        """, (pickup_id, pickup.get("restaurant_id"), req_load, assigned_vid))

        # Update route in DB
        cur.execute("""
            INSERT INTO routes (vehicle_id, polyline_json, updated_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (vehicle_id) DO UPDATE SET polyline_json = EXCLUDED.polyline_json, updated_at = NOW()
        """, (assigned_vid, json.dumps(polyline)))
        cur.close()
    except Exception as e:
        print(f"[OPTIMIZER] DB write error: {e}")

    # Publish updated route to Kafka
    route_event = {
        "vehicle_id": assigned_vid,
        "pickup_id": pickup_id,
        "polyline": polyline,
        "distance_km": round(distance, 2),
        "assigned_load_kg": req_load,
        "timestamp": time.time(),
    }
    producer.send("routes.updated", key=assigned_vid, value=route_event)
    producer.flush()


def main():
    print("[OPTIMIZER] Starting Optimizer Service...")
    time.sleep(12)  # Wait for dependencies

    producer = connect_kafka_producer()
    consumer = connect_kafka_consumer()
    db_conn = connect_db()
    redis_client = connect_redis()

    count = 0
    while True:
        try:
            records = consumer.poll(timeout_ms=2000)
            for tp, messages in records.items():
                for msg in messages:
                    process_pickup(msg.value, producer, db_conn, redis_client)
                    count += 1
                    print(f"[OPTIMIZER] Processed {count} pickups total")
        except Exception as e:
            print(f"[OPTIMIZER] Error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
