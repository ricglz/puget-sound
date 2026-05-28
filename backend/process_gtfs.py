"""Download King County Metro + Sound Transit GTFS data and produce transit_data.json."""

import csv
import io
import json
import zipfile
from pathlib import Path

import httpx

DATA_DIR = Path(__file__).parent / "data"
OUTPUT = DATA_DIR / "transit_data.json"

FEEDS = [
    {
        "name": "King County Metro",
        "url": "https://metro.kingcounty.gov/GTFS/google_daily_transit.zip",
        "targets": {"A Line", "C Line", "D Line", "E Line", "G Line", "H Line", "2", "7", "8", "44", "45", "67"},
    },
    {
        "name": "Sound Transit",
        "url": "https://www.soundtransit.org/GTFS-rail/40_gtfs.zip",
        "targets": {"1 Line", "2 Line"},
    },
]


DISTINCT_COLORS = [
    "E53935", "F4511E", "FB8C00", "FDD835",
    "43A047", "00897B", "00ACC1", "039BE5",
    "3949AB", "8E24AA", "D81B60", "6D4C41",
    "546E7A", "C0CA33", "FF7043", "26A69A",
]
_color_idx = 0


def download(url: str, name: str) -> zipfile.ZipFile:
    print(f"Downloading {name}...")
    resp = httpx.get(url, timeout=60, follow_redirects=True)
    resp.raise_for_status()
    print(f"  {len(resp.content) / 1024 / 1024:.1f} MB")
    return zipfile.ZipFile(io.BytesIO(resp.content))


def read_csv(z: zipfile.ZipFile, name: str) -> list[dict]:
    return list(csv.DictReader(z.read(name).decode().splitlines()))


def process_feed(z: zipfile.ZipFile, targets: set[str]) -> dict:
    routes_raw = read_csv(z, "routes.txt")
    trips_raw = read_csv(z, "trips.txt")
    stops_raw = read_csv(z, "stops.txt")
    stop_times_raw = read_csv(z, "stop_times.txt")

    target_routes = {
        r["route_id"]: r
        for r in routes_raw
        if r.get("route_short_name", "") in targets
    }
    print(f"  Found {len(target_routes)} target routes")

    stops_map = {s["stop_id"]: s for s in stops_raw}

    route_trips: dict[str, str] = {}
    trip_route: dict[str, str] = {}
    trip_stop_counts: dict[str, int] = {}

    for t in trips_raw:
        rid = t["route_id"]
        if rid in target_routes:
            trip_route[t["trip_id"]] = rid

    for st in stop_times_raw:
        tid = st["trip_id"]
        if tid in trip_route:
            trip_stop_counts[tid] = trip_stop_counts.get(tid, 0) + 1

    for tid, rid in trip_route.items():
        count = trip_stop_counts.get(tid, 0)
        current_best = route_trips.get(rid)
        if not current_best or count > trip_stop_counts.get(current_best, 0):
            route_trips[rid] = tid

    trip_stops: dict[str, list] = {tid: [] for tid in route_trips.values()}
    for st in stop_times_raw:
        tid = st["trip_id"]
        if tid in trip_stops:
            trip_stops[tid].append(st)

    for tid in trip_stops:
        trip_stops[tid].sort(key=lambda x: int(x["stop_sequence"]))

    routes_out = []
    for rid, rdata in target_routes.items():
        tid = route_trips.get(rid)
        if not tid:
            continue

        stops_out = []
        for i, st in enumerate(trip_stops[tid]):
            s = stops_map.get(st["stop_id"])
            if not s:
                continue
            stops_out.append({
                "stop_id": st["stop_id"],
                "name": s["stop_name"],
                "lat": float(s["stop_lat"]),
                "lon": float(s["stop_lon"]),
                "sequence": i,
            })

        color = rdata.get("route_color", "FDB71A")
        long_name = rdata.get("route_long_name", "")

        global _color_idx
        default_colors = {"FDB71A", "9C182F", ""}
        if color in default_colors and stops_out:
            color = DISTINCT_COLORS[_color_idx % len(DISTINCT_COLORS)]
            _color_idx += 1

        if not long_name and len(stops_out) >= 2:
            first = stops_out[0]["name"].split(" - ")[0].split(" & ")[0]
            last = stops_out[-1]["name"].split(" - ")[0].split(" & ")[0]
            long_name = f"{first} to {last}"

        routes_out.append({
            "route_id": rid,
            "short_name": rdata["route_short_name"],
            "long_name": long_name,
            "color": color,
            "type": int(rdata.get("route_type", 3)),
            "stops": stops_out,
        })

    trip_map = {tid: rid for tid, rid in trip_route.items()}
    return {"routes": routes_out, "trip_route_map": trip_map}


def main():
    DATA_DIR.mkdir(exist_ok=True)
    all_routes = []
    all_trip_map = {}

    for feed in FEEDS:
        z = download(feed["url"], feed["name"])
        data = process_feed(z, feed["targets"])
        all_routes.extend(data["routes"])
        all_trip_map.update(data["trip_route_map"])

    combined = {"routes": all_routes, "trip_route_map": all_trip_map}

    with open(OUTPUT, "w") as f:
        json.dump(combined, f)

    total_stops = sum(len(r["stops"]) for r in all_routes)
    print(f"\nWrote {OUTPUT}")
    print(f"  {len(all_routes)} routes, {total_stops} stops")
    print(f"  {len(all_trip_map)} trip→route mappings")

    for r in sorted(all_routes, key=lambda x: x["short_name"]):
        print(f"  {r['short_name']:10s} {len(r['stops']):3d} stops")


if __name__ == "__main__":
    main()
