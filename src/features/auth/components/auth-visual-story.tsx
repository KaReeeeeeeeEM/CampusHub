"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { heroSlides } from "@/features/public-site/content";
import { cn } from "@/lib/utils";

const AUTH_STORY_INTERVAL_MS = 5200;

const storyLines = [
  "Verified student identity, campus services, and community access in one secure account.",
  "Institutional teams can coordinate trusted access for every university stakeholder.",
  "Employers connect through structured, verified university talent pathways.",
  "Graduate communities remain connected through identity, mentorship, and opportunity.",
];

export function AuthVisualStory() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const activeStory = heroSlides[activeIndex] ?? heroSlides[0];
  const activeLine = storyLines[activeIndex] ?? storyLines[0];

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % heroSlides.length);
    }, AUTH_STORY_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  if (!activeStory) {
    return null;
  }

  return (
    <section className="relative hidden min-h-screen overflow-hidden border-l border-border bg-black lg:block">
      <div className="absolute inset-0">
        {heroSlides.map((story, index) => (
          <motion.div
            key={story.audience}
            aria-hidden={index !== activeIndex}
            className="absolute inset-0"
            initial={false}
            animate={{
              opacity: index === activeIndex ? 1 : 0,
              scale: index === activeIndex ? 1 : 1.04,
            }}
            transition={{
              duration: reducedMotion ? 0 : 1,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Image
              alt=""
              className="h-full w-full object-cover"
              fill
              priority={index === 0}
              src={story.image}
              sizes="45vw"
            />
          </motion.div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.62)_54%,rgba(0,0,0,0.9)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgba(79,70,229,0.28),transparent_34%)]" />

      <div className="absolute inset-x-0 bottom-0 p-10 text-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStory.audience}
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              {activeStory.audience}
            </p>
            <p className="mt-3 max-w-xl text-3xl font-semibold tracking-normal">
              Secure access for every role in the CampusHub ecosystem.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-200">
              {activeLine}
            </p>
          </motion.div>
        </AnimatePresence>

        <div
          className="mt-8 flex items-center gap-2"
          aria-label="Authentication story selector"
        >
          {heroSlides.map((story, index) => (
            <Button
              key={story.audience}
              type="button"
              aria-label={`Show ${story.audience} visual`}
              variant="ghost"
              className={cn(
                "h-2 min-h-0 rounded-full bg-white/30 p-0 transition-all duration-300 hover:bg-white/50",
                index === activeIndex ? "w-12 bg-primary" : "w-8",
              )}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
