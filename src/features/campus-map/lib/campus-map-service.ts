import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import {
  createMapLocationSchema,
  directionRequestSchema,
  mapLocationQuerySchema,
  nearbyLocationsQuerySchema,
  updateMapLocationSchema,
  type CreateMapLocationInput,
  type UpdateMapLocationInput,
} from "@/features/campus-map/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  MapDirectionRequestModel,
  MapLocationModel,
  MapLocationViewModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function isCampusAdmin(actor: AuthUser) {
  return hasRole(actor.role, ["CAMPUS_ADMIN"], actor.roles);
}

function assertUniversityScope(actor: AuthUser) {
  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  return actor.universityId;
}

function assertCanManage(actor: AuthUser) {
  if (!isCampusAdmin(actor)) {
    throw forbidden("Campus Admin access is required.");
  }
}

function serializeLocation(location: Record<string, unknown>) {
  return {
    id: String(location._id),
    universityId: String(location.universityId),
    name: String(location.name),
    description: (location.description as string | null) ?? null,
    category: String(location.category),
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    buildingCode: (location.buildingCode as string | null) ?? null,
    contactInformation: location.contactInformation ?? location.contact ?? null,
    images: Array.isArray(location.images) ? location.images.map(String) : [],
    status: String(location.status),
    createdBy: String(location.createdBy ?? location.createdById),
    analytics: {
      views: Number(location.views ?? 0),
      uniqueViews: Number(location.uniqueViews ?? 0),
      directionRequests: Number(location.directionRequests ?? 0),
    },
    navigation: location.navigation ?? null,
    liveLocation: location.liveLocation ?? null,
    marketplaceDelivery: location.marketplaceDelivery ?? null,
    eventLocation: location.eventLocation ?? null,
    deletedAt: serializeDate(location.deletedAt),
    createdAt: serializeDate(location.createdAt),
    updatedAt: serializeDate(location.updatedAt),
  };
}

async function getLocationForActor(locationId: string, actor: AuthUser) {
  const universityId = assertUniversityScope(actor);
  const location = await MapLocationModel.findOne({
    _id: locationId,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!location) throw notFound("Map location not found.");
  if (!isCampusAdmin(actor) && location.status !== "ACTIVE") {
    throw notFound("Map location not found.");
  }

  return location;
}

async function trackLocationView(
  actor: AuthUser,
  location: Record<string, unknown>,
) {
  const result = await MapLocationViewModel.updateOne(
    {
      locationId: location._id,
      userId: actor.id,
    },
    {
      $setOnInsert: {
        _id: randomUUID(),
        universityId: location.universityId,
        locationId: location._id,
        userId: actor.id,
        viewedAt: new Date(),
      },
    },
    { upsert: true },
  );

  await MapLocationModel.updateOne(
    { _id: location._id },
    { $inc: { views: 1 } },
  );

  if (result.upsertedCount) {
    const uniqueViews = await MapLocationViewModel.countDocuments({
      locationId: location._id,
    });
    await MapLocationModel.updateOne(
      { _id: location._id },
      { $set: { uniqueViews } },
    );
  }
}

export async function createMapLocation(input: CreateMapLocationInput) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  assertCanManage(actor);
  await connectPostgres();
  const payload = createMapLocationSchema.parse(input);

  const location = await MapLocationModel.create({
    _id: randomUUID(),
    universityId,
    name: payload.name,
    description: payload.description ?? null,
    category: payload.category,
    latitude: payload.latitude,
    longitude: payload.longitude,
    coordinates: {
      type: "Point",
      coordinates: [payload.longitude, payload.latitude],
    },
    buildingCode: payload.buildingCode ?? null,
    building: payload.buildingCode ?? null,
    contactInformation: payload.contactInformation ?? null,
    contact: payload.contactInformation ?? null,
    images: payload.images,
    status: payload.status,
    createdBy: actor.id,
    createdById: actor.id,
    navigation: payload.navigation ?? null,
    liveLocation: payload.liveLocation ?? null,
    marketplaceDelivery: payload.marketplaceDelivery ?? undefined,
    eventLocation: payload.eventLocation ?? undefined,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "MAP_LOCATION_CREATED",
    entityType: "map_location",
    entityId: String(location._id),
    after: serializeLocation(location.toObject()),
  });

  return serializeLocation(location.toObject());
}

export async function listMapLocations(query: unknown = {}) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectPostgres();
  const filters = mapLocationQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };

  if (!isCampusAdmin(actor)) dbFilter.status = "ACTIVE";
  else if (filters.status) dbFilter.status = filters.status;
  else if (!filters.includeInactive) dbFilter.status = { $ne: "ARCHIVED" };
  if (filters.category) dbFilter.category = filters.category;
  if (filters.q) dbFilter.$text = { $search: filters.q };

  const locations = await MapLocationModel.find(dbFilter)
    .sort({ name: 1 })
    .lean();

  return locations.map((location) =>
    serializeLocation(location as Record<string, unknown>),
  );
}

export async function getMapLocation(locationId: string) {
  const actor = await requireAuth();
  await connectPostgres();
  const location = await getLocationForActor(locationId, actor);

  await trackLocationView(actor, location as Record<string, unknown>);
  const refreshed = await MapLocationModel.findById(locationId).lean();

  return serializeLocation((refreshed ?? location) as Record<string, unknown>);
}

export async function updateMapLocation(
  locationId: string,
  input: UpdateMapLocationInput,
) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  assertCanManage(actor);
  await connectPostgres();
  const payload = updateMapLocationSchema.parse(input);
  const before = await getLocationForActor(locationId, actor);
  const update: Record<string, unknown> = {
    updatedById: actor.id,
  };

  if (payload.name !== undefined) update.name = payload.name;
  if (payload.description !== undefined)
    update.description = payload.description ?? null;
  if (payload.category !== undefined) update.category = payload.category;
  if (payload.latitude !== undefined || payload.longitude !== undefined) {
    const latitude = payload.latitude ?? Number(before.latitude);
    const longitude = payload.longitude ?? Number(before.longitude);
    update.latitude = latitude;
    update.longitude = longitude;
    update.coordinates = { type: "Point", coordinates: [longitude, latitude] };
  }
  if (payload.buildingCode !== undefined) {
    update.buildingCode = payload.buildingCode ?? null;
    update.building = payload.buildingCode ?? null;
  }
  if (payload.contactInformation !== undefined) {
    update.contactInformation = payload.contactInformation ?? null;
    update.contact = payload.contactInformation ?? null;
  }
  if (payload.images !== undefined) update.images = payload.images;
  if (payload.status !== undefined) update.status = payload.status;
  if (payload.navigation !== undefined)
    update.navigation = payload.navigation ?? null;
  if (payload.liveLocation !== undefined)
    update.liveLocation = payload.liveLocation ?? null;
  if (payload.marketplaceDelivery !== undefined) {
    update.marketplaceDelivery = payload.marketplaceDelivery;
  }
  if (payload.eventLocation !== undefined)
    update.eventLocation = payload.eventLocation;

  const location = await MapLocationModel.findOneAndUpdate(
    { _id: locationId, universityId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "MAP_LOCATION_UPDATED",
    entityType: "map_location",
    entityId: locationId,
    before: serializeLocation(before as Record<string, unknown>),
    after: location
      ? serializeLocation(location as Record<string, unknown>)
      : null,
  });

  return serializeLocation(location as Record<string, unknown>);
}

export async function deleteMapLocation(locationId: string) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  assertCanManage(actor);
  await connectPostgres();
  const before = await getLocationForActor(locationId, actor);
  const location = await MapLocationModel.findOneAndUpdate(
    { _id: locationId, universityId, ...deletedFilter },
    {
      $set: {
        status: "ARCHIVED",
        deletedAt: new Date(),
        deletedById: actor.id,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "MAP_LOCATION_DELETED",
    entityType: "map_location",
    entityId: locationId,
    before: serializeLocation(before as Record<string, unknown>),
    after: location
      ? serializeLocation(location as Record<string, unknown>)
      : null,
  });

  return serializeLocation(location as Record<string, unknown>);
}

export async function getNearbyLocations(query: unknown) {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectPostgres();
  const filters = nearbyLocationsQuerySchema.parse(query);
  const locations = await MapLocationModel.find({
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
    ...(filters.category ? { category: filters.category } : {}),
    coordinates: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [filters.longitude, filters.latitude],
        },
        $maxDistance: filters.radiusMeters,
      },
    },
  })
    .limit(50)
    .lean();

  return locations.map((location) =>
    serializeLocation(location as Record<string, unknown>),
  );
}

export async function getPopularLocations() {
  const actor = await requireAuth();
  const universityId = assertUniversityScope(actor);
  await connectPostgres();
  const locations = await MapLocationModel.find({
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
  })
    .sort({ directionRequests: -1, views: -1, name: 1 })
    .limit(25)
    .lean();

  return locations.map((location) =>
    serializeLocation(location as Record<string, unknown>),
  );
}

export async function requestDirections(
  locationId: string,
  input: unknown = {},
) {
  const actor = await requireAuth();
  await connectPostgres();
  const payload = directionRequestSchema.parse(input);
  const location = await getLocationForActor(locationId, actor);
  const request = await MapDirectionRequestModel.create({
    _id: randomUUID(),
    universityId: location.universityId,
    locationId,
    userId: actor.id,
    originLatitude: payload.originLatitude ?? null,
    originLongitude: payload.originLongitude ?? null,
    requestedAt: new Date(),
  });

  await MapLocationModel.updateOne(
    { _id: locationId },
    { $inc: { directionRequests: 1 } },
  );
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(location.universityId),
    action: "MAP_DIRECTION_REQUESTED",
    entityType: "map_location",
    entityId: locationId,
    metadata: {
      requestId: request._id,
    },
  });

  const refreshed = await MapLocationModel.findById(locationId).lean();

  return {
    location: serializeLocation(
      (refreshed ?? location) as Record<string, unknown>,
    ),
    request: {
      id: String(request._id),
      locationId,
      requestedAt: request.requestedAt.toISOString(),
    },
  };
}
