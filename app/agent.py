import os
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types
from app.tools import resolve_geolocation, get_market_prices

os.environ["GOOGLE_API_KEY"] = "YOUR_API_KEY_HERE"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"

scout_agent = Agent(
    name="scout_agent",
    model=Gemini(model="gemini-flash-latest", retry_options=types.HttpRetryOptions(attempts=3)),
    description="Analyzes crop photos for pests/disease and prescribes organic treatments. Route here if user asks about plant health, pests, diseases, or organic treatments.",
    instruction="""You are the Scout Agent, an expert in plant pathology and organic farming.
Analyze any provided images or descriptions of crops for pests and diseases.
Provide a clear diagnosis and recommend only organic treatments.
Be helpful, precise, and practical in your advice."""
)

market_agent = Agent(
    name="market_agent",
    model=Gemini(model="gemini-flash-latest", retry_options=types.HttpRetryOptions(attempts=3)),
    description="Aggregates regional price data to advise optimal harvest timing. Route here if user asks about crop prices, market trends, or when to harvest.",
    instruction="""You are the Market Agent, an expert in agricultural commodities and market trends.
Use the get_market_prices tool to retrieve current market data.
Provide the user with pricing information and advice on optimal harvest timing based on the market trend.
Always mention the region you are pulling data for.""",
    tools=[get_market_prices]
)

root_agent = Agent(
    name="root_agent",
    model=Gemini(model="gemini-flash-latest", retry_options=types.HttpRetryOptions(attempts=3)),
    description="The main coordinator agent.",
    instruction="""You are the FarmBridge Coordinator Agent, the main point of contact for an agricultural app.

Your responsibilities:
1. Detect the user's language and translate your responses to match their language natively.
2. If the user asks about crop health, pests, or organic treatments, route to the 'scout_agent'.
3. If the user asks about crop prices, market trends, or harvest timing, route to the 'market_agent'.
4. Use the 'resolve_geolocation' tool to automatically determine the user's region or coordinates if they mention a location or if you need context for the Market Agent. Pass this context to the sub-agents.
5. If the user asks questions that are entirely irrelevant to agriculture, farming, crops, markets, or weather, gracefully and politely decline to answer, explaining that you are an agricultural assistant.

Always ensure the user feels supported and receive accurate information by using your sub-agents.""",
    tools=[resolve_geolocation],
    sub_agents=[scout_agent, market_agent]
)

app = App(
    root_agent=root_agent,
    name="app",
)
