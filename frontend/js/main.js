import { PRESETS, getPresetRouteIds } from "./presets.js";
import { initAudio, playNote, disposeSynths, setVolume, setReverbWet, setMuted, isMuted } from "./audio.js";
import { initMap, renderRoutes, updateVehicles, flashStop, clearMap } from "./map.js";
import {
  loadSettings, getSettings, updateSetting, onSettingsChange, resetSettings, DEFAULTS,
  hasVisited, markVisited, getLastPreset, setLastPreset,
  getCustomRoutes, setCustomRoutes, getDurationWeights, getEventSettings, getProfileSettings,
} from "./settings.js";

const POLL_MS = 3000;
const NPM_WINDOW = 60_000;

let transitData = null;
let activePreset = "pugetMix";
let activeRouteIds = [];
let customRouteIds = new Set();
let prevStops = new Map();
let stopsPrimed = false;
let noteTimestamps = [];
let noteQueue = [];
let noteQueueTimer = null;
let lastRouteNoteAt = new Map();
let audioReady = false;
let muteHandlerAttached = false;
let presetGeneration = 0;

const $ = (id) => document.getElementById(id);

loadSettings();
initMuteButton();

if (hasVisited()) {
  $("splash").classList.add("hidden");
  $("app").classList.remove("hidden");
  syncMuteButton();
  start();
} else {
  $("enter-btn").addEventListener("click", async () => {
    await ensureAudioStarted();
    markVisited();
    $("splash").classList.add("hidden");
    $("app").classList.remove("hidden");
    start();
  });
}

function applyAudioSettings() {
  const s = getSettings();
  setVolume(s.volume);
  setReverbWet(s.reverbWet);
}

async function ensureAudioStarted() {
  if (audioReady) return;
  await initAudio();
  applyAudioSettings();
  setMuted(false);
  audioReady = true;
  syncMuteButton();
}

onSettingsChange((key) => {
  if (key === "volume" || key === "reverbWet" || key === null) applyAudioSettings();
  if (key === "noteRate" || key === null) restartNoteQueue();
});

async function start() {
  transitData = await fetch("/api/transit-data").then((r) => r.json());

  initMap($("map-container"));
  buildPresetUI();

  const saved = getLastPreset();
  const initialPreset = PRESETS[saved] ? saved : "pugetMix";
  if (initialPreset === "custom") {
    customRouteIds = new Set(getCustomRoutes());
  }
  setPreset(initialPreset);

  poll();
  setInterval(poll, POLL_MS);
  setInterval(updateClock, 1000);
  setInterval(updateNPM, 3000);
  updateClock();

  initModals();
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
  const savedCustom = new Set(getCustomRoutes());
  for (const route of transitData.routes) {
    const label = document.createElement("label");
    label.className = "route-toggle";
    label.style.setProperty("--route-color", `#${route.color || "666"}`);

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = route.route_id;
    if (savedCustom.has(route.route_id)) {
      cb.checked = true;
      customRouteIds.add(route.route_id);
    }
    cb.addEventListener("change", () => {
      cb.checked ? customRouteIds.add(route.route_id) : customRouteIds.delete(route.route_id);
      setCustomRoutes([...customRouteIds]);
      if (activePreset === "custom") refreshRoutes();
    });

    const dot = document.createElement("span");
    dot.className = "route-color-dot";
    dot.style.background = `#${route.color || "666"}`;

    const name = document.createElement("span");
    const displayName = route.long_name
      ? `${route.short_name} — ${route.long_name}`
      : route.short_name || route.route_id;
    name.textContent = displayName;

    label.append(cb, dot, name);
    routeList.appendChild(label);
  }
}

function resetView() {
  presetGeneration++;
  clearMap();
  disposeSynths();
  stopNoteQueue();
  deferredArrivals = [];
  prevStops.clear();
  stopsPrimed = false;
  noteTimestamps = [];
  lastRouteNoteAt.clear();
  $("recent-list").innerHTML = "";
  $("notes-per-min").textContent = "♫ 0/min";
}

function setPreset(name) {
  const presetName = PRESETS[name] ? name : "pugetMix";
  activePreset = presetName;
  setLastPreset(presetName);
  document.querySelectorAll(".preset-btn").forEach((b) => b.classList.toggle("active", b.dataset.preset === presetName));
  $("current-preset").textContent = PRESETS[presetName]?.name || "Custom";
  $("custom-section").classList.toggle("hidden", presetName !== "custom");
  updateSetting("scale", null);
  resetView();
  refreshRoutes();
}

function refreshRoutes() {
  activeRouteIds =
    activePreset === "custom"
      ? [...customRouteIds]
      : getPresetRouteIds(activePreset, transitData.routes);
  stopsPrimed = false;
  renderRoutes(transitData.routes, activeRouteIds);
}

let deferredArrivals = [];

function stopNoteQueue() {
  noteQueue = [];
  stopNoteTimer();
}

function stopNoteTimer() {
  if (noteQueueTimer) {
    clearInterval(noteQueueTimer);
    noteQueueTimer = null;
  }
}

function startNoteQueue() {
  if (noteQueueTimer) return;
  const intervalMs = 1000 / getEventSettings().noteRate;
  noteQueueTimer = setInterval(playQueuedNote, intervalMs);
}

function restartNoteQueue() {
  if (!noteQueueTimer) return;
  stopNoteTimer();
  startNoteQueue();
}

function enqueueNote(route, stop) {
  const { routeCooldownMs, maxNoteQueue } = getEventSettings();
  const now = Date.now();
  const lastPlayed = lastRouteNoteAt.get(route.route_id) || 0;
  if (now - lastPlayed < routeCooldownMs) return;
  lastRouteNoteAt.set(route.route_id, now);

  const event = { route, stop, presetName: activePreset, gen: presetGeneration };
  const pendingForRoute = noteQueue.findIndex((e) => e.route.route_id === route.route_id);
  if (pendingForRoute >= 0) {
    noteQueue[pendingForRoute] = event;
  } else {
    if (noteQueue.length >= maxNoteQueue) noteQueue.shift();
    noteQueue.push(event);
  }

  startNoteQueue();
}

function playQueuedNote() {
  if (noteQueue.length === 0) {
    stopNoteQueue();
    return;
  }

  const event = noteQueue.shift();
  if (!event || event.gen !== presetGeneration) return;

  const preset = PRESETS[event.presetName] || PRESETS.rapidride;
  const s = getSettings();
  const effectiveScale = s.scale || preset.scale;
  playNote(event.route, event.stop.sequence, preset.synth, effectiveScale);

  noteTimestamps.push(Date.now());
  addRecent(event.route, event.stop);
}

function scheduleArrivals(arrivals) {
  const s = getSettings();
  const { maxDeferredArrivals, maxDeferredFlush } = getEventSettings();
  const immThreshold = s.immediacy;
  const bankedFraction = s.burstTendency;
  const gen = presetGeneration;

  const guarded = (v) => () => { if (presetGeneration === gen) onArrival(v); };

  for (const v of arrivals) {
    const roll = Math.random();
    if (roll < immThreshold) {
      const delay = Math.random() * (POLL_MS - 200);
      setTimeout(guarded(v), delay);
    } else if (roll < immThreshold + (1 - immThreshold) * (1 - bankedFraction)) {
      const delay = POLL_MS + Math.random() * POLL_MS * 2;
      setTimeout(guarded(v), delay);
    } else {
      if (deferredArrivals.length >= maxDeferredArrivals) deferredArrivals.shift();
      deferredArrivals.push(v);
    }
  }

  if (deferredArrivals.length > 0 && Math.random() < 0.3) {
    const batch = deferredArrivals.splice(0, maxDeferredFlush);
    const baseDelay = Math.random() * POLL_MS;
    batch.forEach((v, i) => {
      setTimeout(guarded(v), baseDelay + i * (150 + Math.random() * 400));
    });
  }
}

async function poll() {
  try {
    const vehicles = await fetch("/api/vehicles").then((r) => r.json());
    const activeVehicles = vehicles.filter((v) => activeRouteIds.includes(v.route_id));

    if (!stopsPrimed) {
      for (const v of activeVehicles) {
        prevStops.set(v.vehicle_id, v.current_status === "STOPPED_AT" ? v.stop_id : null);
      }
      stopsPrimed = true;
      updateVehicles(vehicles, activeRouteIds);
      $("bus-count").textContent = `${activeVehicles.length} buses`;
      return;
    }

    const arrivals = [];
    for (const v of activeVehicles) {
      const prev = prevStops.get(v.vehicle_id);
      if (v.current_status === "STOPPED_AT" && v.stop_id && v.stop_id !== prev) {
        arrivals.push(v);
      }
      prevStops.set(v.vehicle_id, v.current_status === "STOPPED_AT" ? v.stop_id : null);
    }

    scheduleArrivals(arrivals);

    updateVehicles(vehicles, activeRouteIds);
    $("bus-count").textContent = `${activeVehicles.length} buses`;
  } catch (e) {
    console.error("poll:", e);
  }
}

function onArrival(vehicle) {
  const route = transitData.routes.find((r) => r.route_id === vehicle.route_id);
  if (!route) return;
  const stop = route.stops.find((s) => s.stop_id === vehicle.stop_id);
  if (!stop) return;

  flashStop(vehicle.stop_id, `#${route.color || "666"}`);
  enqueueNote(route, stop);
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

// ── Mute ──

function syncMuteButton(muted = audioReady ? isMuted() : true) {
  const btn = $("mute-btn");
  btn.textContent = muted ? "♪" : "♫";
  btn.classList.toggle("muted", muted);
  btn.disabled = false;
  btn.title = audioReady ? "Mute/Unmute" : "Start audio";
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = audioReady && !muted ? "playing" : "paused";
  }
}

async function toggleMute() {
  if (!audioReady) {
    try {
      await ensureAudioStarted();
    } catch (e) {
      console.error("audio start:", e);
      syncMuteButton(true);
    }
    return;
  }

  const muted = !isMuted();
  setMuted(muted);
  syncMuteButton(muted);
}

function initMuteButton() {
  if (muteHandlerAttached) return;
  $("mute-btn").addEventListener("click", toggleMute);
  muteHandlerAttached = true;
}

function initMediaSession() {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: "Puget Sound",
    artist: "Seattle Transit",
  });
  navigator.mediaSession.setActionHandler("play", async () => {
    await ensureAudioStarted();
    setMuted(false);
    syncMuteButton(false);
  });
  navigator.mediaSession.setActionHandler("pause", () => {
    setMuted(true);
    syncMuteButton(true);
  });
  syncMuteButton();
}

// ── Modals ──

function initModals() {
  $("info-btn").addEventListener("click", () => $("info-modal").classList.remove("hidden"));
  $("settings-btn").addEventListener("click", () => {
    setSettingsTab("sound");
    openSettingsModal();
  });
  initMuteButton();
  initMediaSession();

  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  });
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest(".modal-overlay").classList.add("hidden"));
  });
}

function openSettingsModal() {
  populateSettingsModal();
  $("settings-modal").classList.remove("hidden");
}

function populateSettingsModal() {
  const s = getSettings();
  const eventSettings = getEventSettings();
  const profileSettings = getProfileSettings();
  $("setting-volume").value = s.volume;
  $("volume-value").textContent = `${s.volume} dB`;
  $("setting-reverb").value = Math.round(s.reverbWet * 100);
  $("reverbWet-value").textContent = `${Math.round(s.reverbWet * 100)}%`;
  $("setting-immediacy").value = Math.round(s.immediacy * 100);
  $("immediacy-value").textContent = `${Math.round(s.immediacy * 100)}%`;
  $("setting-burst").value = Math.round(s.burstTendency * 100);
  $("burst-value").textContent = `${Math.round(s.burstTendency * 100)}%`;
  $("setting-noteRate").value = eventSettings.noteRate;
  $("noteRate-value").textContent = `${eventSettings.noteRate}/s`;
  $("setting-routeCooldownMs").value = eventSettings.routeCooldownMs;
  $("routeCooldownMs-value").textContent = `${eventSettings.routeCooldownMs} ms`;
  $("setting-maxNoteQueue").value = eventSettings.maxNoteQueue;
  $("maxNoteQueue-value").textContent = eventSettings.maxNoteQueue;
  $("setting-maxDeferredArrivals").value = eventSettings.maxDeferredArrivals;
  $("maxDeferredArrivals-value").textContent = eventSettings.maxDeferredArrivals;
  $("setting-maxDeferredFlush").value = eventSettings.maxDeferredFlush;
  $("maxDeferredFlush-value").textContent = eventSettings.maxDeferredFlush;
  $("setting-profileIntensity").value = Math.round(profileSettings.profileIntensity * 100);
  $("profileIntensity-value").textContent = `${Math.round(profileSettings.profileIntensity * 100)}%`;
  $("setting-profileBrightness").value = Math.round(profileSettings.profileBrightness * 100);
  $("profileBrightness-value").textContent = `${Math.round(profileSettings.profileBrightness * 100)}%`;
  $("setting-stereoWidth").value = Math.round(profileSettings.stereoWidth * 100);
  $("stereoWidth-value").textContent = `${Math.round(profileSettings.stereoWidth * 100)}%`;

  const durKeys = ["dur:0.15", "dur:0.3", "dur:0.6", "dur:1.2", "dur:2.5", "dur:4.0"];
  for (const k of durKeys) {
    const el = $(`setting-${k}`);
    const valEl = $(`${k}-value`);
    if (el) el.value = s[k];
    if (valEl) valEl.textContent = s[k];
  }

  const effectiveScale = s.scale || (PRESETS[activePreset]?.scale ?? "pentatonic");
  document.querySelectorAll(".scale-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.scale === effectiveScale);
  });
}

function setSettingsTab(name) {
  document.querySelectorAll(".settings-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsTab === name);
  });
  document.querySelectorAll(".settings-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.dataset.settingsPane === name);
  });
}

function setupSettingsHandlers() {
  function slider(id, key, format, transform) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      const raw = Number(el.value);
      const val = transform ? transform(raw) : raw;
      updateSetting(key, val);
      const valEl = $(key.replace(":", "-") + "-value") || $(`${key}-value`);
      if (valEl) valEl.textContent = format(raw);
    });
  }

  slider("setting-volume", "volume", (v) => `${v} dB`);
  slider("setting-reverb", "reverbWet", (v) => `${v}%`, (v) => v / 100);
  slider("setting-immediacy", "immediacy", (v) => `${v}%`, (v) => v / 100);
  slider("setting-burst", "burstTendency", (v) => `${v}%`, (v) => v / 100);
  slider("setting-noteRate", "noteRate", (v) => `${v}/s`);
  slider("setting-routeCooldownMs", "routeCooldownMs", (v) => `${v} ms`);
  slider("setting-maxNoteQueue", "maxNoteQueue", (v) => `${v}`);
  slider("setting-maxDeferredArrivals", "maxDeferredArrivals", (v) => `${v}`);
  slider("setting-maxDeferredFlush", "maxDeferredFlush", (v) => `${v}`);
  slider("setting-profileIntensity", "profileIntensity", (v) => `${v}%`, (v) => v / 100);
  slider("setting-profileBrightness", "profileBrightness", (v) => `${v}%`, (v) => v / 100);
  slider("setting-stereoWidth", "stereoWidth", (v) => `${v}%`, (v) => v / 100);

  const durKeys = ["dur:0.15", "dur:0.3", "dur:0.6", "dur:1.2", "dur:2.5", "dur:4.0"];
  for (const k of durKeys) {
    const el = $(`setting-${k}`);
    if (!el) continue;
    el.addEventListener("input", () => {
      const val = Number(el.value);
      updateSetting(k, val);
      const valEl = $(`${k}-value`);
      if (valEl) valEl.textContent = val;
    });
  }

  document.querySelectorAll(".scale-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = PRESETS[activePreset];
      const chosen = btn.dataset.scale;
      const override = preset && chosen === preset.scale ? null : chosen;
      updateSetting("scale", override);
      document.querySelectorAll(".scale-btn").forEach((b) => b.classList.toggle("active", b.dataset.scale === chosen));
    });
  });

  document.querySelectorAll(".settings-tab").forEach((btn) => {
    btn.addEventListener("click", () => setSettingsTab(btn.dataset.settingsTab));
  });

  $("settings-reset")?.addEventListener("click", () => {
    resetSettings();
    populateSettingsModal();
  });
}

setupSettingsHandlers();
