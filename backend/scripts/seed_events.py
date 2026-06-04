import requests
import sys
from datetime import datetime, timedelta

API_BASE = "http://localhost:8000/event/"
ORGANIZER_ID = "00000000-0000-0000-0000-000000000001"

def d(days, hours=0):
    return (datetime.utcnow() + timedelta(days=days, hours=hours)).isoformat() + "Z"

# ── City coordinate clusters (neighbourhoods / venues) ──────────────────────
NYC = [
    {"name": "Midtown Manhattan, New York",   "latitude": 40.7549,  "longitude": -73.9840},
    {"name": "Brooklyn Tech Triangle, NY",     "latitude": 40.6892,  "longitude": -73.9442},
    {"name": "Lower East Side, New York",      "latitude": 40.7157,  "longitude": -73.9863},
    {"name": "Williamsburg, Brooklyn NY",      "latitude": 40.7081,  "longitude": -73.9571},
    {"name": "Chelsea, Manhattan NY",          "latitude": 40.7465,  "longitude": -74.0014},
    {"name": "Flatiron District, New York",    "latitude": 40.7411,  "longitude": -73.9897},
    {"name": "SoHo, New York",                 "latitude": 40.7233,  "longitude": -74.0030},
    {"name": "Harlem, New York",               "latitude": 40.8116,  "longitude": -73.9465},
    {"name": "Astoria, Queens NY",             "latitude": 40.7721,  "longitude": -73.9301},
]

LON = [
    {"name": "Shoreditch, London",             "latitude": 51.5245,  "longitude": -0.0784},
    {"name": "Canary Wharf, London",           "latitude": 51.5054,  "longitude": -0.0235},
    {"name": "Camden, London",                 "latitude": 51.5390,  "longitude": -0.1426},
    {"name": "Brixton, London",                "latitude": 51.4613,  "longitude": -0.1156},
    {"name": "Kings Cross, London",            "latitude": 51.5308,  "longitude": -0.1238},
    {"name": "South Bank, London",             "latitude": 51.5055,  "longitude": -0.1132},
]

SF = [
    {"name": "SoMa, San Francisco",            "latitude": 37.7785,  "longitude": -122.4056},
    {"name": "Mission District, San Francisco","latitude": 37.7599,  "longitude": -122.4148},
    {"name": "Hayes Valley, San Francisco",    "latitude": 37.7759,  "longitude": -122.4245},
]

BER = [
    {"name": "Mitte, Berlin",                  "latitude": 52.5200,  "longitude": 13.4050},
    {"name": "Kreuzberg, Berlin",              "latitude": 52.4987,  "longitude": 13.4070},
    {"name": "Prenzlauer Berg, Berlin",        "latitude": 52.5370,  "longitude": 13.4214},
]

AMS = [
    {"name": "Jordaan, Amsterdam",             "latitude": 52.3750,  "longitude": 4.8833},
    {"name": "De Pijp, Amsterdam",             "latitude": 52.3545,  "longitude": 4.8952},
]

BRU = [
    {"name": "Ixelles, Brussels",              "latitude": 50.8282,  "longitude": 4.3699},
    {"name": "Molenbeek, Brussels",            "latitude": 50.8534,  "longitude": 4.3345},
]

ONLINE = {"name": "Online / Virtual",          "event_type": "online"}

# ── Events ───────────────────────────────────────────────────────────────────
events = [

    # ── NEW YORK — Technology & Startups (free & paid small events) ──
    {"title": "NYC Python Meetup — AI Libraries Showcase",
     "description": "Monthly meetup for Python developers. This month: LangChain, CrewAI, and llama-index demos from community members. Pizza provided.",
     "category": "Technology", "location": NYC[0], "price": 0, "capacity": 80,
     "start_date": d(3), "end_date": d(3, 3)},

    {"title": "Startup Pitch Night — FinTech Edition",
     "description": "6 early-stage FinTech founders pitch to a panel of NYC investors. Free for attendees. Networking drinks after.",
     "category": "Business", "location": NYC[5], "price": 0, "capacity": 120,
     "start_date": d(5), "end_date": d(5, 3)},

    {"title": "Product Design Workshop: Figma to Code",
     "description": "Hands-on workshop covering modern design-to-code workflows using Figma, Tailwind, and shadcn/ui. Bring your laptop.",
     "category": "Creative", "location": NYC[4], "price": 35, "capacity": 30,
     "start_date": d(7), "end_date": d(7, 4)},

    {"title": "Women in Tech NYC — June Networking Brunch",
     "description": "Monthly brunch for women and non-binary folks working in tech. Guest speaker from Google on inclusive hiring.",
     "category": "Networking", "location": NYC[6], "price": 15, "capacity": 60,
     "start_date": d(9), "end_date": d(9, 3)},

    {"title": "Brooklyn Founders Dinner",
     "description": "An intimate dinner for 40 founders and operators in Brooklyn. Share war stories, make connections, no pitching allowed.",
     "category": "Networking", "location": NYC[1], "price": 45, "capacity": 40,
     "start_date": d(11), "end_date": d(11, 3)},

    {"title": "No-Code Builders NYC Meetup",
     "description": "Show off what you built with Webflow, Bubble, and Glide. Beginner friendly. Lightning demo slots available.",
     "category": "Technology", "location": NYC[2], "price": 0, "capacity": 70,
     "start_date": d(4), "end_date": d(4, 2)},

    {"title": "NYC React Native Workshop — Building Offline-First Apps",
     "description": "Deep dive into WatermelonDB, MMKV, and Expo local storage. Intermediate level. Bring your laptop.",
     "category": "Technology", "location": NYC[5], "price": 49, "capacity": 25,
     "start_date": d(14), "end_date": d(14, 5)},

    {"title": "Harlem Art & Tech Mixer",
     "description": "Where Harlem's creative and tech communities collide. Live music, portfolio showcases, open bar for first hour.",
     "category": "Creative", "location": NYC[7], "price": 0, "capacity": 150,
     "start_date": d(6), "end_date": d(6, 4)},

    {"title": "Queens Entrepreneurs Morning Meetup",
     "description": "Early morning coffee meetup for small business owners in Queens. Guest: accountant on entity structuring for LLCs.",
     "category": "Business", "location": NYC[8], "price": 0, "capacity": 40,
     "start_date": d(2), "end_date": d(2, 2)},

    {"title": "AI for Non-Technical Founders — NYC",
     "description": "What every founder needs to know about LLMs, fine-tuning, and AI vendors — without writing a line of code.",
     "category": "Business", "location": NYC[0], "price": 25, "capacity": 100,
     "start_date": d(16), "end_date": d(16, 3)},

    {"title": "Williamsburg Creative Portfolio Night",
     "description": "Designers, illustrators, and photographers show their 2026 work. Open portfolio review format. Free drinks on arrival.",
     "category": "Creative", "location": NYC[3], "price": 0, "capacity": 90,
     "start_date": d(8), "end_date": d(8, 3)},

    {"title": "NYC Kubernetes & DevOps Meetup",
     "description": "Monthly SRE and platform engineering meetup. Talks: GitOps with Flux, eBPF observability, cost optimisation on EKS.",
     "category": "Technology", "location": NYC[4], "price": 0, "capacity": 100,
     "start_date": d(18), "end_date": d(18, 3)},

    {"title": "Impact Investing Summit New York 2026",
     "description": "Full-day summit on ESG, climate tech investing, and social enterprise funding. Keynotes, panels, and deal room.",
     "category": "Business", "location": NYC[0], "price": 199, "capacity": 300,
     "start_date": d(22), "end_date": d(23)},

    {"title": "Soho Photography Walk & Workshop",
     "description": "Street photography walk through SoHo with a professional photographer. Learn composition, light, and post-processing.",
     "category": "Creative", "location": NYC[6], "price": 40, "capacity": 15,
     "start_date": d(10), "end_date": d(10, 4)},

    # ── LONDON ──
    {"title": "London JavaScript Meetup — Signals & Reactivity Deep Dive",
     "description": "How Angular, Solid, and Vue all landed on Signals independently. Live coding session. Sponsored by Vercel.",
     "category": "Technology", "location": LON[0], "price": 0, "capacity": 100,
     "start_date": d(4), "end_date": d(4, 3)},

    {"title": "FinTech Founders Breakfast — Canary Wharf",
     "description": "Monthly working breakfast for FinTech founders and investors. Roundtable format, 20 seats only.",
     "category": "Business", "location": LON[1], "price": 30, "capacity": 20,
     "start_date": d(6), "end_date": d(6, 2)},

    {"title": "Camden Indie Makers Market",
     "description": "Saturday market for independent makers, crafters, and small-batch product brands. 60 stalls, live DJ.",
     "category": "Creative", "location": LON[2], "price": 0, "capacity": 500,
     "start_date": d(5), "end_date": d(5, 8)},

    {"title": "South Bank Book Club & Author Talk",
     "description": "Monthly book club with a guest author. June: tech ethics with the author of 'The Algorithm Trap'. Free entry.",
     "category": "Networking", "location": LON[5], "price": 0, "capacity": 60,
     "start_date": d(12), "end_date": d(12, 2)},

    {"title": "London GenAI Engineering Meetup",
     "description": "Practical talks on production LLM apps — RAG architectures, eval frameworks, cost monitoring. Shoreditch venue.",
     "category": "Technology", "location": LON[0], "price": 0, "capacity": 150,
     "start_date": d(9), "end_date": d(9, 3)},

    {"title": "Kings Cross Yoga & Mindfulness Morning",
     "description": "Free outdoor yoga session followed by guided mindfulness. Mats provided. All levels welcome.",
     "category": "Networking", "location": LON[4], "price": 0, "capacity": 50,
     "start_date": d(3), "end_date": d(3, 2)},

    {"title": "Brixton Community Supper Club",
     "description": "Monthly communal dinner celebrating Brixton's food culture. £20 includes 3 courses. BYOB.",
     "category": "Networking", "location": LON[3], "price": 20, "capacity": 45,
     "start_date": d(15), "end_date": d(15, 3)},

    # ── SAN FRANCISCO ──
    {"title": "SF AI Founders Dinner — Summer Series",
     "description": "Intimate dinner for 30 AI founders and researchers. Curated seating, structured conversations. Application-only.",
     "category": "Business", "location": SF[0], "price": 0, "capacity": 30,
     "start_date": d(7), "end_date": d(7, 3)},

    {"title": "Mission District Hackathon: Climate Tech",
     "description": "48-hour hackathon focused on carbon capture, grid optimisation, and sustainable supply chains. $10K in prizes.",
     "category": "Technology", "location": SF[1], "price": 0, "capacity": 200,
     "start_date": d(13), "end_date": d(15)},

    {"title": "Hayes Valley Pop-Up Art Show",
     "description": "Emerging Bay Area artists show new work. Opening night reception with wine and live music. Free to attend.",
     "category": "Creative", "location": SF[2], "price": 0, "capacity": 120,
     "start_date": d(8), "end_date": d(8, 4)},

    {"title": "SoMa Swift & iOS Developers Meetup",
     "description": "iOS dev meetup. June talks: SwiftData migrations, visionOS layout system, and Swift 6 concurrency pitfalls.",
     "category": "Technology", "location": SF[0], "price": 0, "capacity": 80,
     "start_date": d(11), "end_date": d(11, 3)},

    # ── BERLIN ──
    {"title": "Berlin Startup Ecosystem Mixer — Mitte",
     "description": "Quarterly mixer for the Berlin startup scene. VCs, founders, operators. Free bar for first 90 minutes.",
     "category": "Networking", "location": BER[0], "price": 0, "capacity": 200,
     "start_date": d(6), "end_date": d(6, 4)},

    {"title": "Kreuzberg UX Research Workshop",
     "description": "Full-day practical workshop on user interviews, affinity mapping, and insight synthesis. Group of 16 max.",
     "category": "Creative", "location": BER[1], "price": 79, "capacity": 16,
     "start_date": d(14), "end_date": d(14, 8)},

    {"title": "Berlin Blockchain & Web3 Meetup",
     "description": "Monthly meetup for Web3 builders. This month: ZK proofs in plain English, and a live smart contract audit.",
     "category": "Technology", "location": BER[2], "price": 0, "capacity": 90,
     "start_date": d(10), "end_date": d(10, 3)},

    {"title": "Mitte Photography Exhibition Opening",
     "description": "Opening night for 'Urban Futures' — a group exhibition of 12 Berlin photographers exploring the city in 2026.",
     "category": "Creative", "location": BER[0], "price": 0, "capacity": 80,
     "start_date": d(5), "end_date": d(5, 4)},

    # ── AMSTERDAM ──
    {"title": "Amsterdam Sustainability Networking Lunch",
     "description": "Monthly lunch for professionals working in sustainability, circular economy, and climate policy. 30 seats.",
     "category": "Networking", "location": AMS[0], "price": 25, "capacity": 30,
     "start_date": d(8), "end_date": d(8, 2)},

    {"title": "Dutch Founders Demo Day — June 2026",
     "description": "10 early-stage Dutch startups present to investors and the public. Free to attend. Drinks and bites after.",
     "category": "Business", "location": AMS[1], "price": 0, "capacity": 150,
     "start_date": d(18), "end_date": d(18, 4)},

    {"title": "De Pijp Saturday Morning Run Club",
     "description": "Free weekly 8K run starting at Sarphatipark. All paces welcome. Coffee at local roaster after.",
     "category": "Networking", "location": AMS[1], "price": 0, "capacity": 40,
     "start_date": d(2), "end_date": d(2, 2)},

    # ── BRUSSELS ──
    {"title": "Brussels EU Policy & Tech Breakfast",
     "description": "Monthly breakfast discussion on EU AI Act, Digital Markets Act, and what it means for product teams.",
     "category": "Business", "location": BRU[0], "price": 20, "capacity": 40,
     "start_date": d(7), "end_date": d(7, 2)},

    {"title": "Molenbeek Community Street Festival",
     "description": "Free neighbourhood festival with food stalls, live music, children's activities, and local artisan market.",
     "category": "Creative", "location": BRU[1], "price": 0, "capacity": 1000,
     "start_date": d(12), "end_date": d(12, 10)},

    # ── ONLINE / VIRTUAL ──
    {"title": "Remote Engineering Leaders — Monthly Roundtable",
     "description": "Virtual roundtable for engineering managers and CTOs on remote culture, async workflows, and team health.",
     "category": "Business", "location": ONLINE, "price": 0, "capacity": 200,
     "start_date": d(4), "end_date": d(4, 2)},

    {"title": "Live Coding: Build a RAG App in 60 Minutes",
     "description": "Watch and code along as we build a retrieval-augmented generation app using LangChain, Pinecone, and FastAPI.",
     "category": "Technology", "location": ONLINE, "price": 0, "capacity": 500,
     "start_date": d(3), "end_date": d(3, 2)},

    {"title": "Freelance Designer Pricing Masterclass",
     "description": "How to price your work, handle client negotiations, and move from hourly to value-based pricing. Q&A session.",
     "category": "Business", "location": ONLINE, "price": 19, "capacity": 300,
     "start_date": d(6), "end_date": d(6, 2)},

    {"title": "Open Source Maintainers Summit 2026",
     "description": "Two-day virtual summit for open source maintainers. Sustainability funding, governance, and burnout prevention.",
     "category": "Technology", "location": ONLINE, "price": 0, "capacity": 1000,
     "start_date": d(20), "end_date": d(21)},

    {"title": "Product Management for Engineers — Workshop",
     "description": "Engineers moving into PM roles: how to write PRDs, run discovery, and work with stakeholders. 4-hour workshop.",
     "category": "Business", "location": ONLINE, "price": 29, "capacity": 100,
     "start_date": d(9), "end_date": d(9, 4)},

    {"title": "Intro to Generative AI — No Code Required",
     "description": "Beginner-friendly walkthrough of how LLMs work, what they can and can't do, and how to use them in your work.",
     "category": "Technology", "location": ONLINE, "price": 0, "capacity": 500,
     "start_date": d(1), "end_date": d(1, 2)},
]

# ── Seed ─────────────────────────────────────────────────────────────────────
print("Seeding database with events...")

success, failed = 0, 0
for ev in events:
    payload = {**ev, "organizer_id": ORGANIZER_ID, "status": "published"}
    try:
        r = requests.post(API_BASE, json=payload, timeout=10)
        if r.status_code == 201:
            print(f"  + {ev['title']}")
            success += 1
        else:
            print(f"  x {ev['title']} ({r.status_code}: {r.text[:80]})")
            failed += 1
    except Exception as e:
        print(f"  ! {ev['title']} — {e}")
        failed += 1

print(f"\nDone. {success} created, {failed} failed.")
