"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { Children, isValidElement } from "react";

import { cn } from "@/lib/utils";

type StaggerContainerProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: React.ReactNode;
  staggerDelay?: number;
};

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.08,
  ...props
}: StaggerContainerProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={reducedMotion ? false : "hidden"}
      whileInView={reducedMotion ? undefined : "show"}
      viewport={{ once: true, amount: 0.16 }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      {...props}
    >
      {Children.toArray(children).map((child, index) => (
        <StaggerItem
          key={isValidElement(child) && child.key ? child.key : index}
        >
          {child}
        </StaggerItem>
      ))}
    </motion.div>
  );
}

type StaggerItemProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: React.ReactNode;
};

export function StaggerItem({
  children,
  className,
  ...props
}: StaggerItemProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("h-full", className)}
      variants={
        reducedMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 18 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] }
              }
            }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}
