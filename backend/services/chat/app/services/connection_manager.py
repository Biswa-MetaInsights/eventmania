from fastapi import WebSocket
from typing import List, Dict, Any, Set
import json
import redis.asyncio as redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Local active connections { room_id: { user_id: websocket } }
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.redis_client = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT)

    async def connect(self, room_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        
        self.active_connections[room_id][user_id] = websocket
        logger.info(f"User {user_id} connected to room {room_id}")

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_connections:
            if user_id in self.active_connections[room_id]:
                del self.active_connections[room_id][user_id]
        logger.info(f"User {user_id} disconnected from room {room_id}")

    async def broadcast_to_room(self, room_id: str, message: dict):
        """
        Broadcast to all active connections in a specific room ON THE LOCAL INSTANCE.
        """
        if room_id in self.active_connections:
            for user_id, websocket in self.active_connections[room_id].items():
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {user_id}: {e}")

    async def pubsub_publish(self, room_id: str, message: dict):
        """
        Publish to Redis so OTHER instances can see the message.
        """
        await self.redis_client.publish(f"room:{room_id}", json.dumps(message))

    async def pubsub_subscribe(self, room_id: str):
        """
        Subscribe to a Redis channel for a room and broadcast results locally.
        """
        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe(f"room:{room_id}")
        
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = json.loads(message['data'])
                await self.broadcast_to_room(room_id, data)

manager = ConnectionManager()
