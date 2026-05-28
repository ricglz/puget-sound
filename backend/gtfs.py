import json
import time
import random
from pathlib import Path

from config import DEMO_MODE, FEEDS, TRANSIT_DATA_PATH


SAMPLE_ROUTES = [
    {
        "route_id": "rapidride_e",
        "short_name": "E Line",
        "long_name": "RapidRide E Line",
        "color": "6D2077",
        "type": 3,
        "stops": [
            {"stop_id": "e01", "name": "Aurora Village TC", "lat": 47.774, "lon": -122.345, "sequence": 0},
            {"stop_id": "e02", "name": "Shoreline P&R", "lat": 47.755, "lon": -122.346, "sequence": 1},
            {"stop_id": "e03", "name": "N 185th St", "lat": 47.751, "lon": -122.346, "sequence": 2},
            {"stop_id": "e04", "name": "N 155th St", "lat": 47.739, "lon": -122.346, "sequence": 3},
            {"stop_id": "e05", "name": "N 145th St", "lat": 47.734, "lon": -122.346, "sequence": 4},
            {"stop_id": "e06", "name": "N 130th St", "lat": 47.723, "lon": -122.345, "sequence": 5},
            {"stop_id": "e07", "name": "N 105th St", "lat": 47.701, "lon": -122.345, "sequence": 6},
            {"stop_id": "e08", "name": "N 85th St", "lat": 47.691, "lon": -122.345, "sequence": 7},
            {"stop_id": "e09", "name": "N 65th St", "lat": 47.676, "lon": -122.349, "sequence": 8},
            {"stop_id": "e10", "name": "N 46th St", "lat": 47.662, "lon": -122.347, "sequence": 9},
            {"stop_id": "e11", "name": "Fremont", "lat": 47.651, "lon": -122.350, "sequence": 10},
            {"stop_id": "e12", "name": "Dexter & Mercer", "lat": 47.625, "lon": -122.343, "sequence": 11},
            {"stop_id": "e13", "name": "3rd & Pike", "lat": 47.610, "lon": -122.338, "sequence": 12},
        ],
    },
    {
        "route_id": "rapidride_c",
        "short_name": "C Line",
        "long_name": "RapidRide C Line",
        "color": "FFC72C",
        "type": 3,
        "stops": [
            {"stop_id": "c01", "name": "Westwood Village", "lat": 47.521, "lon": -122.367, "sequence": 0},
            {"stop_id": "c02", "name": "Alaska Junction", "lat": 47.561, "lon": -122.381, "sequence": 1},
            {"stop_id": "c03", "name": "Avalon Way", "lat": 47.567, "lon": -122.370, "sequence": 2},
            {"stop_id": "c04", "name": "W Seattle Bridge", "lat": 47.572, "lon": -122.355, "sequence": 3},
            {"stop_id": "c05", "name": "SODO", "lat": 47.579, "lon": -122.335, "sequence": 4},
            {"stop_id": "c06", "name": "1st Ave S", "lat": 47.593, "lon": -122.334, "sequence": 5},
            {"stop_id": "c07", "name": "Pioneer Square", "lat": 47.601, "lon": -122.332, "sequence": 6},
            {"stop_id": "c08", "name": "3rd & Union", "lat": 47.608, "lon": -122.337, "sequence": 7},
            {"stop_id": "c09", "name": "Pike Place", "lat": 47.610, "lon": -122.342, "sequence": 8},
            {"stop_id": "c10", "name": "Belltown", "lat": 47.615, "lon": -122.349, "sequence": 9},
        ],
    },
    {
        "route_id": "rapidride_d",
        "short_name": "D Line",
        "long_name": "RapidRide D Line",
        "color": "00A651",
        "type": 3,
        "stops": [
            {"stop_id": "d01", "name": "Crown Hill", "lat": 47.693, "lon": -122.375, "sequence": 0},
            {"stop_id": "d02", "name": "65th & 15th NW", "lat": 47.676, "lon": -122.376, "sequence": 1},
            {"stop_id": "d03", "name": "Market St", "lat": 47.668, "lon": -122.384, "sequence": 2},
            {"stop_id": "d04", "name": "15th & Leary", "lat": 47.663, "lon": -122.376, "sequence": 3},
            {"stop_id": "d05", "name": "Interbay", "lat": 47.651, "lon": -122.378, "sequence": 4},
            {"stop_id": "d06", "name": "Queen Anne", "lat": 47.637, "lon": -122.363, "sequence": 5},
            {"stop_id": "d07", "name": "Mercer & 1st", "lat": 47.625, "lon": -122.356, "sequence": 6},
            {"stop_id": "d08", "name": "Denny & 3rd", "lat": 47.618, "lon": -122.345, "sequence": 7},
            {"stop_id": "d09", "name": "3rd & Pike", "lat": 47.610, "lon": -122.338, "sequence": 8},
        ],
    },
    {
        "route_id": "link_1",
        "short_name": "1 Line",
        "long_name": "Link 1 Line",
        "color": "0078C8",
        "type": 0,
        "stops": [
            {"stop_id": "l01", "name": "Lynnwood City Center", "lat": 47.815, "lon": -122.294, "sequence": 0},
            {"stop_id": "l02", "name": "Mountlake Terrace", "lat": 47.789, "lon": -122.304, "sequence": 1},
            {"stop_id": "l03", "name": "Shoreline South", "lat": 47.748, "lon": -122.330, "sequence": 2},
            {"stop_id": "l04", "name": "NE 145th", "lat": 47.734, "lon": -122.328, "sequence": 3},
            {"stop_id": "l05", "name": "NE 130th", "lat": 47.722, "lon": -122.328, "sequence": 4},
            {"stop_id": "l06", "name": "Roosevelt", "lat": 47.677, "lon": -122.317, "sequence": 5},
            {"stop_id": "l07", "name": "U District", "lat": 47.661, "lon": -122.313, "sequence": 6},
            {"stop_id": "l08", "name": "University of Washington", "lat": 47.650, "lon": -122.304, "sequence": 7},
            {"stop_id": "l09", "name": "Capitol Hill", "lat": 47.625, "lon": -122.322, "sequence": 8},
            {"stop_id": "l10", "name": "Westlake", "lat": 47.611, "lon": -122.337, "sequence": 9},
            {"stop_id": "l11", "name": "Pioneer Square", "lat": 47.602, "lon": -122.331, "sequence": 10},
            {"stop_id": "l12", "name": "SODO", "lat": 47.580, "lon": -122.328, "sequence": 11},
            {"stop_id": "l13", "name": "Rainier Beach", "lat": 47.522, "lon": -122.269, "sequence": 12},
            {"stop_id": "l14", "name": "Tukwila Int'l Blvd", "lat": 47.462, "lon": -122.288, "sequence": 13},
            {"stop_id": "l15", "name": "SeaTac Airport", "lat": 47.444, "lon": -122.297, "sequence": 14},
            {"stop_id": "l16", "name": "Angle Lake", "lat": 47.433, "lon": -122.296, "sequence": 15},
        ],
    },
]


class DemoVehicle:
    def __init__(self, vehicle_id: str, route_id: str, stops: list):
        self.vehicle_id = vehicle_id
        self.route_id = route_id
        self.stops = stops
        self.current_index = random.randint(0, len(stops) - 1)
        self.progress = 0.0
        self.direction = random.choice([1, -1])
        self.at_stop = True
        self.dwell_remaining = random.uniform(3, 12)
        self.speed = random.uniform(0.04, 0.10)
        self._last_update = time.time()

    def update(self) -> dict:
        now = time.time()
        dt = now - self._last_update
        self._last_update = now

        if self.at_stop:
            self.dwell_remaining -= dt
            if self.dwell_remaining <= 0:
                self.at_stop = False
                self.progress = 0.0
        else:
            self.progress += self.speed * dt
            if self.progress >= 1.0:
                self.progress = 0.0
                self.current_index += self.direction
                if self.current_index >= len(self.stops) - 1:
                    self.current_index = len(self.stops) - 1
                    self.direction = -1
                elif self.current_index <= 0:
                    self.current_index = 0
                    self.direction = 1
                self.at_stop = True
                self.dwell_remaining = random.uniform(5, 20)

        stop = self.stops[self.current_index]
        if self.at_stop:
            return {
                "vehicle_id": self.vehicle_id,
                "route_id": self.route_id,
                "latitude": stop["lat"],
                "longitude": stop["lon"],
                "current_status": "STOPPED_AT",
                "stop_id": stop["stop_id"],
                "timestamp": int(now),
            }

        next_idx = max(0, min(self.current_index + self.direction, len(self.stops) - 1))
        nxt = self.stops[next_idx]
        lat = stop["lat"] + (nxt["lat"] - stop["lat"]) * self.progress
        lon = stop["lon"] + (nxt["lon"] - stop["lon"]) * self.progress
        return {
            "vehicle_id": self.vehicle_id,
            "route_id": self.route_id,
            "latitude": lat,
            "longitude": lon,
            "current_status": "IN_TRANSIT_TO",
            "stop_id": nxt["stop_id"],
            "timestamp": int(now),
        }


class TransitDataStore:
    def __init__(self):
        self.transit_data = self._load_transit_data()
        self._demo_vehicles: list[DemoVehicle] = []
        if DEMO_MODE:
            self._init_demo()

    def _load_transit_data(self) -> dict:
        if TRANSIT_DATA_PATH.exists():
            with open(TRANSIT_DATA_PATH) as f:
                return json.load(f)
        return {"routes": SAMPLE_ROUTES}

    def get_transit_data(self) -> dict:
        return self.transit_data

    def get_vehicles(self) -> list[dict]:
        if DEMO_MODE:
            return [v.update() for v in self._demo_vehicles]
        return self._fetch_realtime()

    def _init_demo(self):
        for route in self.transit_data["routes"]:
            if len(route["stops"]) < 2:
                continue
            n = max(2, len(route["stops"]) // 4)
            for i in range(n):
                self._demo_vehicles.append(
                    DemoVehicle(f"demo_{route['route_id']}_{i}", route["route_id"], route["stops"])
                )

    def _fetch_realtime(self) -> list[dict]:
        try:
            from google.transit import gtfs_realtime_pb2
            import httpx
        except ImportError:
            return []

        vehicles = []
        for feed_config in FEEDS.values():
            url = feed_config.get("gtfs_rt_vehicles", "")
            if not url:
                continue
            try:
                resp = httpx.get(url, timeout=10)
                feed = gtfs_realtime_pb2.FeedMessage()
                feed.ParseFromString(resp.content)
                for entity in feed.entity:
                    if entity.HasField("vehicle"):
                        v = entity.vehicle
                        status_map = {0: "INCOMING_AT", 1: "STOPPED_AT", 2: "IN_TRANSIT_TO"}
                        vehicles.append({
                            "vehicle_id": v.vehicle.id or entity.id,
                            "route_id": v.trip.route_id,
                            "latitude": v.position.latitude,
                            "longitude": v.position.longitude,
                            "current_status": status_map.get(v.current_status, "IN_TRANSIT_TO"),
                            "stop_id": v.stop_id if v.stop_id else None,
                            "timestamp": v.timestamp,
                        })
            except Exception as e:
                print(f"GTFS-RT fetch error: {e}")
        return vehicles
