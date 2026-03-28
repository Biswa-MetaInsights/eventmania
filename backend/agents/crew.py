from crewai import Agent, Task, Crew, Process
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic_ai import PydanticAI
from typing import List, Optional, Any
import os
from dotenv import load_dotenv

load_dotenv()

class PlatformAgents:
    def __init__(self, llm_model: str = "gemini-1.5-flash"):
        # We'll use Google models as default, but this can be replaced by GPT/Anthropic
        self.llm = ChatGoogleGenerativeAI(model=llm_model)

    def get_content_agent(self) -> Agent:
        return Agent(
            role='Creative Event Copywriter',
            goal='Generate compelling and clear event titles and descriptions from minimal input.',
            backstory='You are a master of marketing and persuasion, specializing in event management and community building. You know how to make people excited to attend a tech summit or workshop.',
            allow_delegation=False,
            verbose=True,
            llm=self.llm
        )

    def get_moderation_agent(self) -> Agent:
        return Agent(
            role='Platform Guardian',
            goal='Scan event content for fraud, spam, or toxic language and provide a trust score.',
            backstory='You are a security and trust expert with deep knowledge of community guidelines and fraud patterns. Your job is to keep the platform professional and safe.',
            allow_delegation=False,
            verbose=True,
            llm=self.llm
        )

class PlatformCrews:
    def __init__(self):
        self.agents = PlatformAgents()

    def run_content_agent(self, minimal_input: str) -> str:
        agent = self.agents.get_content_agent()
        task = Task(
            description=f"Based on the following minimal input: '{minimal_input}', generate a professional title and a compelling 3-paragraph event description. Include a call to action.",
            agent=agent,
            expected_output="An event title and a 3-paragraph marketing description."
        )
        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            verbose=True
        )
        return crew.kickoff()

    def run_moderation_check(self, content_to_check: str) -> str:
        agent = self.agents.get_moderation_agent()
        task = Task(
            description=f"Identify if this content violates any community guidelines (spam, fraud, toxicity): '{content_to_check}'. Rate from 0 (SAFE) to 10 (DANGEROUS).",
            agent=agent,
            expected_output="A trust score (0-10) and a brief justification."
        )
        crew = Crew(
            agents=[agent],
            tasks=[task],
            process=Process.sequential,
            verbose=True
        )
        return crew.kickoff()
