/* global L */

let map;
let routeGroup;
let stopGroup;
let vehicleGroup;
let stopLookup = new Map();
let activeFlashes = [];

export function initMap(container) {
  map = L.map(container, {
    center: [47.61, -122.33],
    zoom: 11,
    zoomControl: false,
    attributionControl: false,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    subdomains: "abcd",
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  routeGroup = L.layerGroup().addTo(map);
  stopGroup = L.layerGroup().addTo(map);
  vehicleGroup = L.layerGroup().addTo(map);
}

export function clearMap() {
  routeGroup.clearLayers();
  stopGroup.clearLayers();
  vehicleGroup.clearLayers();
  stopLookup.clear();
  clearFlashes();
}

export function renderRoutes(routes, activeRouteIds) {
  clearMap();

  const active = routes.filter((r) => activeRouteIds.includes(r.route_id));

  for (const route of active) {
    const color = `#${route.color || "666666"}`;

    if (route.stops.length > 1) {
      const latlngs = route.stops.map((s) => [s.lat, s.lon]);
      L.polyline(latlngs, {
        color,
        weight: 3,
        opacity: 0.45,
        smoothFactor: 1.5,
      }).addTo(routeGroup);
    }

    for (const stop of route.stops) {
      const marker = L.circleMarker([stop.lat, stop.lon], {
        radius: 4,
        color: "transparent",
        fillColor: color,
        fillOpacity: 0.6,
      }).addTo(stopGroup);
      marker.bindTooltip(stop.name, {
        className: "stop-tooltip",
        direction: "top",
        offset: [0, -6],
      });
      stopLookup.set(stop.stop_id, { color, lat: stop.lat, lon: stop.lon });
    }
  }
}

export function updateVehicles(vehicles, activeRouteIds) {
  vehicleGroup.clearLayers();

  const active = vehicles.filter((v) => activeRouteIds.includes(v.route_id));
  for (const v of active) {
    L.circleMarker([v.latitude, v.longitude], {
      radius: 5,
      color: "transparent",
      fillColor: "#fff",
      fillOpacity: 0.85,
    }).addTo(vehicleGroup);
  }
}

export function flashStop(stopId, color) {
  const s = stopLookup.get(stopId);
  if (!s) return;

  const flash = L.circleMarker([s.lat, s.lon], {
    radius: 4,
    color: color || s.color,
    weight: 2,
    fillOpacity: 0,
    opacity: 0.9,
  }).addTo(map);

  let r = 4;
  const interval = setInterval(() => {
    r += 1.5;
    const opacity = Math.max(0, 0.9 - (r - 4) / 20);
    flash.setRadius(r);
    flash.setStyle({ opacity });
    if (opacity <= 0) {
      clearInterval(interval);
      map.removeLayer(flash);
      activeFlashes = activeFlashes.filter((f) => f.marker !== flash);
    }
  }, 30);

  activeFlashes.push({ marker: flash, interval });
}

function clearFlashes() {
  for (const f of activeFlashes) {
    clearInterval(f.interval);
    map.removeLayer(f.marker);
  }
  activeFlashes = [];
}
