export type RouteCoordinate = {
  lat: number;
  lng: number;
};

export type RouteTravelMode = "car" | "foot";

export type CampusRouteResult = {
  path: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  source: "road";
  mode: RouteTravelMode;
};

export function getDirectDistanceMeters(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
) {
  const earthRadiusMeters = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const destinationLat = toRadians(destination.lat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(deltaLng / 2) ** 2;

  return (
    2 *
    earthRadiusMeters *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function formatRouteDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;

  return `${Math.max(1, Math.round(meters))} m`;
}

export function formatRouteDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));

  return `${minutes} min`;
}

async function getRoadRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  mode: RouteTravelMode,
): Promise<CampusRouteResult> {
  const response = await fetch("/api/map-routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, mode }),
  }).catch(() => null);

  if (!response) {
    throw new Error(
      "Road routing is temporarily unavailable. Please try again shortly.",
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(payload?.error ?? "Road routing service is unavailable.");
  }

  const payload = (await response.json()) as CampusRouteResult;

  if (!Number.isFinite(payload.distanceMeters)) {
    throw new Error("Road routing service returned an invalid route.");
  }

  const path = payload.path
    .filter(
      (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
    );

  if (path.length < 2) {
    throw new Error("Road routing service returned an invalid route.");
  }

  return {
    path,
    distanceMeters: payload.distanceMeters,
    durationSeconds: Number(
      payload.durationSeconds ?? payload.distanceMeters / 1.4,
    ),
    source: "road",
    mode,
  };
}

export async function getCampusRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  mode: RouteTravelMode,
) {
  return getRoadRoute(origin, destination, mode);
}
