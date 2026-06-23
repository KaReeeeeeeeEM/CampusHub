import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { notifySavedCandidateFollowers } from "@/features/career/lib/saved-candidate-activity-notifications";
import {
  createShopSchema,
  shopAnalyticsQuerySchema,
  shopQuerySchema,
  updateShopSchema,
} from "@/features/marketplace/lib/shop-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  OrderModel,
  ProductModel,
  ShopModel,
  ShopViewModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

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

function requireUniversity(actor: AuthUser) {
  if (!actor.universityId) throw forbidden("University scope is required.");

  return actor.universityId;
}

function canManageMarketplace(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.MARKETPLACE_MANAGE) ||
    hasPermission(actor, PERMISSIONS.MARKETPLACE_MODERATE)
  );
}

function canCreateShop(actor: AuthUser) {
  return hasPermission(actor, PERMISSIONS.MARKETPLACE_SHOP_CREATE);
}

function canMutateShop(actor: AuthUser, shop: Record<string, unknown>) {
  if (canManageMarketplace(actor)) return true;

  return shop.ownerId === actor.id;
}

function visibleShopFilter(actor: AuthUser) {
  const universityId = requireUniversity(actor);
  const filters: Record<string, unknown>[] = [
    {
      universityId,
      status: "ACTIVE",
      ...deletedFilter,
    },
    {
      universityId,
      ownerId: actor.id,
      ...deletedFilter,
    },
  ];

  if (canManageMarketplace(actor)) {
    filters.push({ universityId, ...deletedFilter });
  }

  return filters;
}

async function uniqueSlug(universityId: string, name: string) {
  const base = slugify(name) || `shop-${Date.now()}`;
  let candidate = base;
  let index = 1;

  while (await ShopModel.exists({ universityId, slug: candidate })) {
    index += 1;
    candidate = `${base}-${index}`;
  }

  return candidate;
}

function serializeShop(shop: Record<string, unknown>) {
  const metadata =
    typeof shop.metadata === "object" && shop.metadata
      ? (shop.metadata as Record<string, unknown>)
      : {};
  const location =
    typeof shop.location === "object" && shop.location
      ? (shop.location as Record<string, unknown>)
      : null;

  return {
    id: String(shop._id),
    ownerId: String(shop.ownerId),
    universityId: String(shop.universityId),
    name: String(shop.name),
    slug: String(shop.slug),
    description: typeof shop.description === "string" ? shop.description : null,
    logo:
      typeof shop.logo === "string"
        ? shop.logo
        : typeof shop.logoUrl === "string"
          ? shop.logoUrl
          : null,
    bannerImage:
      typeof shop.bannerImage === "string"
        ? shop.bannerImage
        : typeof shop.coverImageUrl === "string"
          ? shop.coverImageUrl
          : null,
    category: String(shop.category),
    contactPhone:
      typeof shop.contactPhone === "string" ? shop.contactPhone : null,
    contactEmail:
      typeof shop.contactEmail === "string" ? shop.contactEmail : null,
    whatsappNumber:
      typeof shop.whatsappNumber === "string" ? shop.whatsappNumber : null,
    openingHours:
      typeof shop.openingHours === "object" && shop.openingHours
        ? shop.openingHours
        : null,
    location: location
      ? {
          locationId:
            typeof location.locationId === "string"
              ? location.locationId
              : typeof shop.locationId === "string"
                ? shop.locationId
                : null,
          name: typeof location.name === "string" ? location.name : null,
          address:
            typeof location.address === "string" ? location.address : null,
          latitude:
            typeof location.latitude === "number" ? location.latitude : null,
          longitude:
            typeof location.longitude === "number" ? location.longitude : null,
        }
      : typeof shop.locationId === "string"
        ? { locationId: shop.locationId }
        : null,
    status: String(shop.status),
    verified: Boolean(shop.verified),
    viewCount: Number(shop.viewCount ?? 0),
    followerCount: Number(shop.followerCount ?? 0),
    productCount: Number(shop.productCount ?? 0),
    orderRequestCount: Number(shop.orderRequestCount ?? 0),
    metadata,
    createdAt: serializeDate(shop.createdAt),
    updatedAt: serializeDate(shop.updatedAt),
  };
}

async function getVisibleShopForActor(shopIdOrSlug: string, actor: AuthUser) {
  const shop = await ShopModel.findOne({
    $or: [{ _id: shopIdOrSlug }, { slug: shopIdOrSlug }],
    $and: [{ $or: visibleShopFilter(actor) }],
  }).lean();

  if (!shop) throw notFound("Shop not found.");

  return shop;
}

export async function createShop(input: unknown) {
  const actor = await requireAuth();
  const universityId = requireUniversity(actor);
  if (!canCreateShop(actor))
    throw forbidden("Shop creation access is required.");

  await connectMongo();
  const payload = createShopSchema.parse(input);
  const shop = await ShopModel.create({
    _id: randomUUID(),
    ownerId: actor.id,
    universityId,
    name: payload.name,
    slug: await uniqueSlug(universityId, payload.name),
    description: payload.description,
    logo: payload.logo ?? null,
    logoUrl: payload.logo ?? null,
    bannerImage: payload.bannerImage ?? null,
    coverImageUrl: payload.bannerImage ?? null,
    category: payload.category,
    contactPhone: payload.contactPhone ?? null,
    contactEmail: payload.contactEmail ?? actor.email,
    whatsappNumber: payload.whatsappNumber ?? null,
    openingHours: payload.openingHours ?? null,
    locationId: payload.location?.locationId ?? null,
    location: payload.location ?? null,
    status: "ACTIVE",
    verified: false,
    visibility: "UNIVERSITY",
    createdById: actor.id,
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "SHOP_CREATED",
    entityType: "shop",
    entityId: String(shop._id),
    after: serializeShop(shop.toObject()),
  });
  await notifySavedCandidateFollowers({
    candidateUserId: actor.id,
    universityId,
    type: "SHOP_CREATED",
    title: `${actor.name ?? "A saved candidate"} opened a shop`,
    message: `${actor.name ?? "A saved candidate"} created "${payload.name}" on Campus Market.`,
    entityType: "shop",
    entityId: String(shop._id),
    actionUrl: `/employer/candidates/${actor.id}`,
    metadata: {
      shopName: payload.name,
      category: payload.category,
    },
  });

  return serializeShop(shop.toObject());
}

export async function listShops(query: unknown = {}) {
  const actor = await requireAuth();
  const universityId = requireUniversity(actor);
  await connectMongo();
  const filters = shopQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };

  if (!canManageMarketplace(actor)) {
    dbFilter.$or = [{ status: "ACTIVE" }, { ownerId: actor.id }];
  }
  if (filters.universityId) {
    if (
      !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
      filters.universityId !== universityId
    ) {
      throw forbidden("Cannot access another university's shops.");
    }
    dbFilter.universityId = filters.universityId;
  }
  if (filters.category) dbFilter.category = filters.category;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.verified !== undefined) dbFilter.verified = filters.verified;
  if (filters.ownerId) dbFilter.ownerId = filters.ownerId;
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const shops = await ShopModel.find(dbFilter)
    .sort({ verified: -1, viewCount: -1, createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return shops.map((shop) => serializeShop(shop as Record<string, unknown>));
}

export async function searchShops(query: unknown = {}) {
  return listShops(query);
}

export async function listMyShops(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  return listShops({ ...shopQuerySchema.parse(query), ownerId: actor.id });
}

export async function getShop(shopIdOrSlug: string) {
  const actor = await requireAuth();
  await connectMongo();
  const shop = await getVisibleShopForActor(shopIdOrSlug, actor);

  return serializeShop(shop as Record<string, unknown>);
}

export async function updateShop(shopIdOrSlug: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const shop = await getVisibleShopForActor(shopIdOrSlug, actor);
  if (!canMutateShop(actor, shop as Record<string, unknown>)) {
    throw forbidden("You cannot update this shop.");
  }
  const payload = updateShopSchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };

  if (payload.name !== undefined) update.name = payload.name;
  if (payload.description !== undefined)
    update.description = payload.description;
  if (payload.logo !== undefined) {
    update.logo = payload.logo ?? null;
    update.logoUrl = payload.logo ?? null;
  }
  if (payload.bannerImage !== undefined) {
    update.bannerImage = payload.bannerImage ?? null;
    update.coverImageUrl = payload.bannerImage ?? null;
  }
  if (payload.category !== undefined) update.category = payload.category;
  if (payload.contactPhone !== undefined) {
    update.contactPhone = payload.contactPhone ?? null;
  }
  if (payload.contactEmail !== undefined) {
    update.contactEmail = payload.contactEmail ?? null;
  }
  if (payload.whatsappNumber !== undefined) {
    update.whatsappNumber = payload.whatsappNumber ?? null;
  }
  if (payload.openingHours !== undefined) {
    update.openingHours = payload.openingHours ?? null;
  }
  if (payload.location !== undefined) {
    update.location = payload.location ?? null;
    update.locationId = payload.location?.locationId ?? null;
  }

  const updated = await ShopModel.findOneAndUpdate(
    { _id: shop._id, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(shop.universityId),
    action: "SHOP_UPDATED",
    entityType: "shop",
    entityId: String(shop._id),
    before: serializeShop(shop as Record<string, unknown>),
    after: updated ? serializeShop(updated as Record<string, unknown>) : null,
  });

  return serializeShop(updated as Record<string, unknown>);
}

async function setShopStatus(
  shopIdOrSlug: string,
  status: "PAUSED" | "CLOSED",
  auditAction: "SHOP_PAUSED" | "SHOP_CLOSED",
) {
  const actor = await requireAuth();
  await connectMongo();
  const shop = await getVisibleShopForActor(shopIdOrSlug, actor);
  if (!canMutateShop(actor, shop as Record<string, unknown>)) {
    throw forbidden("You cannot manage this shop.");
  }

  const updated = await ShopModel.findOneAndUpdate(
    { _id: shop._id, ...deletedFilter },
    { $set: { status, updatedById: actor.id } },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(shop.universityId),
    action: auditAction,
    entityType: "shop",
    entityId: String(shop._id),
    metadata: { status },
  });

  return serializeShop(updated as Record<string, unknown>);
}

export function pauseShop(shopIdOrSlug: string) {
  return setShopStatus(shopIdOrSlug, "PAUSED", "SHOP_PAUSED");
}

export function closeShop(shopIdOrSlug: string) {
  return setShopStatus(shopIdOrSlug, "CLOSED", "SHOP_CLOSED");
}

export async function trackShopView(shopIdOrSlug: string) {
  const actor = await requireAuth();
  await connectMongo();
  const shop = await getVisibleShopForActor(shopIdOrSlug, actor);

  await ShopViewModel.create({
    _id: randomUUID(),
    universityId: shop.universityId,
    shopId: shop._id,
    viewerId: actor.id,
    viewedAt: new Date(),
  });
  await ShopModel.updateOne({ _id: shop._id }, { $inc: { viewCount: 1 } });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(shop.universityId),
    action: "SHOP_VIEWED",
    entityType: "shop",
    entityId: String(shop._id),
  });

  return { tracked: true };
}

export async function getShopAnalytics(
  shopIdOrSlug: string,
  query: unknown = {},
) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = shopAnalyticsQuerySchema.parse(query);
  const shop = await getVisibleShopForActor(shopIdOrSlug, actor);
  if (!canMutateShop(actor, shop as Record<string, unknown>)) {
    throw forbidden("You cannot access this shop's analytics.");
  }
  const since = new Date();
  since.setDate(since.getDate() - filters.days);

  const [views, uniqueViewers, products, orderRequests, dailyViews] =
    await Promise.all([
      ShopViewModel.countDocuments({ shopId: shop._id }),
      ShopViewModel.distinct("viewerId", { shopId: shop._id }),
      ProductModel.countDocuments({
        shopId: shop._id,
        deletedAt: null,
        status: { $ne: "ARCHIVED" },
      }),
      OrderModel.countDocuments({ shopId: shop._id }),
      ShopViewModel.aggregate([
        { $match: { shopId: shop._id, viewedAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$viewedAt" },
            },
            views: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  await ShopModel.updateOne(
    { _id: shop._id },
    {
      $set: {
        productCount: products,
        orderRequestCount: orderRequests,
      },
    },
  );

  return {
    shop: serializeShop(shop as Record<string, unknown>),
    totalViews: Number(views),
    uniqueViewers: uniqueViewers.length,
    followers: Number(shop.followerCount ?? 0),
    productCount: Number(products),
    orderRequests: Number(orderRequests),
    dailyViews: dailyViews.map((row) => ({
      date: String(row._id),
      views: Number(row.views ?? 0),
    })),
  };
}
