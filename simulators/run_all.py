"""
Run all simulators concurrently using threads.
"""
import threading
import time

from gps_simulator import run as gps_run
from load_simulator import run as load_run
from pickup_simulator import run as pickup_run


def main():
    print("[SIMULATORS] Starting all simulators...")
    time.sleep(5)  # Let Kafka settle

    threads = [
        threading.Thread(target=gps_run, name="gps-sim", daemon=True),
        threading.Thread(target=load_run, name="load-sim", daemon=True),
        threading.Thread(target=pickup_run, name="pickup-sim", daemon=True),
    ]

    for t in threads:
        t.start()
        print(f"[SIMULATORS] Started {t.name}")

    for t in threads:
        t.join()


if __name__ == "__main__":
    main()
