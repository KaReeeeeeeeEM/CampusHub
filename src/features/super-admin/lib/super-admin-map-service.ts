import { requireApiRole } from "@/lib/auth/authorization";
import { connectPostgres } from "@/lib/db/postgres";
import { MapLocationModel, UniversityModel } from "@/lib/db/models";

export type SuperAdminMapPoint = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  latitude: number;
  longitude: number;
  buildingCode: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SuperAdminCampusMap = {
  universityId: string;
  universityName: string;
  universityShortName: string | null;
  universitySlug: string;
  country: string | null;
  region: string | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
  pointCount: number;
  activePointCount: number;
  categories: string[];
  lastUpdatedAt: string | null;
  points: SuperAdminMapPoint[];
};

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function serializePoint(location: Record<string, unknown>): SuperAdminMapPoint {
  return {
    id: String(location._id),
    name: String(location.name),
    description: (location.description as string | null) ?? null,
    category: String(location.category),
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    buildingCode: (location.buildingCode as string | null) ?? null,
    status: String(location.status),
    createdAt: serializeDate(location.createdAt),
    updatedAt: serializeDate(location.updatedAt),
  };
}

export async function listSuperAdminCampusMaps() {
  await requireApiRole(["SUPER_ADMIN"]);
  await connectPostgres();

  const [universities, locations] = await Promise.all([
    UniversityModel.find({ deletedAt: null }).sort({ name: 1 }).lean(),
    MapLocationModel.find({ deletedAt: null })
      .sort({ universityId: 1, name: 1 })
      .lean(),
  ]);

  const pointsByUniversity = new Map<string, SuperAdminMapPoint[]>();

  locations.forEach((location) => {
    const universityId = String(location.universityId);
    const points = pointsByUniversity.get(universityId) ?? [];
    points.push(serializePoint(location as Record<string, unknown>));
    pointsByUniversity.set(universityId, points);
  });

  return universities
    .map((university) => {
      const universityId = String(university._id);
      const points = pointsByUniversity.get(universityId) ?? [];
      const centerLatitude =
        typeof university.locationLatitude === "number"
          ? university.locationLatitude
          : points[0]?.latitude ?? null;
      const centerLongitude =
        typeof university.locationLongitude === "number"
          ? university.locationLongitude
          : points[0]?.longitude ?? null;
      const categories = Array.from(
        new Set(points.map((point) => point.category).filter(Boolean)),
      ).sort();
      const lastUpdatedAt =
        points
          .map((point) => point.updatedAt ?? point.createdAt)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? serializeDate(university.updatedAt);

      return {
        universityId,
        universityName: String(university.name),
        universityShortName:
          typeof university.shortName === "string" && university.shortName.trim()
            ? university.shortName
            : null,
        universitySlug: String(university.slug),
        country:
          typeof university.country === "string" && university.country.trim()
            ? university.country
            : null,
        region:
          typeof university.region === "string" && university.region.trim()
            ? university.region
            : null,
        centerLatitude,
        centerLongitude,
        pointCount: points.length,
        activePointCount: points.filter((point) => point.status === "ACTIVE").length,
        categories,
        lastUpdatedAt,
        points,
      } satisfies SuperAdminCampusMap;
    })
    .filter(
      (map) =>
        map.pointCount > 0 ||
        (map.centerLatitude !== null && map.centerLongitude !== null),
    );
}

export async function getSuperAdminCampusMap(universityId: string) {
  const maps = await listSuperAdminCampusMaps();
  return maps.find((map) => map.universityId === universityId) ?? null;
}
