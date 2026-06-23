"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DivIcon,
  LatLngExpression,
  LayerGroup,
  Map as LeafletMap,
} from "leaflet";

import type { RouteCoordinate } from "@/components/maps/route-service";

type CampusMapLocation = {
  id: string;
  name: string;
  category: string;
  code?: string;
  description?: string;
  coordinates?: string;
};

type CampusMapRoutePoint = {
  lat: number;
  lng: number;
  label: string;
};

type CampusMapRoute = {
  origin: CampusMapRoutePoint;
  destinationId: string;
  path?: RouteCoordinate[];
};

type OpenStreetMapProps = {
  locations: CampusMapLocation[];
  selectedLocationId?: string;
  routeDestinationId?: string;
  route?: CampusMapRoute | null;
  onSelectLocation?: (locationId: string) => void;
  className?: string;
  center?: LatLngExpression;
  editableMarker?: { lat: number; lng: number } | null;
  editableMarkerLabel?: string;
  onEditableMarkerChange?: (coordinates: { lat: number; lng: number }) => void;
};

const campusCenter: LatLngExpression = [-6.7786, 39.2054];

const fallbackCoordinates: LatLngExpression[] = [
  [-6.7786, 39.2054],
  [-6.7768, 39.2041],
  [-6.7802, 39.2063],
  [-6.7794, 39.2032],
  [-6.7812, 39.2071],
  [-6.7775, 39.2068],
];

function getLocationCoordinates(
  location: CampusMapLocation,
  index: number,
): LatLngExpression {
  if (location.coordinates) {
    const [lat, lng] = location.coordinates
      .split(",")
      .map((value) => Number(value.trim()));

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lat, lng];
    }
  }

  return fallbackCoordinates[index % fallbackCoordinates.length];
}

function toCoordinatePair(coordinates: LatLngExpression) {
  if (Array.isArray(coordinates)) {
    return { lat: Number(coordinates[0]), lng: Number(coordinates[1]) };
  }

  return { lat: coordinates.lat, lng: coordinates.lng };
}

function isValidRoutePath(path: RouteCoordinate[] | undefined) {
  return (
    Array.isArray(path) &&
    path.length >= 2 &&
    path.every(
      (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
    )
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createCampusIcon(
  L: typeof import("leaflet"),
  active: boolean,
  destination: boolean,
): DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 38],
    popupAnchor: [0, -38],
    tooltipAnchor: [0, -36],
    html: `<span class="campushub-map-marker${active ? " campushub-map-marker-active" : ""}${destination ? " campushub-map-marker-destination" : ""}"></span>`,
  });
}

export function OpenStreetMap({
  locations,
  selectedLocationId,
  routeDestinationId,
  route,
  onSelectLocation,
  className,
  center = campusCenter,
  editableMarker,
  editableMarkerLabel = "Selected location",
  onEditableMarkerChange,
}: OpenStreetMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function mountMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await import("leaflet");

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(center, 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20,
      }).addTo(map);

      L.control.scale({ imperial: false }).addTo(map);

      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
      window.setTimeout(() => map.invalidateSize(), 0);
    }

    void mountMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderMarkers() {
      if (!mapReady || !mapRef.current || !layerRef.current) return;

      const L = await import("leaflet");

      if (cancelled || !mapRef.current || !layerRef.current) return;

      mapRef.current.invalidateSize();
      layerRef.current.clearLayers();

      const bounds: LatLngExpression[] = [];
      let destinationCoordinates: LatLngExpression | null = null;
      let destinationName = "";

      locations.forEach((location, index) => {
        const coordinates = getLocationCoordinates(location, index);
        const active = selectedLocationId === location.id;
        const destination = routeDestinationId === location.id;

        if (route?.destinationId === location.id) {
          destinationCoordinates = coordinates;
          destinationName = location.name;
        }

        bounds.push(coordinates);

        const marker = L.marker(coordinates, {
          icon: createCampusIcon(L, active, destination),
          title: location.name,
        });

        marker
          .bindTooltip(
            `<strong>${escapeHtml(location.name)}</strong><br />${escapeHtml(location.category)}`,
            {
              direction: "top",
              offset: [0, -4],
              opacity: 0.96,
            },
          )
          .bindPopup(
            `<strong>${escapeHtml(location.name)}</strong><br /><span>${escapeHtml(location.code ?? location.category)}</span>`,
          )
          .addTo(layerRef.current!);

        if (onSelectLocation) {
          marker.on("click", () => onSelectLocation(location.id));
        }

        if (active) {
          marker.openPopup();
          if (!route) {
            mapRef.current?.setView(coordinates, 17, { animate: true });
          }
        }
      });

      if (route && destinationCoordinates) {
        const originCoordinates: LatLngExpression = [
          route.origin.lat,
          route.origin.lng,
        ];
        const hasRoadPath = isValidRoutePath(route.path);
        const routeCoordinates: LatLngExpression[] = hasRoadPath
          ? route.path!.map((point) => [point.lat, point.lng])
          : [];
        const destinationPair = toCoordinatePair(destinationCoordinates);

        if (hasRoadPath) {
          L.polyline(routeCoordinates, {
            color: "#22c55e",
            lineCap: "round",
            lineJoin: "round",
            opacity: 0.95,
            weight: 5,
          }).addTo(layerRef.current);
        }

        L.circleMarker(originCoordinates, {
          radius: 8,
          color: "#0ea5e9",
          fillColor: "#0ea5e9",
          fillOpacity: 0.95,
          weight: 3,
        })
          .bindPopup(
            `<strong>${escapeHtml(route.origin.label)}</strong><br /><span>Route start</span>`,
          )
          .addTo(layerRef.current);

        L.circleMarker(destinationCoordinates, {
          radius: 8,
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 0.95,
          weight: 3,
        })
          .bindPopup(
            `<strong>${escapeHtml(destinationName)}</strong><br /><span>${destinationPair.lat.toFixed(6)}, ${destinationPair.lng.toFixed(6)}</span>`,
          )
          .addTo(layerRef.current)
          .openPopup();

        mapRef.current.fitBounds(
          L.latLngBounds(
            hasRoadPath
              ? routeCoordinates
              : [originCoordinates, destinationCoordinates],
          ),
          {
            padding: [48, 48],
            maxZoom: 18,
          },
        );
      }

      if (!route && !selectedLocationId && bounds.length > 1) {
        mapRef.current.fitBounds(L.latLngBounds(bounds), {
          padding: [32, 32],
          maxZoom: 17,
        });
      }

      if (editableMarker) {
        const editableCoordinates: LatLngExpression = [
          editableMarker.lat,
          editableMarker.lng,
        ];
        const marker = L.marker(editableCoordinates, {
          draggable: Boolean(onEditableMarkerChange),
          icon: createCampusIcon(L, true, true),
          title: editableMarkerLabel,
        });

        marker
          .bindTooltip(
            `<strong>${escapeHtml(editableMarkerLabel)}</strong><br />Drag to set exact location`,
            {
              direction: "top",
              offset: [0, -4],
              opacity: 0.96,
            },
          )
          .on("dragend", () => {
            const nextCoordinates = marker.getLatLng();
            onEditableMarkerChange?.({
              lat: nextCoordinates.lat,
              lng: nextCoordinates.lng,
            });
          })
          .addTo(layerRef.current);

        marker.openTooltip();
        mapRef.current.setView(editableCoordinates, 17, { animate: true });
      }
    }

    void renderMarkers();

    return () => {
      cancelled = true;
    };
  }, [
    locations,
    editableMarker,
    editableMarkerLabel,
    mapReady,
    onEditableMarkerChange,
    onSelectLocation,
    route,
    routeDestinationId,
    selectedLocationId,
  ]);

  return <div ref={containerRef} className={className} />;
}

export type { CampusMapLocation, CampusMapRoute, CampusMapRoutePoint };
