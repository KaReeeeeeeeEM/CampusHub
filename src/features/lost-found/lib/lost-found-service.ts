import { randomUUID } from "node:crypto";

import {
  archiveLostFoundItemSchema,
  createLostFoundItemSchema,
  lostFoundQuerySchema,
  updateLostFoundItemSchema,
} from "@/features/lost-found/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import { LostFoundItemModel } from "@/lib/db/models";

const deletedFilter = { deletedAt: null };

const statusToDb = {
  Open: "OPEN",
  Matched: "MATCHED",
  Returned: "RETURNED",
  "Under Review": "UNDER_REVIEW",
} as const;

const statusFromDb = {
  OPEN: "Open",
  MATCHED: "Matched",
  RETURNED: "Returned",
  UNDER_REVIEW: "Under Review",
} as const;

const typeToDb = {
  Lost: "LOST",
  Found: "FOUND",
} as const;

const typeFromDb = {
  LOST: "Lost",
  FOUND: "Found",
} as const;

function assertUniversityScope(universityId: string | null | undefined) {
  if (!universityId) {
    throw forbidden("University scope is required.");
  }

  return universityId;
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function formatReportedAt(value: unknown) {
  const date = value instanceof Date ? value : null;

  if (!date) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function readTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function buildActorPhone(actor: Awaited<ReturnType<typeof requireAuth>>) {
  return readTrimmedString(actor.phoneNumber);
}

function buildActorContact(actor: Awaited<ReturnType<typeof requireAuth>>) {
  return buildActorPhone(actor) || readTrimmedString(actor.email);
}

function readPreferredContact(value: unknown) {
  const contact = readTrimmedString(value);

  if (!contact) return "";

  return (
    contact
      .split("•")
      .map((part) => part.trim())
      .find(Boolean) ?? ""
  );
}

export function serializeLostFoundItem(item: Record<string, unknown>) {
  const rawStatus = String(item.status ?? "OPEN") as keyof typeof statusFromDb;
  const rawType = String(item.type ?? "LOST") as keyof typeof typeFromDb;
  const reporterName =
    typeof item.reporterName === "string" && item.reporterName.trim()
      ? item.reporterName
      : "Campus user";
  const contact =
    readTrimmedString(item.reporterPhone) ||
    readPreferredContact(item.contact) ||
    readTrimmedString(item.reporterEmail);

  return {
    id: String(item._id),
    universityId: String(item.universityId),
    title: String(item.title),
    type: typeFromDb[rawType] ?? "Lost",
    category: String(item.category ?? "Other"),
    status: statusFromDb[rawStatus] ?? "Open",
    location: String(item.location ?? ""),
    reportedBy: reporterName,
    reportedAt: formatReportedAt(item.createdAt),
    createdAt: serializeDate(item.createdAt),
    updatedAt: serializeDate(item.updatedAt),
    description: String(item.description ?? ""),
    contact,
    verification: String(item.verification ?? ""),
    images: Array.isArray(item.images) ? item.images.map(String) : [],
  };
}

export async function listLostFoundItems(query: unknown = {}) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor.universityId);

  await connectPostgres();

  const filters = lostFoundQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };

  if (filters.type) dbFilter.type = typeToDb[filters.type];
  if (filters.status) dbFilter.status = statusToDb[filters.status];
  if (filters.category && filters.category !== "All") {
    dbFilter.category = filters.category;
  }
  if (filters.q) dbFilter.$text = { $search: filters.q };

  const items = await LostFoundItemModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return items.map((item) =>
    serializeLostFoundItem(item as Record<string, unknown>),
  );
}

export async function createLostFoundItem(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor.universityId);

  await connectPostgres();

  const payload = createLostFoundItemSchema.parse(input);
  const status = statusToDb[payload.status];
  const item = await LostFoundItemModel.create({
    _id: randomUUID(),
    universityId,
    createdById: actor.id,
    reporterId: actor.id,
    reporterName: actor.name ?? actor.email,
    reporterEmail: actor.email,
    reporterPhone: buildActorPhone(actor) || null,
    title: payload.title,
    type: typeToDb[payload.type],
    category: payload.category,
    status,
    location: payload.location,
    description: payload.description,
    verification: payload.verification,
    contact: payload.contact || buildActorContact(actor),
    images: payload.images,
    returnedAt: status === "RETURNED" ? new Date() : null,
    matchedAt: status === "MATCHED" ? new Date() : null,
  });

  const serialized = serializeLostFoundItem(item.toObject());

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "LOST_FOUND_ITEM_CREATED",
    entityType: "lost_found_item",
    entityId: String(item._id),
    after: serialized,
  });

  return serialized;
}

export async function updateLostFoundItem(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor.universityId);

  await connectPostgres();

  const payload = updateLostFoundItemSchema.parse(input);
  const status = statusToDb[payload.status];
  const before = await LostFoundItemModel.findOne({
    _id: payload.id,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!before) {
    throw notFound("Lost and found item was not found.");
  }

  const item = await LostFoundItemModel.findOneAndUpdate(
    {
      _id: payload.id,
      universityId,
      ...deletedFilter,
    },
    {
      $set: {
        status,
        updatedById: actor.id,
        returnedAt: status === "RETURNED" ? new Date() : null,
        matchedAt: status === "MATCHED" ? new Date() : null,
      },
    },
    { new: true },
  ).lean();

  if (!item) {
    throw notFound("Lost and found item was not found.");
  }

  const serialized = serializeLostFoundItem(item as Record<string, unknown>);

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "LOST_FOUND_ITEM_UPDATED",
    entityType: "lost_found_item",
    entityId: payload.id,
    before: serializeLostFoundItem(before as Record<string, unknown>),
    after: serialized,
  });

  return serialized;
}

export async function archiveLostFoundItem(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor.universityId);

  await connectPostgres();

  const payload = archiveLostFoundItemSchema.parse(input);
  const before = await LostFoundItemModel.findOneAndUpdate(
    {
      _id: payload.id,
      universityId,
      ...deletedFilter,
    },
    {
      $set: {
        deletedAt: new Date(),
        deletedById: actor.id,
        deleteReason: "Archived from lost and found management.",
      },
    },
    { new: false },
  ).lean();

  if (!before) {
    throw notFound("Lost and found item was not found.");
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "LOST_FOUND_ITEM_ARCHIVED",
    entityType: "lost_found_item",
    entityId: payload.id,
    before: serializeLostFoundItem(before as Record<string, unknown>),
    after: null,
  });

  return { id: payload.id };
}
