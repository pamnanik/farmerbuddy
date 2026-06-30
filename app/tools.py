import urllib.request
import urllib.parse
import json
import logging

def resolve_geolocation(location_name: str) -> dict:
    """Gets the geolocation coordinates and details for a given location name.

    Args:
        location_name: The name of the city, region, or address. Can be 'auto' or empty to detect via IP.

    Returns:
        dict with 'status' and location data (latitude, longitude, timezone).
    """
    try:
        location_name = location_name.strip() if location_name else "Delhi"
            
        query = urllib.parse.quote(location_name)
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={query}&count=1"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            if "results" in data and len(data["results"]) > 0:
                result = data["results"][0]
                return {
                    "status": "success",
                    "latitude": result.get("latitude"),
                    "longitude": result.get("longitude"),
                    "timezone": result.get("timezone"),
                    "country": result.get("country"),
                    "name": result.get("name")
                }
            
            # Fallback: If it's a multi-word location (e.g., "Delhi India" or "Delhi, India"), 
            # try resolving using just the first part (usually the city).
            parts = [p.strip() for p in location_name.replace(",", " ").split() if p.strip()]
            if len(parts) > 1:
                return resolve_geolocation(parts[0])
                
            return {"status": "not_found", "message": f"No location found for {location_name}"}
    except Exception as e:
        logging.error(f"Error fetching geolocation: {e}")
        return {"status": "error", "message": str(e)}

def get_market_prices(crop: str, region: str) -> dict:
    """Aggregates simulated regional price data for a crop.

    Args:
        crop: The name of the crop (e.g., tomatoes, wheat).
        region: The region or location to fetch prices for.

    Returns:
        dict containing price information and optimal harvest advice.
    """
    crop = crop.lower()
    
    # Simulated data for demonstration
    simulated_db = {
        "tomatoes": {"price_per_kg": 2.50, "trend": "rising", "demand": "high"},
        "wheat": {"price_per_kg": 0.30, "trend": "stable", "demand": "medium"},
        "corn": {"price_per_kg": 0.25, "trend": "falling", "demand": "low"},
        "apples": {"price_per_kg": 1.50, "trend": "rising", "demand": "high"}
    }
    
    data = simulated_db.get(crop, {"price_per_kg": 1.0, "trend": "unknown", "demand": "unknown"})
    
    advice = "Hold harvest if possible, prices may rise." if data["trend"] == "rising" else "Harvest soon to secure current prices."
    
    return {
        "status": "success",
        "crop": crop,
        "region": region,
        "current_price_per_kg_usd": data["price_per_kg"],
        "market_trend": data["trend"],
        "demand": data["demand"],
        "harvest_advice": advice
    }
