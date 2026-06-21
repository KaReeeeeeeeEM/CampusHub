import { randomUUID } from "node:crypto";

import { requireApiRole } from "@/lib/auth/authorization";
import { connectMongo } from "@/lib/db/mongodb";
import {
  AlmanacEventModel,
  AlmanacModel,
  UniversityModel,
} from "@/lib/db/models";

export type SuperAdminAlmanacEvent = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string | null;
  endDate: string | null;
  isAllDay: boolean;
  isDeadline: boolean;
  deadlineType: string | null;
  color: string;
  status: string;
};

export type SuperAdminAlmanac = {
  id: string;
  universityId: string;
  universityName: string;
  title: string;
  description: string | null;
  academicYear: string | null;
  semester: string | null;
  status: string;
  eventCount: number;
  deadlineCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  events: SuperAdminAlmanacEvent[];
};

export type SuperAdminAlmanacUniversity = {
  id: string;
  name: string;
};

export type SuperAdminAlmanacInput = {
  universityId: string;
  title: string;
  description?: string | null;
  academicYear?: string | null;
  semester?: string | null;
  status?: string | null;
};

export type SuperAdminAlmanacEventInput = {
  title: string;
  description?: string | null;
  eventType?: string | null;
  startDate: string;
  endDate?: string | null;
  isAllDay?: boolean | null;
  isDeadline?: boolean | null;
  deadlineType?: string | null;
  color?: string | null;
  status?: string | null;
};

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function metadataValue(item: Record<string, unknown>, key: string) {
  const metadata = item.metadata;
  return metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>)[key]
    : null;
}

function serializeEvent(event: Record<string, unknown>): SuperAdminAlmanacEvent {
  return {
    id: String(event._id),
    title: String(event.title),
    description: (event.description as string | null) ?? null,
    eventType: String(event.eventType ?? "GENERAL"),
    startDate: serializeDate(event.startDate),
    endDate: serializeDate(event.endDate),
    isAllDay: Boolean(event.isAllDay),
    isDeadline: Boolean(metadataValue(event, "isDeadline")),
    deadlineType: (metadataValue(event, "deadlineType") as string | null) ?? null,
    color: String(event.color ?? "#22c55e"),
    status: String(event.status ?? "ACTIVE"),
  };
}

function serializeAlmanac(
  almanac: Record<string, unknown>,
  universityNames: Map<string, string>,
  events: SuperAdminAlmanacEvent[],
): SuperAdminAlmanac {
  const deadlineCount = events.filter((event) => event.isDeadline).length;
  const universityId = String(almanac.universityId);

  return {
    id: String(almanac._id),
    universityId,
    universityName: universityNames.get(universityId) ?? "Unknown university",
    title: String(almanac.title),
    description: (almanac.description as string | null) ?? null,
    academicYear: (almanac.academicYear as string | null) ?? null,
    semester: (almanac.semester as string | null) ?? null,
    status: String(almanac.status ?? "ACTIVE"),
    eventCount: events.length,
    deadlineCount,
    createdAt: serializeDate(almanac.createdAt),
    updatedAt: serializeDate(almanac.updatedAt),
    events,
  };
}

function assertTitle(value: string | undefined) {
  const title = value?.trim();
  if (!title) throw new Error("Title is required.");
  return title;
}

function dateValue(value: string | null | undefined, fallback: Date) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export async function listSuperAdminAlmanacs() {
  await requireApiRole(["SUPER_ADMIN"]);
  await connectMongo();

  const [universities, almanacs, events] = await Promise.all([
    UniversityModel.find({ deletedAt: null }).sort({ name: 1 }).lean(),
    AlmanacModel.find({ deletedAt: null })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean(),
    AlmanacEventModel.find({ deletedAt: null })
      .sort({ startDate: 1 })
      .lean(),
  ]);
  const universityNames = new Map(
    universities.map((university) => [
      String(university._id),
      String(university.name),
    ]),
  );
  const eventsByAlmanac = new Map<string, SuperAdminAlmanacEvent[]>();

  events.forEach((event) => {
    const almanacId = metadataValue(event as Record<string, unknown>, "almanacId");
    if (typeof almanacId !== "string") return;

    const grouped = eventsByAlmanac.get(almanacId) ?? [];
    grouped.push(serializeEvent(event as Record<string, unknown>));
    eventsByAlmanac.set(almanacId, grouped);
  });

  return {
    universities: universities.map((university) => ({
      id: String(university._id),
      name: String(university.name),
    })),
    almanacs: almanacs.map((almanac) =>
      serializeAlmanac(
        almanac as Record<string, unknown>,
        universityNames,
        eventsByAlmanac.get(String(almanac._id)) ?? [],
      ),
    ),
  };
}

export async function createSuperAdminAlmanac(input: SuperAdminAlmanacInput) {
  const actor = await requireApiRole(["SUPER_ADMIN"]);
  await connectMongo();

  if (!input.universityId) throw new Error("University is required.");

  const almanac = await AlmanacModel.create({
    _id: randomUUID(),
    universityId: input.universityId,
    title: assertTitle(input.title),
    description: input.description?.trim() || null,
    academicYear: input.academicYear?.trim() || null,
    semester: input.semester?.trim() || null,
    status: input.status?.trim() || "ACTIVE",
    createdById: actor.id,
  });
  const university = await UniversityModel.findById(input.universityId).lean();

  return serializeAlmanac(
    almanac.toObject(),
    new Map([[input.universityId, String(university?.name ?? "Unknown university")]]),
    [],
  );
}

export async function createSuperAdminAlmanacEvent(
  almanacId: string,
  input: SuperAdminAlmanacEventInput,
) {
  const actor = await requireApiRole(["SUPER_ADMIN"]);
  await connectMongo();

  const almanac = await AlmanacModel.findOne({
    _id: almanacId,
    deletedAt: null,
  }).lean();

  if (!almanac) throw new Error("Almanac not found.");

  const startDate = dateValue(input.startDate, new Date());
  const endDate = dateValue(input.endDate, startDate);
  const isDeadline = Boolean(input.isDeadline);
  const deadlineType = isDeadline ? input.deadlineType?.trim() || "GENERAL" : null;

  const event = await AlmanacEventModel.create({
    _id: randomUUID(),
    universityId: String(almanac.universityId),
    title: assertTitle(input.title),
    description: input.description?.trim() || null,
    eventType: input.eventType?.trim() || "GENERAL",
    startDate,
    endDate,
    isAllDay: input.isAllDay ?? true,
    visibility: "ALL_USERS",
    collegeIds: [],
    color: input.color?.trim() || (isDeadline ? "#ef4444" : "#22c55e"),
    createdBy: actor.id,
    createdById: actor.id,
    status: input.status?.trim() || "ACTIVE",
    academicYear: (almanac.academicYear as string | null) ?? null,
    semester: (almanac.semester as string | null) ?? null,
    reminders: [],
    appliesTo: { universityWide: true, collegeIds: [], roles: [] },
    metadata: {
      almanacId,
      isDeadline,
      deadlineType,
    },
  });

  return serializeEvent(event.toObject());
}
