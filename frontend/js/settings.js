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
  scale: null,
};

const PREFIX = "ps:";
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

export function loadSettings() {
  settings = {};
  for (const [key, def] of Object.entries(DEFAULTS)) {
    settings[key] = read(key, def);
  }
}

export function getSettings() {
  return settings;
}

export function updateSetting(key, value) {
  settings[key] = value;
  write(key, value);
  listeners.forEach((fn) => fn(key, value, settings));
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
    [0.15, settings["dur:0.15"]],
    [0.3, settings["dur:0.3"]],
    [0.6, settings["dur:0.6"]],
    [1.2, settings["dur:1.2"]],
    [2.5, settings["dur:2.5"]],
    [4.0, settings["dur:4.0"]],
  ];
}

export { DEFAULTS };
