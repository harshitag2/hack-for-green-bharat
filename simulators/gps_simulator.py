"""
GPS Simulator — emits GPS events to Kafka topic `gps.events` every 1s for 3 vehicles.
Vehicles move along predefined routes around Delhi with realistic speed variations.
"""
import json
import time
import math
import random
import os
from kafka import KafkaProducer

KAFKA = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

# Predefined route waypoints for 3 vehicles (Delhi area)
ROUTES = {
    "V001": [
        (28.6139, 77.2090), (28.6160, 77.2110), (28.6180, 77.2130),
        (28.6200, 77.2150), (28.6220, 77.2170), (28.6250, 77.2190),
        (28.6280, 77.2200), (28.6300, 77.2200), (28.6320, 77.2220),
        (28.6350, 77.2250),
    ],
    "V002": [
        (28.6280, 77.2190), (28.6300, 77.2210), (28.6320, 77.2230),
        (28.6350, 77.2250), (28.6380, 77.2220), (28.6400, 77.2180),
        (28.6420, 77.2140), (28.6450, 77.2100), (28.6470, 77.2150),
        (28.6500, 77.2300),
    ],
    "V003": [
        (28.6350, 77.2250), (28.6320, 77.2280), (28.6280, 77.2310),
        (28.6250, 77.2340), (28.6220, 77.2360), (28.6200, 77.2350),
        (28.6170, 77.2380), (28.6140, 77.2400), (28.6120, 77.2380),
        (28.6139, 77.2090),
    ],
}

def interpolate(p1, p2, t):
    """Linear interpolation between two points."""
    return (p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)


def create_producer():
    for attempt in range(30):
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
            )
            print("[GPS] Connected to Kafka")
            return producer
        except Exception as e:
            print(f"[GPS] Kafka not ready (attempt {attempt+1}): {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to Kafka")


def run():
    producer = create_producer()
    # State per vehicle
    state = {}
    for vid, route in ROUTES.items():
        state[vid] = {
            "route": route,
            "segment": 0,
            "t": 0.0,
            "speed": 30 + random.uniform(-5, 5),
        }

    step = 0
    while True:
        for vid, s in state.items():
            route = s["route"]
            seg = s["segment"]
            t = s["t"]

            p1 = route[seg % len(route)]
            p2 = route[(seg + 1) % len(route)]
            lat, lng = interpolate(p1, p2, t)

            # Add small noise for realism
            lat += random.uniform(-0.0002, 0.0002)
            lng += random.uniform(-0.0002, 0.0002)

            # Speed variation: occasionally idle or overspeed
            if random.random() < 0.05:
                speed = 0  # idling
            elif random.random() < 0.05:
                speed = 90 + random.uniform(0, 20)  # overspeed
            else:
                speed = s["speed"] + random.uniform(-3, 3)
                speed = max(10, min(70, speed))
            s["speed"] = speed

            # Occasionally emit (0,0) to test filtering
            if random.random() < 0.02:
                lat, lng = 0.0, 0.0

            event = {
                "vehicle_id": vid,
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "speed": round(speed, 1),
                "timestamp": time.time(),
                "heading": random.uniform(0, 360),
            }

            producer.send("gps.events", key=vid, value=event)

            # Advance along route
            s["t"] += 0.02
            if s["t"] >= 1.0:
                s["t"] = 0.0
                s["segment"] = (s["segment"] + 1) % (len(route) - 1)

        step += 1
        if step % 30 == 0:
            print(f"[GPS] Emitted {step * 3} events total")
        producer.flush()
        time.sleep(1)


if __name__ == "__main__":
    run()
