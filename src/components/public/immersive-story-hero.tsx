"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, Network } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CountUpStat } from "@/components/motion/count-up-stat";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { Button } from "@/components/ui/button";
import { heroSlides } from "@/features/public-site/content";
import { cn } from "@/lib/utils";

const STORY_INTERVAL_MS = 5200;

const accentPositions = [
  { x: "18%", y: "28%" },
  { x: "74%", y: "26%" },
  { x: "78%", y: "70%" },
  { x: "22%", y: "72%" },
];

const storySignals = [
  "Campus life, connected",
  "Institutional trust layer",
  "Talent pathways opening",
  "Lifelong networks active",
];

export function ImmersiveStoryHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 760], [0, 54]);
  const activeStory = heroSlides[activeIndex] ?? heroSlides[0];
  const accent = accentPositions[activeIndex] ?? accentPositions[0];
  const activeSignal = storySignals[activeIndex] ?? storySignals[0];

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % heroSlides.length);
    }, STORY_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  if (!activeStory) {
    return null;
  }

  return (
    <section className="relative isolate min-h-[760px] overflow-hidden border-b border-white/10 bg-black text-white">
      <div className="absolute inset-0">
        {heroSlides.map((story, index) => (
          <motion.div
            key={story.audience}
            aria-hidden={index !== activeIndex}
            className="absolute inset-0"
            initial={false}
            animate={{
              opacity: index === activeIndex ? 1 : 0,
              scale: index === activeIndex ? 1 : 1.055,
            }}
            transition={{
              duration: reducedMotion ? 0 : 1.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ y: reducedMotion ? 0 : parallaxY }}
          >
            <Image
              priority={index === 0}
              alt=""
              className="h-full w-full object-cover"
              fill
              src={story.image}
              sizes="100vw"
            />
          </motion.div>
        ))}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.6)_42%,rgba(0,0,0,0.15)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.22)_0%,rgba(0,0,0,0.18)_44%,rgba(0,0,0,0.82)_100%)]" />
      <motion.div
        className="absolute h-72 w-72 rounded-full bg-primary/24 blur-3xl sm:h-96 sm:w-96"
        animate={{ left: accent.x, top: accent.y }}
        transition={{
          duration: reducedMotion ? 0 : 0.9,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      <div className="absolute inset-x-0 bottom-0 top-36 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 mx-auto grid min-h-[760px] max-w-7xl content-end gap-8 px-4 pb-8 pt-36 sm:px-6 sm:pt-40 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-end lg:px-8 lg:pb-10">
        <div className="max-w-5xl">
          <div className="mb-7 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-normal text-zinc-200">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
              <Network
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              CampusHub live ecosystem
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={activeSignal}
                className="text-primary"
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                {activeSignal}
              </motion.span>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStory.audience}
              initial={
                reducedMotion
                  ? false
                  : { opacity: 0, y: 24, filter: "blur(10px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reducedMotion
                  ? undefined
                  : { opacity: 0, y: -18, filter: "blur(8px)" }
              }
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-sm font-semibold uppercase tracking-normal text-primary">
                For {activeStory.audience}
              </p>
              <h1 className="mt-4 max-w-5xl text-5xl font-semibold leading-[0.95] tracking-normal sm:text-7xl lg:text-8xl">
                {activeStory.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-200 sm:text-xl">
                {activeStory.description}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <MagneticButton className="w-full sm:w-auto">
              <Button asChild className="min-h-12 w-full sm:w-auto">
                <Link href="/employers/apply">
                  Employer Apply
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </MagneticButton>
            <MagneticButton className="w-full sm:w-auto">
              <Button
                asChild
                variant="secondary"
                className="min-h-12 w-full border-white/15 bg-white/12 text-white hover:bg-white/18 sm:w-auto"
              >
                <Link href={activeStory.href}>
                  Explore {activeStory.audience}
                </Link>
              </Button>
            </MagneticButton>
          </div>
        </div>

        <div className="glass-panel p-4 sm:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeStory.audience}-stat`}
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-xs font-semibold uppercase tracking-normal text-zinc-300">
                Live ecosystem signal
              </p>
              <div className="mt-4 text-5xl font-semibold text-white">
                <CountUpStat value={activeStory.statValue} />
              </div>
              <p className="mt-2 text-sm font-medium text-primary">
                {activeStory.statLabel}
              </p>
              <p className="mt-5 text-sm leading-6 text-zinc-200">
                {activeStory.signal}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center lg:col-span-2">
          <div
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-md"
            aria-label="Hero audience selector"
          >
            {heroSlides.map((story, index) => (
              <Button
                key={story.audience}
                type="button"
                aria-label={`Show ${story.audience} story`}
                variant="ghost"
                className={cn(
                  "h-2.5 min-h-0 rounded-full bg-white/25 p-0 transition-all duration-300 hover:bg-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  index === activeIndex
                    ? "w-16 bg-primary shadow-[0_0_22px_rgba(79,70,229,0.55)]"
                    : "w-10",
                )}
                onClick={() => setActiveIndex(index)}
              >
                {index === activeIndex ? (
                  <motion.span
                    layoutId="hero-audience-indicator"
                    className="block h-full rounded-full bg-primary"
                    transition={{
                      duration: reducedMotion ? 0 : 0.35,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                ) : null}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
