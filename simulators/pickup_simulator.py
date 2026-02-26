"""
Pickup Simulator — emits new pickup requests to Kafka topic `pickup.requests`
randomly every 20-40s from random restaurants.
"""
import json
import time
import random
import uuid
import os
from kafka import KafkaProducer

KAFKA = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

RESTAURANTS = [
    {"id": "R001", "name": "Spice Garden", "lat": 28.6300, "lng": 77.2200},
    {"id": "R002", "name": "Delhi Darbar", "lat": 28.6450, "lng": 77.2100},
    {"id": "R003", "name": "Tandoori Nights", "lat": 28.6200, "lng": 77.2350},
    {"id": "R004", "name": "Green Leaf Cafe", "lat": 28.6100, "lng": 77.2400},
    {"id": "R005", "name": "Royal Kitchen", "lat": 28.6500, "lng": 77.2300},
]


def create_producer():
    for attempt in range(30):
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
            )
            print("[PICKUP] Connected to Kafka")
            return producer
        except Exception as e:
            print(f"[PICKUP] Kafka not ready (attempt {attempt+1}): {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to Kafka")


def run():
    producer = create_producer()
    count = 0
    while True:
        restaurant = random.choice(RESTAURANTS)
        pickup_id = f"PK-{uuid.uuid4().hex[:8]}"
        load_kg = round(random.uniform(10, 80), 1)

        event = {
            "pickup_id": pickup_id,
            "restaurant_id": restaurant["id"],
            "restaurant_name": restaurant["name"],
            "lat": restaurant["lat"],
            "lng": restaurant["lng"],
            "requested_load_kg": load_kg,
            "timestamp": time.time(),
        }

        producer.send("pickup.requests", key=pickup_id, value=event)
        producer.flush()
        count += 1
        print(f"[PICKUP] New request #{count}: {pickup_id} from {restaurant['name']} ({load_kg} kg)")

        delay = random.uniform(20, 40)
        time.sleep(delay)


if __name__ == "__main__":
    run()
