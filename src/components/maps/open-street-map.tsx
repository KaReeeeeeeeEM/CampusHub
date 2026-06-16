"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DivIcon,
  LatLngExpression,
  LayerGroup,
  Map as LeafletMap,
} from "leaflet";

type CampusMapLocation = {
  id: string;
  name: string;
  category: string;
  code?: string;
  description?: string;
  coordinates?: string;
};

type OpenStreetMapProps = {
  locations: CampusMapLocation[];
  selectedLocationId?: string;
  routeDestinationId?: string;
  onSelectLocation: (locationId: string) => void;
  className?: string;
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
  onSelectLocation,
  className,
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
      }).setView(campusCenter, 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20,
      }).addTo(map);

      L.control.scale({ imperial: false }).addTo(map);

      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
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

      layerRef.current.clearLayers();

      const bounds: LatLngExpression[] = [];

      locations.forEach((location, index) => {
        const coordinates = getLocationCoordinates(location, index);
        const active = selectedLocationId === location.id;
        const destination = routeDestinationId === location.id;

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
          .on("click", () => onSelectLocation(location.id))
          .addTo(layerRef.current!);

        if (active) {
          marker.openTooltip();
          mapRef.current?.setView(coordinates, 17, { animate: true });
        }
      });

      if (!selectedLocationId && bounds.length > 1) {
        mapRef.current.fitBounds(L.latLngBounds(bounds), {
          padding: [32, 32],
          maxZoom: 17,
        });
      }
    }

    void renderMarkers();

    return () => {
      cancelled = true;
    };
  }, [
    locations,
    mapReady,
    onSelectLocation,
    routeDestinationId,
    selectedLocationId,
  ]);

  return <div ref={containerRef} className={className} />;
}

export type { CampusMapLocation };
