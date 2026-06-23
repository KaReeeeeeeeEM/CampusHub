import { NextResponse } from "next/server";

import type { RouteTravelMode } from "@/components/maps/route-service";

type RouteCoordinate = {
  lat: number;
  lng: number;
};

type RouteRequestBody = {
  origin?: RouteCoordinate;
  destination?: RouteCoordinate;
  mode?: RouteTravelMode;
};

type RouteProviderResult = {
  path: RouteCoordinate[];
  distanceMeters: number;
  durationSeconds: number;
  provider: string;
};

type OsrmRouteResponse = {
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

type OpenRouteServiceResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
    properties?: {
      summary?: {
        distance?: number;
        duration?: number;
      };
    };
  }>;
};

const routeTimeoutMs = 15_000;

function isValidCoordinate(value: unknown): value is RouteCoordinate {
  if (!value || typeof value !== "object") return false;

  const coordinate = value as RouteCoordinate;

  return Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lng);
}

function getDirectDistanceMeters(
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

function isValidRoutePath(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  path: RouteCoordinate[],
) {
  if (path.length < 2) return false;

  const validPoints = path.every(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
  );

  if (!validPoints) return false;

  const directDistance = getDirectDistanceMeters(origin, destination);

  if (directDistance > 100 && path.length < 3) {
    return false;
  }

  return true;
}

async function fetchJson<T>(
  url: URL | string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(routeTimeoutMs),
  }).catch(() => null);

  if (!response) {
    throw new Error("Route provider is unreachable.");
  }

  if (!response.ok) {
    throw new Error(`Route provider failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

function parseOsrmRoute(
  payload: OsrmRouteResponse,
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  provider: string,
): RouteProviderResult {
  const route = payload.routes?.[0];
  const path =
    route?.geometry?.coordinates
      ?.map(([lng, lat]) => ({ lat, lng }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)) ??
    [];

  if (
    !route ||
    !Number.isFinite(route.distance) ||
    !isValidRoutePath(origin, destination, path)
  ) {
    throw new Error(`${provider} returned an invalid route.`);
  }

  return {
    path,
    distanceMeters: Number(route.distance),
    durationSeconds: Number(route.duration ?? 0),
    provider,
  };
}

function parseOpenRouteServiceRoute(
  payload: OpenRouteServiceResponse,
  origin: RouteCoordinate,
  destination: RouteCoordinate,
): RouteProviderResult {
  const feature = payload.features?.[0];
  const summary = feature?.properties?.summary;
  const path =
    feature?.geometry?.coordinates
      ?.map(([lng, lat]) => ({ lat, lng }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)) ??
    [];

  if (
    !summary ||
    !Number.isFinite(summary.distance) ||
    !isValidRoutePath(origin, destination, path)
  ) {
    throw new Error("OpenRouteService returned an invalid route.");
  }

  return {
    path,
    distanceMeters: Number(summary.distance),
    durationSeconds: Number(summary.duration ?? 0),
    provider: "openrouteservice",
  };
}

async function getOpenRouteServiceRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  mode: RouteTravelMode,
) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    throw new Error("OpenRouteService is not configured.");
  }

  const profile = mode === "car" ? "driving-car" : "foot-walking";
  const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;
  const payload = await fetchJson<OpenRouteServiceResponse>(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: apiKey,
      "Content-Type": "application/json",
      "User-Agent": "CampusHub map route resolver",
    },
    body: JSON.stringify({
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
    }),
  });

  return parseOpenRouteServiceRoute(payload, origin, destination);
}

async function getOsrmRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  baseUrl: string,
  provider: string,
) {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = new URL(`${baseUrl}/${coordinates}`);

  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");

  const payload = await fetchJson<OsrmRouteResponse>(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "CampusHub map route resolver",
    },
    next: { revalidate: 60 },
  });

  return parseOsrmRoute(payload, origin, destination, provider);
}

async function resolveRoadRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  mode: RouteTravelMode,
) {
  const providers: Array<() => Promise<RouteProviderResult>> = [];

  if (process.env.OPENROUTESERVICE_API_KEY) {
    providers.push(() => getOpenRouteServiceRoute(origin, destination, mode));
  }

  if (mode === "car") {
    providers.push(
      () =>
        getOsrmRoute(
          origin,
          destination,
          "https://routing.openstreetmap.de/routed-car/route/v1/driving",
          "openstreetmap-de-car",
        ),
      () =>
        getOsrmRoute(
          origin,
          destination,
          "https://router.project-osrm.org/route/v1/driving",
          "osrm-demo-car",
        ),
    );
  } else {
    providers.push(() =>
      getOsrmRoute(
        origin,
        destination,
        "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
        "openstreetmap-de-foot",
      ),
    );
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Provider failed.");
    }
  }

  throw new Error(errors[errors.length - 1] ?? "Road routing is unavailable.");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RouteRequestBody | null;

  if (
    !body ||
    !isValidCoordinate(body.origin) ||
    !isValidCoordinate(body.destination) ||
    (body.mode !== "car" && body.mode !== "foot")
  ) {
    return NextResponse.json(
      { error: "Valid origin, destination, and travel mode are required." },
      { status: 400 },
    );
  }

  try {
    const route = await resolveRoadRoute(
      body.origin,
      body.destination,
      body.mode,
    );

    return NextResponse.json({
      path: route.path,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      source: "road",
      provider: route.provider,
      mode: body.mode,
    });
  } catch (error) {
    console.warn(
      "Unable to resolve road route.",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      {
        error:
          "Road routing is temporarily unavailable. Please try again shortly.",
      },
      { status: 502 },
    );
  }
}
