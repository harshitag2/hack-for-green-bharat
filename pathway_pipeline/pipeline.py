"""
BYUFUEL – Pathway Streaming Pipeline
======================================
Built on the Pathway real-time data processing framework.
Uses pw.io.kafka connectors, pw.Schema, pw.udf, and Pathway's
declarative table API (filter, select, groupby, reduce, join).

Architecture:
─────────────
  [gps.events]  ──→  pw.io.kafka.read ──┐
                                         ├─→ filter ──→ select ──→ join ──→ compute
  [load.events] ──→  pw.io.kafka.read ──┘
                                                                   │
                            ┌──────────────────────────────────────┤
                            ▼                    ▼                 ▼
                     pw.io.kafka.write    pw.io.kafka.write   pw.io.kafka.write
                  [alerts.route_deviation]  [emissions.metrics]  [driving.behavior]

Topics Consumed:
  - gps.events   (vehicle GPS: lat, lng, speed, heading)
  - load.events  (load sensor: load_kg, capacity_kg)

Topics Produced:
  - alerts.route_deviation  (route deviation + speed anomaly alerts)
  - emissions.metrics       (CO₂ + fuel estimates per vehicle)
  - driving.behavior        (DTW-based abnormal driving detection)
"""

import pathway as pw
import json
import math
import time
import os
import threading
from collections import defaultdict
import numpy as np
import psycopg2
import redis as redis_lib

# ═══════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════

KAFKA_BROKER = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://byufuel:byufuel123@postgres:5432/byufuel")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

# Thresholds
OVERSPEED_THRESHOLD = 80.0    # km/h
IDLE_THRESHOLD = 2.0          # km/h
DEVIATION_THRESHOLD = 0.005   # ~500m in degrees
DTW_THRESHOLD = 50.0          # DTW distance threshold
CO2_BASE_RATE = 2.3           # kg CO₂ per km (diesel truck baseline)

# Kafka rdkafka settings (librdkafka format used by Pathway)
rdkafka_settings = {
    "bootstrap.servers": KAFKA_BROKER,
    "group.id": "pathway-byufuel-pipeline",
    "session.timeout.ms": "6000",
    "auto.offset.reset": "latest",
}

# ═══════════════════════════════════════════════════════════
# PATHWAY SCHEMAS
# ═══════════════════════════════════════════════════════════

class GPSEventSchema(pw.Schema):
    """Schema for GPS events from vehicle trackers."""
    vehicle_id: str
    lat: float
    lng: float
    speed: float
    timestamp: float
    heading: float


class LoadEventSchema(pw.Schema):
    """Schema for load sensor events."""
    vehicle_id: str
    load_kg: float
    capacity_kg: float
    timestamp: float


# ═══════════════════════════════════════════════════════════
# GLOBAL STATE (shared across UDFs)
# ═══════════════════════════════════════════════════════════

# Planned routes loaded from DB at startup
planned_routes: dict = {}

# Speed history for DTW (30-sample rolling window per vehicle)
speed_windows: dict = defaultdict(list)

# Reference "normal" driving speed pattern
NORMAL_PATTERN = [
    30, 32, 35, 38, 40, 42, 44, 45, 45, 44,
    42, 40, 38, 35, 33, 30, 28, 30, 32, 35,
    38, 40, 42, 44, 45, 44, 42, 40, 38, 35,
]

# Database and Redis connections
db_conn = None
redis_client = None


# ═══════════════════════════════════════════════════════════
# CONNECTION HELPERS
# ═══════════════════════════════════════════════════════════

def connect_db():
    global db_conn
    for attempt in range(30):
        try:
            db_conn = psycopg2.connect(DATABASE_URL)
            db_conn.autocommit = True
            print("[PATHWAY] ✓ PostgreSQL connected")
            return
        except Exception as e:
            print(f"[PATHWAY] DB retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to PostgreSQL")


def connect_redis():
    global redis_client
    for attempt in range(30):
        try:
            redis_client = redis_lib.from_url(REDIS_URL, decode_responses=True)
            redis_client.ping()
            print("[PATHWAY] ✓ Redis connected")
            return
        except Exception as e:
            print(f"[PATHWAY] Redis retry {attempt+1}: {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to Redis")


def load_planned_routes():
    """Load planned route polylines from PostgreSQL."""
    global planned_routes
    try:
        cur = db_conn.cursor()
        cur.execute("SELECT vehicle_id, polyline_json FROM routes")
        for vid, poly_json in cur.fetchall():
            planned_routes[vid] = json.loads(poly_json)
        cur.close()
        print(f"[PATHWAY] ✓ Loaded {len(planned_routes)} planned routes")
    except Exception as e:
        print(f"[PATHWAY] Error loading routes: {e}")


# ═══════════════════════════════════════════════════════════
# GEOMETRY FUNCTIONS
# ═══════════════════════════════════════════════════════════

def _point_to_segment_distance(lat, lng, p1, p2):
    """Distance from point to line segment in degree-space."""
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    if dx == 0 and dy == 0:
        return math.sqrt((lat - p1[0])**2 + (lng - p1[1])**2)
    t = max(0, min(1, ((lat - p1[0]) * dx + (lng - p1[1]) * dy) / (dx*dx + dy*dy)))
    proj_lat = p1[0] + t * dx
    proj_lng = p1[1] + t * dy
    return math.sqrt((lat - proj_lat)**2 + (lng - proj_lng)**2)


def _min_distance_to_polyline(lat, lng, polyline):
    """Minimum distance from a point to any segment in a polyline."""
    if not polyline or len(polyline) < 2:
        return 0.0
    return min(
        _point_to_segment_distance(lat, lng, polyline[i], polyline[i+1])
        for i in range(len(polyline) - 1)
    )


def _dtw_distance(series_a, series_b):
    """Dynamic Time Warping distance between two speed time-series."""
    n, m = len(series_a), len(series_b)
    if n == 0 or m == 0:
        return 0.0
    matrix = np.full((n + 1, m + 1), float("inf"))
    matrix[0][0] = 0.0
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = abs(series_a[i-1] - series_b[j-1])
            matrix[i][j] = cost + min(matrix[i-1][j], matrix[i][j-1], matrix[i-1][j-1])
    return float(matrix[n][m])


# ═══════════════════════════════════════════════════════════
# PATHWAY UDFs (User Defined Functions)
# ═══════════════════════════════════════════════════════════

# ── GPS Filtering ──────────────────────────────────────────

@pw.udf
def is_valid_gps(lat: float, lng: float) -> bool:
    """Filter out invalid GPS coordinates (0,0)."""
    return not (lat == 0.0 and lng == 0.0)


# ── Route Deviation ────────────────────────────────────────

@pw.udf
def compute_route_deviation(vehicle_id: str, lat: float, lng: float) -> float:
    """Compute min distance from vehicle to its planned route polyline (degrees)."""
    route = planned_routes.get(vehicle_id, [])
    if not route:
        return 0.0
    return round(_min_distance_to_polyline(lat, lng, route), 6)


@pw.udf
def is_deviated(deviation: float) -> bool:
    """Check if deviation exceeds threshold."""
    return deviation > DEVIATION_THRESHOLD


# ── Speed Classification ──────────────────────────────────

@pw.udf
def classify_speed(speed: float) -> str:
    """Classify speed into categories."""
    if speed < IDLE_THRESHOLD:
        return "idling"
    elif speed > OVERSPEED_THRESHOLD:
        return "overspeed"
    else:
        return "normal"


@pw.udf
def is_speed_anomaly(speed_class: str) -> bool:
    """Check if speed is abnormal (idle or overspeed)."""
    return speed_class != "normal"


# ── Emissions Computation ─────────────────────────────────

@pw.udf
def compute_co2(speed: float, load_kg: float, capacity_kg: float) -> float:
    """
    Estimate CO₂ emission based on vehicle speed and load.
    Formula: CO₂ = base_rate × speed_factor × load_factor × (speed / 60)
    """
    cap = capacity_kg if capacity_kg > 0 else 500.0
    speed_factor = 1.0 + (speed / 100.0) * 0.5
    load_factor = 1.0 + (load_kg / cap) * 0.3
    return round(CO2_BASE_RATE * speed_factor * load_factor * (speed / 60.0), 4)


@pw.udf
def compute_fuel(co2_est: float) -> float:
    """Estimate fuel consumption from CO₂ (approx 2.31 kg CO₂ per liter diesel)."""
    return round(co2_est / 2.31, 4)


# ── DTW Driving Behaviour ────────────────────────────────

@pw.udf
def compute_dtw_score(vehicle_id: str, speed: float) -> float:
    """
    Add speed to rolling window (30 samples), compute DTW distance
    against a reference normal driving pattern.
    Returns DTW distance (0 if window not yet full).
    """
    speed_windows[vehicle_id].append(speed)
    if len(speed_windows[vehicle_id]) > 30:
        speed_windows[vehicle_id] = speed_windows[vehicle_id][-30:]

    if len(speed_windows[vehicle_id]) < 30:
        return 0.0

    return round(_dtw_distance(speed_windows[vehicle_id], NORMAL_PATTERN), 2)


@pw.udf
def is_abnormal_driving(dtw_score: float) -> bool:
    """Check if DTW score exceeds abnormal driving threshold."""
    return dtw_score > DTW_THRESHOLD


@pw.udf
def get_speed_stats(vehicle_id: str) -> str:
    """Get speed pattern statistics for the vehicle's window."""
    window = speed_windows.get(vehicle_id, [])
    if len(window) < 5:
        return "{}"
    return json.dumps({
        "avg_speed": round(float(np.mean(window)), 1),
        "max_speed": round(float(max(window)), 1),
        "min_speed": round(float(min(window)), 1),
        "std_speed": round(float(np.std(window)), 1),
    })


# ── Side Effects: Write to DB + Redis ─────────────────────

@pw.udf
def persist_vehicle_state(vehicle_id: str, lat: float, lng: float, speed: float, load_kg: float) -> bool:
    """Write latest vehicle state to PostgreSQL and Redis (side effect UDF)."""
    # Update Redis (fast cache)
    try:
        if redis_client:
            redis_client.hset(f"vehicle:{vehicle_id}", mapping={
                "lat": str(lat), "lng": str(lng),
                "speed": str(speed), "load_kg": str(load_kg),
                "updated_at": str(time.time()),
            })
    except Exception:
        pass

    # Update PostgreSQL
    try:
        if db_conn:
            cur = db_conn.cursor()
            cur.execute("""
                INSERT INTO vehicle_state (vehicle_id, lat, lng, speed, load_kg, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (vehicle_id) DO UPDATE SET
                    lat=EXCLUDED.lat, lng=EXCLUDED.lng, speed=EXCLUDED.speed,
                    load_kg=EXCLUDED.load_kg, updated_at=NOW()
            """, (vehicle_id, lat, lng, speed, load_kg))
            cur.close()
    except Exception:
        pass
    return True


@pw.udf
def persist_alert(vehicle_id: str, alert_type: str, payload: str) -> bool:
    """Save alert to PostgreSQL (side effect UDF)."""
    try:
        if db_conn:
            cur = db_conn.cursor()
            cur.execute(
                "INSERT INTO alerts (vehicle_id, type, payload_json) VALUES (%s, %s, %s)",
                (vehicle_id, alert_type, payload),
            )
            cur.close()
    except Exception:
        pass
    return True


@pw.udf
def persist_emission(vehicle_id: str, co2: float, fuel: float, load_kg: float, speed: float) -> bool:
    """Save emission metric to PostgreSQL (side effect UDF)."""
    try:
        if db_conn:
            cur = db_conn.cursor()
            cur.execute(
                "INSERT INTO emissions (vehicle_id, co2_est, fuel_est, load_kg, speed) VALUES (%s,%s,%s,%s,%s)",
                (vehicle_id, co2, fuel, load_kg, speed),
            )
            cur.close()
    except Exception:
        pass
    return True


@pw.udf
def persist_load_to_redis(vehicle_id: str, load_kg: float, capacity_kg: float) -> bool:
    """Cache latest load data in Redis (side effect UDF)."""
    try:
        if redis_client:
            redis_client.hset(f"vehicle:{vehicle_id}", mapping={
                "load_kg": str(load_kg),
                "capacity_kg": str(capacity_kg),
            })
    except Exception:
        pass
    return True


@pw.udf
def get_vehicle_load(vehicle_id: str) -> float:
    """Get latest load from Redis cache."""
    try:
        if redis_client:
            data = redis_client.hgetall(f"vehicle:{vehicle_id}")
            if data and "load_kg" in data:
                return float(data["load_kg"])
    except Exception:
        pass
    return 0.0


@pw.udf
def get_vehicle_capacity(vehicle_id: str) -> float:
    """Get vehicle capacity from Redis cache."""
    try:
        if redis_client:
            data = redis_client.hgetall(f"vehicle:{vehicle_id}")
            if data and "capacity_kg" in data:
                return float(data["capacity_kg"])
    except Exception:
        pass
    return 500.0


# ── Constant UDFs (for string literals in Pathway tables) ──

@pw.udf
def const_route_deviation() -> str:
    return "route_deviation"

@pw.udf
def const_abnormal_driving() -> str:
    return "abnormal_driving"


# ── JSON serialization UDFs ───────────────────────────────

@pw.udf
def to_alert_json(vehicle_id: str, alert_type: str, lat: float, lng: float,
                  speed: float, deviation: float, timestamp: float) -> str:
    """Serialize alert event to JSON."""
    payload = {
        "vehicle_id": vehicle_id,
        "type": alert_type,
        "lat": lat, "lng": lng,
        "speed": speed,
        "deviation_deg": deviation,
        "timestamp": timestamp,
    }
    if alert_type == "overspeed":
        payload["threshold"] = OVERSPEED_THRESHOLD
    return json.dumps(payload)


@pw.udf
def to_emission_json(vehicle_id: str, co2: float, fuel: float,
                     load_kg: float, speed: float, timestamp: float) -> str:
    """Serialize emission metric to JSON."""
    return json.dumps({
        "vehicle_id": vehicle_id,
        "co2_est": co2, "fuel_est": fuel,
        "load_kg": load_kg, "speed": speed,
        "timestamp": timestamp,
    })


@pw.udf
def to_behavior_json(vehicle_id: str, dtw_score: float,
                     stats: str, timestamp: float) -> str:
    """Serialize driving behavior event to JSON."""
    return json.dumps({
        "vehicle_id": vehicle_id,
        "type": "abnormal_driving",
        "dtw_distance": dtw_score,
        "pattern_summary": json.loads(stats) if stats else {},
        "timestamp": timestamp,
    })


# ═══════════════════════════════════════════════════════════
# ROUTE UPDATE LISTENER (background thread)
# ═══════════════════════════════════════════════════════════

def route_update_listener():
    """Background thread: listen for route updates from optimizer."""
    from kafka import KafkaConsumer as KC
    for attempt in range(30):
        try:
            consumer = KC(
                "routes.updated", bootstrap_servers=KAFKA_BROKER,
                group_id="pathway-route-updates",
                auto_offset_reset="latest",
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                consumer_timeout_ms=1000,
            )
            print("[PATHWAY] ✓ Route update listener started")
            break
        except Exception as e:
            print(f"[PATHWAY] Route listener retry {attempt+1}: {e}")
            time.sleep(3)
    else:
        return

    while True:
        try:
            for tp, msgs in consumer.poll(timeout_ms=2000).items():
                for msg in msgs:
                    vid = msg.value.get("vehicle_id")
                    poly = msg.value.get("polyline", [])
                    if vid and poly:
                        planned_routes[vid] = poly
                        print(f"[PATHWAY] ↻ Route updated for {vid}")
        except Exception as e:
            print(f"[PATHWAY] Route listener error: {e}")
            time.sleep(1)


# ═══════════════════════════════════════════════════════════
# MAIN PATHWAY PIPELINE
# ═══════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print(" BYUFUEL — Pathway Streaming Pipeline")
    print("=" * 60)
    time.sleep(10)  # Wait for Kafka, DB, Redis

    # ── Initialize connections ──
    connect_db()
    connect_redis()
    load_planned_routes()

    # ── Start route update listener ──
    threading.Thread(target=route_update_listener, daemon=True).start()

    # ═══════════════════════════════════════════════════════
    # STEP 1: READ FROM KAFKA (Input Connectors)
    # ═══════════════════════════════════════════════════════

    print("[PATHWAY] Connecting to Kafka topics...")

    gps_stream = pw.io.kafka.read(
        rdkafka_settings,
        topic="gps.events",
        schema=GPSEventSchema,
        format="json",
        autocommit_duration_ms=1000,
    )

    load_stream = pw.io.kafka.read(
        rdkafka_settings,
        topic="load.events",
        schema=LoadEventSchema,
        format="json",
        autocommit_duration_ms=3000,
    )

    print("[PATHWAY] ✓ Kafka input connectors configured")

    # ═══════════════════════════════════════════════════════
    # STEP 2: FILTER INVALID GPS
    # ═══════════════════════════════════════════════════════
    # Remove GPS events with (0,0) coordinates

    valid_gps = gps_stream.filter(
        is_valid_gps(gps_stream.lat, gps_stream.lng)
    )

    # ═══════════════════════════════════════════════════════
    # STEP 3: PROCESS LOAD EVENTS (Cache in Redis)
    # ═══════════════════════════════════════════════════════
    # Persist latest load readings to Redis for GPS enrichment

    load_cached = load_stream.select(
        vehicle_id=load_stream.vehicle_id,
        load_kg=load_stream.load_kg,
        capacity_kg=load_stream.capacity_kg,
        cached=persist_load_to_redis(
            load_stream.vehicle_id,
            load_stream.load_kg,
            load_stream.capacity_kg,
        ),
    )

    # ═══════════════════════════════════════════════════════
    # STEP 4: ENRICH GPS WITH LOAD DATA
    # ═══════════════════════════════════════════════════════
    # Join GPS data with latest load from Redis cache

    enriched = valid_gps.select(
        vehicle_id=valid_gps.vehicle_id,
        lat=valid_gps.lat,
        lng=valid_gps.lng,
        speed=valid_gps.speed,
        timestamp=valid_gps.timestamp,
        heading=valid_gps.heading,
        load_kg=get_vehicle_load(valid_gps.vehicle_id),
        capacity_kg=get_vehicle_capacity(valid_gps.vehicle_id),
    )

    # ═══════════════════════════════════════════════════════
    # STEP 5: COMPUTE ALL METRICS
    # ═══════════════════════════════════════════════════════
    # Route deviation, speed class, emissions, DTW score

    computed = enriched.select(
        vehicle_id=enriched.vehicle_id,
        lat=enriched.lat,
        lng=enriched.lng,
        speed=enriched.speed,
        timestamp=enriched.timestamp,
        load_kg=enriched.load_kg,
        capacity_kg=enriched.capacity_kg,
        # Route deviation (distance to planned polyline)
        deviation=compute_route_deviation(
            enriched.vehicle_id, enriched.lat, enriched.lng
        ),
        # Speed classification
        speed_class=classify_speed(enriched.speed),
        # CO₂ emission estimate
        co2_est=compute_co2(
            enriched.speed, enriched.load_kg, enriched.capacity_kg
        ),
        # Fuel estimate
        fuel_est=compute_fuel(
            compute_co2(enriched.speed, enriched.load_kg, enriched.capacity_kg)
        ),
        # DTW driving behaviour score
        dtw_score=compute_dtw_score(enriched.vehicle_id, enriched.speed),
        # Speed pattern stats (for behavior alerts)
        speed_stats=get_speed_stats(enriched.vehicle_id),
        # Side effect: persist state to DB + Redis
        _persisted=persist_vehicle_state(
            enriched.vehicle_id, enriched.lat, enriched.lng,
            enriched.speed, enriched.load_kg,
        ),
    )

    # ═══════════════════════════════════════════════════════
    # STEP 6: ROUTE DEVIATION ALERTS → alerts.route_deviation
    # ═══════════════════════════════════════════════════════
    # Filter for deviated + speed anomalies, format, publish

    deviation_alerts = computed.filter(is_deviated(computed.deviation))
    deviation_output = deviation_alerts.select(
        vehicle_id=deviation_alerts.vehicle_id,
        alert_json=to_alert_json(
            deviation_alerts.vehicle_id, const_route_deviation(),
            deviation_alerts.lat, deviation_alerts.lng,
            deviation_alerts.speed, deviation_alerts.deviation,
            deviation_alerts.timestamp,
        ),
        _saved=persist_alert(
            deviation_alerts.vehicle_id,
            const_route_deviation(),
            to_alert_json(
                deviation_alerts.vehicle_id, const_route_deviation(),
                deviation_alerts.lat, deviation_alerts.lng,
                deviation_alerts.speed, deviation_alerts.deviation,
                deviation_alerts.timestamp,
            ),
        ),
    )

    speed_anomalies = computed.filter(is_speed_anomaly(computed.speed_class))
    speed_output = speed_anomalies.select(
        vehicle_id=speed_anomalies.vehicle_id,
        alert_json=to_alert_json(
            speed_anomalies.vehicle_id, speed_anomalies.speed_class,
            speed_anomalies.lat, speed_anomalies.lng,
            speed_anomalies.speed, speed_anomalies.deviation,
            speed_anomalies.timestamp,
        ),
        _saved=persist_alert(
            speed_anomalies.vehicle_id,
            speed_anomalies.speed_class,
            to_alert_json(
                speed_anomalies.vehicle_id, speed_anomalies.speed_class,
                speed_anomalies.lat, speed_anomalies.lng,
                speed_anomalies.speed, speed_anomalies.deviation,
                speed_anomalies.timestamp,
            ),
        ),
    )

    # Publish alerts to Kafka
    pw.io.kafka.write(deviation_output, rdkafka_settings, topic_name="alerts.route_deviation", format="json")
    pw.io.kafka.write(speed_output, rdkafka_settings, topic_name="alerts.route_deviation", format="json")

    # ═══════════════════════════════════════════════════════
    # STEP 7: EMISSIONS → emissions.metrics
    # ═══════════════════════════════════════════════════════

    emissions_output = computed.select(
        vehicle_id=computed.vehicle_id,
        emission_json=to_emission_json(
            computed.vehicle_id, computed.co2_est, computed.fuel_est,
            computed.load_kg, computed.speed, computed.timestamp,
        ),
        _saved=persist_emission(
            computed.vehicle_id, computed.co2_est,
            computed.fuel_est, computed.load_kg, computed.speed,
        ),
    )

    pw.io.kafka.write(emissions_output, rdkafka_settings, topic_name="emissions.metrics", format="json")

    # ═══════════════════════════════════════════════════════
    # STEP 8: DRIVING BEHAVIOR → driving.behavior
    # ═══════════════════════════════════════════════════════

    abnormal = computed.filter(is_abnormal_driving(computed.dtw_score))
    behavior_output = abnormal.select(
        vehicle_id=abnormal.vehicle_id,
        behavior_json=to_behavior_json(
            abnormal.vehicle_id, abnormal.dtw_score,
            abnormal.speed_stats, abnormal.timestamp,
        ),
        _saved=persist_alert(
            abnormal.vehicle_id,
            const_abnormal_driving(),
            to_behavior_json(
                abnormal.vehicle_id, abnormal.dtw_score,
                abnormal.speed_stats, abnormal.timestamp,
            ),
        ),
    )

    pw.io.kafka.write(behavior_output, rdkafka_settings, topic_name="driving.behavior", format="json")

    # ═══════════════════════════════════════════════════════
    # LAUNCH PATHWAY ENGINE
    # ═══════════════════════════════════════════════════════

    print("[PATHWAY] ═══════════════════════════════════════════")
    print("[PATHWAY]  Pipeline configured. Starting pw.run()...")
    print("[PATHWAY]  Streams: GPS → Filter → Enrich → Compute")
    print("[PATHWAY]  Outputs: Alerts | Emissions | Behavior")
    print("[PATHWAY] ═══════════════════════════════════════════")

    pw.run()


if __name__ == "__main__":
    main()
