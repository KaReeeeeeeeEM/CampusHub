import { randomBytes, randomUUID } from "node:crypto";

import { requireApiRole } from "@/lib/auth/authorization";
import { connectMongo } from "@/lib/db/mongodb";
import {
  AlmanacEventModel,
  AnnouncementModel,
  CollegeModel,
  CommitteeModel,
  DepartmentModel,
  EventModel,
  ForumModel,
  MapLocationModel,
  PollModel,
  SuggestionModel,
  UniversityModel,
} from "@/lib/db/models";

export const platformContentTypes = [
  "announcements",
  "events",
  "almanac",
  "map-locations",
  "polls",
  "suggestions",
  "forums",
  "committees",
] as const;

export type PlatformContentType = (typeof platformContentTypes)[number];

export type PlatformContentItem = {
  id: string;
  type: PlatformContentType;
  title: string;
  universityId: string;
  universityName: string;
  category: string;
  status: string;
  description: string;
  startsAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown>;
};

export type PlatformContentUniversity = {
  id: string;
  name: string;
};

export type PlatformContentTarget = {
  id: string;
  name: string;
  universityId: string;
};

export type PlatformContentMapLocation = {
  id: string;
  name: string;
  universityId: string;
  category: string;
  coordinates: string;
  latitude: number | null;
  longitude: number | null;
};

export type PlatformContentInput = {
  type: PlatformContentType;
  universityId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  venue?: string | null;
  venueMode?: "UNIVERSITY_POINT" | "OUTSIDE" | null;
  locationId?: string | null;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  options?: string[] | null;
  visibility?: "UNIVERSITY" | "COLLEGE" | "DEPARTMENT" | "CUSTOM" | null;
  collegeIds?: string[] | null;
  departmentIds?: string[] | null;
  customAudience?: string[] | null;
  allowMultipleSelection?: boolean | null;
  anonymous?: boolean | null;
};

const contentModels = {
  announcements: AnnouncementModel,
  events: EventModel,
  almanac: AlmanacEventModel,
  "map-locations": MapLocationModel,
  polls: PollModel,
  suggestions: SuggestionModel,
  forums: ForumModel,
  committees: CommitteeModel,
} as const;

const statusDefaults: Record<PlatformContentType, string> = {
  announcements: "DRAFT",
  events: "DRAFT",
  almanac: "ACTIVE",
  "map-locations": "ACTIVE",
  polls: "DRAFT",
  suggestions: "OPEN",
  forums: "ACTIVE",
  committees: "ACTIVE",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function dateValue(value: string | null | undefined, fallback: Date) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function normalizeType(value: unknown): PlatformContentType {
  if (
    typeof value === "string" &&
    platformContentTypes.includes(value as PlatformContentType)
  ) {
    return value as PlatformContentType;
  }

  throw new Error("Unsupported platform content type.");
}

function getDisplayTitle(type: PlatformContentType, item: Record<string, unknown>) {
  if (type === "map-locations" || type === "forums" || type === "committees") {
    return stringValue(item.name, "Untitled");
  }

  return stringValue(item.title, "Untitled");
}

function getDescription(type: PlatformContentType, item: Record<string, unknown>) {
  if (type === "announcements") {
    return stringValue(item.summary, stringValue(item.content, stringValue(item.body)));
  }
  if (type === "forums") {
    return stringValue(item.description);
  }

  return stringValue(item.description);
}

function getCategory(type: PlatformContentType, item: Record<string, unknown>) {
  if (type === "events") return stringValue(item.eventType, "GENERAL");
  if (type === "almanac") return stringValue(item.eventType, "GENERAL");
  if (type === "map-locations") return stringValue(item.category, "OTHER");
  if (type === "polls") return stringValue(item.pollType, "GENERAL");
  if (type === "committees") return stringValue(item.category, "GENERAL");

  return stringValue(item.category, "GENERAL");
}

function getStartDate(type: PlatformContentType, item: Record<string, unknown>) {
  if (type === "events") return serializeDate(item.startDate ?? item.startAt);
  if (type === "almanac") return serializeDate(item.startDate);
  if (type === "polls") return serializeDate(item.startDate ?? item.startsAt);

  return null;
}

function getEndDate(type: PlatformContentType, item: Record<string, unknown>) {
  if (type === "events") return serializeDate(item.endDate ?? item.endAt);
  if (type === "almanac") return serializeDate(item.endDate);
  if (type === "polls") return serializeDate(item.endDate ?? item.endsAt);

  return null;
}

function getPollOptions(item: Record<string, unknown>) {
  if (!Array.isArray(item.options)) return [];

  return item.options
    .map((option) => {
      if (typeof option === "string") return option;
      if (option && typeof option === "object") {
        const label = (option as Record<string, unknown>).label;
        return typeof label === "string" ? label : "";
      }
      return "";
    })
    .filter(Boolean);
}

function serializeItem(
  type: PlatformContentType,
  item: Record<string, unknown>,
  universityNames: Map<string, string>,
): PlatformContentItem {
  const universityId = stringValue(item.universityId);

  return {
    id: stringValue(item._id),
    type,
    title: getDisplayTitle(type, item),
    universityId,
    universityName: universityNames.get(universityId) ?? "Unknown university",
    category: getCategory(type, item),
    status: stringValue(item.status, "UNKNOWN"),
    description: getDescription(type, item),
    startsAt: getStartDate(type, item),
    createdAt: serializeDate(item.createdAt),
    updatedAt: serializeDate(item.updatedAt),
    metadata: {
      visibility: item.visibility ?? null,
      endDate: getEndDate(type, item),
      options: type === "polls" ? getPollOptions(item) : [],
      collegeIds: item.collegeIds ?? [],
      departmentIds: item.departmentIds ?? [],
      customAudience: item.customAudience ?? [],
      allowMultipleSelection:
        item.allowMultipleSelection ?? item.allowMultiple ?? null,
      anonymous: item.anonymous ?? null,
      venue: item.venue ?? null,
      locationId: item.locationId ?? null,
      locationName: item.locationName ?? null,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      collegeId: item.collegeId ?? null,
      departmentId: item.departmentId ?? null,
    },
  };
}

function getQueryFilter(query?: {
  type?: PlatformContentType | "all";
  universityId?: string;
  q?: string;
}) {
  const filter: Record<string, unknown> = {};

  if (query?.universityId && query.universityId !== "all") {
    filter.universityId = query.universityId;
  }

  if (query?.q?.trim()) {
    filter.$or = [
      { title: { $regex: query.q.trim(), $options: "i" } },
      { name: { $regex: query.q.trim(), $options: "i" } },
      { description: { $regex: query.q.trim(), $options: "i" } },
      { content: { $regex: query.q.trim(), $options: "i" } },
      { body: { $regex: query.q.trim(), $options: "i" } },
    ];
  }

  return filter;
}

function buildCreatePayload(input: PlatformContentInput, actorId: string) {
  const type = normalizeType(input.type);
  const now = new Date();
  const startsAt = dateValue(input.startsAt, now);
  const endsAt = dateValue(input.endsAt, new Date(startsAt.getTime() + 60 * 60 * 1000));
  const title = input.title.trim();
  const description = input.description?.trim() || title;
  const category = input.category?.trim() || "GENERAL";
  const status = input.status?.trim() || statusDefaults[type];
  const slug = slugify(title);

  if (!input.universityId) {
    throw new Error("University is required.");
  }

  if (!title) {
    throw new Error("Title is required.");
  }

  switch (type) {
    case "announcements":
      return {
        _id: randomUUID(),
        universityId: input.universityId,
        title,
        slug,
        content: description,
        body: description,
        summary: description,
        category: category === "GENERAL" ? "GENERAL" : category,
        createdBy: actorId,
        status,
      };
    case "events": {
      const usesUniversityPoint = input.venueMode === "UNIVERSITY_POINT";
      const venue = usesUniversityPoint
        ? input.locationName?.trim() || input.venue?.trim()
        : input.venue?.trim();
      const latitude =
        typeof input.latitude === "number" && Number.isFinite(input.latitude)
          ? input.latitude
          : null;
      const longitude =
        typeof input.longitude === "number" && Number.isFinite(input.longitude)
          ? input.longitude
          : null;

      if (usesUniversityPoint && !input.locationId) {
        throw new Error("Select a university map point for this event.");
      }

      if (!usesUniversityPoint && !venue) {
        throw new Error("Enter an outside venue for this event.");
      }

      if (latitude === null || longitude === null) {
        throw new Error("Set event latitude and longitude for directions.");
      }

      return {
        _id: randomUUID(),
        universityId: input.universityId,
        title,
        description,
        eventType: category === "GENERAL" ? "SOCIAL" : category,
        organizerId: actorId,
        venue,
        locationId: usesUniversityPoint ? input.locationId : null,
        locationName: usesUniversityPoint ? venue : null,
        latitude,
        longitude,
        startDate: startsAt,
        endDate: endsAt,
        startAt: startsAt,
        endAt: endsAt,
        qrCode: `event_${randomBytes(32).toString("base64url")}`,
        status,
      };
    }
    case "almanac":
      return {
        _id: randomUUID(),
        universityId: input.universityId,
        title,
        description,
        eventType: category,
        startDate: startsAt,
        endDate: endsAt,
        createdBy: actorId,
        status,
      };
    case "map-locations": {
      const latitude = Number(input.latitude ?? 0);
      const longitude = Number(input.longitude ?? 0);
      return {
        _id: randomUUID(),
        universityId: input.universityId,
        name: title,
        description,
        category: category === "GENERAL" ? "OTHER" : category,
        latitude,
        longitude,
        coordinates: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        createdBy: actorId,
        status,
      };
    }
    case "polls": {
      const optionLabels = (input.options ?? [])
        .map((option) => option.trim())
        .filter(Boolean);
      const options = (optionLabels.length >= 2 ? optionLabels : ["Yes", "No"]).map(
        (label) => ({ optionId: randomUUID(), label, voteCount: 0 }),
      );
      const visibility = input.visibility ?? "UNIVERSITY";
      const collegeIds = visibility === "COLLEGE" ? input.collegeIds ?? [] : [];
      const departmentIds =
        visibility === "DEPARTMENT" ? input.departmentIds ?? [] : [];
      const customAudience =
        visibility === "CUSTOM" ? input.customAudience ?? [] : [];

      return {
        _id: randomUUID(),
        universityId: input.universityId,
        createdById: actorId,
        creatorId: actorId,
        title,
        description,
        pollType: category,
        options,
        visibility,
        collegeIds,
        departmentIds,
        customAudience,
        targetAudience: {
          universityWide: visibility === "UNIVERSITY",
          collegeIds,
          departmentIds,
          roles: ["STUDENT", "TEACHER"],
        },
        allowMultiple: Boolean(input.allowMultipleSelection),
        allowMultipleSelection: Boolean(input.allowMultipleSelection),
        anonymous: Boolean(input.anonymous),
        endsAt,
        endDate: endsAt,
        startDate: startsAt,
        startsAt,
        status,
      };
    }
    case "suggestions":
      return {
        _id: randomUUID(),
        universityId: input.universityId,
        createdById: actorId,
        authorId: actorId,
        title,
        description,
        category,
        status,
      };
    case "forums":
      return {
        _id: randomUUID(),
        universityId: input.universityId,
        name: title,
        slug,
        description,
        status,
      };
    case "committees":
      return {
        _id: randomUUID(),
        universityId: input.universityId,
        name: title,
        slug,
        description,
        category: category === "GENERAL" ? "GENERAL" : category,
        status,
      };
    default:
      throw new Error("Unsupported platform content type.");
  }
}

function buildUpdatePayload(type: PlatformContentType, input: Partial<PlatformContentInput>) {
  const update: Record<string, unknown> = {};

  if (input.title?.trim()) {
    if (
      type === "map-locations" ||
      type === "forums" ||
      type === "committees"
    ) {
      update.name = input.title.trim();
      update.slug = slugify(input.title);
    } else {
      update.title = input.title.trim();
      if (type === "announcements") update.slug = slugify(input.title);
    }
  }

  if (typeof input.description === "string") {
    if (type === "announcements") {
      update.content = input.description;
      update.body = input.description;
      update.summary = input.description;
    } else if (type === "suggestions") {
      update.description = input.description || "No description provided.";
    } else {
      update.description = input.description;
    }
  }

  if (input.category?.trim()) {
    if (type === "events" || type === "almanac") update.eventType = input.category;
    else if (type === "polls") update.pollType = input.category;
    else update.category = input.category;
  }

  if (input.status?.trim()) update.status = input.status;

  if (input.startsAt) {
    const startsAt = dateValue(input.startsAt, new Date());
    if (type === "events") {
      update.startDate = startsAt;
      update.startAt = startsAt;
    } else if (type === "almanac") update.startDate = startsAt;
    else if (type === "polls") {
      update.startDate = startsAt;
      update.startsAt = startsAt;
    }
  }

  if (input.endsAt) {
    const endsAt = dateValue(input.endsAt, new Date());
    if (type === "events") {
      update.endDate = endsAt;
      update.endAt = endsAt;
    } else if (type === "almanac") update.endDate = endsAt;
    else if (type === "polls") {
      update.endDate = endsAt;
      update.endsAt = endsAt;
    }
  }

  if (type === "polls") {
    if (input.visibility) {
      const collegeIds =
        input.visibility === "COLLEGE" ? input.collegeIds ?? [] : [];
      const departmentIds =
        input.visibility === "DEPARTMENT" ? input.departmentIds ?? [] : [];

      update.visibility = input.visibility;
      update.collegeIds = collegeIds;
      update.departmentIds = departmentIds;
      update.customAudience =
        input.visibility === "CUSTOM" ? input.customAudience ?? [] : [];
      update.targetAudience = {
        universityWide: input.visibility === "UNIVERSITY",
        collegeIds,
        departmentIds,
        roles: ["STUDENT", "TEACHER"],
      };
    }

    if (typeof input.allowMultipleSelection === "boolean") {
      update.allowMultiple = input.allowMultipleSelection;
      update.allowMultipleSelection = input.allowMultipleSelection;
    }

    if (typeof input.anonymous === "boolean") {
      update.anonymous = input.anonymous;
    }
  }

  if (type === "events" && typeof input.venue === "string") {
    const usesUniversityPoint = input.venueMode === "UNIVERSITY_POINT";
    const venue = usesUniversityPoint
      ? input.locationName?.trim() || input.venue.trim()
      : input.venue.trim();
    const latitude =
      typeof input.latitude === "number" && Number.isFinite(input.latitude)
        ? input.latitude
        : null;
    const longitude =
      typeof input.longitude === "number" && Number.isFinite(input.longitude)
        ? input.longitude
        : null;

    if (usesUniversityPoint && !input.locationId) {
      throw new Error("Select a university map point for this event.");
    }

    if (!usesUniversityPoint && !venue) {
      throw new Error("Enter an outside venue for this event.");
    }

    if (latitude === null || longitude === null) {
      throw new Error("Set event latitude and longitude for directions.");
    }

    update.venue = venue;
    update.locationId = usesUniversityPoint ? input.locationId : null;
    update.locationName = usesUniversityPoint ? venue : null;
    update.latitude = latitude;
    update.longitude = longitude;
  }

  if (type === "map-locations") {
    const hasLat = typeof input.latitude === "number";
    const hasLng = typeof input.longitude === "number";
    if (hasLat) update.latitude = input.latitude;
    if (hasLng) update.longitude = input.longitude;
    if (hasLat || hasLng) {
      const latitude = Number(input.latitude ?? 0);
      const longitude = Number(input.longitude ?? 0);
      update.coordinates = { type: "Point", coordinates: [longitude, latitude] };
    }
  }

  return update;
}

export async function listPlatformContent(query?: {
  type?: PlatformContentType | "all";
  universityId?: string;
  q?: string;
}) {
  await requireApiRole(["SUPER_ADMIN"]);
  await connectMongo();

  const universities = await UniversityModel.find({ deletedAt: null })
    .sort({ name: 1 })
    .lean();
  const [colleges, departments, mapLocations] = await Promise.all([
    CollegeModel.find({ deletedAt: null, status: "ACTIVE" })
      .select("_id name shortName code universityId")
      .sort({ name: 1 })
      .lean(),
    DepartmentModel.find({ deletedAt: null, status: "ACTIVE" })
      .select("_id name code universityId")
      .sort({ name: 1 })
      .lean(),
    MapLocationModel.find({ deletedAt: null, status: "ACTIVE" })
      .select("_id name category latitude longitude universityId")
      .sort({ name: 1 })
      .lean(),
  ]);
  const universityNames = new Map(
    universities.map((university) => [String(university._id), String(university.name)]),
  );
  const filter = getQueryFilter(query);
  const selectedTypes =
    query?.type && query.type !== "all" ? [query.type] : [...platformContentTypes];

  const entries = await Promise.all(
    selectedTypes.map(async (type) => {
      const records = await contentModels[type]
        .find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(100)
        .lean();

      return records.map((record) =>
        serializeItem(type, record as Record<string, unknown>, universityNames),
      );
    }),
  );

  return {
    universities: universities.map((university) => ({
      id: String(university._id),
      name: String(university.name),
    })),
    colleges: colleges.map((college) => ({
      id: String(college._id),
      name: String(college.shortName ?? college.name ?? college.code),
      universityId: String(college.universityId),
    })),
    departments: departments.map((department) => ({
      id: String(department._id),
      name: String(department.name ?? department.code),
      universityId: String(department.universityId),
    })),
    mapLocations: mapLocations.map((location) => ({
      id: String(location._id),
      name: String(location.name),
      universityId: String(location.universityId),
      category: String(location.category ?? "Campus"),
      coordinates:
        typeof location.latitude === "number" &&
        typeof location.longitude === "number"
          ? `${location.latitude}, ${location.longitude}`
          : "",
      latitude:
        typeof location.latitude === "number" ? Number(location.latitude) : null,
      longitude:
        typeof location.longitude === "number"
          ? Number(location.longitude)
          : null,
    })),
    items: entries.flat().sort((a, b) => {
      const aDate = a.updatedAt ?? a.createdAt ?? "";
      const bDate = b.updatedAt ?? b.createdAt ?? "";
      return bDate.localeCompare(aDate);
    }),
  };
}

export async function createPlatformContent(input: unknown) {
  const actor = await requireApiRole(["SUPER_ADMIN"]);
  await connectMongo();

  const payload = input as PlatformContentInput;
  const type = normalizeType(payload.type);
  const created = await contentModels[type].create(
    buildCreatePayload(payload, actor.id),
  );
  const universities = await UniversityModel.find({ deletedAt: null }).lean();
  const universityNames = new Map(
    universities.map((university) => [String(university._id), String(university.name)]),
  );

  return serializeItem(type, created.toObject(), universityNames);
}

export async function updatePlatformContent(
  typeValue: string,
  id: string,
  input: unknown,
) {
  await requireApiRole(["SUPER_ADMIN"]);
  await connectMongo();

  const type = normalizeType(typeValue);
  const updated = await contentModels[type]
    .findByIdAndUpdate(id, { $set: buildUpdatePayload(type, input as Partial<PlatformContentInput>) }, { new: true })
    .lean();

  if (!updated) throw new Error("Platform content record was not found.");

  const universities = await UniversityModel.find({ deletedAt: null }).lean();
  const universityNames = new Map(
    universities.map((university) => [String(university._id), String(university.name)]),
  );

  return serializeItem(type, updated as Record<string, unknown>, universityNames);
}

export async function deletePlatformContent(typeValue: string, id: string) {
  await requireApiRole(["SUPER_ADMIN"]);
  await connectMongo();

  const type = normalizeType(typeValue);
  const archivedStatus =
    type === "suggestions" ? "ARCHIVED" : type === "events" ? "CANCELLED" : "ARCHIVED";
  const deleted = await contentModels[type]
    .findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date(), status: archivedStatus } },
      { new: true },
    )
    .lean();

  if (!deleted) throw new Error("Platform content record was not found.");

  return { id, type };
}
