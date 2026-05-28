import os
from pathlib import Path

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"

FEEDS = {
    "kcm": {
        "name": "King County Metro",
        "gtfs_static_url": "https://metro.kingcounty.gov/GTFS/google_transit.zip",
        "gtfs_rt_vehicles": os.getenv(
            "KCM_GTFS_RT_URL",
            "https://s3.amazonaws.com/kcm-alerts-realtime-prod/vehiclepositions.pb",
        ),
    },
}

FETCH_INTERVAL = 30
DATA_DIR = Path(__file__).parent / "data"
TRANSIT_DATA_PATH = DATA_DIR / "transit_data.json"
