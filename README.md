# 🚛 GREEN LANTERN — Real-time Fleet Monitoring & Dynamic Route Optimization

> A complete prototype for real-time fleet monitoring with GPS tracking, load sensors, emission analytics, driving behavior detection, and dynamic route optimization.

![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20Kafka%20%7C%20React%20%7C%20PostgreSQL%20%7C%20Redis-blue)
![Python](https://img.shields.io/badge/Python-3.11-green)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)

## 🌐 Live Demo

**🚀 [View Live Application](https://hack-for-green-bharat-ruby.vercel.app/)**

The live demo runs with simulated real-time data, updating every second to showcase the Kafka/Pathway pipeline functionality.

---

## 📋 Prerequisites

- **Docker Desktop** (v20+ with Docker Compose v2)
- **Minimum 8GB RAM** allocated to Docker
- Ports available: `3000`, `8000`, `5432`, `6379`, `9092`, `2181`, `29092`

---

## 🚀 Quick Start

### One command to run everything:

```bash
cd greenlantern
docker compose up --build
```

> ⏱️ First build takes ~3-5 minutes. Subsequent starts are faster.

### Access the application:

| Service | URL |
|---------|-----|
| **Frontend Dashboard** | [http://localhost:3000](http://localhost:3000) |
| **Backend API** | [http://localhost:8000](http://localhost:8000) |
| **API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **Health Check** | [http://localhost:8000/health](http://localhost:8000/health) |

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Simulators  │────▶│    Kafka     │◀───▶│  Pathway    │
│ GPS/Load/    │     │   Broker     │     │  Pipeline   │
│ Pickup       │     └──────┬───────┘     └──────┬──────┘
└─────────────┘            │                     │
                           │              ┌──────▼──────┐
                    ┌──────▼───────┐      │  Optimizer  │
                    │   FastAPI    │      │  (OR-Tools) │
                    │   Backend    │      └─────────────┘
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌───▼────┐
        │PostgreSQL│ │  Redis   │ │ React  │
        │   DB     │ │  Cache   │ │Frontend│
        └──────────┘ └──────────┘ └────────┘
```

---

## 📂 Project Structure

```
greenlantern/
├── docker-compose.yml          # Full orchestration
├── .env                        # Environment variables
├── README.md                   # This file
├── db/
│   └── init.sql                # Schema + seed data
├── simulators/
│   ├── Dockerfile
│   ├── gps_simulator.py        # GPS events → gps.events
│   ├── load_simulator.py       # Load events → load.events
│   ├── pickup_simulator.py     # Pickup requests → pickup.requests
│   └── run_all.py              # Runs all simulators
├── pathway_pipeline/
│   ├── Dockerfile
│   └── pipeline.py             # Stream processing + DTW
├── optimizer/
│   ├── Dockerfile
│   └── optimizer.py            # VRP assignment service
├── backend/
│   ├── Dockerfile
│   └── main.py                 # FastAPI REST + WebSocket
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.jsx             # Main dashboard
│       ├── App.css             # Dark theme styles
│       └── components/
│           ├── LiveMap.jsx     # Leaflet map
│           ├── VehiclesTable.jsx
│           ├── AlertsPanel.jsx
│           └── RoutesView.jsx
└── kafka-setup/
    └── create-topics.sh
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicles` | Latest state of all vehicles |
| GET | `/api/warehouses` | List all warehouses |
| GET | `/api/restaurants` | List all restaurants |
| GET | `/api/routes/current` | Current routes for all vehicles |
| GET | `/api/alerts?limit=50` | Recent alerts |
| GET | `/api/emissions?limit=100` | Recent emission metrics |
| POST | `/api/optimize` | Trigger manual route optimization |
| WS | `/ws/live` | WebSocket for real-time updates |

---

## 📡 Kafka Topics

| Topic | Producer | Consumer | Description |
|-------|----------|----------|-------------|
| `gps.events` | GPS Simulator | Pathway Pipeline | Vehicle GPS coordinates |
| `load.events` | Load Simulator | Pathway Pipeline | Load sensor readings |
| `pickup.requests` | Pickup Simulator | Optimizer | New pickup requests |
| `alerts.route_deviation` | Pipeline | Backend (WS) | Route deviation & speed alerts |
| `routes.updated` | Optimizer | Backend (WS) + Pipeline | Updated route polylines |
| `emissions.metrics` | Pipeline | Backend (WS) | CO₂ & fuel estimates |
| `driving.behavior` | Pipeline | Backend (WS) | DTW behavior anomalies |

### View Kafka Topics & Messages

```bash
# List all topics
docker exec greenlantern-kafka-1 kafka-topics --list --bootstrap-server localhost:9092

# Watch GPS events
docker exec greenlantern-kafka-1 kafka-console-consumer \
  --topic gps.events --bootstrap-server localhost:9092 --from-beginning --max-messages 10

# Watch alerts
docker exec greenlantern-kafka-1 kafka-console-consumer \
  --topic alerts.route_deviation --bootstrap-server localhost:9092

# Watch emissions
docker exec greenlantern-kafka-1 kafka-console-consumer \
  --topic emissions.metrics --bootstrap-server localhost:9092
```

---

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `vehicles` | Fleet vehicle definitions (id, type, capacity, fuel) |
| `vehicle_state` | Latest GPS + load per vehicle |
| `warehouses` | Warehouse locations |
| `restaurants` | Restaurant locations |
| `pickups` | Pickup requests & assignments |
| `routes` | Current route polylines per vehicle |
| `alerts` | Historical alerts |
| `emissions` | Emission metric history |

### Access PostgreSQL

```bash
docker exec -it greenlantern-postgres-1 psql -U greenlantern -d greenlantern
```

---

## 📊 Dashboard Features

### 🗺️ Live Map
- Real-time vehicle markers (color-coded by status)
  - 🔵 Blue = Normal driving
  - 🟣 Purple = Idling
  - 🔴 Red = Overspeed
  - 🟡 Orange = Fast
- Route polylines per vehicle
- Warehouse (🏭) and Restaurant (🍽️) markers
- Interactive popups with vehicle details

### 🚛 Vehicles Table
- ID, type, speed, load, capacity %, fuel type
- Emission score per vehicle
- Real-time status indicators

### 🔔 Alerts Panel
- Route deviation alerts
- Overspeed warnings
- Idling detection
- DTW-based abnormal driving behavior

### 📍 Routes View
- Select vehicle to view its route
- Polyline visualization on map
- Waypoint details panel

### 🌿 Emissions
- Total CO₂ and fuel estimates
- Per-vehicle emission metrics table
- Real-time data streaming

---

## 🧪 How Simulations Work

1. **GPS Simulator** (`gps_simulator.py`): Moves 3 vehicles along predefined Delhi routes. Occasionally produces idle events (speed=0), overspeed (>80km/h), and invalid GPS (0,0) for pipeline filtering.

2. **Load Simulator** (`load_simulator.py`): Gradually changes vehicle load with occasional pickup (+20-50kg) and delivery (-30-60kg) events.

3. **Pickup Simulator** (`pickup_simulator.py`): Creates new pickup requests from restaurants every 20-40s with random load requirements.

---

## 🛠️ Service Logs

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f backend
docker compose logs -f pathway-pipeline
docker compose logs -f optimizer
docker compose logs -f simulators

# View only errors
docker compose logs -f 2>&1 | grep -i error
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port already in use | `docker compose down` then retry, or change ports in `docker-compose.yml` |
| Kafka not ready | Services auto-retry connections. Wait 30s after startup. |
| Frontend blank | Clear browser cache, check `docker compose logs frontend` |
| No data on dashboard | Check `docker compose logs simulators` — data starts ~15s after all services up |
| DB connection errors | `docker compose down -v` to reset volumes, then `docker compose up --build` |

### Full Reset

```bash
docker compose down -v --rmi all
docker compose up --build
```

---

## 📸 Screenshots

> *(Dashboard screenshots will appear here after first run)*

| View | Description |
|------|-------------|
| Live Map | Real-time vehicle tracking on dark Leaflet map |
| Vehicles Table | Fleet overview with speed/load/emissions |
| Alerts Panel | Streaming deviation & behavior alerts |
| Routes View | Per-vehicle route visualization |
| Emissions | CO₂ and fuel analytics |

---

## 🏛️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend API | Python FastAPI |
| Message Queue | Apache Kafka |
| Stream Processing | Pathway-style Pipeline |
| Route Optimization | OR-Tools VRP |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Frontend | React 18 (Vite) |
| Maps | Leaflet + react-leaflet |
| Orchestration | Docker Compose |

---

## 📝 License

MIT License — Built for the Hack for Green Bharat hackathon.
