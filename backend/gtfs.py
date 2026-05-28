import json
import time
import random
from pathlib import Path

import httpx

from config import DEMO_MODE, TRANSIT_DATA_PATH

OBA_VEHICLES_URL = "https://api.pugetsound.onebusaway.org/api/where/vehicles-for-agency/1.json?key=TEST"


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
        self.trip_route_map: dict[str, str] = self.transit_data.get("trip_route_map", {})
        self.route_stops: dict[str, list] = {
            r["route_id"]: r["stops"] for r in self.transit_data["routes"]
        }
        self._demo_vehicles: list[DemoVehicle] = []
        self._cached_vehicles: list[dict] = []
        self._cache_time: float = 0
        if DEMO_MODE:
            self._init_demo()

    def _load_transit_data(self) -> dict:
        if TRANSIT_DATA_PATH.exists():
            with open(TRANSIT_DATA_PATH) as f:
                return json.load(f)
        return {"routes": [], "trip_route_map": {}}

    def get_transit_data(self) -> dict:
        return {"routes": self.transit_data["routes"]}

    def get_vehicles(self) -> list[dict]:
        if DEMO_MODE:
            return [v.update() for v in self._demo_vehicles]
        return self._fetch_oba()

    def _init_demo(self):
        for route in self.transit_data["routes"]:
            if len(route["stops"]) < 2:
                continue
            n = max(2, len(route["stops"]) // 4)
            for i in range(n):
                self._demo_vehicles.append(
                    DemoVehicle(f"demo_{route['route_id']}_{i}", route["route_id"], route["stops"])
                )

    def _find_closest_stop(self, route_id: str, lat: float, lon: float) -> str | None:
        stops = self.route_stops.get(route_id)
        if not stops:
            return None
        best = None
        best_dist = float("inf")
        for s in stops:
            d = (s["lat"] - lat) ** 2 + (s["lon"] - lon) ** 2
            if d < best_dist:
                best_dist = d
                best = s["stop_id"]
        return best

    def _fetch_oba(self) -> list[dict]:
        now = time.time()
        if now - self._cache_time < 10:
            return self._cached_vehicles

        try:
            resp = httpx.get(OBA_VEHICLES_URL, timeout=10, follow_redirects=True)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            print(f"OBA fetch error: {e}")
            return self._cached_vehicles

        vehicles = []
        for v in data.get("data", {}).get("list", []):
            trip_id = v.get("tripId", "")
            # Strip agency prefix (e.g., "1_80904021" → "80904021")
            raw_tid = trip_id.split("_", 1)[-1] if "_" in trip_id else trip_id
            route_id = self.trip_route_map.get(raw_tid)
            if not route_id:
                continue

            ts = v.get("tripStatus", {})
            pos = ts.get("position", {})
            lat = pos.get("lat", 0)
            lon = pos.get("lon", 0)
            if lat == 0 and lon == 0:
                continue

            closest_stop = ts.get("closestStop", "")
            if "_" in closest_stop:
                closest_stop = closest_stop.split("_", 1)[-1]

            offset = ts.get("closestStopTimeOffset", 999)
            phase = ts.get("phase", "")
            status = "STOPPED_AT" if phase == "layover_during" or offset <= 0 else "IN_TRANSIT_TO"

            vid = v.get("vehicleId", "")
            if "_" in vid:
                vid = vid.split("_", 1)[-1]

            vehicles.append({
                "vehicle_id": vid,
                "route_id": route_id,
                "latitude": lat,
                "longitude": lon,
                "current_status": status,
                "stop_id": closest_stop,
                "timestamp": int(ts.get("lastUpdateTime", 0) / 1000),
            })

        self._cached_vehicles = vehicles
        self._cache_time = now
        return vehicles
