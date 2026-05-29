export const PRESETS = {
  pugetMix: {
    name: "Puget Mix",
    description: "Balanced mix of RapidRide, Link, and frequent Seattle routes",
    routePatterns: [
      "A Line", "B Line", "C Line", "D Line", "E Line", "F Line", "G Line", "H Line",
      "1 Line", "2 Line",
      "7", "8", "40", "44", "45", "48", "60", "62", "67", "70", "75",
      "550",
    ],
    synth: "triangle",
    scale: "mixolydian",
  },
  rapidride: {
    name: "RapidRide",
    description: "All RapidRide lines (A, B, C, D, E, F, G, H)",
    routePatterns: ["A Line", "B Line", "C Line", "D Line", "E Line", "F Line", "G Line", "H Line"],
    synth: "am",
    scale: "pentatonic",
  },
  seattleCore: {
    name: "Seattle Core",
    description: "Frequent Seattle bus routes",
    routePatterns: [
      "2", "3", "4", "7", "8", "10", "11", "12", "13", "14",
      "21", "24", "28", "31", "32", "33", "36", "40", "44", "45",
      "48", "49", "50", "60", "62", "65", "67", "70", "75",
    ],
    synth: "am",
    scale: "dorian",
  },
  top10: {
    name: "High-Ridership",
    description: "Metro's highest-ridership routes plus key additions",
    routePatterns: [
      "A Line", "B Line", "D Line", "E Line", "F Line", "G Line", "H Line",
      "2", "7", "8", "40", "44", "45", "48", "67",
    ],
    synth: "triangle",
    scale: "mixolydian",
  },
  stExpress: {
    name: "ST Express",
    description: "Sound Transit express buses",
    routePatterns: ["522", "542", "545", "550", "554", "556", "566", "570"],
    synth: "triangle",
    scale: "pentatonic",
  },
  link: {
    name: "Link Light Rail",
    description: "Sound Transit Link light rail",
    routePatterns: ["1 Line", "2 Line", "T Line"],
    synth: "fm",
    scale: "dorian",
  },
  regionalRail: {
    name: "Regional Rail",
    description: "Link light rail, Tacoma Link, and Sounder",
    routePatterns: ["1 Line", "2 Line", "T Line", "N Line", "S Line"],
    synth: "fm",
    scale: "dorian",
  },
  streetcars: {
    name: "Streetcars",
    description: "Seattle streetcar routes",
    routePatterns: ["First Hill Streetcar", "South Lake Union Streetcar"],
    synth: "am",
    scale: "pentatonic",
  },
  all: {
    name: "Everything",
    description: "Every route in the curated dataset",
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
    (p) => name === p || route.route_id === p,
  );
}

export function getPresetRouteIds(presetName, routes) {
  return routes.filter((r) => matchesPreset(r, presetName)).map((r) => r.route_id);
}
