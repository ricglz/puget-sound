/* global d3 */

let svg, g;
let projection;
let routeGroup, stopGroup, vehicleGroup, flashGroup;
let stopElements = new Map();

const BOUNDS = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-122.46, 47.4],
        [-122.46, 47.82],
        [-122.22, 47.82],
        [-122.22, 47.4],
        [-122.46, 47.4],
      ],
    ],
  },
};

export function initMap(container) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
  g = svg.append("g");

  projection = d3.geoMercator().fitSize([width * 0.75, height * 0.88], BOUNDS);
  const [tx, ty] = projection.translate();
  projection.translate([tx - width * 0.05, ty]);

  routeGroup = g.append("g").attr("class", "routes");
  stopGroup = g.append("g").attr("class", "stops");
  flashGroup = g.append("g").attr("class", "flashes");
  vehicleGroup = g.append("g").attr("class", "vehicles");

  const zoom = d3.zoom().scaleExtent([0.5, 10]).on("zoom", (e) => g.attr("transform", e.transform));
  svg.call(zoom);
}

export function renderRoutes(routes, activeRouteIds) {
  routeGroup.selectAll("*").remove();
  stopGroup.selectAll("*").remove();
  stopElements.clear();

  const active = routes.filter((r) => activeRouteIds.includes(r.route_id));

  for (const route of active) {
    const color = `#${route.color || "666666"}`;

    if (route.stops.length > 1) {
      const pts = route.stops.map((s) => projection([s.lon, s.lat]));
      routeGroup
        .append("path")
        .datum(pts)
        .attr("d", d3.line().curve(d3.curveCatmullRom.alpha(0.5)))
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2.5)
        .attr("stroke-opacity", 0.35)
        .attr("stroke-linecap", "round");
    }

    for (const stop of route.stops) {
      const [x, y] = projection([stop.lon, stop.lat]);
      const el = stopGroup
        .append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 3)
        .attr("fill", color)
        .attr("fill-opacity", 0.55);
      el.append("title").text(stop.name);
      stopElements.set(stop.stop_id, { x, y, color });
    }
  }
}

export function updateVehicles(vehicles, activeRouteIds) {
  const data = vehicles.filter((v) => activeRouteIds.includes(v.route_id));

  const sel = vehicleGroup.selectAll(".vehicle").data(data, (d) => d.vehicle_id);

  sel.exit().remove();

  sel
    .enter()
    .append("circle")
    .attr("class", "vehicle")
    .attr("r", 4)
    .attr("fill", "#fff")
    .attr("fill-opacity", 0.85)
    .merge(sel)
    .transition()
    .duration(2000)
    .ease(d3.easeLinear)
    .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
    .attr("cy", (d) => projection([d.longitude, d.latitude])[1]);
}

export function flashStop(stopId, color) {
  const s = stopElements.get(stopId);
  if (!s) return;

  flashGroup
    .append("circle")
    .attr("cx", s.x)
    .attr("cy", s.y)
    .attr("r", 3)
    .attr("fill", "none")
    .attr("stroke", color || s.color)
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 0.9)
    .transition()
    .duration(1200)
    .attr("r", 22)
    .attr("stroke-opacity", 0)
    .remove();
}
