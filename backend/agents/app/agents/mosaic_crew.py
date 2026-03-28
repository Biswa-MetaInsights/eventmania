try:
    from crewai import Agent, Task, Crew, Process
    from langchain_google_genai import ChatGoogleGenerativeAI
    HAS_AI = True
except ImportError:
    HAS_AI = False
    print("⚠️  AI Libraries (CrewAI/LangChain) not found. Running in Pure-Mock Mode.")

import os
from typing import Dict, Any

# Mock state if KAFKA_BOOTSTRAP_SERVERS is missing
MOCK_MODE = os.getenv("MOCK_KAFKA", "FALSE") == "TRUE"

class MosaicCrew:
    def __init__(self, event_data: Dict[str, Any]):
        self.event_data = event_data

    def get_agents(self):
        # 1. The Enricher: SEO and Creative Writing
        enricher = Agent(
            role='Event Marketing Specialist',
            goal='Enhance the event description and title for high conversion and SEO relevance',
            backstory='An expert in digital marketing and copy-writing with 10 years experience in event discovery.',
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

        # 2. The Policeman: High-integrity Security/Safety
        policeman = Agent(
            role='Safety & Integrity Moderator',
            goal='Scan the event for toxic language, scams, or non-compliant content.',
            backstory='A former security analyst trained to detect subtle misinformation and unsafe community practices.',
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

        # 3. The Analyst: Interest Extraction
        analyst = Agent(
            role='Data Scientist / Recommendation Analyst',
            goal='Extract a list of 5-10 specific interests (Topic Mosaics) from the event metadata.',
            backstory='Expert in tagging and NLP, specializing in mapping events to latent user personas.',
            llm=llm,
            verbose=True,
            allow_delegation=False
        )

        return [enricher, policeman, analyst]

    def get_tasks(self, agents):
        enricher, policeman, analyst = agents

        t1 = Task(
            description=f"Enhance the title '{self.event_data['title']}' and description '{self.event_data['description']}' into a high-energy marketing blurb.",
            expected_output="A JSON object with 'marketing_blurb' and 'enhanced_title'.",
            agent=enricher,
        )

        t2 = Task(
            description=f"Analyze the content for safety. Result must include a boolean 'is_safe' and a brief 'moderation_reason'.",
            expected_output="A JSON object with 'is_safe' and 'moderation_reason'.",
            agent=policeman,
        )

        t3 = Task(
            description=f"Create an array of technical interests for: {self.event_data['title']}. Max 10 tags.",
            expected_output="A JSON object with a 'topic_mosaic' array of strings.",
            agent=analyst,
        )

        return [t1, t2, t3]

    def run(self):
        # 🛡️ Shadow Mode / Pure-Mock Path (Bypasses AI if missing or requested)
        if not HAS_AI or MOCK_MODE:
            return {
                "marketing_blurb": f"🚀 [ENHANCED] Prepare for {self.event_data.get('title', 'Event')}!",
                "is_safe": True,
                "topic_mosaic": ["AI", "Innovation", "Networking"]
            }

        # 🧠 Brain Path: Using Actual CrewAI
        agents = self.get_agents()
        tasks = self.get_tasks(agents)

        crew = Crew(
            agents=agents,
            tasks=tasks,
            process=Process.sequential,
            verbose=True
        )

        return crew.kickoff()
