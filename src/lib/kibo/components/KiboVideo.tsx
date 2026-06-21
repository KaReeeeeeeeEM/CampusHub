"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type VideoHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

import { KIBO_CONFIG } from "../config";
import { getKiboVideoSources } from "../animations";
import { getKiboImage } from "../images";
import type { KiboAnimation, KiboMood } from "../types";

type KiboVideoProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "controls" | "poster"
> & {
  animation: KiboAnimation;
  posterMood?: KiboMood;
  autoplay?: boolean;
  loop?: boolean;
  className?: string;
};

export function KiboVideo({
  animation,
  posterMood = "happy",
  autoplay = true,
  loop = true,
  className,
  muted = true,
  playsInline = true,
  ...props
}: KiboVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const sources = useMemo(() => {
    const asset = getKiboVideoSources(animation);

    return [asset.webm, asset.mp4].filter(Boolean) as string[];
  }, [animation]);
  const source = sources[sourceIndex] ?? sources[0];

  useEffect(() => {
    setSourceIndex(0);
  }, [animation]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: KIBO_CONFIG.videoVisibilityThreshold },
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (autoplay && visible) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }

    return () => video.pause();
  }, [autoplay, source, visible]);

  return (
    <video
      ref={videoRef}
      key={`${animation}-${source}`}
      className={cn("block h-full w-full object-contain", className)}
      muted={muted}
      playsInline={playsInline}
      autoPlay={autoplay}
      loop={loop}
      preload="none"
      controls={false}
      poster={getKiboImage(posterMood)}
      onError={() =>
        setSourceIndex((current) =>
          current + 1 < sources.length ? current + 1 : current,
        )
      }
      {...props}
    >
      {source ? (
        <source
          src={source}
          type={source.endsWith(".webm") ? "video/webm" : "video/mp4"}
        />
      ) : null}
    </video>
  );
}
