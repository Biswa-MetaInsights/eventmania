from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.chat import ChatMessage, RoomParticipation
from app.schemas.chat_schemas import MessageIn, MessageOut
from app.services.connection_manager import manager
from uuid import UUID
import datetime
import logging
import asyncio

router = APIRouter(prefix="/chat", tags=["Real-time Chat"])

logger = logging.getLogger(__name__)

@router.websocket("/ws/{room_id}/{user_id}")
async def chat_websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str, db: Session = Depends(get_db)):
    """
    WebSocket for real-time room communication.
    Expected URI: ws://domain.com/chat/ws/event:uuidv4/uuidv4
    """
    await manager.connect(room_id, user_id, websocket)
    
    # 1. Start background task for Redis Pub/Sub subscription for this room
    # Check if a listener is already running (In production, use a single shared listener task)
    # asyncio.create_task(manager.pubsub_subscribe(room_id))

    try:
        while True:
            # Receive text data (JSON)
            data = await websocket.receive_json()
            
            # Use Pydantic to validate the input message
            msg_in = MessageIn(**data)
            
            # 2. Persist message to PostgreSQL history
            new_msg = ChatMessage(
                sender_id=user_id,
                room_id=room_id,
                content=msg_in.content,
                message_type=msg_in.message_type
            )
            # We don't use 'db' here directly as it's a generator from Depends across loops.
            # In a real WebSocket, you'd open/close a session or use a thread-safe connection pool.
            # For now, let's assume we handle persistence in a background task OR standard session logic.
            # db.add(new_msg)
            # db.commit()
            
            # 3. Broadcast to others (via Redis Pub/Sub for scalability)
            broadcast_msg = {
                "sender_id": str(user_id),
                "room_id": room_id,
                "content": msg_in.content,
                "message_type": msg_in.message_type,
                "timestamp": str(datetime.datetime.utcnow())
            }
            await manager.broadcast_to_room(room_id, broadcast_msg)
            await manager.pubsub_publish(room_id, broadcast_msg)

    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id)
        # Optional: Broadcast departure
        await manager.broadcast_to_room(room_id, {"system": f"User {user_id} left."})
    except Exception as e:
        logger.error(f"Error in chat websocket: {e}")
        manager.disconnect(room_id, user_id)

@router.get("/history/{room_id}", response_model=list[MessageOut])
def get_chat_history(room_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """
    Fetch historical messages for a room/event.
    """
    return db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.created_at.desc()).limit(limit).all()
