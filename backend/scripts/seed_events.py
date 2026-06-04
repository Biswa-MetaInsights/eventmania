import sqlite3
import os
import requests
from datetime import datetime, timedelta

API_BASE = "http://localhost:8000"

# ── Reset: wipe existing seed data before inserting ───────────────────────────
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "platform_dev.db"))

if os.path.exists(DB_PATH):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM events")
    conn.execute("DELETE FROM communities")
    conn.commit()
    conn.close()
    print(f"🗑️  Cleared existing events and communities from {os.path.basename(DB_PATH)}")
else:
    print("⚠️  Database not found — it will be created when the backend starts.")

print("🌱 Seeding EventMind database...")

now = datetime.utcnow()

# ── Offline events (shown in "Events in Thiruvananthapuram" carousel) ──────────
offline_events = [
    {
        "title": "Indie Music Night — Live at Kovalam Beach",
        "description": "An evening of live indie music on the shores of Kovalam. Local and national acts perform under the stars.",
        "category": "music",
        "start_date": (now + timedelta(days=10, hours=19)).isoformat() + "Z",
        "end_date": (now + timedelta(days=10, hours=22)).isoformat() + "Z",
        "location": {"name": "Kovalam Beach Amphitheatre", "latitude": 8.3988, "longitude": 76.9822},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 499.0,
        "capacity": 300,
        "status": "published",
    },
    {
        "title": "Kerala Street Food Festival 2026",
        "description": "Celebrate the rich culinary heritage of Kerala with 40+ food stalls, cooking demos, and cultural performances.",
        "category": "food",
        "start_date": (now + timedelta(days=11, hours=11)).isoformat() + "Z",
        "end_date": (now + timedelta(days=11, hours=20)).isoformat() + "Z",
        "location": {"name": "Central Stadium Grounds, Palayam", "latitude": 8.5095, "longitude": 76.9618},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 2000,
        "status": "published",
    },
    {
        "title": "Morning Yoga & Meditation at Shanghumugham",
        "description": "Start your day with a guided yoga and meditation session on Shanghumugham Beach. All levels welcome.",
        "category": "wellness",
        "start_date": (now + timedelta(days=7, hours=6, minutes=30)).isoformat() + "Z",
        "end_date": (now + timedelta(days=7, hours=8)).isoformat() + "Z",
        "location": {"name": "Shanghumugham Beach", "latitude": 8.4775, "longitude": 76.9487},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 100,
        "status": "published",
    },
    {
        "title": "TechTVM — AI & Future of Work Summit",
        "description": "Kerala's biggest tech summit. Talks, panels, and workshops on AI, automation, and the future workplace.",
        "category": "tech",
        "start_date": (now + timedelta(days=14, hours=10)).isoformat() + "Z",
        "end_date": (now + timedelta(days=14, hours=18)).isoformat() + "Z",
        "location": {"name": "Technopark Convention Centre, Kazhakuttam", "latitude": 8.5578, "longitude": 76.8798},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 500,
        "status": "published",
    },
    {
        "title": "Standup Comedy Showcase ft. Rahul Subramanian",
        "description": "An evening of laughter with one of India's top standups. Limited seats — book fast!",
        "category": "comedy",
        "start_date": (now + timedelta(days=8, hours=20)).isoformat() + "Z",
        "end_date": (now + timedelta(days=8, hours=22, minutes=30)).isoformat() + "Z",
        "location": {"name": "Casino Hotel, Wellington Island, Kochi", "latitude": 9.9628, "longitude": 76.2595},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 799.0,
        "capacity": 400,
        "status": "published",
    },
    {
        "title": "Contemporary Art Walk — Kashi Gallery Fort Kochi",
        "description": "A curated walk through Fort Kochi's vibrant contemporary art scene, led by local art historians.",
        "category": "arts",
        "start_date": (now + timedelta(days=12, hours=17)).isoformat() + "Z",
        "end_date": (now + timedelta(days=12, hours=20)).isoformat() + "Z",
        "location": {"name": "Kashi Art Gallery, Fort Kochi", "latitude": 9.9632, "longitude": 76.2399},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 200.0,
        "capacity": 50,
        "status": "published",
    },
    {
        "title": "Thiruvananthapuram Food Truck Meetup",
        "description": "12 food trucks, live music, and a great crowd. Bring the family for a relaxed Sunday afternoon.",
        "category": "food",
        "start_date": (now + timedelta(days=13, hours=12)).isoformat() + "Z",
        "end_date": (now + timedelta(days=13, hours=20)).isoformat() + "Z",
        "location": {"name": "Technopark Phase I Gate, Trivandrum", "latitude": 8.5511, "longitude": 76.8783},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 1000,
        "status": "published",
    },
    {
        "title": "Carnatic Music Evening — Sangeetha Sabha",
        "description": "A classical Carnatic concert at the iconic Tagore Theatre, featuring senior artistes from Kerala.",
        "category": "music",
        "start_date": (now + timedelta(days=9, hours=17, minutes=30)).isoformat() + "Z",
        "end_date": (now + timedelta(days=9, hours=20)).isoformat() + "Z",
        "location": {"name": "Tagore Theatre, Trivandrum", "latitude": 8.5007, "longitude": 76.9579},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 600,
        "status": "published",
    },
]

# ── Online events (category must be exactly "online" for carousel filter) ──────
online_events = [
    {
        "title": "UX Design Fundamentals — Live Workshop",
        "description": "Master the fundamentals of user experience design in this live, interactive online workshop.",
        "category": "online",
        "start_date": (now + timedelta(days=6, hours=14)).isoformat() + "Z",
        "end_date": (now + timedelta(days=6, hours=17)).isoformat() + "Z",
        "location": {"name": "Online (Zoom)", "latitude": 0, "longitude": 0},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 399.0,
        "capacity": 200,
        "status": "published",
    },
    {
        "title": "Python for Data Science — Weekend Bootcamp",
        "description": "A free two-day bootcamp covering Python essentials, pandas, and machine learning basics.",
        "category": "online",
        "start_date": (now + timedelta(days=5, hours=9)).isoformat() + "Z",
        "end_date": (now + timedelta(days=6, hours=17)).isoformat() + "Z",
        "location": {"name": "Online (Google Meet)", "latitude": 0, "longitude": 0},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 500,
        "status": "published",
    },
    {
        "title": "Startup Pitch Night — Virtual Demo Day",
        "description": "Watch Kerala's most promising startups pitch to a panel of VCs and angel investors. Free to attend.",
        "category": "online",
        "start_date": (now + timedelta(days=4, hours=19)).isoformat() + "Z",
        "end_date": (now + timedelta(days=4, hours=21, minutes=30)).isoformat() + "Z",
        "location": {"name": "Online (YouTube Live)", "latitude": 0, "longitude": 0},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 5000,
        "status": "published",
    },
    {
        "title": "React & Next.js Advanced Patterns",
        "description": "A deep dive into server components, streaming, and advanced caching in Next.js App Router.",
        "category": "online",
        "start_date": (now + timedelta(days=8, hours=17)).isoformat() + "Z",
        "end_date": (now + timedelta(days=8, hours=20)).isoformat() + "Z",
        "location": {"name": "Online (Discord Stage)", "latitude": 0, "longitude": 0},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 599.0,
        "capacity": 150,
        "status": "published",
    },
    {
        "title": "Mindful Living — Mental Wellness Webinar",
        "description": "A free 90-minute webinar on mindfulness, stress reduction, and building healthy daily habits.",
        "category": "online",
        "start_date": (now + timedelta(days=3, hours=11)).isoformat() + "Z",
        "end_date": (now + timedelta(days=3, hours=12, minutes=30)).isoformat() + "Z",
        "location": {"name": "Online (Zoom)", "latitude": 0, "longitude": 0},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 1000,
        "status": "published",
    },
    {
        "title": "Entrepreneurship 101 — Free Webinar for Students",
        "description": "Everything a student needs to know about building a startup: ideation, validation, and funding basics.",
        "category": "online",
        "start_date": (now + timedelta(days=15, hours=18)).isoformat() + "Z",
        "end_date": (now + timedelta(days=15, hours=19, minutes=30)).isoformat() + "Z",
        "location": {"name": "Online (Zoom)", "latitude": 0, "longitude": 0},
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "price": 0.0,
        "capacity": 2000,
        "status": "published",
    },
]

# ── Offline communities (shown in "Communities in Thiruvananthapuram") ──────────
# category must NOT be "online" to appear in the offline section
offline_communities = [
    {
        "name": "ReactKerala — Frontend Developers Meetup",
        "description": "Monthly meetups for frontend developers in Kerala. Talks, workshops, and networking.",
        "category": "tech",
        "location": {"name": "Technopark Phase I, Trivandrum", "latitude": 8.5511, "longitude": 76.8783},
        "next_event_date": (now + timedelta(days=10, hours=17)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 2300,
        "price": 0.0,
        "status": "active",
    },
    {
        "name": "TVM Photography Club — Weekend Shoots",
        "description": "A community of photography enthusiasts exploring Trivandrum through their lenses.",
        "category": "arts",
        "location": {"name": "Shanghumugham Beach, Trivandrum", "latitude": 8.4775, "longitude": 76.9487},
        "next_event_date": (now + timedelta(days=7, hours=6, minutes=30)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 870,
        "price": 199.0,
        "status": "active",
    },
    {
        "name": "Kerala Running Club — Sunday Long Run",
        "description": "We run every Sunday morning. All paces welcome. Come for the run, stay for the chai.",
        "category": "sports",
        "location": {"name": "Vellayambalam Ground, Trivandrum", "latitude": 8.5095, "longitude": 76.9559},
        "next_event_date": (now + timedelta(days=5, hours=5, minutes=30)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 1100,
        "price": 0.0,
        "status": "active",
    },
    {
        "name": "Trivandrum Foodies — Street Food Walks",
        "description": "Guided street food walks through the lanes of East Fort, Chalai, and beyond.",
        "category": "food",
        "location": {"name": "East Fort, Trivandrum", "latitude": 8.4870, "longitude": 76.9518},
        "next_event_date": (now + timedelta(days=9, hours=19)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 3800,
        "price": 0.0,
        "status": "active",
    },
    {
        "name": "Kerala Blockchain & Web3 Network",
        "description": "Building the Web3 ecosystem in Kerala. Monthly talks, hackathons, and investor connects.",
        "category": "tech",
        "location": {"name": "IIM Kozhikode TVM Campus", "latitude": 8.5205, "longitude": 76.9341},
        "next_event_date": (now + timedelta(days=6, hours=19)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 540,
        "price": 499.0,
        "status": "active",
    },
    {
        "name": "Trivandrum Book Club — Monthly Reads",
        "description": "We read one book a month and meet to discuss it. Fiction, non-fiction, and everything between.",
        "category": "arts",
        "location": {"name": "British Library, Trivandrum", "latitude": 8.5033, "longitude": 76.9560},
        "next_event_date": (now + timedelta(days=14, hours=16)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 620,
        "price": 0.0,
        "status": "active",
    },
    {
        "name": "CrossFit TVM — Open Box Saturday",
        "description": "Open box sessions every Saturday morning. Beginners and advanced athletes both welcome.",
        "category": "sports",
        "location": {"name": "Pettah, Trivandrum", "latitude": 8.5198, "longitude": 76.9283},
        "next_event_date": (now + timedelta(days=5, hours=7)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 310,
        "price": 799.0,
        "status": "active",
    },
    {
        "name": "Kerala Startup Founders Network",
        "description": "A peer network for founders building startups in Kerala. Monthly dinners and investor meetups.",
        "category": "tech",
        "location": {"name": "Kerala Startup Mission HQ, Kazhakuttam", "latitude": 8.5578, "longitude": 76.8798},
        "next_event_date": (now + timedelta(days=11, hours=10)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 4200,
        "price": 0.0,
        "status": "active",
    },
    {
        "name": "TVM Cyclists Guild — Early Morning Rides",
        "description": "Cycling routes around Trivandrum every Sunday at 5 AM. Helmet mandatory, no fitness bar.",
        "category": "sports",
        "location": {"name": "Kanakakunnu Palace, Trivandrum", "latitude": 8.5033, "longitude": 76.9524},
        "next_event_date": (now + timedelta(days=5, hours=5)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 780,
        "price": 0.0,
        "status": "active",
    },
    {
        "name": "Carnatic Musicians Collective Kerala",
        "description": "A space for Carnatic musicians to collaborate, perform, and learn together.",
        "category": "arts",
        "location": {"name": "Tagore Theatre, Trivandrum", "latitude": 8.5007, "longitude": 76.9579},
        "next_event_date": (now + timedelta(days=8, hours=17)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 1500,
        "price": 0.0,
        "status": "active",
    },
]

# ── Online communities (category must be exactly "online") ────────────────────
online_communities = [
    {
        "name": "Kerala Python & Data Science Community",
        "description": "Weekly study groups, paper readings, and live coding sessions on Discord.",
        "category": "online",
        "location": {"name": "Online (Discord)", "latitude": 0, "longitude": 0},
        "next_event_date": (now + timedelta(days=6, hours=19)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 6100,
        "price": 0.0,
        "status": "active",
    },
    {
        "name": "Kerala Indie Game Developers",
        "description": "Monthly game jams, portfolio reviews, and collaboration on indie projects.",
        "category": "online",
        "location": {"name": "Online (Discord)", "latitude": 0, "longitude": 0},
        "next_event_date": (now + timedelta(days=11, hours=20)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 2900,
        "price": 0.0,
        "status": "active",
    },
    {
        "name": "Malayalam Creative Writers Circle",
        "description": "Share your writing, get feedback, and meet fellow writers every week on Zoom.",
        "category": "online",
        "location": {"name": "Online (Zoom)", "latitude": 0, "longitude": 0},
        "next_event_date": (now + timedelta(days=8, hours=18)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 1400,
        "price": 0.0,
        "status": "active",
    },
    {
        "name": "South Indian Food Science & Culture Network",
        "description": "Live sessions on fermentation, spice science, and traditional South Indian cooking.",
        "category": "online",
        "location": {"name": "Online (Google Meet)", "latitude": 0, "longitude": 0},
        "next_event_date": (now + timedelta(days=13, hours=16)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 980,
        "price": 299.0,
        "status": "active",
    },
    {
        "name": "Kerala UX & Product Design Guild",
        "description": "Design critiques, portfolio roasts, and career advice for UX designers in Kerala.",
        "category": "online",
        "location": {"name": "Online (Figma Community)", "latitude": 0, "longitude": 0},
        "next_event_date": (now + timedelta(days=9, hours=17)).isoformat() + "Z",
        "organizer_id": "00000000-0000-0000-0000-000000000001",
        "member_count": 3300,
        "price": 0.0,
        "status": "active",
    },
]

# ── Seed helper ────────────────────────────────────────────────────────────────

def seed_section(label, items, endpoint):
    print(f"\n{'─' * 52}")
    print(f"  {label}")
    print(f"{'─' * 52}")
    success = 0
    for item in items:
        title = item.get("title") or item.get("name", "?")
        try:
            r = requests.post(endpoint, json=item, timeout=10)
            if r.status_code == 201:
                print(f"  ✅ {title}")
                success += 1
            else:
                print(f"  ❌ {title}: HTTP {r.status_code} — {r.text[:120]}")
        except Exception as e:
            print(f"  ❌ {title}: {e}")
    print(f"  → {success}/{len(items)} seeded")
    return success


# ── Run ────────────────────────────────────────────────────────────────────────

total = 0
total += seed_section("Offline events (8)", offline_events, f"{API_BASE}/event/")
total += seed_section("Online events (6)", online_events, f"{API_BASE}/event/")
total += seed_section("Offline communities (10)", offline_communities, f"{API_BASE}/community/")
total += seed_section("Online communities (5)", online_communities, f"{API_BASE}/community/")

print(f"\n🎉 Done! Seeded {total} records total.")
