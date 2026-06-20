"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FiSkipForward } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { eventToCelebration } from "@/features/streak-celebration/lib/celebration-utils";
import type {
  CelebrationViewModel,
  RewardEvent,
} from "@/features/streak-celebration/lib/types";
import { cn } from "@/lib/utils";

type RewardEventsResponse = {
  data?: {
    events?: RewardEvent[];
  };
  error?: {
    message?: string;
  } | null;
};

type WeeklyActivityDay = {
  label: string;
  date: string;
  active: boolean;
  isToday: boolean;
};

type StreakSummary = {
  currentCount: number;
  weeklyActivity: WeeklyActivityDay[];
};

type StreakSummaryResponse = {
  data?: {
    summary?: StreakSummary;
  };
  error?: {
    message?: string;
  } | null;
};

type CelebrationContextValue = {
  refreshCelebrations: () => void;
};

const CelebrationContext = createContext<CelebrationContextValue>({
  refreshCelebrations: () => undefined,
});

export function useStreakCelebrations() {
  return useContext(CelebrationContext);
}

export function StreakCelebrationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, isPending } = useAuth();
  const [queue, setQueue] = useState<RewardEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<RewardEvent | null>(null);
  const knownEventIds = useRef(new Set<string>());
  const fetchingRef = useRef(false);

  const refreshCelebrations = useCallback(async () => {
    if (!isAuthenticated || fetchingRef.current) return;

    fetchingRef.current = true;

    try {
      const response = await fetch("/api/reward-events?status=UNSEEN&limit=10", {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as RewardEventsResponse;

      if (!response.ok || payload.error) return;

      const incoming = (payload.data?.events ?? []).filter((event) => {
        if (knownEventIds.current.has(event.id)) return false;

        knownEventIds.current.add(event.id);
        return true;
      });

      if (incoming.length) {
        setQueue((current) => [...current, ...incoming]);
      }
    } catch {
      return;
    } finally {
      fetchingRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isPending || !isAuthenticated) {
      setQueue([]);
      setActiveEvent(null);
      knownEventIds.current.clear();
      return;
    }

    void refreshCelebrations();
    const interval = window.setInterval(refreshCelebrations, 45_000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, isPending, refreshCelebrations]);

  useEffect(() => {
    const refresh = () => void refreshCelebrations();

    window.addEventListener("campushub:streak-updated", refresh);

    return () => window.removeEventListener("campushub:streak-updated", refresh);
  }, [refreshCelebrations]);

  useEffect(() => {
    if (activeEvent || queue.length === 0) return;

    const [nextEvent, ...rest] = queue;
    setActiveEvent(nextEvent);
    setQueue(rest);
  }, [activeEvent, queue]);

  const completeActiveEvent = useCallback(async () => {
    const event = activeEvent;
    setActiveEvent(null);

    if (!event) return;

    try {
      await fetch(`/api/reward-events/${event.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status: "SEEN" }),
      });
    } catch {
      return;
    }
  }, [activeEvent]);

  const value = useMemo(
    () => ({ refreshCelebrations }),
    [refreshCelebrations],
  );

  return (
    <CelebrationContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {activeEvent ? (
          <StreakCelebrationOverlay
            key={activeEvent.id}
            event={activeEvent}
            onClose={completeActiveEvent}
          />
        ) : null}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}

function StreakCelebrationOverlay({
  event,
  onClose,
}: {
  event: RewardEvent;
  onClose: () => void;
}) {
  const viewModel = useMemo(() => eventToCelebration(event), [event]);
  const [step, setStep] = useState(0);
  const [streakSummary, setStreakSummary] = useState<StreakSummary | null>(
    null,
  );
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStreakSummary() {
      try {
        const streakType =
          typeof event.metadata?.streakType === "string"
            ? event.metadata.streakType
            : "DAILY_LOGIN";
        const response = await fetch(
          `/api/streaks/summary?streakType=${encodeURIComponent(streakType)}`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as StreakSummaryResponse;

        if (!cancelled && response.ok && !payload.error) {
          setStreakSummary(payload.data?.summary ?? null);
        }
      } catch {
        if (!cancelled) setStreakSummary(null);
      }
    }

    void loadStreakSummary();

    return () => {
      cancelled = true;
    };
  }, [event.id, event.metadata]);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStep(1), 300),
      window.setTimeout(() => setStep(2), 1_100),
      window.setTimeout(() => setStep(3), 2_100),
      window.setTimeout(() => setStep(4), 3_600),
      window.setTimeout(() => setStep(5), 4_200),
      window.setTimeout(() => setStep(6), 4_800),
    ];

    return () => timers.forEach(window.clearTimeout);
  }, [event.id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlayRef.current
      ?.querySelector<HTMLButtonElement>("[data-celebration-continue]")
      ?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (step !== 3) return;

    if (viewModel.kind === "freeze") {
      fireFreezeBurst();
    } else {
      fireCelebrationBurst(viewModel.kind);
    }
  }, [step, viewModel.kind]);

  return (
    <motion.div
      ref={overlayRef}
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-[200] flex min-h-dvh items-center justify-center overflow-hidden px-4 py-6",
        viewModel.kind === "freeze"
          ? "bg-sky-950/35 backdrop-blur-xl"
          : "bg-amber-950/25 backdrop-blur-xl",
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
    >
      <motion.div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 opacity-80",
          viewModel.kind === "freeze"
            ? "bg-[radial-gradient(circle_at_center,rgba(125,211,252,0.18),transparent_48%)]"
            : "bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.16),transparent_52%)]",
        )}
      />
      <motion.div
        className="relative w-full max-w-[430px] overflow-hidden rounded-3xl bg-white px-6 pb-7 pt-8 text-center text-slate-950 shadow-[0_28px_90px_rgba(69,26,3,0.24)] sm:px-8"
        initial={{ opacity: 0, scale: 0.86, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
          <motion.div
            className="flex items-center justify-center text-7xl sm:text-8xl"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{
              scale: step >= 1 ? [0.6, 1.16, 0.98, 1.04, 1] : 0.6,
              opacity: step >= 1 ? 1 : 0,
              rotate: step >= 1 ? [-8, 6, -3, 2, 0] : -8,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            {viewModel.heroIcon}
          </motion.div>
        </div>

        <HeroNumber
          step={step}
          summary={streakSummary}
          viewModel={viewModel}
        />
        <motion.p
          className="relative mx-auto mt-2 max-w-xs text-xs font-semibold leading-5 text-slate-500 sm:text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 10 }}
        >
          {viewModel.kind === "freeze"
            ? "Your streak freeze kept your momentum safe."
            : "You are building a strong CampusHub habit."}
        </motion.p>

        <WeekStrip
          step={step}
          summary={streakSummary}
          viewModel={viewModel}
        />

        <div className="relative mt-7 flex flex-col gap-3">
          <Button
            data-celebration-continue
            type="button"
            className="h-12 w-full bg-sky-500 text-base font-black uppercase tracking-[0.08em] text-white shadow-[0_5px_0_#0284c7] hover:bg-sky-400"
            onClick={onClose}
          >
            Continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
          >
            <FiSkipForward className="h-4 w-4" aria-hidden="true" />
            Skip
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WeekStrip({
  step,
  summary,
  viewModel,
}: {
  step: number;
  summary: StreakSummary | null;
  viewModel: CelebrationViewModel;
}) {
  const weeklyActivity = summary?.weeklyActivity ?? [];
  const activeTodayIndex = weeklyActivity.findIndex(
    (day) => day.isToday && day.active,
  );

  return (
    <motion.div
      className="relative mx-auto mt-6 grid max-w-sm grid-cols-7 gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 10 }}
    >
      {weeklyActivity.map((day, index) => {
        const current = activeTodayIndex >= 0 && index === activeTodayIndex;
        const complete = day.active && !current;
        const active = day.active || current;
        const freeze = viewModel.kind === "freeze" && current;

        return (
          <div key={`${day.label}-${day.date}`} className="text-center">
            <p
              className={cn(
                "text-xs font-black uppercase",
                active ? "text-orange-500" : "text-slate-300",
                freeze && "text-sky-500",
              )}
            >
              {day.label}
            </p>
            <motion.div
              className={cn(
                "relative mt-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-black",
                complete
                  ? "bg-orange-500 text-white"
                  : "bg-slate-200 text-slate-400",
                current && "bg-orange-100 text-orange-500 ring-2 ring-orange-300",
                freeze && "bg-sky-400 text-white",
              )}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{
                scale: active && step >= 2 ? [0.6, 1.18, 1] : 1,
                opacity: step >= 2 ? 1 : 0,
              }}
              transition={{ delay: index * 0.06 }}
            >
              {complete ? "✓" : ""}
              {current ? (
                <motion.span
                  className="absolute -top-5 text-2xl drop-shadow-md"
                  initial={{ opacity: 0, y: -18, scale: 0.45, rotate: -18 }}
                  animate={
                    step >= 3
                      ? {
                          opacity: 1,
                          y: [-18, 2, -2, 0],
                          scale: [0.45, 1.3, 0.95, 1],
                          rotate: [-18, 8, -4, 0],
                        }
                      : { opacity: 0, y: -18, scale: 0.45 }
                  }
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  {freeze ? "🧊" : "🔥"}
                </motion.span>
              ) : null}
            </motion.div>
          </div>
        );
      })}
      {weeklyActivity.length === 0 ? (
        <p className="col-span-7 text-center text-xs font-semibold text-slate-400">
          Loading streak days
        </p>
      ) : null}
    </motion.div>
  );
}

function HeroNumber({
  step,
  summary,
  viewModel,
}: {
  step: number;
  summary: StreakSummary | null;
  viewModel: CelebrationViewModel;
}) {
  const toCount = summary?.currentCount ?? viewModel.toCount;
  const fromCount =
    typeof toCount === "number" && toCount > 1
      ? Math.min(viewModel.fromCount ?? toCount - 1, toCount - 1)
      : viewModel.fromCount;
  const count = useAnimatedCount(
    step >= 2 ? toCount : fromCount,
    fromCount,
    toCount,
  );

  if (toCount === null) {
    return (
      <motion.h1
        className="campushub-streak-display relative mt-5 text-3xl font-black tracking-normal text-slate-900 sm:text-4xl"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 18 }}
      >
        {viewModel.title}
      </motion.h1>
    );
  }

  return (
    <motion.div
      className="relative mt-4"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 18 }}
    >
      <h1 className="campushub-streak-display text-3xl font-black tracking-normal text-slate-900 sm:text-4xl">
        {count} day streak!
      </h1>
    </motion.div>
  );
}

function useAnimatedCount(
  activeValue: number | null,
  from: number | null,
  to: number | null,
) {
  const [value, setValue] = useState(from ?? to ?? 0);

  useEffect(() => {
    if (activeValue === null || to === null) return;

    const start = from ?? Math.max(to - 1, 0);
    const startedAt = performance.now();
    const duration = 1_000;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (to - start) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [activeValue, from, to]);

  return value;
}

function fireCelebrationBurst(kind: CelebrationViewModel["kind"]) {
  const colors =
    kind === "badge" || kind === "achievement"
      ? ["#facc15", "#fb923c", "#ffffff", "#a855f7"]
      : ["#f97316", "#facc15", "#ffffff", "#ef4444"];

  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.58 },
    colors,
  });
  window.setTimeout(() => {
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.62 },
      colors,
    });
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.62 },
      colors,
    });
  }, 350);
}

function fireFreezeBurst() {
  const colors = ["#67e8f9", "#bae6fd", "#ffffff", "#38bdf8"];

  confetti({
    particleCount: 120,
    spread: 90,
    scalar: 0.8,
    origin: { y: 0.56 },
    colors,
  });
  window.setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 120,
      scalar: 0.6,
      decay: 0.88,
      origin: { y: 0.48 },
      colors,
    });
  }, 450);
}
