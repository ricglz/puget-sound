const DEFAULTS = {
  volume: -8,
  reverbWet: 0.35,
  "dur:0.15": 40,
  "dur:0.3": 25,
  "dur:0.6": 15,
  "dur:1.2": 10,
  "dur:2.5": 7,
  "dur:4.0": 3,
  immediacy: 0.55,
  burstTendency: 0.33,
  noteRate: 9,
  routeCooldownMs: 450,
  maxNoteQueue: 80,
  maxDeferredArrivals: 80,
  maxDeferredFlush: 30,
  profileIntensity: 1,
  profileBrightness: 1,
  stereoWidth: 1,
  scale: null,
};

const PREFIX = "ps:";
const DURATION_KEYS = ["dur:0.15", "dur:0.3", "dur:0.6", "dur:1.2", "dur:2.5", "dur:4.0"];
const NUMERIC_RANGES = {
  volume: [-20, 0],
  reverbWet: [0, 1],
  immediacy: [0, 1],
  burstTendency: [0, 1],
  noteRate: [2, 16],
  routeCooldownMs: [0, 1500],
  maxNoteQueue: [10, 200],
  maxDeferredArrivals: [10, 200],
  maxDeferredFlush: [5, 80],
  profileIntensity: [0, 1.5],
  profileBrightness: [0.5, 1.5],
  stereoWidth: [0, 1.5],
};

let settings = {};
let listeners = [];

function read(key, fallback) {
  const raw = localStorage.getItem(PREFIX + key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function write(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeNumber(value, fallback, min, max) {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return clamp(safeValue, min, max);
}

function normalizeDurationWeight(value, fallback) {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return clamp(safeValue, 0, 100);
}

function normalizeSetting(key, value) {
  if (DURATION_KEYS.includes(key)) {
    return normalizeDurationWeight(value, 0);
  }
  const range = NUMERIC_RANGES[key];
  if (range) {
    return normalizeNumber(value, DEFAULTS[key], range[0], range[1]);
  }
  return value;
}

function numberSetting(key, min, max) {
  return normalizeNumber(settings[key], DEFAULTS[key], min, max);
}

function durationWeightSetting(key) {
  return normalizeDurationWeight(settings[key], 0);
}

export function loadSettings() {
  settings = {};
  for (const [key, def] of Object.entries(DEFAULTS)) {
    settings[key] = normalizeSetting(key, read(key, def));
  }
}

export function getSettings() {
  return settings;
}

export function updateSetting(key, value) {
  const normalized = normalizeSetting(key, value);
  settings[key] = normalized;
  write(key, normalized);
  listeners.forEach((fn) => fn(key, normalized, settings));
}

export function onSettingsChange(fn) {
  listeners.push(fn);
}

export function resetSettings() {
  for (const [key, def] of Object.entries(DEFAULTS)) {
    settings[key] = def;
    if (def === null) {
      remove(key);
    } else {
      write(key, def);
    }
  }
  listeners.forEach((fn) => fn(null, null, settings));
}

export function hasVisited() {
  return localStorage.getItem(PREFIX + "visited") === "1";
}

export function markVisited() {
  localStorage.setItem(PREFIX + "visited", "1");
}

export function getLastPreset() {
  return read("preset", "pugetMix");
}

export function setLastPreset(name) {
  write("preset", name);
}

export function getCustomRoutes() {
  return read("customRoutes", []);
}

export function setCustomRoutes(ids) {
  write("customRoutes", ids);
}

export function getDurationWeights() {
  return [
    [0.15, durationWeightSetting("dur:0.15")],
    [0.3, durationWeightSetting("dur:0.3")],
    [0.6, durationWeightSetting("dur:0.6")],
    [1.2, durationWeightSetting("dur:1.2")],
    [2.5, durationWeightSetting("dur:2.5")],
    [4.0, durationWeightSetting("dur:4.0")],
  ];
}

export function getAudioSettings() {
  return {
    volume: numberSetting("volume", -20, 0),
    reverbWet: numberSetting("reverbWet", 0, 1),
  };
}

export function getTimingSettings() {
  return {
    immediacy: numberSetting("immediacy", 0, 1),
    burstTendency: numberSetting("burstTendency", 0, 1),
  };
}

export function getEventSettings() {
  return {
    noteRate: numberSetting("noteRate", 2, 16),
    routeCooldownMs: numberSetting("routeCooldownMs", 0, 1500),
    maxNoteQueue: numberSetting("maxNoteQueue", 10, 200),
    maxDeferredArrivals: numberSetting("maxDeferredArrivals", 10, 200),
    maxDeferredFlush: numberSetting("maxDeferredFlush", 5, 80),
  };
}

export function getProfileSettings() {
  return {
    profileIntensity: numberSetting("profileIntensity", 0, 1.5),
    profileBrightness: numberSetting("profileBrightness", 0.5, 1.5),
    stereoWidth: numberSetting("stereoWidth", 0, 1.5),
  };
}

export { DEFAULTS };
