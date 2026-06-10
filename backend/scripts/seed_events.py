import sqlite3
import os
import requests
from datetime import datetime, timedelta

EVENT_API = "http://localhost:8000/event/"
COMMUNITY_API = "http://localhost:8000/community/"
ORGANIZER_ID = "00000000-0000-0000-0000-000000000001"

def d(days, hours=0):
    return (datetime.utcnow() + timedelta(days=days, hours=hours)).isoformat() + "Z"

# ── Reset: wipe existing seed data before inserting ───────────────────────────
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "platform_dev.db"))

if os.path.exists(DB_PATH):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM events")
    conn.execute("DELETE FROM communities")
    conn.commit()
    conn.close()
    print(f"Cleared existing events and communities from {os.path.basename(DB_PATH)}")
else:
    print("Database not found — it will be created when the backend starts.")

# ── City coordinate clusters ──────────────────────────────────────────────────
NYC = [
    {"name": "Midtown Manhattan, New York",    "latitude": 40.7549,  "longitude": -73.9840},
    {"name": "Brooklyn Tech Triangle, NY",      "latitude": 40.6892,  "longitude": -73.9442},
    {"name": "Lower East Side, New York",       "latitude": 40.7157,  "longitude": -73.9863},
    {"name": "Williamsburg, Brooklyn NY",       "latitude": 40.7081,  "longitude": -73.9571},
    {"name": "Chelsea, Manhattan NY",           "latitude": 40.7465,  "longitude": -74.0014},
    {"name": "Flatiron District, New York",     "latitude": 40.7411,  "longitude": -73.9897},
    {"name": "SoHo, New York",                  "latitude": 40.7233,  "longitude": -74.0030},
    {"name": "Harlem, New York",                "latitude": 40.8116,  "longitude": -73.9465},
    {"name": "Astoria, Queens NY",              "latitude": 40.7721,  "longitude": -73.9301},
]

LON = [
    {"name": "Shoreditch, London",              "latitude": 51.5245,  "longitude": -0.0784},
    {"name": "Canary Wharf, London",            "latitude": 51.5054,  "longitude": -0.0235},
    {"name": "Camden, London",                  "latitude": 51.5390,  "longitude": -0.1426},
    {"name": "Brixton, London",                 "latitude": 51.4613,  "longitude": -0.1156},
    {"name": "Kings Cross, London",             "latitude": 51.5308,  "longitude": -0.1238},
    {"name": "South Bank, London",              "latitude": 51.5055,  "longitude": -0.1132},
]

SF = [
    {"name": "SoMa, San Francisco",             "latitude": 37.7785,  "longitude": -122.4056},
    {"name": "Mission District, San Francisco", "latitude": 37.7599,  "longitude": -122.4148},
    {"name": "Hayes Valley, San Francisco",     "latitude": 37.7759,  "longitude": -122.4245},
]

BER = [
    {"name": "Mitte, Berlin",                   "latitude": 52.5200,  "longitude": 13.4050},
    {"name": "Kreuzberg, Berlin",               "latitude": 52.4987,  "longitude": 13.4070},
    {"name": "Prenzlauer Berg, Berlin",         "latitude": 52.5370,  "longitude": 13.4214},
]

AMS = [
    {"name": "Jordaan, Amsterdam",              "latitude": 52.3750,  "longitude": 4.8833},
    {"name": "De Pijp, Amsterdam",              "latitude": 52.3545,  "longitude": 4.8952},
]

BRU = [
    {"name": "Ixelles, Brussels",               "latitude": 50.8282,  "longitude": 4.3699},
    {"name": "Molenbeek, Brussels",             "latitude": 50.8534,  "longitude": 4.3345},
]

TVM = [
    {"name": "Kovalam Beach Amphitheatre",      "latitude": 8.3988,   "longitude": 76.9822},
    {"name": "Central Stadium Grounds, Palayam","latitude": 8.5095,   "longitude": 76.9618},
    {"name": "Shanghumugham Beach",             "latitude": 8.4775,   "longitude": 76.9487},
    {"name": "Technopark Convention Centre",    "latitude": 8.5578,   "longitude": 76.8798},
    {"name": "Tagore Theatre, Trivandrum",      "latitude": 8.5007,   "longitude": 76.9579},
]

ONLINE = {"name": "Online / Virtual", "latitude": 0, "longitude": 0}

# ── Events ────────────────────────────────────────────────────────────────────
events = [
    # ── NEW YORK ──
    {"title": "NYC Python Meetup — AI Libraries Showcase",
     "description": "Monthly meetup for Python developers. LangChain, CrewAI, and llama-index demos. Pizza provided.",
     "category": "Technology", "location": NYC[0], "price": 0, "capacity": 80,
     "start_date": d(3), "end_date": d(3, 3)},

    {"title": "Startup Pitch Night — FinTech Edition",
     "description": "6 early-stage FinTech founders pitch to a panel of NYC investors. Free for attendees. Networking drinks after.",
     "category": "Business", "location": NYC[5], "price": 0, "capacity": 120,
     "start_date": d(5), "end_date": d(5, 3)},

    {"title": "Product Design Workshop: Figma to Code",
     "description": "Hands-on workshop covering modern design-to-code workflows using Figma, Tailwind, and shadcn/ui.",
     "category": "Creative", "location": NYC[4], "price": 35, "capacity": 30,
     "start_date": d(7), "end_date": d(7, 4)},

    {"title": "Women in Tech NYC — June Networking Brunch",
     "description": "Monthly brunch for women and non-binary folks working in tech. Guest speaker from Google on inclusive hiring.",
     "category": "Networking", "location": NYC[6], "price": 15, "capacity": 60,
     "start_date": d(9), "end_date": d(9, 3)},

    {"title": "Brooklyn Founders Dinner",
     "description": "An intimate dinner for 40 founders and operators in Brooklyn. No pitching allowed.",
     "category": "Networking", "location": NYC[1], "price": 45, "capacity": 40,
     "start_date": d(11), "end_date": d(11, 3)},

    {"title": "No-Code Builders NYC Meetup",
     "description": "Show off what you built with Webflow, Bubble, and Glide. Beginner friendly.",
     "category": "Technology", "location": NYC[2], "price": 0, "capacity": 70,
     "start_date": d(4), "end_date": d(4, 2)},

    {"title": "Harlem Art & Tech Mixer",
     "description": "Where Harlem's creative and tech communities collide. Live music, portfolio showcases.",
     "category": "Creative", "location": NYC[7], "price": 0, "capacity": 150,
     "start_date": d(6), "end_date": d(6, 4)},

    {"title": "Queens Entrepreneurs Morning Meetup",
     "description": "Early morning coffee meetup for small business owners in Queens.",
     "category": "Business", "location": NYC[8], "price": 0, "capacity": 40,
     "start_date": d(2), "end_date": d(2, 2)},

    {"title": "Impact Investing Summit New York 2026",
     "description": "Full-day summit on ESG, climate tech investing, and social enterprise funding.",
     "category": "Business", "location": NYC[0], "price": 199, "capacity": 300,
     "start_date": d(22), "end_date": d(23)},

    {"title": "Soho Photography Walk & Workshop",
     "description": "Street photography walk through SoHo with a professional photographer.",
     "category": "Creative", "location": NYC[6], "price": 40, "capacity": 15,
     "start_date": d(10), "end_date": d(10, 4)},

    # ── LONDON ──
    {"title": "London JavaScript Meetup — Signals & Reactivity Deep Dive",
     "description": "How Angular, Solid, and Vue all landed on Signals independently. Live coding session.",
     "category": "Technology", "location": LON[0], "price": 0, "capacity": 100,
     "start_date": d(4), "end_date": d(4, 3)},

    {"title": "FinTech Founders Breakfast — Canary Wharf",
     "description": "Monthly working breakfast for FinTech founders and investors. Roundtable format, 20 seats only.",
     "category": "Business", "location": LON[1], "price": 30, "capacity": 20,
     "start_date": d(6), "end_date": d(6, 2)},

    {"title": "Camden Indie Makers Market",
     "description": "Saturday market for independent makers, crafters, and small-batch product brands. 60 stalls.",
     "category": "Creative", "location": LON[2], "price": 0, "capacity": 500,
     "start_date": d(5), "end_date": d(5, 8)},

    {"title": "London GenAI Engineering Meetup",
     "description": "Practical talks on production LLM apps — RAG architectures, eval frameworks, cost monitoring.",
     "category": "Technology", "location": LON[0], "price": 0, "capacity": 150,
     "start_date": d(9), "end_date": d(9, 3)},

    {"title": "Brixton Community Supper Club",
     "description": "Monthly communal dinner celebrating Brixton's food culture. £20 includes 3 courses.",
     "category": "Networking", "location": LON[3], "price": 20, "capacity": 45,
     "start_date": d(15), "end_date": d(15, 3)},

    # ── SAN FRANCISCO ──
    {"title": "SF AI Founders Dinner — Summer Series",
     "description": "Intimate dinner for 30 AI founders and researchers. Curated seating, structured conversations.",
     "category": "Business", "location": SF[0], "price": 0, "capacity": 30,
     "start_date": d(7), "end_date": d(7, 3)},

    {"title": "Mission District Hackathon: Climate Tech",
     "description": "48-hour hackathon focused on carbon capture, grid optimisation, and sustainable supply chains. $10K in prizes.",
     "category": "Technology", "location": SF[1], "price": 0, "capacity": 200,
     "start_date": d(13), "end_date": d(15)},

    {"title": "Hayes Valley Pop-Up Art Show",
     "description": "Emerging Bay Area artists show new work. Opening night reception with wine and live music.",
     "category": "Creative", "location": SF[2], "price": 0, "capacity": 120,
     "start_date": d(8), "end_date": d(8, 4)},

    # ── BERLIN ──
    {"title": "Berlin Startup Ecosystem Mixer — Mitte",
     "description": "Quarterly mixer for the Berlin startup scene. VCs, founders, operators. Free bar first 90 minutes.",
     "category": "Networking", "location": BER[0], "price": 0, "capacity": 200,
     "start_date": d(6), "end_date": d(6, 4)},

    {"title": "Kreuzberg UX Research Workshop",
     "description": "Full-day practical workshop on user interviews, affinity mapping, and insight synthesis. 16 max.",
     "category": "Creative", "location": BER[1], "price": 79, "capacity": 16,
     "start_date": d(14), "end_date": d(14, 8)},

    {"title": "Berlin Blockchain & Web3 Meetup",
     "description": "Monthly meetup for Web3 builders. ZK proofs in plain English, and a live smart contract audit.",
     "category": "Technology", "location": BER[2], "price": 0, "capacity": 90,
     "start_date": d(10), "end_date": d(10, 3)},

    # ── AMSTERDAM ──
    {"title": "Amsterdam Sustainability Networking Lunch",
     "description": "Monthly lunch for professionals in sustainability, circular economy, and climate policy.",
     "category": "Networking", "location": AMS[0], "price": 25, "capacity": 30,
     "start_date": d(8), "end_date": d(8, 2)},

    {"title": "Dutch Founders Demo Day — June 2026",
     "description": "10 early-stage Dutch startups present to investors and the public. Drinks and bites after.",
     "category": "Business", "location": AMS[1], "price": 0, "capacity": 150,
     "start_date": d(18), "end_date": d(18, 4)},

    # ── BRUSSELS ──
    {"title": "Brussels EU Policy & Tech Breakfast",
     "description": "Monthly breakfast discussion on EU AI Act, Digital Markets Act, and product teams.",
     "category": "Business", "location": BRU[0], "price": 20, "capacity": 40,
     "start_date": d(7), "end_date": d(7, 2)},

    {"title": "Molenbeek Community Street Festival",
     "description": "Free neighbourhood festival with food stalls, live music, and local artisan market.",
     "category": "Creative", "location": BRU[1], "price": 0, "capacity": 1000,
     "start_date": d(12), "end_date": d(12, 10)},

    # ── THIRUVANANTHAPURAM ──
    {"title": "Indie Music Night — Live at Kovalam Beach",
     "description": "An evening of live indie music on the shores of Kovalam. Local and national acts perform under the stars.",
     "category": "music", "location": TVM[0], "price": 499, "capacity": 300,
     "start_date": d(10, 19), "end_date": d(10, 22)},

    {"title": "Kerala Street Food Festival 2026",
     "description": "Celebrate the rich culinary heritage of Kerala with 40+ food stalls, cooking demos, and cultural performances.",
     "category": "food", "location": TVM[1], "price": 0, "capacity": 2000,
     "start_date": d(11, 11), "end_date": d(11, 20)},

    {"title": "TechTVM — AI & Future of Work Summit",
     "description": "Kerala's biggest tech summit. Talks, panels, and workshops on AI, automation, and the future workplace.",
     "category": "tech", "location": TVM[3], "price": 0, "capacity": 500,
     "start_date": d(14, 10), "end_date": d(14, 18)},

    {"title": "Morning Yoga & Meditation at Shanghumugham",
     "description": "Start your day with a guided yoga and meditation session on Shanghumugham Beach. All levels welcome.",
     "category": "wellness", "location": TVM[2], "price": 0, "capacity": 100,
     "start_date": d(7, 6), "end_date": d(7, 8)},

    # ── ONLINE ──
    {"title": "Live Coding: Build a RAG App in 60 Minutes",
     "description": "Build a retrieval-augmented generation app using LangChain, Pinecone, and FastAPI.",
     "category": "online", "location": ONLINE, "price": 0, "capacity": 500,
     "start_date": d(3), "end_date": d(3, 2)},

    {"title": "Remote Engineering Leaders — Monthly Roundtable",
     "description": "Virtual roundtable for engineering managers and CTOs on remote culture and async workflows.",
     "category": "online", "location": ONLINE, "price": 0, "capacity": 200,
     "start_date": d(4), "end_date": d(4, 2)},

    {"title": "Intro to Generative AI — No Code Required",
     "description": "Beginner-friendly walkthrough of how LLMs work and how to use them in your work.",
     "category": "online", "location": ONLINE, "price": 0, "capacity": 500,
     "start_date": d(1), "end_date": d(1, 2)},

    {"title": "React & Next.js Advanced Patterns",
     "description": "A deep dive into server components, streaming, and advanced caching in Next.js App Router.",
     "category": "online", "location": ONLINE, "price": 599, "capacity": 150,
     "start_date": d(8, 17), "end_date": d(8, 20)},

    {"title": "Python for Data Science — Weekend Bootcamp",
     "description": "A free two-day bootcamp covering Python essentials, pandas, and machine learning basics.",
     "category": "online", "location": ONLINE, "price": 0, "capacity": 500,
     "start_date": d(5, 9), "end_date": d(6, 17)},

    {"title": "UX Design Fundamentals — Live Workshop",
     "description": "Master the fundamentals of user experience design in this live, interactive online workshop.",
     "category": "online", "location": ONLINE, "price": 399, "capacity": 200,
     "start_date": d(6, 14), "end_date": d(6, 17)},
]

# ── Communities ───────────────────────────────────────────────────────────────
now = datetime.utcnow()

offline_communities = [
    {
        "name": "ReactKerala — Frontend Developers Meetup",
        "description": "Monthly meetups for frontend developers in Kerala. Talks, workshops, and networking.",
        "category": "tech",
        "location": {"name": "Technopark Phase I, Trivandrum", "latitude": 8.5511, "longitude": 76.8783},
        "next_event_date": (now + timedelta(days=10, hours=17)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 2300, "price": 0.0, "status": "active",
    },
    {
        "name": "TVM Photography Club — Weekend Shoots",
        "description": "A community of photography enthusiasts exploring Trivandrum through their lenses.",
        "category": "arts",
        "location": {"name": "Shanghumugham Beach, Trivandrum", "latitude": 8.4775, "longitude": 76.9487},
        "next_event_date": (now + timedelta(days=7, hours=6)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 870, "price": 199.0, "status": "active",
    },
    {
        "name": "Kerala Running Club — Sunday Long Run",
        "description": "We run every Sunday morning. All paces welcome. Come for the run, stay for the chai.",
        "category": "sports",
        "location": {"name": "Vellayambalam Ground, Trivandrum", "latitude": 8.5095, "longitude": 76.9559},
        "next_event_date": (now + timedelta(days=5, hours=5)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 1100, "price": 0.0, "status": "active",
    },
    {
        "name": "Trivandrum Foodies — Street Food Walks",
        "description": "Guided street food walks through the lanes of East Fort, Chalai, and beyond.",
        "category": "food",
        "location": {"name": "East Fort, Trivandrum", "latitude": 8.4870, "longitude": 76.9518},
        "next_event_date": (now + timedelta(days=9, hours=19)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 3800, "price": 0.0, "status": "active",
    },
    {
        "name": "Kerala Blockchain & Web3 Network",
        "description": "Building the Web3 ecosystem in Kerala. Monthly talks, hackathons, and investor connects.",
        "category": "tech",
        "location": {"name": "IIM Kozhikode TVM Campus", "latitude": 8.5205, "longitude": 76.9341},
        "next_event_date": (now + timedelta(days=6, hours=19)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 540, "price": 499.0, "status": "active",
    },
    {
        "name": "Trivandrum Book Club — Monthly Reads",
        "description": "We read one book a month and meet to discuss it. Fiction, non-fiction, and everything between.",
        "category": "arts",
        "location": {"name": "British Library, Trivandrum", "latitude": 8.5033, "longitude": 76.9560},
        "next_event_date": (now + timedelta(days=14, hours=16)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 620, "price": 0.0, "status": "active",
    },
    {
        "name": "Kerala Startup Founders Network",
        "description": "A peer network for founders building startups in Kerala. Monthly dinners and investor meetups.",
        "category": "tech",
        "location": {"name": "Kerala Startup Mission HQ, Kazhakuttam", "latitude": 8.5578, "longitude": 76.8798},
        "next_event_date": (now + timedelta(days=11, hours=10)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 4200, "price": 0.0, "status": "active",
    },
    {
        "name": "TVM Cyclists Guild — Early Morning Rides",
        "description": "Cycling routes around Trivandrum every Sunday at 5 AM. Helmet mandatory, no fitness bar.",
        "category": "sports",
        "location": {"name": "Kanakakunnu Palace, Trivandrum", "latitude": 8.5033, "longitude": 76.9524},
        "next_event_date": (now + timedelta(days=5, hours=5)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 780, "price": 0.0, "status": "active",
    },
    {
        "name": "Carnatic Musicians Collective Kerala",
        "description": "A space for Carnatic musicians to collaborate, perform, and learn together.",
        "category": "arts",
        "location": {"name": "Tagore Theatre, Trivandrum", "latitude": 8.5007, "longitude": 76.9579},
        "next_event_date": (now + timedelta(days=8, hours=17)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 1500, "price": 0.0, "status": "active",
    },
]

online_communities = [
    {
        "name": "Kerala Python & Data Science Community",
        "description": "Weekly study groups, paper readings, and live coding sessions on Discord.",
        "category": "online",
        "location": {"name": "Online (Discord)", "latitude": 0, "longitude": 0},
        "next_event_date": (now + timedelta(days=6, hours=19)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 6100, "price": 0.0, "status": "active",
    },
    {
        "name": "Kerala Indie Game Developers",
        "description": "Monthly game jams, portfolio reviews, and collaboration on indie projects.",
        "category": "online",
        "location": {"name": "Online (Discord)", "latitude": 0, "longitude": 0},
        "next_event_date": (now + timedelta(days=11, hours=20)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 2900, "price": 0.0, "status": "active",
    },
    {
        "name": "Malayalam Creative Writers Circle",
        "description": "Share your writing, get feedback, and meet fellow writers every week on Zoom.",
        "category": "online",
        "location": {"name": "Online (Zoom)", "latitude": 0, "longitude": 0},
        "next_event_date": (now + timedelta(days=8, hours=18)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 1400, "price": 0.0, "status": "active",
    },
    {
        "name": "Kerala UX & Product Design Guild",
        "description": "Design critiques, portfolio roasts, and career advice for UX designers in Kerala.",
        "category": "online",
        "location": {"name": "Online (Figma Community)", "latitude": 0, "longitude": 0},
        "next_event_date": (now + timedelta(days=9, hours=17)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 3300, "price": 0.0, "status": "active",
    },
]

# Tag the offline Kerala communities with their city so city-based filtering works.
# Online communities are intentionally left city-less — they are location-independent
# and surface via a separate category="online" query on the home page (like online events).
for _c in offline_communities:
    _c["location"]["city"] = "Thiruvananthapuram"

# Communities for other picker cities so the home page is populated when a
# different city is selected (New York is the default city in the frontend).
other_city_communities = [
    # ── New York ──
    {
        "name": "NYC JavaScript Developers",
        "description": "Monthly meetups for JS/TS developers across the five boroughs. Talks, demos, and hiring.",
        "category": "tech",
        "location": {"name": "SoHo, Manhattan", "city": "New York", "latitude": 40.7233, "longitude": -74.0030},
        "next_event_date": (now + timedelta(days=8, hours=18)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 5200, "price": 0.0, "status": "active",
    },
    {
        "name": "Brooklyn Run Club — Saturday Long Run",
        "description": "All-paces running group meeting every Saturday morning along the East River.",
        "category": "sports",
        "location": {"name": "Williamsburg, Brooklyn", "city": "New York", "latitude": 40.7081, "longitude": -73.9571},
        "next_event_date": (now + timedelta(days=4, hours=7)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 1900, "price": 0.0, "status": "active",
    },
    {
        "name": "Manhattan Foodies — Tasting Walks",
        "description": "Guided food tours through Chinatown, Little Italy, and the Lower East Side.",
        "category": "food",
        "location": {"name": "Lower East Side, Manhattan", "city": "New York", "latitude": 40.7150, "longitude": -73.9843},
        "next_event_date": (now + timedelta(days=10, hours=19)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 3400, "price": 250.0, "status": "active",
    },
    {
        "name": "NYC Indie Film Collective",
        "description": "Screenings, script readings, and collaboration for independent filmmakers in the city.",
        "category": "arts",
        "location": {"name": "Astoria, Queens", "city": "New York", "latitude": 40.7644, "longitude": -73.9235},
        "next_event_date": (now + timedelta(days=13, hours=18)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 1200, "price": 0.0, "status": "active",
    },
    # ── London ──
    {
        "name": "London Python Meetup",
        "description": "Talks and workshops on Python, data, and ML. Monthly at venues across central London.",
        "category": "tech",
        "location": {"name": "Shoreditch, London", "city": "London", "latitude": 51.5265, "longitude": -0.0780},
        "next_event_date": (now + timedelta(days=9, hours=18)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 4100, "price": 0.0, "status": "active",
    },
    {
        "name": "Thames Path Runners",
        "description": "Weekend runs along the Thames. Social pace, riverside views, coffee afterwards.",
        "category": "sports",
        "location": {"name": "South Bank, London", "city": "London", "latitude": 51.5074, "longitude": -0.1162},
        "next_event_date": (now + timedelta(days=6, hours=8)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 1500, "price": 0.0, "status": "active",
    },
    {
        "name": "London Street Food Society",
        "description": "Exploring London's best markets and street food, from Borough to Camden.",
        "category": "food",
        "location": {"name": "Borough Market, London", "city": "London", "latitude": 51.5055, "longitude": -0.0905},
        "next_event_date": (now + timedelta(days=12, hours=19)).isoformat() + "Z",
        "organizer_id": ORGANIZER_ID, "member_count": 2800, "price": 0.0, "status": "active",
    },
]

# ── Seed helper ───────────────────────────────────────────────────────────────
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
                print(f"  + {title}")
                success += 1
            else:
                print(f"  x {title}: HTTP {r.status_code} — {r.text[:120]}")
        except Exception as e:
            print(f"  x {title}: {e}")
    print(f"  -> {success}/{len(items)} seeded")
    return success

# ── Run ───────────────────────────────────────────────────────────────────────
print("Seeding EventMind database...")

event_payloads = [{**ev, "organizer_id": ORGANIZER_ID, "status": "published"} for ev in events]

total = 0
total += seed_section(f"Events ({len(event_payloads)})", event_payloads, EVENT_API)
total += seed_section(f"Offline communities ({len(offline_communities)})", offline_communities, COMMUNITY_API)
total += seed_section(f"Online communities ({len(online_communities)})", online_communities, COMMUNITY_API)
total += seed_section(f"Other-city communities ({len(other_city_communities)})", other_city_communities, COMMUNITY_API)

print(f"\nDone! Seeded {total} records total.")
