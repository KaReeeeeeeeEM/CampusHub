"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import type { University } from "@/features/universities/lib/mock-data";

export function UniversityCard({ university }: { university: University }) {
  const reducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, {
    stiffness: 180,
    damping: 22,
    mass: 0.4,
  });
  const smoothY = useSpring(pointerY, {
    stiffness: 180,
    damping: 22,
    mass: 0.4,
  });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-4, 4]);
  const imageX = useTransform(smoothX, [-0.5, 0.5], [-12, 12]);
  const imageY = useTransform(smoothY, [-0.5, 0.5], [-10, 10]);

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (reducedMotion) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <motion.article
      className="premium-card group overflow-hidden rounded-lg border border-border bg-surface shadow-sm outline outline-1 outline-transparent transition-[outline-color] duration-300 hover:border-primary/70 hover:outline-primary/50"
      style={
        reducedMotion
          ? undefined
          : {
              rotateX,
              rotateY,
              transformPerspective: 900,
            }
      }
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="relative aspect-[16/8]">
        <motion.div
          className="absolute -inset-3"
          style={reducedMotion ? undefined : { x: imageX, y: imageY }}
        >
          <Image
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
            fill
            src={university.image}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-black/28" />
        <div
          className="absolute left-4 top-4 rounded-md px-3 py-1 text-xs font-semibold text-white shadow-sm"
          style={{ backgroundColor: university.brandColor }}
        >
          {university.shortName}
        </div>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border border-border bg-background px-2 py-1">
            {university.status}
          </span>
          <span className="rounded-md border border-border bg-background px-2 py-1">
            {university.type}
          </span>
        </div>
        <h2 className="mt-4 text-xl font-semibold">{university.name}</h2>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {university.city}, {university.country}
        </div>
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {university.description}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={`/universities/${university.slug}`}>
              View profile
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/join-university?university=${university.slug}`}>
              Join university
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
