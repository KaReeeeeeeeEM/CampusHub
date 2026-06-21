"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  KIBO_IMAGES,
  KIBO_VIDEO_SOURCES,
  KiboAvatar,
  KiboEmptyState,
  KiboEvent,
  KiboNotification,
  KiboVideo,
  useKibo,
  type KiboAnimation,
  type KiboMood,
} from "@/lib/kibo";

type ProcessedManifest = {
  videos?: Array<{
    processed?: string | null;
    animationType?: string;
    alphaMode?: boolean;
    transparencyQuality?: string;
    quality?: string;
  }>;
};

const moods = Object.keys(KIBO_IMAGES) as KiboMood[];
const animations = Object.keys(KIBO_VIDEO_SOURCES) as KiboAnimation[];
const themeSurfaces = [
  { label: "Light", className: "bg-white text-slate-950" },
  { label: "Dark", className: "bg-slate-950 text-white" },
  {
    label: "Bubblegum",
    className: "bg-pink-100 text-pink-950",
  },
  {
    label: "Custom",
    className: "bg-[linear-gradient(135deg,#071326,#4f46e5)] text-white",
  },
];

export default function KiboShowcasePage() {
  const { showModal, showNotification, triggerEvent } = useKibo();
  const [manifest, setManifest] = useState<ProcessedManifest | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadManifest() {
      try {
        const response = await fetch("/kibo/processed-manifest.json", {
          cache: "no-store",
        });
        const payload = (await response.json()) as ProcessedManifest;

        if (!cancelled) setManifest(payload);
      } catch {
        if (!cancelled) setManifest({ videos: [] });
      }
    }

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  const validation = useMemo(() => {
    const byAnimation = new Map(
      manifest?.videos?.map((video) => [video.animationType, video]) ?? [],
    );

    return animations.map((animation) => {
      const manifestKey =
        animation === "projectStar" ? "project-star" : animation;
      const record = byAnimation.get(manifestKey);

      return {
        animation,
        processed: record?.processed ?? KIBO_VIDEO_SOURCES[animation].webm,
        pass: Boolean(record?.alphaMode),
        quality: record?.quality ?? "pending",
        transparencyQuality: record?.transparencyQuality ?? "pending",
      };
    });
  }, [manifest]);

  return (
    <main className="mx-auto w-full max-w-none space-y-8 px-4 py-6 sm:px-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Kibo Platform
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Kibo Mascot Showcase</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Internal testing surface for Kibo images, processed videos, event
          triggers, empty states, notifications, modal celebrations, and
          transparency checks.
        </p>
      </header>

      <section className="dashboard-card rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() =>
              showModal({
                animation: "badge",
                title: "Badge Unlocked",
                description: "You earned the CampusHub Kibo test badge.",
              })
            }
          >
            Show Badge Modal
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => triggerEvent(KiboEvent.STREAK_MILESTONE)}
          >
            Trigger Streak Event
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              showNotification({
                animation: "announcement",
                title: "New Announcement",
                description:
                  "A new university announcement has been published.",
              })
            }
          >
            Show Notification
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Images</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {moods.map((mood) => (
            <div
              key={mood}
              className="dashboard-card rounded-xl border border-border bg-surface p-4 text-center"
            >
              <KiboAvatar mood={mood} size="xl" className="mx-auto" />
              <p className="mt-3 text-sm font-semibold capitalize">{mood}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Processed Videos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {animations.map((animation) => (
            <div
              key={animation}
              className="dashboard-card rounded-xl border border-border bg-surface p-4"
            >
              <div className="h-44">
                <KiboVideo animation={animation} loop autoplay />
              </div>
              <p className="mt-3 text-sm font-semibold">{animation}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {KIBO_VIDEO_SOURCES[animation].webm}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <KiboEmptyState
          mood="curious"
          title="No Projects Yet"
          description="Be the first to showcase your work."
        />
        <KiboEmptyState
          mood="thinking"
          title="No products available"
          description="Check back later."
        />
        <KiboEmptyState
          mood="happy"
          title="You’re all caught up"
          description="Nothing new right now."
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Notification Examples</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <KiboNotification
            animation="announcement"
            title="New Announcement"
            description="A new university announcement has been published."
          />
          <KiboNotification
            animation="marketplace"
            title="Marketplace Activity"
            description="A new order request is waiting for review."
          />
          <KiboNotification
            animation="projectStar"
            title="Project Star"
            description="Someone appreciated your project."
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Transparency Validation</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {validation.map((item) => (
            <div
              key={item.animation}
              className="dashboard-card rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">{item.animation}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.processed}
                  </p>
                </div>
                <span
                  className={
                    item.pass
                      ? "rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success"
                      : "rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive"
                  }
                >
                  {item.pass ? "alpha detected" : "needs review"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {themeSurfaces.map((surface) => (
                  <div
                    key={surface.label}
                    className={`rounded-lg p-3 ${surface.className}`}
                  >
                    <p className="mb-2 text-xs font-semibold">
                      {surface.label}
                    </p>
                    <div className="h-28">
                      <KiboVideo animation={item.animation} loop autoplay />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Quality: {item.quality}. Transparency:{" "}
                {item.transparencyQuality}.
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
