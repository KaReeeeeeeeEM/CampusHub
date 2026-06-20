import { randomUUID } from "node:crypto";

import {
  createSavedLocationSchema,
  marketplaceLocationInputSchema,
  marketplaceLocationSearchSchema,
  savedLocationQuerySchema,
  updateSavedLocationSchema,
} from "@/features/marketplace/lib/location-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  MapLocationModel,
  MarketplaceSavedLocationModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function requireUniversity(actor: AuthUser) {
  if (!actor.universityId) throw forbidden("University scope is required.");

  return actor.universityId;
}

function serializeSavedLocation(location: Record<string, unknown>) {
  return {
    id: String(location._id),
    universityId: String(location.universityId),
    userId: String(location.userId),
    label: String(location.label),
    locationType: String(location.locationType),
    mapLocationId:
      typeof location.mapLocationId === "string"
        ? location.mapLocationId
        : null,
    name: typeof location.name === "string" ? location.name : null,
    address: typeof location.address === "string" ? location.address : null,
    latitude: typeof location.latitude === "number" ? location.latitude : null,
    longitude:
      typeof location.longitude === "number" ? location.longitude : null,
    instructions:
      typeof location.instructions === "string" ? location.instructions : null,
    useCount: Number(location.useCount ?? 0),
    lastUsedAt: serializeDate(location.lastUsedAt),
    isDefault: Boolean(location.isDefault),
    createdAt: serializeDate(location.createdAt),
    updatedAt: serializeDate(location.updatedAt),
  };
}

function serializeMapLocation(location: Record<string, unknown>) {
  return {
    id: String(location._id),
    universityId: String(location.universityId),
    name: String(location.name),
    description:
      typeof location.description === "string" ? location.description : null,
    category: String(location.category),
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    buildingCode:
      typeof location.buildingCode === "string" ? location.buildingCode : null,
    marketplaceDelivery: location.marketplaceDelivery ?? null,
  };
}

async function getMapLocationSnapshot(mapLocationId: string, actor: AuthUser) {
  const location = await MapLocationModel.findOne({
    _id: mapLocationId,
    universityId: requireUniversity(actor),
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!location) throw notFound("Map location not found.");

  return {
    locationType: "MAP_LOCATION",
    mapLocationId: String(location._id),
    name: String(location.name),
    address:
      typeof location.buildingCode === "string" ? location.buildingCode : null,
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    instructions:
      typeof location.marketplaceDelivery === "object" &&
      location.marketplaceDelivery &&
      "instructions" in location.marketplaceDelivery
        ? String(
            (location.marketplaceDelivery as Record<string, unknown>)
              .instructions ?? "",
          ) || null
        : null,
  };
}

async function saveLocationFromSnapshot(input: {
  actor: AuthUser;
  snapshot: Record<string, unknown>;
  label?: string | null;
  isDefault?: boolean;
}) {
  if (input.isDefault) {
    await MarketplaceSavedLocationModel.updateMany(
      { userId: input.actor.id, isDefault: true, deletedAt: null },
      { $set: { isDefault: false } },
    );
  }

  const saved = await MarketplaceSavedLocationModel.create({
    _id: randomUUID(),
    universityId: requireUniversity(input.actor),
    userId: input.actor.id,
    label:
      input.label ??
      String(input.snapshot.name ?? input.snapshot.address ?? "Saved location"),
    locationType: input.snapshot.locationType,
    mapLocationId: input.snapshot.mapLocationId ?? null,
    name: input.snapshot.name ?? null,
    address: input.snapshot.address ?? null,
    latitude: input.snapshot.latitude ?? null,
    longitude: input.snapshot.longitude ?? null,
    instructions: input.snapshot.instructions ?? null,
    isDefault: Boolean(input.isDefault),
    createdById: input.actor.id,
  });

  await writeAuditLog({
    actorId: input.actor.id,
    universityId: requireUniversity(input.actor),
    action: "MARKETPLACE_LOCATION_SAVED",
    entityType: "marketplace_saved_location",
    entityId: String(saved._id),
    after: serializeSavedLocation(saved.toObject()),
  });

  return saved;
}

export async function resolveMarketplaceLocation(
  input: unknown,
  actor: AuthUser,
) {
  const payload = marketplaceLocationInputSchema.parse(input);

  if (payload.savedLocationId) {
    const saved = await MarketplaceSavedLocationModel.findOneAndUpdate(
      {
        _id: payload.savedLocationId,
        userId: actor.id,
        universityId: requireUniversity(actor),
        ...deletedFilter,
      },
      {
        $inc: { useCount: 1 },
        $set: { lastUsedAt: new Date() },
      },
      { new: true },
    ).lean();
    if (!saved) throw notFound("Saved location not found.");

    return {
      savedLocationId: String(saved._id),
      mapLocationId:
        typeof saved.mapLocationId === "string" ? saved.mapLocationId : null,
      location: {
        locationType: String(saved.locationType),
        name: saved.name ?? saved.label,
        address: saved.address ?? null,
        latitude: saved.latitude ?? null,
        longitude: saved.longitude ?? null,
        instructions: saved.instructions ?? null,
      },
    };
  }

  let snapshot: Record<string, unknown>;
  if (payload.locationType === "MAP_LOCATION") {
    if (!payload.mapLocationId) throw forbidden("Map location id is required.");
    snapshot = await getMapLocationSnapshot(payload.mapLocationId, actor);
  } else {
    snapshot = {
      locationType: payload.locationType,
      mapLocationId: payload.mapLocationId ?? null,
      name: payload.name ?? payload.label ?? null,
      address: payload.address ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      instructions: payload.instructions ?? null,
    };
  }

  let savedLocationId: string | null = null;
  if (payload.saveForLater) {
    const saved = await saveLocationFromSnapshot({
      actor,
      snapshot,
      label: payload.label,
      isDefault: payload.isDefault,
    });
    savedLocationId = String(saved._id);
  }

  return {
    savedLocationId,
    mapLocationId:
      typeof snapshot.mapLocationId === "string"
        ? snapshot.mapLocationId
        : null,
    location: snapshot,
  };
}

export async function createSavedLocation(input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = createSavedLocationSchema.parse(input);
  let snapshot: Record<string, unknown>;

  if (payload.locationType === "MAP_LOCATION") {
    if (!payload.mapLocationId) throw forbidden("Map location id is required.");
    snapshot = await getMapLocationSnapshot(payload.mapLocationId, actor);
  } else {
    snapshot = {
      locationType: payload.locationType,
      mapLocationId: payload.mapLocationId ?? null,
      name: payload.name ?? payload.label,
      address: payload.address ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      instructions: payload.instructions ?? null,
    };
  }

  const saved = await saveLocationFromSnapshot({
    actor,
    snapshot,
    label: payload.label,
    isDefault: payload.isDefault,
  });

  return serializeSavedLocation(saved.toObject());
}

export async function listSavedLocations(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = savedLocationQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    universityId: requireUniversity(actor),
    userId: actor.id,
    ...deletedFilter,
  };
  if (filters.locationType) dbFilter.locationType = filters.locationType;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const locations = await MarketplaceSavedLocationModel.find(dbFilter)
    .sort({ isDefault: -1, lastUsedAt: -1, createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return locations.map((location) =>
    serializeSavedLocation(location as Record<string, unknown>),
  );
}

export async function updateSavedLocation(locationId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = updateSavedLocationSchema.parse(input);
  const before = await MarketplaceSavedLocationModel.findOne({
    _id: locationId,
    userId: actor.id,
    universityId: requireUniversity(actor),
    ...deletedFilter,
  }).lean();
  if (!before) throw notFound("Saved location not found.");

  if (payload.isDefault) {
    await MarketplaceSavedLocationModel.updateMany(
      { userId: actor.id, isDefault: true, deletedAt: null },
      { $set: { isDefault: false } },
    );
  }

  const update: Record<string, unknown> = { updatedById: actor.id };
  if (payload.label !== undefined) update.label = payload.label;
  if (payload.locationType !== undefined)
    update.locationType = payload.locationType;
  if (payload.mapLocationId !== undefined)
    update.mapLocationId = payload.mapLocationId ?? null;
  if (payload.name !== undefined) update.name = payload.name ?? null;
  if (payload.address !== undefined) update.address = payload.address ?? null;
  if (payload.latitude !== undefined)
    update.latitude = payload.latitude ?? null;
  if (payload.longitude !== undefined)
    update.longitude = payload.longitude ?? null;
  if (payload.instructions !== undefined)
    update.instructions = payload.instructions ?? null;
  if (payload.isDefault !== undefined) update.isDefault = payload.isDefault;

  const saved = await MarketplaceSavedLocationModel.findOneAndUpdate(
    { _id: locationId, userId: actor.id, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: requireUniversity(actor),
    action: "MARKETPLACE_LOCATION_UPDATED",
    entityType: "marketplace_saved_location",
    entityId: locationId,
    before: serializeSavedLocation(before as Record<string, unknown>),
    after: saved
      ? serializeSavedLocation(saved as Record<string, unknown>)
      : null,
  });

  return serializeSavedLocation(saved as Record<string, unknown>);
}

export async function deleteSavedLocation(locationId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const saved = await MarketplaceSavedLocationModel.findOneAndUpdate(
    {
      _id: locationId,
      userId: actor.id,
      universityId: requireUniversity(actor),
      ...deletedFilter,
    },
    {
      $set: {
        deletedAt: new Date(),
        deletedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!saved) throw notFound("Saved location not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: requireUniversity(actor),
    action: "MARKETPLACE_LOCATION_DELETED",
    entityType: "marketplace_saved_location",
    entityId: locationId,
  });

  return { deleted: true };
}

export async function searchMarketplaceLocations(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = marketplaceLocationSearchSchema.parse(query);
  const results: {
    savedLocations: ReturnType<typeof serializeSavedLocation>[];
    mapLocations: ReturnType<typeof serializeMapLocation>[];
  } = {
    savedLocations: [],
    mapLocations: [],
  };

  if (filters.includeSaved) {
    const savedFilter: Record<string, unknown> = {
      universityId: requireUniversity(actor),
      userId: actor.id,
      ...deletedFilter,
    };
    if (filters.q) {
      savedFilter.$or = [
        { label: new RegExp(filters.q, "i") },
        { name: new RegExp(filters.q, "i") },
        { address: new RegExp(filters.q, "i") },
      ];
    }
    const saved = await MarketplaceSavedLocationModel.find(savedFilter)
      .sort({ isDefault: -1, lastUsedAt: -1, createdAt: -1 })
      .limit(filters.limit)
      .lean();
    results.savedLocations = saved.map((location) =>
      serializeSavedLocation(location as Record<string, unknown>),
    );
  }

  if (filters.includeMapLocations) {
    const mapFilter: Record<string, unknown> = {
      universityId: requireUniversity(actor),
      status: "ACTIVE",
      ...deletedFilter,
    };
    if (filters.q) mapFilter.$text = { $search: filters.q };
    if (filters.marketplaceDeliveryOnly) {
      mapFilter["marketplaceDelivery.enabled"] = true;
    }
    const locations = await MapLocationModel.find(mapFilter)
      .sort({ name: 1 })
      .limit(filters.limit)
      .lean();
    results.mapLocations = locations.map((location) =>
      serializeMapLocation(location as Record<string, unknown>),
    );
  }

  return results;
}
