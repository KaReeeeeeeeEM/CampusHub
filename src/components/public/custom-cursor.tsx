"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring
} from "framer-motion";
import { useEffect, useState } from "react";

export function CustomCursor() {
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const smoothX = useSpring(x, { stiffness: 260, damping: 28, mass: 0.4 });
  const smoothY = useSpring(y, { stiffness: 260, damping: 28, mass: 0.4 });
  const [active, setActive] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    if (!finePointer || reducedMotion) {
      return;
    }

    setEnabled(true);

    function handlePointerMove(event: PointerEvent) {
      x.set(event.clientX);
      y.set(event.clientY);

      const magnetic = (event.target as HTMLElement | null)?.closest(
        "[data-magnetic]"
      ) as HTMLElement | null;

      if (!magnetic) {
        return;
      }

      const rect = magnetic.getBoundingClientRect();
      const offsetX = (event.clientX - rect.left - rect.width / 2) * 0.16;
      const offsetY = (event.clientY - rect.top - rect.height / 2) * 0.16;
      magnetic.style.setProperty("--magnetic-x", `${offsetX}px`);
      magnetic.style.setProperty("--magnetic-y", `${offsetY}px`);
    }

    function handleOver(event: PointerEvent) {
      const targetElement = event.target as HTMLElement | null;
      setActive(
        Boolean(targetElement?.closest("a, button, [data-cursor='interactive']"))
      );
    }

    function handleOut(event: PointerEvent) {
      const targetElement = event.target as HTMLElement | null;
      const magnetic = targetElement?.closest("[data-magnetic]") as
        | HTMLElement
        | null;
      magnetic?.style.setProperty("--magnetic-x", "0px");
      magnetic?.style.setProperty("--magnetic-y", "0px");
      setActive(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerover", handleOver);
    window.addEventListener("pointerout", handleOut);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerover", handleOver);
      window.removeEventListener("pointerout", handleOut);
    };
  }, [reducedMotion, x, y]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <motion.div
        className="custom-cursor"
        animate={{
          width: active ? 54 : 34,
          height: active ? 54 : 34,
          opacity: 1
        }}
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%"
        }}
        aria-hidden="true"
      />
      <motion.div
        className="custom-cursor-dot"
        style={{
          x,
          y,
          translateX: "-50%",
          translateY: "-50%"
        }}
        aria-hidden="true"
      />
    </>
  );
}
