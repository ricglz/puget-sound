import { PRESETS, getPresetRouteIds } from "./presets.js";
import { initAudio, playNote, disposeSynths } from "./audio.js";
import { initMap, renderRoutes, updateVehicles, flashStop } from "./map.js";

const POLL_MS = 3000;
const NPM_WINDOW = 60_000;

let transitData = null;
let activePreset = "rapidride";
let activeRouteIds = [];
let customRouteIds = new Set();
let prevStops = new Map();
let noteTimestamps = [];

const $ = (id) => document.getElementById(id);

$("enter-btn").addEventListener("click", async () => {
  await initAudio();
  $("splash").classList.add("hidden");
  $("app").classList.remove("hidden");
  start();
});

async function start() {
  transitData = await fetch("/api/transit-data").then((r) => r.json());

  initMap($("map-container"));
  buildPresetUI();
  setPreset("rapidride");

  poll();
  setInterval(poll, POLL_MS);
  setInterval(updateClock, 1000);
  setInterval(updateNPM, 3000);
  updateClock();
}

function buildPresetUI() {
  const list = $("preset-list");
  for (const [key, preset] of Object.entries(PRESETS)) {
    const btn = document.createElement("button");
    btn.className = "preset-btn";
    btn.textContent = preset.name;
    btn.title = preset.description;
    btn.dataset.preset = key;
    btn.addEventListener("click", () => setPreset(key));
    list.appendChild(btn);
  }

  const routeList = $("route-list");
  for (const route of transitData.routes) {
    const label = document.createElement("label");
    label.className = "route-toggle";
    label.style.setProperty("--route-color", `#${route.color || "666"}`);

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = route.route_id;
    cb.addEventListener("change", () => {
      cb.checked ? customRouteIds.add(route.route_id) : customRouteIds.delete(route.route_id);
      if (activePreset === "custom") refreshRoutes();
    });

    const dot = document.createElement("span");
    dot.className = "route-color-dot";
    dot.style.background = `#${route.color || "666"}`;

    const name = document.createElement("span");
    name.textContent = route.short_name || route.route_id;

    label.append(cb, dot, name);
    routeList.appendChild(label);
  }
}

function setPreset(name) {
  activePreset = name;
  document.querySelectorAll(".preset-btn").forEach((b) => b.classList.toggle("active", b.dataset.preset === name));
  $("current-preset").textContent = PRESETS[name]?.name || "Custom";
  disposeSynths();
  refreshRoutes();
}

function refreshRoutes() {
  activeRouteIds =
    activePreset === "custom"
      ? [...customRouteIds]
      : getPresetRouteIds(activePreset, transitData.routes);
  renderRoutes(transitData.routes, activeRouteIds);
}

async function poll() {
  try {
    const vehicles = await fetch("/api/vehicles").then((r) => r.json());

    for (const v of vehicles) {
      if (!activeRouteIds.includes(v.route_id)) continue;
      const prev = prevStops.get(v.vehicle_id);
      if (v.current_status === "STOPPED_AT" && v.stop_id && v.stop_id !== prev) {
        onArrival(v);
      }
      prevStops.set(v.vehicle_id, v.current_status === "STOPPED_AT" ? v.stop_id : null);
    }

    updateVehicles(vehicles, activeRouteIds);
    const count = vehicles.filter((v) => activeRouteIds.includes(v.route_id)).length;
    $("bus-count").textContent = `${count} buses`;
  } catch (e) {
    console.error("poll:", e);
  }
}

function onArrival(vehicle) {
  const route = transitData.routes.find((r) => r.route_id === vehicle.route_id);
  if (!route) return;
  const stop = route.stops.find((s) => s.stop_id === vehicle.stop_id);
  if (!stop) return;

  const preset = PRESETS[activePreset] || PRESETS.rapidride;
  playNote(vehicle.route_id, stop.sequence, preset.synth, preset.scale);
  flashStop(vehicle.stop_id, `#${route.color || "666"}`);

  noteTimestamps.push(Date.now());
  addRecent(route, stop);
}

function addRecent(route, stop) {
  const ul = $("recent-list");
  const li = document.createElement("li");
  li.innerHTML = `<span style="color:#${route.color || "666"}">&#9679;</span> ${route.short_name} &rarr; ${stop.name}`;
  ul.prepend(li);
  while (ul.children.length > 8) ul.lastChild.remove();
}

function updateClock() {
  $("clock").textContent = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function updateNPM() {
  const now = Date.now();
  noteTimestamps = noteTimestamps.filter((t) => now - t < NPM_WINDOW);
  $("notes-per-min").textContent = `♫ ${noteTimestamps.length}/min`;
}
