# Puget Sound

**Seattle's transit, playing itself.**

Each bus line is a voice. Each stop, a note. When a bus arrives at a station, it triggers a musical note — creating an ever-changing, unscripted soundscape shaped by the city's actual transit patterns. During rush hours the output is dense and overlapping; at night, the pace slows and gaps of silence emerge. No two listening sessions are ever identical.

## Inspiration

Inspired by [@heliouz_](https://www.instagram.com/reels/DYSMK3xxzuP/) and [El Organillero](https://organillero.heliouz.com/) — a live map of Mexico City's Metrobús that turns bus arrivals into a generative musical composition.

## Tech stack

- **FastAPI** — backend proxy for GTFS-realtime feeds
- **Tone.js** — audio synthesis with PolySynth, reverb, and weighted random durations
- **Leaflet** — map with CartoDB dark tiles
- Vanilla ES modules, no build system

## Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://localhost:8000.

The app starts in **demo mode** by default, simulating vehicle movement along real Seattle routes. Set `DEMO_MODE=false` to use live GTFS-realtime feeds from King County Metro.

## Routes

Demo data includes Metro's most productive routes by ridership: RapidRide A/C/D/E/G/H lines, Routes 2, 7, 8, 44, 45, 67, and Link 1 Line light rail.
