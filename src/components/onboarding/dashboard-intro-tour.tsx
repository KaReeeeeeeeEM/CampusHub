"use client";

import introJs from "intro.js";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type DashboardIntroTourProps = {
  role: string;
  storageKey: string;
};

type TourStep = {
  element?: Element;
  title: string;
  intro: string;
};

function findElement(selector: string) {
  return document.querySelector(selector) ?? undefined;
}

function pageKey(pathname: string) {
  return pathname.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "");
}

function pageLabel(pathname: string) {
  const heading = document.querySelector("h1")?.textContent?.trim();
  const activeNav = findElement(
    ".dashboard-nav-item-active, aside a[class*='active']",
  )?.textContent?.trim();
  const fallback =
    pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replace(/[-_]+/g, " ") ?? "page";

  return heading || activeNav || fallback.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function DashboardIntroTour({
  role,
  storageKey,
}: DashboardIntroTourProps) {
  const pathname = usePathname();

  useEffect(() => {
    const currentStorageKey = `${storageKey}:${pageKey(pathname) || "home"}`;

    if (window.localStorage.getItem(currentStorageKey) === "complete") return;

    const timeout = window.setTimeout(() => {
      const currentPageLabel = pageLabel(pathname);
      const sidebar = findElement(".dashboard-sidebar, aside");
      const topbar = findElement(".dashboard-topbar, header");
      const activeSection = findElement(
        ".dashboard-nav-item-active, aside a[class*='active']",
      );
      const mainContent = findElement("main, [role='main']");
      const steps: TourStep[] = [
        {
          title: `${currentPageLabel}`,
          intro: `This quick tour highlights the key areas on this ${role} page.`,
        },
        {
          element: sidebar,
          title: "Workspace navigation",
          intro:
            "Use this sidebar to move between the modules available to your role.",
        },
        {
          element: topbar,
          title: "Search and account tools",
          intro:
            "Search CampusHub, review notifications, adjust appearance, and access your account menu from here.",
        },
        {
          element: activeSection,
          title: "Current section",
          intro:
            "The highlighted navigation item shows where you are inside the workspace.",
        },
        {
          element: mainContent,
          title: "Page workspace",
          intro:
            "Your role-specific metrics, actions, empty states, and management workflows appear in this area.",
        },
      ].filter((step) => !("element" in step) || step.element);

      const tour = introJs();

      tour.setOptions({
        steps,
        nextLabel: "Next",
        prevLabel: "Back",
        doneLabel: "Done",
        skipLabel: "Skip",
        showProgress: true,
        showBullets: false,
        disableInteraction: false,
        exitOnOverlayClick: false,
        hidePrev: true,
        hideNext: false,
        scrollToElement: true,
        tooltipClass: "campushub-intro-tooltip",
        highlightClass: "campushub-intro-highlight",
      });

      tour.oncomplete(() => {
        window.localStorage.setItem(currentStorageKey, "complete");
      });
      tour.onexit(() => {
        window.localStorage.setItem(currentStorageKey, "complete");
      });

      void tour.start();
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [pathname, role, storageKey]);

  return null;
}
