/* global L */

let map;
let routeGroup;
let stopGroup;
let vehicleGroup;
let stopLookup = new Map();
let vehicleMarkers = new Map();
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
  vehicleMarkers.clear();
  clearFlashes();
}

export function renderRoutes(routes, activeRouteIds) {
  clearMap();

  const active = routes.filter((r) => hasRoute(activeRouteIds, r.route_id));

  for (const route of active) {
    const color = `#${route.color || "666666"}`;

    if (route.stops.length > 1) {
      const latlngs = route.stops.map((s) => [s.lat, s.lon]);
      const label = route.long_name
        ? `${route.short_name} — ${route.long_name}`
        : route.short_name;
      L.polyline(latlngs, {
        color,
        weight: 3,
        opacity: 0.45,
        smoothFactor: 1.5,
      }).bindTooltip(label, {
        className: "stop-tooltip",
        sticky: true,
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
  const seen = new Set();

  for (const v of vehicles) {
    if (!hasRoute(activeRouteIds, v.route_id)) continue;
    const lat = Number(v.latitude);
    const lon = Number(v.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    seen.add(v.vehicle_id);
    const latLng = [lat, lon];
    const marker = vehicleMarkers.get(v.vehicle_id);
    if (marker) {
      marker.setLatLng(latLng);
    } else {
      vehicleMarkers.set(
        v.vehicle_id,
        L.circleMarker(latLng, {
          radius: 5,
          color: "transparent",
          fillColor: "#fff",
          fillOpacity: 0.85,
        }).addTo(vehicleGroup),
      );
    }
  }

  for (const [vehicleId, marker] of vehicleMarkers) {
    if (seen.has(vehicleId)) continue;
    vehicleGroup.removeLayer(marker);
    vehicleMarkers.delete(vehicleId);
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

function hasRoute(activeRouteIds, routeId) {
  return activeRouteIds instanceof Set
    ? activeRouteIds.has(routeId)
    : activeRouteIds.includes(routeId);
}
