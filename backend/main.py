from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from gtfs import TransitDataStore

app = FastAPI(title="Puget Sound")
store = TransitDataStore()

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


@app.get("/api/vehicles")
async def vehicles():
    return store.get_vehicles()


@app.get("/api/transit-data")
async def transit_data():
    return store.get_transit_data()


app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
async def index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))
