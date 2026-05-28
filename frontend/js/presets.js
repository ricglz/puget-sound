export const PRESETS = {
  rapidride: {
    name: "RapidRide",
    description: "High-frequency bus network (C, D, E lines)",
    routePatterns: ["C Line", "D Line", "E Line"],
    synth: "am",
    scale: "pentatonic",
  },
  link: {
    name: "Link Light Rail",
    description: "Sound Transit rail",
    routePatterns: ["1 Line", "2 Line"],
    synth: "fm",
    scale: "dorian",
  },
  all: {
    name: "Everything",
    description: "Every active route",
    routePatterns: ["*"],
    synth: "triangle",
    scale: "pentatonic",
  },
  custom: {
    name: "Custom",
    description: "Pick your own routes",
    routePatterns: [],
    synth: "am",
    scale: "pentatonic",
  },
};

export function matchesPreset(route, presetName) {
  const preset = PRESETS[presetName];
  if (!preset) return false;
  if (preset.routePatterns.includes("*")) return true;
  if (preset.routePatterns.length === 0) return false;
  const name = route.short_name || route.long_name || "";
  return preset.routePatterns.some(
    (p) => name.includes(p) || route.route_id.includes(p),
  );
}

export function getPresetRouteIds(presetName, routes) {
  return routes.filter((r) => matchesPreset(r, presetName)).map((r) => r.route_id);
}
