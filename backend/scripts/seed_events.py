import requests
import random
from datetime import datetime, timedelta

API_BASE = "http://localhost:8000/event/"

print("🌱 Seeding Database with Fake Events...")

fake_events = [
    {
        "title": "Global AI Summit 2026",
        "description": "Join the world's leading researchers to discuss the future of AGI and agentic architectures.",
        "category": "Technology",
        "start_date": (datetime.utcnow() + timedelta(days=10)).isoformat() + "Z",
        "end_date": (datetime.utcnow() + timedelta(days=12)).isoformat() + "Z",
        "location": {"name": "San Francisco Convention Center", "latitude": 37.7749, "longitude": -122.4194},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 299.99,
        "capacity": 500,
        "status": "published"
    },
    {
        "title": "Indie Game Dev Hackathon",
        "description": "A 48-hour hackathon for indie game developers. Build a game from scratch and win prizes!",
        "category": "Gaming",
        "start_date": (datetime.utcnow() + timedelta(days=5)).isoformat() + "Z",
        "end_date": (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z",
        "location": {"name": "Online Discord Server", "latitude": 40.7128, "longitude": -74.0060},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 1000,
        "status": "published"
    },
    {
        "title": "Flutter Web Masterclass",
        "description": "Learn how to build production-grade web applications using Flutter and Riverpod.",
        "category": "Education",
        "start_date": (datetime.utcnow() + timedelta(days=20)).isoformat() + "Z",
        "end_date": (datetime.utcnow() + timedelta(days=21)).isoformat() + "Z",
        "location": {"name": "Tech Hub London", "latitude": 51.5074, "longitude": -0.1278},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 49.99,
        "capacity": 200,
        "status": "published"
    }
]

success_count = 0
for event in fake_events:
    try:
        response = requests.post(API_BASE, json=event)
        if response.status_code == 201:
            print(f"✅ Created: {event['title']}")
            success_count += 1
        else:
            print(f"❌ Failed to create {event['title']}: {response.text}")
    except Exception as e:
        print(f"❌ Error connecting to API: {e}")

print(f"\n🎉 Done! Successfully seeded {success_count} events.")
