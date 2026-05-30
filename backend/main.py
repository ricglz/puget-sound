import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import DEMO_MODE
from gtfs import TransitDataStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("puget-sound")

app = FastAPI(title="Puget Sound")
store = TransitDataStore()

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

logger.info("DEMO_MODE=%s, routes=%d, trip_map_entries=%d",
            DEMO_MODE, len(store.transit_data.get("routes", [])),
            len(store.trip_route_map))


@app.get("/api/vehicles")
def vehicles():
    data = store.get_vehicles()
    logger.info("vehicles: %d returned", len(data))
    return data


@app.get("/api/transit-data")
async def transit_data():
    return store.get_transit_data()


@app.get("/api/debug")
async def debug():
    return {
        "demo_mode": DEMO_MODE,
        "routes": len(store.transit_data.get("routes", [])),
        "trip_map_entries": len(store.trip_route_map),
        "demo_vehicles": len(store._demo_vehicles),
    }


app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
async def index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))
