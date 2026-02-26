#!/bin/bash
# Wait for Kafka to be ready
echo "Waiting for Kafka to be ready..."
sleep 10

KAFKA_BROKER="kafka:9092"

TOPICS=(
  "gps.events"
  "load.events"
  "pickup.requests"
  "alerts.route_deviation"
  "routes.updated"
  "emissions.metrics"
  "driving.behavior"
)

for TOPIC in "${TOPICS[@]}"; do
  echo "Creating topic: $TOPIC"
  /opt/kafka/bin/kafka-topics.sh --create \
    --bootstrap-server "$KAFKA_BROKER" \
    --replication-factor 1 \
    --partitions 3 \
    --topic "$TOPIC" \
    --if-not-exists
done

echo "All topics created successfully!"
/opt/kafka/bin/kafka-topics.sh --list --bootstrap-server "$KAFKA_BROKER"
