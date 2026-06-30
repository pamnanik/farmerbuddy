import uuid
import os
import logging
import base64
from typing import Optional
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from google.adk.runners import InMemoryRunner
from google.genai import types
from app.agent import app as adk_app

app = FastAPI()

os.makedirs("app/static", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

runner = InMemoryRunner(app=adk_app)
runner.auto_create_session = True

class ChatRequest(BaseModel):
    message: str
    image: Optional[str] = None
    session_id: str = ""

@app.post("/chat")
async def chat(request: ChatRequest):
    session_id = request.session_id if request.session_id else str(uuid.uuid4())
    response_text = ""
    
    try:
        if request.message and len(request.message) > 500:
            return {"response": "Error: Message exceeds maximum length of 500 characters.", "session_id": session_id}
            
        if request.message and not request.image:
            msg_lower = request.message.strip().lower()
            if msg_lower in ["hi", "hello", "hey", "greetings"]:
                return {"response": "Hello! I'm FarmBridge. I can help with crop diseases, market prices, and farming advice. Please include your city and country with your query so I can better understand your local climate and common issues. How can I assist you today?", "session_id": session_id}

        parts = []
        if request.message:
            parts.append(types.Part.from_text(text=request.message))
            
        if request.image:
            # Format is typically data:image/png;base64,iVBORw0KGgoAAA...
            if "," in request.image:
                header, encoded = request.image.split(",", 1)
                mime_type = header.split(";")[0].split(":")[1]
            else:
                encoded = request.image
                mime_type = "image/jpeg"
                
            image_bytes = base64.b64decode(encoded)
            
            # Validate image size (10 MB = 10 * 1024 * 1024 bytes)
            if len(image_bytes) > 10 * 1024 * 1024:
                return {"response": "Error: Image size exceeds maximum limit of 10MB.", "session_id": session_id}
                
            # Validate image format
            image_format = mime_type.split("/")[-1].lower()
            if image_format == "jpg":
                image_format = "jpeg"
            if image_format not in ["jpeg", "png"]:
                return {"response": "Error: Unsupported image format. Only JPG, JPEG, and PNG are supported.", "session_id": session_id}

            parts.append(types.Part(inline_data=types.Blob(mime_type=mime_type, data=image_bytes)))

        if not parts:
            return {"response": "Please provide a message or an image.", "session_id": session_id}

        # Run the agent asynchronously and collect the text events
        async for event in runner.run_async(
            user_id="default_user",
            session_id=session_id,
            new_message=types.Content(role="user", parts=parts)
        ):
            # The event structure in ADK contains author and content
            # We want to capture the output from the agents, not the user
            if event.author != "user" and hasattr(event, "content") and event.content:
                if hasattr(event.content, "parts") and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            response_text += part.text
                elif hasattr(event.content, "text"):
                    response_text += event.content.text
                elif isinstance(event.content, str):
                    response_text += event.content
                    
    except Exception as e:
        logging.error(f"Error running agent: {e}")
        response_text = "Temporary unavailable."
        
    return {"response": response_text, "session_id": session_id}

@app.get("/")
def index():
    return FileResponse("app/static/index.html")
