import uvicorn
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import uuid

try:
    from crew import PlatformCrews
    CREW_AVAILABLE = True
except ImportError:
    CREW_AVAILABLE = False

app = FastAPI(
    title="Agentic Messaging Service",
    description="Orchestrates CrewAI agents for autonomous tasks across the event platform",
)

class TaskRequest(BaseModel):
    user_id: Optional[str] = None
    event_id: Optional[str] = None
    input_data: str

class TaskResponse(BaseModel):
    task_id: str
    status: str

# In-memory task status (In production, use Redis)
tasks_status = {}

@app.post("/agents/generate-content", response_model=TaskResponse)
def trigger_content_generation(req: TaskRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    tasks_status[task_id] = "PENDING"

    # Define background execution for the CrewAI task
    def run_crew():
        try:
            if not CREW_AVAILABLE:
                tasks_status[task_id] = "COMPLETED (SHADOW MODE - AI not available)"
                return
            crews = PlatformCrews()
            result = crews.run_content_agent(req.input_data)
            tasks_status[task_id] = "COMPLETED"
            print(f"Agent Task {task_id} result: {result}")
        except Exception as e:
            tasks_status[task_id] = f"FAILED: {str(e)}"

    background_tasks.add_task(run_crew)
    return TaskResponse(task_id=task_id, status="PENDING")

@app.get("/agents/task/{task_id}")
def get_task_status(task_id: str):
    return {"task_id": task_id, "status": tasks_status.get(task_id, "NOT_FOUND")}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8010, reload=True)
