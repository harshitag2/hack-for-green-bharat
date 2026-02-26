"""
BYUFUEL Backend API (FastAPI)
==============================
REST endpoints + WebSocket for live updates.
"""

import json
import time
import os
import asyncio
import threading
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import psycopg2.extras
import redis
from kafka import KafkaConsumer, KafkaProducer

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://byufuel:byufuel123@postgres:5432/byufuel")
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
KAFKA = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

# ─── Connection Helpers ──────────────────────────────────

def get_db():
    for attempt in range(30):
        try:
            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = True
            return conn
        except Exception as e:
            print(f"[API] DB retry {attempt+1}: {e}")
            time.sleep(2)
    raise RuntimeError("Could not connect to DB")


def get_redis():
    for attempt in range(30):
        try:
            r = redis.from_url(REDIS_URL, decode_responses=True)
            r.ping()
            return r
        except Exception as e:
            print(f"[API] Redis retry {attempt+1}: {e}")
            time.sleep(2)
    raise RuntimeError("Could not connect to Redis")


def get_kafka_producer():
    for attempt in range(20):
        try:
            p = KafkaProducer(
                bootstrap_servers=KAFKA,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
            )
            return p
        except Exception as e:
            print(f"[API] Kafka producer retry {attempt+1}: {e}")
            time.sleep(3)
    return None


# ─── WebSocket Manager ───────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()

# ─── Kafka Consumer Thread for WebSocket Push ────────────

def kafka_ws_consumer(loop):
    """Background thread: consumes multiple Kafka topics, pushes to WebSocket clients."""
    topics = [
        "gps.events", "load.events", "alerts.route_deviation",
        "routes.updated", "emissions.metrics", "driving.behavior",
    ]
    for attempt in range(30):
        try:
            consumer = KafkaConsumer(
                *topics,
                bootstrap_servers=KAFKA,
                group_id="backend-ws-group",
                auto_offset_reset="latest",
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                consumer_timeout_ms=1000,
            )
            print("[API] Kafka WS consumer connected")
            break
        except Exception as e:
            print(f"[API] Kafka WS consumer retry {attempt+1}: {e}")
            time.sleep(3)
    else:
        print("[API] Could not start Kafka WS consumer")
        return

    while True:
        try:
            records = consumer.poll(timeout_ms=500)
            for tp, messages in records.items():
                topic = tp.topic
                for msg in messages:
                    ws_msg = {
                        "topic": topic,
                        "data": msg.value,
                    }
                    asyncio.run_coroutine_threadsafe(manager.broadcast(ws_msg), loop)
        except Exception as e:
            print(f"[API] WS consumer error: {e}")
            time.sleep(1)


# ─── App Lifecycle ───────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start Kafka WS consumer in background thread
    loop = asyncio.get_event_loop()
    t = threading.Thread(target=kafka_ws_consumer, args=(loop,), daemon=True)
    t.start()
    print("[API] Kafka WS consumer thread started")
    yield
    print("[API] Shutting down")


app = FastAPI(
    title="BYUFUEL API",
    description="Real-time Fleet Monitoring + Dynamic Route Optimization",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Health Check ────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "byufuel-api"}


# ─── REST Endpoints ──────────────────────────────────────

@app.get("/api/vehicles")
def get_vehicles():
    """Get latest state of all vehicles."""
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT v.id, v.type, v.capacity_kg, v.fuel_type,
                   vs.lat, vs.lng, vs.speed, vs.load_kg, vs.updated_at
            FROM vehicles v
            LEFT JOIN vehicle_state vs ON v.id = vs.vehicle_id
            ORDER BY v.id
        """)
        rows = cur.fetchall()
        cur.close()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "type": r["type"],
                "capacity_kg": float(r["capacity_kg"]),
                "fuel_type": r["fuel_type"],
                "lat": float(r["lat"]) if r["lat"] else 0,
                "lng": float(r["lng"]) if r["lng"] else 0,
                "speed": float(r["speed"]) if r["speed"] else 0,
                "load_kg": float(r["load_kg"]) if r["load_kg"] else 0,
                "capacity_pct": round(float(r["load_kg"] or 0) / float(r["capacity_kg"]) * 100, 1),
                "updated_at": str(r["updated_at"]) if r["updated_at"] else None,
            })
        return {"vehicles": result}
    finally:
        conn.close()


@app.get("/api/warehouses")
def get_warehouses():
    """Get all warehouses."""
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM warehouses ORDER BY id")
        rows = cur.fetchall()
        cur.close()
        return {"warehouses": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.get("/api/restaurants")
def get_restaurants():
    """Get all restaurants."""
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM restaurants ORDER BY id")
        rows = cur.fetchall()
        cur.close()
        return {"restaurants": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.get("/api/routes/current")
def get_current_routes():
    """Get current routes for all vehicles."""
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT vehicle_id, polyline_json, updated_at FROM routes ORDER BY vehicle_id")
        rows = cur.fetchall()
        cur.close()
        result = []
        for r in rows:
            result.append({
                "vehicle_id": r["vehicle_id"],
                "polyline": json.loads(r["polyline_json"]),
                "updated_at": str(r["updated_at"]),
            })
        return {"routes": result}
    finally:
        conn.close()


@app.get("/api/alerts")
def get_alerts(limit: int = 50):
    """Get recent alerts."""
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT id, vehicle_id, type, payload_json, created_at
            FROM alerts ORDER BY created_at DESC LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
        cur.close()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "vehicle_id": r["vehicle_id"],
                "type": r["type"],
                "payload": json.loads(r["payload_json"]),
                "created_at": str(r["created_at"]),
            })
        return {"alerts": result}
    finally:
        conn.close()


@app.get("/api/emissions")
def get_emissions(limit: int = 100):
    """Get recent emission metrics."""
    conn = get_db()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT id, vehicle_id, co2_est, fuel_est, load_kg, speed, created_at
            FROM emissions ORDER BY created_at DESC LIMIT %s
        """, (limit,))
        rows = cur.fetchall()
        cur.close()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "vehicle_id": r["vehicle_id"],
                "co2_est": float(r["co2_est"]),
                "fuel_est": float(r["fuel_est"]),
                "load_kg": float(r["load_kg"]),
                "speed": float(r["speed"]),
                "created_at": str(r["created_at"]),
            })
        return {"emissions": result}
    finally:
        conn.close()


@app.post("/api/optimize")
def manual_optimize():
    """Manually trigger optimization for pending pickups."""
    conn = get_db()
    producer = get_kafka_producer()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM pickups WHERE status = 'pending' ORDER BY created_at")
        pending = cur.fetchall()
        cur.close()

        if not pending:
            return {"status": "no_pending_pickups", "count": 0}

        if producer:
            for p in pending:
                event = {
                    "pickup_id": p["id"],
                    "restaurant_id": p["restaurant_id"],
                    "requested_load_kg": float(p["requested_load_kg"]),
                    "lat": 28.62,  # approximate
                    "lng": 77.22,
                    "timestamp": time.time(),
                }
                producer.send("pickup.requests", key=p["id"], value=event)
            producer.flush()

        return {"status": "optimization_triggered", "count": len(pending)}
    finally:
        conn.close()


# ─── WebSocket ───────────────────────────────────────────

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            # Could handle client commands here
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
