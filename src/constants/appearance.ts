export type AppearancePalette = {
  id: string;
  name: string;
  description: string;
  primary: string;
  primaryHover: string;
  primaryActive: string;
  success: string;
  info: string;
  warning: string;
  achievement: string;
  preview: string[];
};

export const APPEARANCE_STORAGE_KEY = "campushub:appearance";

export const appearancePalettes: AppearancePalette[] = [
  {
    id: "default",
    name: "Default",
    description: "CampusHub indigo interface",
    primary: "#4F46E5",
    primaryHover: "#4338CA",
    primaryActive: "#3730A3",
    success: "#10B981",
    info: "#3B82F6",
    warning: "#F59E0B",
    achievement: "#D4A017",
    preview: ["#4F46E5", "#3B82F6", "#10B981", "#D4A017"],
  },
  {
    id: "claude",
    name: "Claude",
    description: "Warm amber campus tones",
    primary: "#B45309",
    primaryHover: "#92400E",
    primaryActive: "#78350F",
    success: "#16A34A",
    info: "#0E7490",
    warning: "#D97706",
    achievement: "#C2410C",
    preview: ["#B45309", "#C2410C", "#7C3AED", "#F59E0B"],
  },
  {
    id: "twitter",
    name: "Twitter",
    description: "Clean sky blue interface",
    primary: "#0EA5E9",
    primaryHover: "#0284C7",
    primaryActive: "#0369A1",
    success: "#22C55E",
    info: "#2563EB",
    warning: "#F97316",
    achievement: "#EAB308",
    preview: ["#0EA5E9", "#38BDF8", "#22C55E", "#2563EB"],
  },
  {
    id: "violet-bloom",
    name: "Violet Bloom",
    description: "Deep purple gradient energy",
    primary: "#7C3AED",
    primaryHover: "#6D28D9",
    primaryActive: "#5B21B6",
    success: "#34D399",
    info: "#6366F1",
    warning: "#F59E0B",
    achievement: "#A855F7",
    preview: ["#7C3AED", "#8B5CF6", "#34D399", "#6D28D9"],
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Emerald green terminal",
    primary: "#22C55E",
    primaryHover: "#16A34A",
    primaryActive: "#15803D",
    success: "#10B981",
    info: "#3B82F6",
    warning: "#F59E0B",
    achievement: "#7C3AED",
    preview: ["#22C55E", "#10B981", "#7C3AED", "#34D399"],
  },
  {
    id: "tangerine",
    name: "Tangerine",
    description: "Orange on cool blue-gray",
    primary: "#EA580C",
    primaryHover: "#C2410C",
    primaryActive: "#9A3412",
    success: "#16A34A",
    info: "#64748B",
    warning: "#F97316",
    achievement: "#F59E0B",
    preview: ["#EA580C", "#64748B", "#F97316", "#2563EB"],
  },
  {
    id: "darkmatter",
    name: "Darkmatter",
    description: "Amber and teal on dark slate",
    primary: "#B7791F",
    primaryHover: "#975A16",
    primaryActive: "#744210",
    success: "#2DD4BF",
    info: "#0891B2",
    warning: "#D97706",
    achievement: "#C084FC",
    preview: ["#B7791F", "#0E7490", "#D97706", "#2DD4BF"],
  },
  {
    id: "doom-64",
    name: "Doom 64",
    description: "Retro red and deep green",
    primary: "#7F1D1D",
    primaryHover: "#991B1B",
    primaryActive: "#450A0A",
    success: "#166534",
    info: "#1E3A8A",
    warning: "#92400E",
    achievement: "#A3E635",
    preview: ["#7F1D1D", "#166534", "#1E3A8A", "#991B1B"],
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Clean blue on white",
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    primaryActive: "#1E40AF",
    success: "#10B981",
    info: "#3B82F6",
    warning: "#F59E0B",
    achievement: "#6366F1",
    preview: ["#2563EB", "#3B82F6", "#1D4ED8", "#60A5FA"],
  },
  {
    id: "t3-chat",
    name: "T3 Chat",
    description: "Warm rose and purple",
    primary: "#BE185D",
    primaryHover: "#9D174D",
    primaryActive: "#831843",
    success: "#14B8A6",
    info: "#7C3AED",
    warning: "#F97316",
    achievement: "#DB2777",
    preview: ["#BE185D", "#DB2777", "#7C3AED", "#14B8A6"],
  },
  {
    id: "mocha-mousse",
    name: "Mocha Mousse",
    description: "Warm earthy brown tones",
    primary: "#8B5E3C",
    primaryHover: "#734A2E",
    primaryActive: "#5C3923",
    success: "#2F855A",
    info: "#0E7490",
    warning: "#B7791F",
    achievement: "#A16207",
    preview: ["#8B5E3C", "#A16207", "#0E7490", "#2F855A"],
  },
  {
    id: "bubblegum",
    name: "Bubblegum",
    description: "Playful pink and teal",
    primary: "#DB2777",
    primaryHover: "#BE185D",
    primaryActive: "#9D174D",
    success: "#14B8A6",
    info: "#06B6D4",
    warning: "#F59E0B",
    achievement: "#F472B6",
    preview: ["#DB2777", "#EC4899", "#06B6D4", "#14B8A6"],
  },
];

export const defaultAppearancePalette = appearancePalettes[0];

export function getAppearancePalette(paletteId: string) {
  return (
    appearancePalettes.find((palette) => palette.id === paletteId) ??
    defaultAppearancePalette
  );
}
