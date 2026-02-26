"""
Pathway-style Streaming Pipeline
=================================
Consumes gps.events and load.events from Kafka, performs:
  1. Filters invalid GPS (0,0) and missing fields
  2. Joins GPS + latest load per vehicle
  3. Computes route deviation (distance from planned polyline)
  4. Detects speed anomalies (overspeed > 80 km/h, idling = 0 km/h)
  5. Computes emissions metric (CO2 = base * speed_factor * load_factor)
  6. DTW-based driving behaviour detection (window 30 samples)
  7. Publishes alerts to alerts.route_deviation
  8. Publishes metrics to emissions.metrics
  9. Publishes driving behaviour to driving.behavior

Uses kafka-python consumers/producers with stream-processing semantics
(continuous consume-transform-produce loop).
"""

import json
import math
import time
import os
import threading
from collections import defaultdict, deque
from kafka import KafkaConsumer, KafkaProducer
import psycopg2
import redis
import numpy as np

KAFKA = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://byufuel:byufuel123@postgres:5432/byufuel")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

# ─── State stores ──────────────────────────────────────
latest_gps = {}        # vehicle_id -> {lat, lng, speed, timestamp}
latest_load = {}       # vehicle_id -> {load_kg, capacity_kg, timestamp}
planned_routes = {}    # vehicle_id -> [[lat,lng], ...]
speed_history = defaultdict(lambda: deque(maxlen=30))  # DTW window

# ─── Thresholds ────────────────────────────────────────
OVERSPEED_THRESHOLD = 80.0    # km/h
IDLE_THRESHOLD = 2.0          # km/h
DEVIATION_THRESHOLD = 0.005   # ~500m in degrees
DTW_DISTANCE_THRESHOLD = 50.0 # DTW distance threshold
EMISSION_BASE_CO2 = 2.3       # kg CO2 per km base (diesel truck)


def connect_kafka_producer():
    for attempt in range(30):
        try:
            p = KafkaProducer(
                bootstrap_servers=KAFKA,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
            )
            print("[PIPELINE] Producer connected")
            return p
        except Exception as e:
            print(f"[PIPELINE] Producer retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect Kafka producer")


def connect_kafka_consumer(topics, group_id):
    for attempt in range(30):
        try:
            c = KafkaConsumer(
                *topics,
                bootstrap_servers=KAFKA,
                group_id=group_id,
                auto_offset_reset="latest",
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                consumer_timeout_ms=1000,
            )
            print(f"[PIPELINE] Consumer connected to {topics}")
            return c
        except Exception as e:
            print(f"[PIPELINE] Consumer retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect Kafka consumer")


def connect_db():
    for attempt in range(30):
        try:
            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = True
            print("[PIPELINE] DB connected")
            return conn
        except Exception as e:
            print(f"[PIPELINE] DB retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to DB")


def connect_redis():
    for attempt in range(30):
        try:
            r = redis.from_url(REDIS_URL, decode_responses=True)
            r.ping()
            print("[PIPELINE] Redis connected")
            return r
        except Exception as e:
            print(f"[PIPELINE] Redis retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to Redis")


def load_planned_routes(db_conn):
    """Load planned routes from DB."""
    global planned_routes
    try:
        cur = db_conn.cursor()
        cur.execute("SELECT vehicle_id, polyline_json FROM routes")
        for row in cur.fetchall():
            vid = row[0]
            poly = json.loads(row[1])
            planned_routes[vid] = poly
        cur.close()
        print(f"[PIPELINE] Loaded {len(planned_routes)} planned routes")
    except Exception as e:
        print(f"[PIPELINE] Error loading routes: {e}")


def haversine_deg(lat1, lon1, lat2, lon2):
    """Simple degree-based distance (approximate)."""
    return math.sqrt((lat1 - lat2) ** 2 + (lon1 - lon2) ** 2)


def point_to_polyline_distance(lat, lng, polyline):
    """Minimum distance from point to polyline segments."""
    if not polyline or len(polyline) < 2:
        return 0.0
    min_dist = float("inf")
    for i in range(len(polyline) - 1):
        p1 = polyline[i]
        p2 = polyline[i + 1]
        # Project point onto segment
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        if dx == 0 and dy == 0:
            dist = haversine_deg(lat, lng, p1[0], p1[1])
        else:
            t = max(0, min(1, ((lat - p1[0]) * dx + (lng - p1[1]) * dy) / (dx * dx + dy * dy)))
            proj_lat = p1[0] + t * dx
            proj_lng = p1[1] + t * dy
            dist = haversine_deg(lat, lng, proj_lat, proj_lng)
        min_dist = min(min_dist, dist)
    return min_dist


def compute_dtw_distance(series1, series2):
    """Simplified DTW distance between two speed time-series."""
    n, m = len(series1), len(series2)
    if n == 0 or m == 0:
        return 0.0
    dtw_matrix = np.full((n + 1, m + 1), float("inf"))
    dtw_matrix[0][0] = 0.0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = abs(series1[i - 1] - series2[j - 1])
            dtw_matrix[i][j] = cost + min(
                dtw_matrix[i - 1][j],
                dtw_matrix[i][j - 1],
                dtw_matrix[i - 1][j - 1],
            )
    return dtw_matrix[n][m]


# Reference "normal" driving pattern (smooth acceleration/deceleration)
NORMAL_SPEED_PATTERN = [
    30, 32, 35, 38, 40, 42, 44, 45, 45, 44,
    42, 40, 38, 35, 33, 30, 28, 30, 32, 35,
    38, 40, 42, 44, 45, 44, 42, 40, 38, 35,
]


def process_gps_event(event, producer, db_conn, redis_client):
    """Process a single GPS event through the pipeline."""
    vid = event.get("vehicle_id")
    lat = event.get("lat", 0)
    lng = event.get("lng", 0)
    speed = event.get("speed", 0)
    ts = event.get("timestamp", time.time())

    # ─── Step 1: Filter invalid GPS ─────────────────
    if lat == 0 and lng == 0:
        return
    if not vid:
        return

    # ─── Step 2: Update state ───────────────────────
    latest_gps[vid] = {"lat": lat, "lng": lng, "speed": speed, "timestamp": ts}

    # Build joined state
    load_info = latest_load.get(vid, {"load_kg": 0, "capacity_kg": 500})
    load_kg = load_info["load_kg"]
    capacity_kg = load_info["capacity_kg"]

    # Update Redis cache
    try:
        redis_client.hset(f"vehicle:{vid}", mapping={
            "lat": str(lat), "lng": str(lng), "speed": str(speed),
            "load_kg": str(load_kg), "capacity_kg": str(capacity_kg),
            "updated_at": str(ts),
        })
    except Exception:
        pass

    # Update DB
    try:
        cur = db_conn.cursor()
        cur.execute("""
            INSERT INTO vehicle_state (vehicle_id, lat, lng, speed, load_kg, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            ON CONFLICT (vehicle_id) DO UPDATE SET
                lat = EXCLUDED.lat, lng = EXCLUDED.lng,
                speed = EXCLUDED.speed, load_kg = EXCLUDED.load_kg,
                updated_at = NOW()
        """, (vid, lat, lng, speed, load_kg))
        cur.close()
    except Exception as e:
        print(f"[PIPELINE] DB write error: {e}")

    # ─── Step 3: Route deviation ────────────────────
    route = planned_routes.get(vid, [])
    if route:
        deviation = point_to_polyline_distance(lat, lng, route)
        if deviation > DEVIATION_THRESHOLD:
            alert = {
                "vehicle_id": vid,
                "type": "route_deviation",
                "deviation_deg": round(deviation, 6),
                "lat": lat, "lng": lng,
                "timestamp": ts,
            }
            producer.send("alerts.route_deviation", key=vid, value=alert)
            # Save alert to DB
            try:
                cur = db_conn.cursor()
                cur.execute(
                    "INSERT INTO alerts (vehicle_id, type, payload_json) VALUES (%s, %s, %s)",
                    (vid, "route_deviation", json.dumps(alert)),
                )
                cur.close()
            except Exception:
                pass

    # ─── Step 4: Speed anomalies ────────────────────
    if speed > OVERSPEED_THRESHOLD:
        alert = {
            "vehicle_id": vid, "type": "overspeed",
            "speed": speed, "threshold": OVERSPEED_THRESHOLD,
            "lat": lat, "lng": lng, "timestamp": ts,
        }
        producer.send("alerts.route_deviation", key=vid, value=alert)
        try:
            cur = db_conn.cursor()
            cur.execute(
                "INSERT INTO alerts (vehicle_id, type, payload_json) VALUES (%s, %s, %s)",
                (vid, "overspeed", json.dumps(alert)),
            )
            cur.close()
        except Exception:
            pass

    if speed < IDLE_THRESHOLD:
        alert = {
            "vehicle_id": vid, "type": "idling",
            "speed": speed, "lat": lat, "lng": lng, "timestamp": ts,
        }
        producer.send("alerts.route_deviation", key=vid, value=alert)
        try:
            cur = db_conn.cursor()
            cur.execute(
                "INSERT INTO alerts (vehicle_id, type, payload_json) VALUES (%s, %s, %s)",
                (vid, "idling", json.dumps(alert)),
            )
            cur.close()
        except Exception:
            pass

    # ─── Step 5: Emissions metric ───────────────────
    # CO2 = base_rate * speed_factor * load_factor
    speed_factor = 1.0 + (speed / 100.0) * 0.5
    load_factor = 1.0 + (load_kg / capacity_kg) * 0.3
    co2_est = round(EMISSION_BASE_CO2 * speed_factor * load_factor * (speed / 60.0), 4)
    fuel_est = round(co2_est / 2.31, 4)  # approx liters

    emission = {
        "vehicle_id": vid,
        "co2_est": co2_est,
        "fuel_est": fuel_est,
        "load_kg": load_kg,
        "speed": speed,
        "timestamp": ts,
    }
    producer.send("emissions.metrics", key=vid, value=emission)

    # Save emission to DB
    try:
        cur = db_conn.cursor()
        cur.execute(
            "INSERT INTO emissions (vehicle_id, co2_est, fuel_est, load_kg, speed) VALUES (%s,%s,%s,%s,%s)",
            (vid, co2_est, fuel_est, load_kg, speed),
        )
        cur.close()
    except Exception:
        pass

    # ─── Step 6: DTW driving behaviour ──────────────
    speed_history[vid].append(speed)
    if len(speed_history[vid]) >= 30:
        current_pattern = list(speed_history[vid])
        dtw_dist = compute_dtw_distance(current_pattern, NORMAL_SPEED_PATTERN)
        if dtw_dist > DTW_DISTANCE_THRESHOLD:
            behavior_event = {
                "vehicle_id": vid,
                "type": "abnormal_driving",
                "dtw_distance": round(dtw_dist, 2),
                "pattern_summary": {
                    "avg_speed": round(np.mean(current_pattern), 1),
                    "max_speed": round(max(current_pattern), 1),
                    "min_speed": round(min(current_pattern), 1),
                    "std_speed": round(float(np.std(current_pattern)), 1),
                },
                "timestamp": ts,
            }
            producer.send("driving.behavior", key=vid, value=behavior_event)
            try:
                cur = db_conn.cursor()
                cur.execute(
                    "INSERT INTO alerts (vehicle_id, type, payload_json) VALUES (%s, %s, %s)",
                    (vid, "abnormal_driving", json.dumps(behavior_event)),
                )
                cur.close()
            except Exception:
                pass

    producer.flush()


def process_load_event(event, redis_client):
    """Process a load sensor event."""
    vid = event.get("vehicle_id")
    if not vid:
        return
    latest_load[vid] = {
        "load_kg": event.get("load_kg", 0),
        "capacity_kg": event.get("capacity_kg", 500),
        "timestamp": event.get("timestamp", time.time()),
    }
    # Update Redis
    try:
        redis_client.hset(f"vehicle:{vid}", mapping={
            "load_kg": str(event.get("load_kg", 0)),
            "capacity_kg": str(event.get("capacity_kg", 500)),
        })
    except Exception:
        pass


def gps_consumer_thread(producer, db_conn, redis_client):
    """Consume GPS events in a loop."""
    consumer = connect_kafka_consumer(["gps.events"], "pathway-gps-group")
    count = 0
    while True:
        try:
            records = consumer.poll(timeout_ms=500)
            for tp, messages in records.items():
                for msg in messages:
                    process_gps_event(msg.value, producer, db_conn, redis_client)
                    count += 1
                    if count % 50 == 0:
                        print(f"[PIPELINE] Processed {count} GPS events")
        except Exception as e:
            print(f"[PIPELINE] GPS consumer error: {e}")
            time.sleep(1)


def load_consumer_thread(redis_client):
    """Consume Load events in a loop."""
    consumer = connect_kafka_consumer(["load.events"], "pathway-load-group")
    count = 0
    while True:
        try:
            records = consumer.poll(timeout_ms=500)
            for tp, messages in records.items():
                for msg in messages:
                    process_load_event(msg.value, redis_client)
                    count += 1
                    if count % 20 == 0:
                        print(f"[PIPELINE] Processed {count} Load events")
        except Exception as e:
            print(f"[PIPELINE] Load consumer error: {e}")
            time.sleep(1)


def route_update_thread(db_conn):
    """Listen for route updates and refresh planned routes."""
    consumer = connect_kafka_consumer(["routes.updated"], "pathway-routes-group")
    while True:
        try:
            records = consumer.poll(timeout_ms=2000)
            for tp, messages in records.items():
                for msg in messages:
                    data = msg.value
                    vid = data.get("vehicle_id")
                    polyline = data.get("polyline", [])
                    if vid and polyline:
                        planned_routes[vid] = polyline
                        print(f"[PIPELINE] Updated route for {vid}")
        except Exception as e:
            print(f"[PIPELINE] Route consumer error: {e}")
            time.sleep(1)


def main():
    print("[PIPELINE] Starting Pathway-style streaming pipeline...")
    time.sleep(10)  # Wait for dependencies

    producer = connect_kafka_producer()
    db_conn = connect_db()
    redis_client = connect_redis()

    # Load initial planned routes from DB
    load_planned_routes(db_conn)

    threads = [
        threading.Thread(target=gps_consumer_thread, args=(producer, db_conn, redis_client), daemon=True),
        threading.Thread(target=load_consumer_thread, args=(redis_client,), daemon=True),
        threading.Thread(target=route_update_thread, args=(db_conn,), daemon=True),
    ]

    for t in threads:
        t.start()
        print(f"[PIPELINE] Started thread: {t.name}")

    # Keep main alive
    for t in threads:
        t.join()


if __name__ == "__main__":
    main()
