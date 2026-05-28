export const PRESETS = {
  rapidride: {
    name: "RapidRide",
    description: "All RapidRide lines (A, C, D, E, G, H)",
    routePatterns: ["A Line", "C Line", "D Line", "E Line", "G Line", "H Line"],
    synth: "am",
    scale: "pentatonic",
  },
  top10: {
    name: "Top 10",
    description: "Metro's most productive routes by ridership",
    routePatterns: ["A Line", "E Line", "D Line", "G Line", "H Line", "route_7", "route_8", "route_44", "route_45", "route_67", "route_2"],
    synth: "triangle",
    scale: "mixolydian",
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
