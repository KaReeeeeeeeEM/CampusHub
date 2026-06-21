"use client";

import introJs from "intro.js";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useOverlayCoordinator } from "@/components/overlays/overlay-coordinator";

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

function findElementByText(selector: string, patterns: RegExp[]) {
  return (
    Array.from(document.querySelectorAll(selector)).find((element) => {
      const text = element.textContent?.trim() ?? "";
      const ariaLabel = element.getAttribute("aria-label") ?? "";
      const label = `${text} ${ariaLabel}`.trim();

      return patterns.some((pattern) => pattern.test(label));
    }) ?? undefined
  );
}

function findSearchControl() {
  return findElement(
    "input[type='search'], input[placeholder*='Search' i], [role='search'] input",
  );
}

function findFilterControl() {
  return (
    findElement("[role='tablist'], [data-radix-select-trigger]") ??
    findElementByText("button, [role='button']", [
      /filter/i,
      /^all$/i,
      /today|last 7 days|last 30 days|status|category/i,
    ])
  );
}

function findPrimaryAction() {
  return findElementByText("button, a, [role='button']", [
    /create/i,
    /add/i,
    /invite/i,
    /generate/i,
    /export/i,
    /publish/i,
    /save/i,
    /upload/i,
  ]);
}

function findRecordsSurface() {
  return (
    findElement("table, [role='table'], .dashboard-table") ??
    findElement("[data-slot='table']")
  );
}

function findMetricsSurface() {
  return findElement(
    ".dashboard-card, [data-chart], .recharts-wrapper, svg[role='img']",
  );
}

function findMapSurface() {
  return findElement(".leaflet-container");
}

function findFormSurface() {
  return findElement("form");
}

function findEmptyState() {
  return findElementByText("section, article, div", [
    /no .*available/i,
    /no .*yet/i,
    /nothing new/i,
    /all caught up/i,
    /no records/i,
  ]);
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

const kiboIntroStorageKey = "campushub:intro:kibo";
const shellIntroStorageKey = "campushub:intro:workspace-shell";
const completeIntroValue = "complete";

let activeIntroTour = false;

function getStoredIntroValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredIntroComplete(key: string) {
  try {
    window.localStorage.setItem(key, completeIntroValue);
  } catch {
    // Ignore storage failures so onboarding never blocks dashboard usage.
  }
}

function hasCompletedAnyDashboardIntro() {
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (
        key &&
        key.startsWith("campushub:intro:") &&
        key !== kiboIntroStorageKey &&
        key !== shellIntroStorageKey &&
        window.localStorage.getItem(key) === completeIntroValue
      ) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function pageKind(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const leaf = parts.at(-1) ?? "dashboard";
  const parent = parts.at(-2) ?? "";
  const combined = `${parent}/${leaf}`;

  if (leaf === "dashboard") return "dashboard";
  if (leaf === "reports" || leaf === "analytics" || combined.includes("analytics")) {
    return "analytics";
  }
  if (leaf === "settings") return "settings";
  if (leaf === "notifications") return "notifications";
  if (leaf === "map" || leaf === "maps") return "map";
  if (leaf === "market" || parent === "market") return "marketplace";
  if (leaf === "showcase" || parent === "showcase") return "showcase";
  if (leaf === "profile") return "profile";
  if (
    /announcements|events|polls|suggestions|forums?|almanac|lost-found/.test(
      combined,
    )
  ) {
    return "engagement";
  }
  if (
    /universities|colleges|departments|users|students|teachers|campus-admins|representatives|employers|alumni/.test(
      combined,
    )
  ) {
    return "records";
  }

  return "workspace";
}

function pageIntroCopy(kind: string, label: string, role: string) {
  const copies: Record<string, string> = {
    dashboard:
      "This dashboard tour focuses on the live metrics, quick actions, and status panels for your role.",
    analytics:
      "This reporting tour focuses on filters, charts, exports, and the detailed records behind each metric.",
    settings:
      "This settings tour focuses on the preferences and controls that change how your workspace behaves.",
    notifications:
      "This notifications tour focuses on filtering message types and reviewing unread or historical updates.",
    map: "This map tour focuses on finding campus places, selecting destinations, and using navigation controls.",
    marketplace:
      "This marketplace tour focuses on product discovery, shop activity, orders, and seller actions.",
    showcase:
      "This showcase tour focuses on projects, achievements, visibility, and portfolio actions.",
    profile:
      "This profile tour focuses on your identity, account details, and public-facing information.",
    engagement:
      "This page tour focuses on creating, reviewing, filtering, and acting on campus engagement records.",
    records:
      "This page tour focuses on reviewing institutional records and using the available management actions.",
    workspace:
      "This page tour focuses on the page-specific controls and data available here.",
  };

  return `${label}: ${copies[kind] ?? copies.workspace} It is tailored for the ${role} workspace.`;
}

function buildPageSpecificSteps(pathname: string, label: string, role: string) {
  const kind = pageKind(pathname);
  const searchControl = findSearchControl();
  const filterControl = findFilterControl();
  const primaryAction = findPrimaryAction();
  const recordsSurface = findRecordsSurface();
  const metricsSurface = findMetricsSurface();
  const mapSurface = findMapSurface();
  const formSurface = findFormSurface();
  const emptyState = findEmptyState();

  const steps: TourStep[] = [
    {
      title: label,
      intro: pageIntroCopy(kind, label, role),
    },
  ];

  if (kind === "map" && mapSurface) {
    steps.push({
      element: mapSurface,
      title: "Campus map",
      intro:
        "Use this map to inspect campus geography, published locations, and routes. Location data comes from the university map records.",
    });
  }

  if (metricsSurface && ["dashboard", "analytics", "showcase"].includes(kind)) {
    steps.push({
      element: metricsSurface,
      title: kind === "analytics" ? "Live metrics and charts" : "Key status cards",
      intro:
        "These panels summarize the most important live records for this page. Empty datasets should show zero values or helpful empty states.",
    });
  }

  if (searchControl) {
    steps.push({
      element: searchControl,
      title: "Search this page",
      intro:
        "Use this search field to narrow the records or content shown on this specific page.",
    });
  }

  if (filterControl && filterControl !== searchControl) {
    steps.push({
      element: filterControl,
      title: "Page filters",
      intro:
        "Use these filters to change the page view without leaving this workflow.",
    });
  }

  if (primaryAction) {
    steps.push({
      element: primaryAction,
      title: "Primary action",
      intro:
        "This is the main action for this page, such as creating, inviting, exporting, publishing, or saving records.",
    });
  }

  if (formSurface && kind === "settings") {
    steps.push({
      element: formSurface,
      title: "Settings form",
      intro:
        "Adjust only the settings you need, then save changes from this page.",
    });
  }

  if (recordsSurface) {
    steps.push({
      element: recordsSurface,
      title: "Records area",
      intro:
        "This area lists the live database records for the page. Row actions should stay close to each record.",
    });
  } else if (emptyState) {
    steps.push({
      element: emptyState,
      title: "Empty state",
      intro:
        "When no live records exist, this section explains what will appear here and how to start if your role allows it.",
    });
  }

  return steps;
}

export function DashboardIntroTour({
  role,
  storageKey,
}: DashboardIntroTourProps) {
  const pathname = usePathname();
  const { activeOverlay, claimOverlay, releaseOverlay } =
    useOverlayCoordinator();

  useEffect(() => {
    const currentStorageKey = `${storageKey}:${pageKey(pathname) || "home"}`;

    if (
      activeIntroTour ||
      getStoredIntroValue(currentStorageKey) === completeIntroValue
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (activeIntroTour) return;
      if (!claimOverlay("dashboard-intro")) return;

      const currentPageLabel = pageLabel(pathname);
      const shouldIntroduceKibo =
        getStoredIntroValue(kiboIntroStorageKey) !== completeIntroValue;
      const shouldSuppressLegacyShellIntro = hasCompletedAnyDashboardIntro();
      const shouldShowShellIntro =
        getStoredIntroValue(shellIntroStorageKey) !== completeIntroValue &&
        !shouldSuppressLegacyShellIntro;

      if (shouldSuppressLegacyShellIntro) {
        setStoredIntroComplete(shellIntroStorageKey);
      }

      const sidebar = findElement(".dashboard-sidebar, aside");
      const topbar = findElement(".dashboard-topbar, header");
      const activeSection = findElement(
        ".dashboard-nav-item-active, aside a[class*='active']",
      );
      const shellSteps: TourStep[] = [
        ...(shouldIntroduceKibo
          ? [
              {
                title: "Meet Kibo",
                intro:
                  "<div class='campushub-intro-kibo'><img src='/kibo/images/processed/happy.png' alt='Kibo mascot' /><p>Kibo is your CampusHub companion for onboarding, empty states, streaks, badge unlocks, reminders, and important celebration moments. Kibo will appear only when it helps, and you can dismiss Kibo interactions whenever they show up.</p></div>",
              },
            ]
          : []),
        ...(shouldShowShellIntro
          ? [
              {
                element: sidebar,
                title: "Workspace navigation",
                intro:
                  "This sidebar is your module list. CampusHub will not repeat this general navigation step on every page.",
              },
              {
                element: topbar,
                title: "Search and account tools",
                intro:
                  "Use the top bar for global search, notifications, appearance, and account controls. Future tours will focus on page-specific work.",
              },
              {
                element: activeSection,
                title: "Current section",
                intro:
                  "The highlighted item shows your current module inside the workspace.",
              },
            ]
          : []),
      ].filter((step) => !("element" in step) || step.element);
      const pageSteps = buildPageSpecificSteps(pathname, currentPageLabel, role);
      const steps = [...shellSteps, ...pageSteps];

      const tour = introJs();
      activeIntroTour = true;
      setStoredIntroComplete(currentStorageKey);
      if (shouldIntroduceKibo) {
        setStoredIntroComplete(kiboIntroStorageKey);
      }
      if (shouldShowShellIntro) {
        setStoredIntroComplete(shellIntroStorageKey);
      }

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
        activeIntroTour = false;
        releaseOverlay("dashboard-intro");
      });
      tour.onexit(() => {
        activeIntroTour = false;
        releaseOverlay("dashboard-intro");
      });

      void tour.start();
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [activeOverlay, claimOverlay, pathname, releaseOverlay, role, storageKey]);

  return null;
}
