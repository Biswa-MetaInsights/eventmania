import asyncio
import json
import logging
import os
from typing import Any, Callable, Dict, Optional

# Use a mock implementation if requested for local-only testing
MOCK_MODE = os.getenv("MOCK_KAFKA", "FALSE") == "TRUE"

class KafkaManager:
    def __init__(self, bootstrap_servers: str, client_id: str):
        self.bootstrap_servers = bootstrap_servers
        self.client_id = client_id
        self.producer: Optional[Any] = None # Type hint as Any because it could be AIOKafkaProducer or mock
        self.is_running = False
        self.logger = logging.getLogger(f"kafka.{client_id}")

    async def start(self):
        if MOCK_MODE:
            self.logger.info("🛠️ Kafka Mock Started (Shadow Mode)")
            self.is_running = True
            return

        try:
            from aiokafka import AIOKafkaProducer
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            await self.producer.start()
            self.is_running = True
            self.logger.info("Kafka Producer started.")
        except Exception as e:
            self.logger.error(f"❌ Failed to start Kafka Producer: {e}")
            self.is_running = False

    async def send(self, topic: str, value: Dict[str, Any]):
        if not self.is_running:
            self.logger.warning(f"Attempted to send to {topic} but KafkaManager is not running.")
            return

        if MOCK_MODE:
            self.logger.info(f"📤 [MOCK] Topic {topic}: {json.dumps(value)}")
            return

        try:
            await self.producer.send_and_wait(topic, value) # value is already serialized by producer
            self.logger.info(f"Event sent to topic {topic}: {value}")
        except Exception as e:
            self.logger.error(f"❌ Failed to send to {topic}: {e}")

    async def stop(self):
        if self.producer:
            await self.producer.stop()
            self.logger.info("Kafka Producer stopped.")
        self.is_running = False

    async def consume(self, topic: str, group_id: str, callback: Callable[[Dict[str, Any]], Any]):
        """Standard non-blocking consumer mockup for local testing"""
        if MOCK_MODE:
            self.logger.info(f"📥 [MOCK] Listening on {topic} (Group: {group_id}). No actual consumption in mock mode.")
            # In a real mock, you might want to simulate receiving messages or have a way to inject them.
            # For now, it just logs that it's "listening".
            return

        from aiokafka import AIOKafkaConsumer
        consumer = AIOKafkaConsumer(
            topic,
            bootstrap_servers=self.bootstrap_servers,
            group_id=group_id,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest'
        )
        await consumer.start()
        logger.info(f"Kafka Consumer for {topic} started (group: {group_id}).")
        try:
            async for msg in consumer:
                logger.info(f"Received event from {topic}: {msg.value}")
                await callback(msg.value)
        except Exception as e:
            logger.error(f"Error consuming events from {topic}: {e}")
        finally:
            await consumer.stop()
