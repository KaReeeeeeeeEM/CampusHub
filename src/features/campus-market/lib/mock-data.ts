export type MarketVisibility =
  | "ALL_USERS"
  | "STUDENTS"
  | "TEACHERS"
  | "ALUMNI"
  | "EMPLOYERS"
  | "CUSTOM";
export type MarketStatus = "ACTIVE" | "DRAFT" | "PAUSED" | "SOLD OUT";
export type MarketProduct = Record<string, unknown>;
export type MarketShop = Record<string, unknown>;
export type MarketOrder = Record<string, unknown>;

export const marketCategories = [
  "Books",
  "Electronics",
  "Food",
  "Fashion",
  "Services",
  "Digital",
  "Other",
] as const;

export const visibilityOptions: MarketVisibility[] = [
  "ALL_USERS",
  "STUDENTS",
  "TEACHERS",
  "ALUMNI",
  "EMPLOYERS",
  "CUSTOM",
];

export const campusDeliveryLocations: Array<Record<string, unknown>> = [];
export const marketProducts: MarketProduct[] = [];
export const marketShops: MarketShop[] = [];
export const marketOrders: MarketOrder[] = [];
