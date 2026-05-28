/* global L */

let map;
let routeLayers = [];
let stopMarkers = new Map();
let vehicleMarkers = new Map();

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
}

export function renderRoutes(routes, activeRouteIds) {
  routeLayers.forEach((l) => map.removeLayer(l));
  routeLayers = [];
  stopMarkers.forEach((s) => map.removeLayer(s.marker));
  stopMarkers.clear();

  const active = routes.filter((r) => activeRouteIds.includes(r.route_id));

  for (const route of active) {
    const color = `#${route.color || "666666"}`;

    if (route.stops.length > 1) {
      const latlngs = route.stops.map((s) => [s.lat, s.lon]);
      const line = L.polyline(latlngs, {
        color,
        weight: 3,
        opacity: 0.45,
        smoothFactor: 1.5,
      }).addTo(map);
      routeLayers.push(line);
    }

    for (const stop of route.stops) {
      const marker = L.circleMarker([stop.lat, stop.lon], {
        radius: 4,
        color: "transparent",
        fillColor: color,
        fillOpacity: 0.6,
      }).addTo(map);
      marker.bindTooltip(stop.name, {
        className: "stop-tooltip",
        direction: "top",
        offset: [0, -6],
      });
      stopMarkers.set(stop.stop_id, { marker, color, lat: stop.lat, lon: stop.lon });
    }
  }
}

export function updateVehicles(vehicles, activeRouteIds) {
  const active = vehicles.filter((v) => activeRouteIds.includes(v.route_id));
  const activeIds = new Set(active.map((v) => v.vehicle_id));

  for (const [id, marker] of vehicleMarkers) {
    if (!activeIds.has(id)) {
      map.removeLayer(marker);
      vehicleMarkers.delete(id);
    }
  }

  for (const v of active) {
    if (vehicleMarkers.has(v.vehicle_id)) {
      vehicleMarkers.get(v.vehicle_id).setLatLng([v.latitude, v.longitude]);
    } else {
      const marker = L.circleMarker([v.latitude, v.longitude], {
        radius: 5,
        color: "transparent",
        fillColor: "#fff",
        fillOpacity: 0.85,
      }).addTo(map);
      vehicleMarkers.set(v.vehicle_id, marker);
    }
  }
}

export function flashStop(stopId, color) {
  const s = stopMarkers.get(stopId);
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
    }
  }, 30);
}
