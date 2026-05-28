import json
import time
import random
from pathlib import Path

from config import DEMO_MODE, FEEDS, TRANSIT_DATA_PATH


SAMPLE_ROUTES = [
    {
        "route_id": "rapidride_a",
        "short_name": "A Line",
        "long_name": "RapidRide A Line",
        "color": "0063A7",
        "type": 3,
        "stops": [
            {"stop_id": "a01", "name": "Tukwila Int'l Blvd Stn", "lat": 47.462, "lon": -122.288, "sequence": 0},
            {"stop_id": "a02", "name": "S 154th St", "lat": 47.449, "lon": -122.296, "sequence": 1},
            {"stop_id": "a03", "name": "SeaTac Airport", "lat": 47.444, "lon": -122.297, "sequence": 2},
            {"stop_id": "a04", "name": "S 200th St", "lat": 47.422, "lon": -122.296, "sequence": 3},
            {"stop_id": "a05", "name": "Kent-Des Moines", "lat": 47.402, "lon": -122.296, "sequence": 4},
            {"stop_id": "a06", "name": "S 260th St", "lat": 47.383, "lon": -122.296, "sequence": 5},
            {"stop_id": "a07", "name": "Star Lake P&R", "lat": 47.368, "lon": -122.296, "sequence": 6},
            {"stop_id": "a08", "name": "S 288th St", "lat": 47.354, "lon": -122.296, "sequence": 7},
            {"stop_id": "a09", "name": "S 304th St", "lat": 47.338, "lon": -122.296, "sequence": 8},
            {"stop_id": "a10", "name": "S 316th St", "lat": 47.325, "lon": -122.297, "sequence": 9},
            {"stop_id": "a11", "name": "Federal Way TC", "lat": 47.318, "lon": -122.303, "sequence": 10},
        ],
    },
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
        "route_id": "rapidride_g",
        "short_name": "G Line",
        "long_name": "RapidRide G Line",
        "color": "E8242A",
        "type": 3,
        "stops": [
            {"stop_id": "g01", "name": "Madison & 1st", "lat": 47.604, "lon": -122.338, "sequence": 0},
            {"stop_id": "g02", "name": "Madison & 4th", "lat": 47.604, "lon": -122.334, "sequence": 1},
            {"stop_id": "g03", "name": "Madison & 8th", "lat": 47.607, "lon": -122.327, "sequence": 2},
            {"stop_id": "g04", "name": "Madison & Broadway", "lat": 47.610, "lon": -122.321, "sequence": 3},
            {"stop_id": "g05", "name": "Madison & 12th", "lat": 47.613, "lon": -122.316, "sequence": 4},
            {"stop_id": "g06", "name": "Madison & 17th", "lat": 47.616, "lon": -122.308, "sequence": 5},
            {"stop_id": "g07", "name": "Madison & 23rd", "lat": 47.619, "lon": -122.297, "sequence": 6},
            {"stop_id": "g08", "name": "Madison & MLK", "lat": 47.618, "lon": -122.289, "sequence": 7},
        ],
    },
    {
        "route_id": "rapidride_h",
        "short_name": "H Line",
        "long_name": "RapidRide H Line",
        "color": "E87722",
        "type": 3,
        "stops": [
            {"stop_id": "h01", "name": "Downtown Burien TC", "lat": 47.470, "lon": -122.344, "sequence": 0},
            {"stop_id": "h02", "name": "Ambaum & 128th", "lat": 47.478, "lon": -122.344, "sequence": 1},
            {"stop_id": "h03", "name": "White Center", "lat": 47.508, "lon": -122.350, "sequence": 2},
            {"stop_id": "h04", "name": "Westwood Village", "lat": 47.521, "lon": -122.367, "sequence": 3},
            {"stop_id": "h05", "name": "35th & Avalon", "lat": 47.550, "lon": -122.371, "sequence": 4},
            {"stop_id": "h06", "name": "Alaska Junction", "lat": 47.561, "lon": -122.381, "sequence": 5},
        ],
    },
    {
        "route_id": "route_7",
        "short_name": "7",
        "long_name": "Route 7 — Rainier Valley",
        "color": "4CAF50",
        "type": 3,
        "stops": [
            {"stop_id": "r7_01", "name": "Rainier Beach", "lat": 47.522, "lon": -122.269, "sequence": 0},
            {"stop_id": "r7_02", "name": "Henderson & MLK", "lat": 47.525, "lon": -122.274, "sequence": 1},
            {"stop_id": "r7_03", "name": "Rainier & Orcas", "lat": 47.552, "lon": -122.284, "sequence": 2},
            {"stop_id": "r7_04", "name": "Columbia City", "lat": 47.560, "lon": -122.286, "sequence": 3},
            {"stop_id": "r7_05", "name": "Rainier & Genesee", "lat": 47.570, "lon": -122.290, "sequence": 4},
            {"stop_id": "r7_06", "name": "Mt Baker", "lat": 47.580, "lon": -122.295, "sequence": 5},
            {"stop_id": "r7_07", "name": "Rainier & Jackson", "lat": 47.599, "lon": -122.310, "sequence": 6},
            {"stop_id": "r7_08", "name": "12th & Jackson", "lat": 47.599, "lon": -122.317, "sequence": 7},
            {"stop_id": "r7_09", "name": "5th & Jackson", "lat": 47.599, "lon": -122.328, "sequence": 8},
            {"stop_id": "r7_10", "name": "3rd & Pike", "lat": 47.610, "lon": -122.338, "sequence": 9},
        ],
    },
    {
        "route_id": "route_8",
        "short_name": "8",
        "long_name": "Route 8 — Capitol Hill / Denny",
        "color": "FF5722",
        "type": 3,
        "stops": [
            {"stop_id": "r8_01", "name": "Capitol Hill Stn", "lat": 47.625, "lon": -122.322, "sequence": 0},
            {"stop_id": "r8_02", "name": "Broadway & John", "lat": 47.620, "lon": -122.321, "sequence": 1},
            {"stop_id": "r8_03", "name": "Denny & Broadway", "lat": 47.618, "lon": -122.321, "sequence": 2},
            {"stop_id": "r8_04", "name": "Denny & Fairview", "lat": 47.619, "lon": -122.332, "sequence": 3},
            {"stop_id": "r8_05", "name": "Denny & Westlake", "lat": 47.619, "lon": -122.338, "sequence": 4},
            {"stop_id": "r8_06", "name": "Denny & Aurora", "lat": 47.619, "lon": -122.347, "sequence": 5},
            {"stop_id": "r8_07", "name": "Uptown", "lat": 47.624, "lon": -122.357, "sequence": 6},
            {"stop_id": "r8_08", "name": "Seattle Center", "lat": 47.622, "lon": -122.352, "sequence": 7},
        ],
    },
    {
        "route_id": "route_44",
        "short_name": "44",
        "long_name": "Route 44 — Ballard to U District",
        "color": "9C27B0",
        "type": 3,
        "stops": [
            {"stop_id": "r44_01", "name": "Ballard (Market St)", "lat": 47.668, "lon": -122.384, "sequence": 0},
            {"stop_id": "r44_02", "name": "NW 45th & 11th", "lat": 47.662, "lon": -122.373, "sequence": 1},
            {"stop_id": "r44_03", "name": "Wallingford", "lat": 47.662, "lon": -122.353, "sequence": 2},
            {"stop_id": "r44_04", "name": "N 45th & Meridian", "lat": 47.661, "lon": -122.335, "sequence": 3},
            {"stop_id": "r44_05", "name": "N 45th & University Way", "lat": 47.661, "lon": -122.315, "sequence": 4},
            {"stop_id": "r44_06", "name": "U District Stn", "lat": 47.661, "lon": -122.313, "sequence": 5},
        ],
    },
    {
        "route_id": "route_45",
        "short_name": "45",
        "long_name": "Route 45 — Loyal Heights to U District",
        "color": "00BCD4",
        "type": 3,
        "stops": [
            {"stop_id": "r45_01", "name": "Loyal Heights", "lat": 47.685, "lon": -122.389, "sequence": 0},
            {"stop_id": "r45_02", "name": "NW 85th & 24th", "lat": 47.691, "lon": -122.386, "sequence": 1},
            {"stop_id": "r45_03", "name": "Greenwood & 85th", "lat": 47.691, "lon": -122.355, "sequence": 2},
            {"stop_id": "r45_04", "name": "Green Lake", "lat": 47.681, "lon": -122.340, "sequence": 3},
            {"stop_id": "r45_05", "name": "Roosevelt & 65th", "lat": 47.676, "lon": -122.318, "sequence": 4},
            {"stop_id": "r45_06", "name": "Roosevelt Stn", "lat": 47.677, "lon": -122.317, "sequence": 5},
            {"stop_id": "r45_07", "name": "U District Stn", "lat": 47.661, "lon": -122.313, "sequence": 6},
        ],
    },
    {
        "route_id": "route_67",
        "short_name": "67",
        "long_name": "Route 67 — Northgate to U District",
        "color": "795548",
        "type": 3,
        "stops": [
            {"stop_id": "r67_01", "name": "Northgate TC", "lat": 47.708, "lon": -122.328, "sequence": 0},
            {"stop_id": "r67_02", "name": "5th NE & NE 103rd", "lat": 47.700, "lon": -122.324, "sequence": 1},
            {"stop_id": "r67_03", "name": "Roosevelt & Northgate Way", "lat": 47.699, "lon": -122.318, "sequence": 2},
            {"stop_id": "r67_04", "name": "Roosevelt & 80th", "lat": 47.688, "lon": -122.318, "sequence": 3},
            {"stop_id": "r67_05", "name": "Roosevelt & 65th", "lat": 47.676, "lon": -122.318, "sequence": 4},
            {"stop_id": "r67_06", "name": "U District Stn", "lat": 47.661, "lon": -122.313, "sequence": 5},
        ],
    },
    {
        "route_id": "route_2",
        "short_name": "2",
        "long_name": "Route 2 — Queen Anne / Madrona",
        "color": "607D8B",
        "type": 3,
        "stops": [
            {"stop_id": "r2_01", "name": "Queen Anne Ave & W Galer", "lat": 47.639, "lon": -122.357, "sequence": 0},
            {"stop_id": "r2_02", "name": "1st & Mercer", "lat": 47.625, "lon": -122.356, "sequence": 1},
            {"stop_id": "r2_03", "name": "3rd & Bell", "lat": 47.614, "lon": -122.343, "sequence": 2},
            {"stop_id": "r2_04", "name": "3rd & Pike", "lat": 47.610, "lon": -122.338, "sequence": 3},
            {"stop_id": "r2_05", "name": "3rd & James", "lat": 47.602, "lon": -122.331, "sequence": 4},
            {"stop_id": "r2_06", "name": "12th & Yesler", "lat": 47.601, "lon": -122.316, "sequence": 5},
            {"stop_id": "r2_07", "name": "14th & Union", "lat": 47.611, "lon": -122.312, "sequence": 6},
            {"stop_id": "r2_08", "name": "23rd & Union", "lat": 47.613, "lon": -122.296, "sequence": 7},
            {"stop_id": "r2_09", "name": "34th & Union", "lat": 47.613, "lon": -122.285, "sequence": 8},
            {"stop_id": "r2_10", "name": "Madrona", "lat": 47.612, "lon": -122.280, "sequence": 9},
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
