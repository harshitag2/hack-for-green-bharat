"""
Load Simulator — emits load sensor events to Kafka topic `load.events` every 3s.
Simulates gradual load changes for each vehicle.
"""
import json
import time
import random
import os
from kafka import KafkaProducer

KAFKA = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

VEHICLES = {
    "V001": {"capacity": 500.0, "current_load": 120.0},
    "V002": {"capacity": 300.0, "current_load": 80.0},
    "V003": {"capacity": 600.0, "current_load": 200.0},
}


def create_producer():
    for attempt in range(30):
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
            )
            print("[LOAD] Connected to Kafka")
            return producer
        except Exception as e:
            print(f"[LOAD] Kafka not ready (attempt {attempt+1}): {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to Kafka")


def run():
    producer = create_producer()
    step = 0
    while True:
        for vid, state in VEHICLES.items():
            # Simulate load changes: random drift + occasional pickup/dropoff
            delta = random.uniform(-5, 5)
            if random.random() < 0.1:
                delta += random.uniform(20, 50)  # pickup happened
            if random.random() < 0.08:
                delta -= random.uniform(30, 60)  # delivery happened

            state["current_load"] = max(0, min(state["capacity"], state["current_load"] + delta))

            event = {
                "vehicle_id": vid,
                "load_kg": round(state["current_load"], 1),
                "capacity_kg": state["capacity"],
                "timestamp": time.time(),
            }

            producer.send("load.events", key=vid, value=event)

        step += 1
        if step % 10 == 0:
            print(f"[LOAD] Emitted {step * 3} load events total")
        producer.flush()
        time.sleep(3)


if __name__ == "__main__":
    run()
