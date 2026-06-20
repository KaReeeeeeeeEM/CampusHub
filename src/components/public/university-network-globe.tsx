"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { HoverCard } from "@/components/motion/hover-card";
import type { PublicUniversity } from "@/features/universities/lib/university-directory-service";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/theme-store";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { GlobeMethods, GlobeProps } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading university network
    </div>
  ),
});

type UniversityNode = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
};

type UniversityArc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
};

const universityCoordinates: Record<
  string,
  Pick<UniversityNode, "lat" | "lng">
> = {
  "university-of-dar-es-salaam": { lat: -6.7799, lng: 39.2026 },
  "sokoine-university-of-agriculture": { lat: -6.8278, lng: 37.6591 },
  "muhimbili-university-of-health-and-allied-sciences": {
    lat: -6.8087,
    lng: 39.2735,
  },
  "arden-university-college": { lat: -3.3869, lng: 36.683 },
};

function asNode(point: object): UniversityNode {
  return point as UniversityNode;
}

function asArc(arc: object): UniversityArc {
  return arc as UniversityArc;
}

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function UniversityNetworkGlobe({
  universities,
}: {
  universities: PublicUniversity[];
}) {
  const reducedMotion = useReducedMotion();
  const theme = useThemeStore((state) => state.theme);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const isDark = resolvedTheme === "dark";
  const globeTheme = {
    globeImageUrl: isDark
      ? "//unpkg.com/three-globe/example/img/earth-dark.jpg"
      : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
    atmosphereColor: isDark ? "#4F46E5" : "#4338CA",
    arcColor: isDark
      ? ["rgba(129,140,248,0.2)", "rgba(79,70,229,0.95)"]
      : ["rgba(67,56,202,0.18)", "rgba(55,48,163,0.9)"],
    pointColor: isDark ? "#818CF8" : "#4F46E5",
  };

  const nodes = useMemo<UniversityNode[]>(
    () =>
      universities.map((university, index) => ({
        id: university.slug,
        name: university.name,
        city: university.city,
        lat: universityCoordinates[university.slug]?.lat ?? -6.8 + index,
        lng: universityCoordinates[university.slug]?.lng ?? 39 + index,
        size: 0.35 + index * 0.05,
        color: university.accentColor,
      })),
    [],
  );

  const arcs = useMemo<UniversityArc[]>(() => {
    const hub = nodes[0];

    if (!hub) {
      return [];
    }

    return nodes.slice(1).map((node) => ({
      startLat: hub.lat,
      startLng: hub.lng,
      endLat: node.lat,
      endLng: node.lng,
      color: ["rgba(79,70,229,0.2)", "rgba(79,70,229,0.95)"],
    }));
  }, [nodes]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(Math.round(entry.contentRect.width));
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => setSystemTheme(getSystemTheme());

    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);

    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    const globe = globeRef.current;

    if (!globe) {
      return;
    }

    globe.pointOfView({ lat: -5.8, lng: 38.4, altitude: 2.2 }, 900);

    const controls = globe.controls();
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = false;
  }, [reducedMotion]);

  const globeProps: GlobeProps = {
    width,
    height: Math.min(520, Math.max(360, Math.round(width * 0.72))),
    backgroundColor: "rgba(0,0,0,0)",
    globeImageUrl: globeTheme.globeImageUrl,
    bumpImageUrl: "//unpkg.com/three-globe/example/img/earth-topology.png",
    showAtmosphere: true,
    atmosphereColor: globeTheme.atmosphereColor,
    atmosphereAltitude: isDark ? 0.14 : 0.1,
    pointsData: nodes,
    pointLat: (point) => asNode(point).lat,
    pointLng: (point) => asNode(point).lng,
    pointAltitude: 0.025,
    pointRadius: (point) => asNode(point).size,
    pointColor: (point) => (isDark ? asNode(point).color : globeTheme.pointColor),
    pointLabel: (point) => {
      const node = asNode(point);
      return `${node.name}<br />${node.city}`;
    },
    arcsData: arcs,
    arcStartLat: (arc: object) => asArc(arc).startLat,
    arcStartLng: (arc: object) => asArc(arc).startLng,
    arcEndLat: (arc: object) => asArc(arc).endLat,
    arcEndLng: (arc: object) => asArc(arc).endLng,
    arcColor: () => globeTheme.arcColor,
    arcAltitude: 0.22,
    arcStroke: 0.7,
    arcDashLength: 0.55,
    arcDashGap: 1.8,
    arcDashAnimateTime: reducedMotion ? 0 : 4200,
    enablePointerInteraction: true,
  };

  return (
    <FadeIn>
      <HoverCard className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[0.8fr_1.2fr] lg:p-8">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              University network
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal">
              A connected ecosystem across institutions, employers, and alumni.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              CampusHub is designed for multi-university scale. The network
              layer can grow from local campus communities into regional
              partnerships, graduate networks, and employer ecosystems.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
              {nodes.map((node) => (
                <div key={node.id} className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: node.color }}
                  />
                  {node.name}
                </div>
              ))}
            </div>
          </div>
          <div
            ref={containerRef}
            className={cn(
              "min-h-96 overflow-hidden rounded-lg border border-border transition-colors duration-300",
              isDark
                ? "bg-background"
                : "bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.08),rgba(255,255,255,0)_62%),linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))]",
            )}
          >
            <Globe key={resolvedTheme} ref={globeRef} {...globeProps} />
          </div>
        </div>
      </HoverCard>
    </FadeIn>
  );
}
