import logging
import asyncio
import os
import sys

# Ensure 'shared' and other local modules are discoverable
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))
if root_dir not in sys.path:
    sys.path.append(root_dir)

from shared.kafka_utils import KafkaManager
from app.agents.mosaic_crew import MosaicCrew

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agent.mosaic_worker")

# Configuration
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")

class MosaicWorker:
    def __init__(self):
        # Unique Client ID for the Agent Service
        self.kafka = KafkaManager(KAFKA_BOOTSTRAP, "data-mosaic-agent")

    async def start(self):
        await self.kafka.start()
        logger.info("🤖 Data Mosaic Worker Started - Listening for incoming events...")
        
        # Subscribe to 'event.created'
        await self.kafka.consume(
            topic="event.created",
            group_id="agent-service-group",
            callback=self.process_event
        )

    async def process_event(self, data: dict):
        event_id = data.get("id") or data.get("event_id")
        logger.info(f"🔄 Processing Event: {event_id}...")
        
        # 1. Initialize the Mosaic Crew
        crew = MosaicCrew(data)
        
        # 2. Kickoff the autonomous cycle (Non-blocking)
        try:
            # We run this in a thread or separate task since CrewAI is blocking.
            result = await asyncio.to_thread(crew.run)
            
            logger.info(f"✅ Mosaic Enrichment Complete for {event_id}")
            logger.info(f"✨ Enhanced Result: {result}")
            
            # 3. Publish back an 'event.moderated' event
            # In a real environment, This would trigger the Event Service to update the DB.
            await self.kafka.send("event.moderated", {
                "id": event_id,
                "status": "verified" if result.get("is_safe", True) else "rejected",
                "mosaic": result.get("topic_mosaic", []),
                "marketing_blurb": result.get("marketing_blurb")
            })
            
        except Exception as e:
            logger.error(f"❌ Mosaic Processing Failed for {event_id}: {e}")

async def main():
    worker = MosaicWorker()
    await worker.start()
    
    # Keep the worker alive
    while True:
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
