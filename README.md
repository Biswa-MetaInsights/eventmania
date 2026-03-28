# 🚀 EventMind: The Agentic Event Marketplace

---

## 🏛️ 1. Executive Summary & Philosophy
**EventMind** is a next-generation marketplace platform that leverages **Autonomous AI Agents** to automate the entire event management lifecycle—from event creation and marketing to attendee networking and ticketing.

By shifting from a passive tool to an **agentic ecosystem**, EventMind provides organizers with a "zero-touch" backend and attendees with a hyper-personalized discovery experience.

---

## 🏢 2. Business & Marketplace Architecture
*Scale Your Events with Autonomous Intelligence*

### 🔄 The Event Lifecycle Loop
| Phase | Value Proposition |
| :--- | :--- |
| **Creation** | Organizers input raw ideas; AI automatically optimizes for SEO and compliance. |
| **Discovery** | Attendees find events based on their **AI-Generated Interest Mosaics**, not just keywords. |
| **Monetization** | Instant, secure checkout via **Stripe** with automated organizer split-payments. |
| **Networking** | **Shadow Bonding Agents** match attendees with similar profiles in the Chat communities. |
| **Analytics** | Deep-dive insights into demand, sentiment, and attendee engagement. |

### 📈 Business Value Proposition (BVP)
- **Sub-24h Event GTM**: AI reduces the time from "Idea" to "Live Listing" by 90%.
- **High-Trust Marketplace**: Every event is pre-moderated by our **AI Safety Policy Agent**.
- **Increased LTV**: Smart recommendations ensure attendees stay within the ecosystem for future summits.

---

## ⚙️ 3. Technical System Architecture
*Microservices | Event-Sourcing | Agentic AI*

### 🛠️ The Tech Stack
- **Frontend**: Flutter Web (Indigo/Rose Aesthetics, High-Performance Dart).
- **Backend API**: 10+ Python Microservices (FastAPI).
- **Communication**: Kafka (Asynchronous events) + Redis (Real-time caching).
- **Database Layer**: PostgreSQL (Production) / SQLite (Local Shadow Mode).
- **AI Brain**: Gemini 1.5 Pro + CrewAI (Agentic Framework).
- **Security**: Centralized JWT Authentication & Gateway-level Rate Limiting.

### 🤖 The Data Mosaic AI (Agentic Strategy)
We follow an **Event-Driven Agentic Architecture (EDAA)**:
- **Event Sourcing**: Every state-change fires to a Kafka topic.
- **Autonomous Agents**: Specialized **AI Crews** (Enricher, Policeman, Analyst) autonomously update the marketplace state based on these events.

---

## 🗺️ 4. System Logic & Flows

### 🌊 Technical High-Level Flow (Backend)
```mermaid
graph TD
    subgraph Frontend
      FW[Flutter Web]
    end

    subgraph "Entry Point"
      GW[API Gateway] :: "Port 8000"
    end

    subgraph "Microservices Cluster"
      AS[Auth Service]
      ES[Event Service]
      TS[Ticketing Service]
      PS[Payment Service]
    end

    subgraph "AI Brain (Agentic Hub)"
      MA[Data Mosaic Agent]
      MOD[Moderation Agent]
    end

    FW -->|REST/WS| GW
    GW -->|Route| AS
    GW -->|Route| ES
    ES -->|Event| KB[Kafka Bus]
    KB -->|Trigger| MA
    KB -->|Trigger| MOD
    MOD -->|Verified| ES
```

---

## 🚀 5. Getting Started (Production & Local)

### 💠 Local Shadow-Mode (No Infra Required)
We've built a custom **One-Click Bootstrap** to bypass Docker/Kafka requirements for immediate testing:

1.  **Bootstrap Environment**:
    ```powershell
    py backend/scripts/prepare_slim_env.py
    py backend/scripts/install_all.py
    ```
2.  **Launch Ecosystem**:
    ```powershell
    py backend/scripts/shadow_runner.py
    ```
3.  **Launch Frontend**:
    ```powershell
    cd frontend; flutter run -d chrome
    ```

### 🚢 Production Deployment
EventMind is designed for **Kubernetes (K8s) Orchestration**:
- Every service includes a `Dockerfile` for containerization.
- Orchestrate with `docker-compose.yml` for unified local stacks.
- Centralized logging via **ElasticSearch/FluentD**.

---

## 🔒 6. Security & Integrity
- **Stateless Authentication**: Secured via **JWT** with global refresh-token rotations.
- **Rate-Limiting**: Standardized protected paths via the **API Gateway**.
- **Data Isolation**: Each service owns its database silo to prevent cascading security failures.

---

### *A Biswa-MetaInsights Enterprise*
