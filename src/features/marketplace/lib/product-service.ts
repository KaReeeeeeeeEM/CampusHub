import { randomUUID } from "node:crypto";

import { createActivity } from "@/features/activity-feed/lib/activity-feed-service";
import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  createProductSchema,
  productAnalyticsQuerySchema,
  productClickTrackingSchema,
  productQuerySchema,
  updateProductSchema,
} from "@/features/marketplace/lib/product-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  ProductClickModel,
  ProductFavoriteModel,
  ProductModel,
  ProductViewModel,
  ShopModel,
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

function canManageMarketplace(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.MARKETPLACE_MANAGE) ||
    hasPermission(actor, PERMISSIONS.MARKETPLACE_MODERATE)
  );
}

function canCreateProduct(actor: AuthUser) {
  return hasPermission(actor, PERMISSIONS.MARKETPLACE_PRODUCT_CREATE);
}

function canMutateProduct(actor: AuthUser, product: Record<string, unknown>) {
  if (canManageMarketplace(actor)) return true;

  return product.ownerId === actor.id || product.sellerId === actor.id;
}

function visibilityFilter(actor: AuthUser) {
  const universityId = requireUniversity(actor);
  const filters: Record<string, unknown>[] = [
    {
      universityId,
      visibility: "ALL_USERS",
      status: "ACTIVE",
      ...deletedFilter,
    },
    { universityId, ownerId: actor.id, ...deletedFilter },
  ];

  const roleVisibility: Record<string, string> = {
    STUDENT: "STUDENTS",
    TEACHER: "TEACHERS",
    ALUMNI: "ALUMNI",
    EMPLOYER: "EMPLOYERS",
  };
  const roleVisibilityValue = roleVisibility[actor.role];
  if (roleVisibilityValue) {
    filters.push({
      universityId,
      visibility: roleVisibilityValue,
      status: "ACTIVE",
      ...deletedFilter,
    });
  }
  filters.push({
    universityId,
    visibility: "CUSTOM",
    customAudience: { $in: [actor.role, ...(actor.roles ?? [])] },
    status: "ACTIVE",
    ...deletedFilter,
  });

  if (canManageMarketplace(actor)) {
    filters.push({ universityId, ...deletedFilter });
  }

  return filters;
}

function serializeProduct(product: Record<string, unknown>) {
  const location =
    typeof product.location === "object" && product.location
      ? (product.location as Record<string, unknown>)
      : null;

  return {
    id: String(product._id),
    shopId: String(product.shopId),
    ownerId: String(product.ownerId ?? product.sellerId),
    universityId: String(product.universityId),
    title:
      typeof product.title === "string"
        ? product.title
        : typeof product.name === "string"
          ? product.name
          : "",
    description:
      typeof product.description === "string" ? product.description : null,
    images: Array.isArray(product.images) ? product.images.map(String) : [],
    category: String(product.category),
    productType: String(product.productType ?? "PHYSICAL"),
    price: Number(product.price ?? 0),
    currency: String(product.currency ?? "TZS"),
    availability: String(product.availability ?? "AVAILABLE"),
    visibility: String(product.visibility ?? "ALL_USERS"),
    customAudience: Array.isArray(product.customAudience)
      ? product.customAudience.map(String)
      : [],
    location,
    status: String(product.status),
    featured: Boolean(product.isFeatured),
    viewCount: Number(product.viewCount ?? 0),
    clickCount: Number(product.clickCount ?? 0),
    favoriteCount: Number(product.favoriteCount ?? 0),
    orderRequestCount: Number(product.orderRequestCount ?? 0),
    createdAt: serializeDate(product.createdAt),
    updatedAt: serializeDate(product.updatedAt),
  };
}

async function getVisibleProductForActor(productId: string, actor: AuthUser) {
  const product = await ProductModel.findOne({
    _id: productId,
    $and: [{ $or: visibilityFilter(actor) }],
  }).lean();

  if (!product) throw notFound("Product not found.");

  return product;
}

async function getOwnedActiveShop(shopId: string, actor: AuthUser) {
  const universityId = requireUniversity(actor);
  const shop = await ShopModel.findOne({
    _id: shopId,
    universityId,
    status: "ACTIVE",
    ...deletedFilter,
  }).lean();

  if (!shop) throw notFound("Active shop not found.");
  if (!canManageMarketplace(actor) && shop.ownerId !== actor.id) {
    throw forbidden("You cannot manage products for this shop.");
  }

  return shop;
}

export async function createProduct(input: unknown) {
  const actor = await requireAuth();
  if (!canCreateProduct(actor)) {
    throw forbidden("Product creation access is required.");
  }
  await connectMongo();
  const payload = createProductSchema.parse(input);
  const shop = await getOwnedActiveShop(payload.shopId, actor);
  const product = await ProductModel.create({
    _id: randomUUID(),
    universityId: shop.universityId,
    shopId: shop._id,
    sellerId: actor.id,
    ownerId: actor.id,
    name: payload.title,
    title: payload.title,
    description: payload.description,
    images: payload.images,
    category: payload.category,
    productType: payload.productType,
    price: payload.price,
    currency: payload.currency,
    availability: payload.availability,
    location: payload.location ?? shop.location ?? null,
    stockQuantity: payload.productType === "SERVICE" ? 0 : 1,
    condition: payload.productType === "SERVICE" ? "SERVICE" : "NEW",
    visibility: payload.visibility,
    customAudience: payload.customAudience,
    status: "ACTIVE",
    createdById: actor.id,
  });

  await Promise.all([
    ShopModel.updateOne({ _id: shop._id }, { $inc: { productCount: 1 } }),
    createActivity({
      actorId: actor.id,
      actorType: actor.role,
      universityId: String(shop.universityId),
      activityType: "PRODUCT_CREATED",
      title: payload.title,
      description: payload.description,
      entityType: "product",
      entityId: String(product._id),
      image: payload.images[0] ?? null,
      visibility: "UNIVERSITY",
      score: 0,
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(shop.universityId),
      action: "PRODUCT_CREATED",
      entityType: "product",
      entityId: String(product._id),
      after: serializeProduct(product.toObject()),
    }),
  ]);

  return serializeProduct(product.toObject());
}

export async function listProducts(query: unknown = {}) {
  const actor = await requireAuth();
  const universityId = requireUniversity(actor);
  await connectMongo();
  const filters = productQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    universityId,
    $and: [{ $or: visibilityFilter(actor) }],
  };

  if (filters.universityId) {
    if (
      !hasRole(actor.role, ["SUPER_ADMIN"], actor.roles) &&
      filters.universityId !== universityId
    ) {
      throw forbidden("Cannot access another university's products.");
    }
    dbFilter.universityId = filters.universityId;
  }
  if (filters.shopId) dbFilter.shopId = filters.shopId;
  if (filters.ownerId) dbFilter.ownerId = filters.ownerId;
  if (filters.category) dbFilter.category = filters.category;
  if (filters.productType) dbFilter.productType = filters.productType;
  if (filters.visibility) dbFilter.visibility = filters.visibility;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.featured !== undefined) dbFilter.isFeatured = filters.featured;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    dbFilter.price = {};
    if (filters.minPrice !== undefined) {
      (dbFilter.price as Record<string, number>).$gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      (dbFilter.price as Record<string, number>).$lte = filters.maxPrice;
    }
  }
  if (filters.q) dbFilter.$text = { $search: filters.q };
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const products = await ProductModel.find(dbFilter)
    .sort({ isFeatured: -1, viewCount: -1, createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return products.map((product) =>
    serializeProduct(product as Record<string, unknown>),
  );
}

export async function searchProducts(query: unknown = {}) {
  return listProducts(query);
}

export async function getFeaturedProducts(query: unknown = {}) {
  return listProducts({ ...productQuerySchema.parse(query), featured: true });
}

export async function getProduct(productId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const product = await getVisibleProductForActor(productId, actor);

  return serializeProduct(product as Record<string, unknown>);
}

export async function updateProduct(productId: string, input: unknown) {
  const actor = await requireAuth();
  await connectMongo();
  const product = await getVisibleProductForActor(productId, actor);
  if (!canMutateProduct(actor, product as Record<string, unknown>)) {
    throw forbidden("You cannot update this product.");
  }
  const payload = updateProductSchema.parse(input);
  const update: Record<string, unknown> = { updatedById: actor.id };

  if (payload.title !== undefined) {
    update.title = payload.title;
    update.name = payload.title;
  }
  if (payload.description !== undefined)
    update.description = payload.description;
  if (payload.images !== undefined) update.images = payload.images;
  if (payload.category !== undefined) update.category = payload.category;
  if (payload.productType !== undefined)
    update.productType = payload.productType;
  if (payload.price !== undefined) update.price = payload.price;
  if (payload.currency !== undefined) update.currency = payload.currency;
  if (payload.availability !== undefined)
    update.availability = payload.availability;
  if (payload.visibility !== undefined) update.visibility = payload.visibility;
  if (payload.customAudience !== undefined) {
    update.customAudience = payload.customAudience;
  }
  if (payload.location !== undefined)
    update.location = payload.location ?? null;

  const updated = await ProductModel.findOneAndUpdate(
    { _id: productId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(product.universityId),
    action: "PRODUCT_UPDATED",
    entityType: "product",
    entityId: productId,
    before: serializeProduct(product as Record<string, unknown>),
    after: updated
      ? serializeProduct(updated as Record<string, unknown>)
      : null,
  });

  return serializeProduct(updated as Record<string, unknown>);
}

async function setProductStatus(
  productId: string,
  status: "ARCHIVED",
  auditAction: "PRODUCT_DELETED" | "PRODUCT_ARCHIVED",
) {
  const actor = await requireAuth();
  await connectMongo();
  const product = await getVisibleProductForActor(productId, actor);
  if (!canMutateProduct(actor, product as Record<string, unknown>)) {
    throw forbidden("You cannot manage this product.");
  }

  const update: Record<string, unknown> = {
    status,
    updatedById: actor.id,
  };
  if (auditAction === "PRODUCT_DELETED") {
    update.deletedAt = new Date();
    update.deletedById = actor.id;
  }

  const updated = await ProductModel.findOneAndUpdate(
    { _id: productId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();

  if (auditAction === "PRODUCT_DELETED") {
    await ShopModel.updateOne(
      { _id: product.shopId },
      { $inc: { productCount: -1 } },
    );
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(product.universityId),
    action: auditAction,
    entityType: "product",
    entityId: productId,
    metadata: { status },
  });

  return serializeProduct(updated as Record<string, unknown>);
}

export function archiveProduct(productId: string) {
  return setProductStatus(productId, "ARCHIVED", "PRODUCT_ARCHIVED");
}

export function deleteProduct(productId: string) {
  return setProductStatus(productId, "ARCHIVED", "PRODUCT_DELETED");
}

export async function trackProductView(productId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const product = await getVisibleProductForActor(productId, actor);

  await ProductViewModel.create({
    _id: randomUUID(),
    universityId: product.universityId,
    productId,
    viewerId: actor.id,
    viewedAt: new Date(),
  });
  await ProductModel.updateOne({ _id: productId }, { $inc: { viewCount: 1 } });
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(product.universityId),
    action: "PRODUCT_VIEWED",
    entityType: "product",
    entityId: productId,
  });

  return { tracked: true };
}

export async function trackProductClick(
  productId: string,
  input: unknown = {},
) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = productClickTrackingSchema.parse(input);
  const product = await getVisibleProductForActor(productId, actor);

  await ProductClickModel.create({
    _id: randomUUID(),
    universityId: product.universityId,
    productId,
    userId: actor.id,
    clickType: payload.clickType,
    clickedAt: new Date(),
    metadata: payload.metadata ?? null,
  });
  await ProductModel.updateOne(
    { _id: productId },
    {
      $inc: {
        clickCount: 1,
        orderRequestCount: payload.clickType === "ORDER_REQUEST" ? 1 : 0,
      },
    },
  );
  if (payload.clickType === "ORDER_REQUEST") {
    await ShopModel.updateOne(
      { _id: product.shopId },
      { $inc: { orderRequestCount: 1 } },
    );
  }
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(product.universityId),
    action: "PRODUCT_CLICKED",
    entityType: "product",
    entityId: productId,
    metadata: { clickType: payload.clickType },
  });

  return { tracked: true };
}

export async function favoriteProduct(productId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const product = await getVisibleProductForActor(productId, actor);

  try {
    await ProductFavoriteModel.create({
      _id: `product-favorite:${productId}:${actor.id}`,
      universityId: product.universityId,
      productId,
      userId: actor.id,
    });
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== 11000
    ) {
      throw error;
    }

    return {
      favorited: true,
      duplicate: true,
      favoriteCount: Number(product.favoriteCount ?? 0),
    };
  }

  const updated = await ProductModel.findOneAndUpdate(
    { _id: productId },
    { $inc: { favoriteCount: 1 } },
    { new: true },
  ).lean();
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(product.universityId),
    action: "PRODUCT_FAVORITED",
    entityType: "product",
    entityId: productId,
  });

  return {
    favorited: true,
    duplicate: false,
    favoriteCount: Number(updated?.favoriteCount ?? 0),
  };
}

export async function removeProductFavorite(productId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const product = await getVisibleProductForActor(productId, actor);
  const result = await ProductFavoriteModel.deleteOne({
    productId,
    userId: actor.id,
  });

  if (!result.deletedCount) {
    return {
      favorited: false,
      removed: false,
      favoriteCount: Number(product.favoriteCount ?? 0),
    };
  }

  const updated = await ProductModel.findOneAndUpdate(
    { _id: productId },
    { $inc: { favoriteCount: -1 } },
    { new: true },
  ).lean();
  await writeAuditLog({
    actorId: actor.id,
    universityId: String(product.universityId),
    action: "PRODUCT_UNFAVORITED",
    entityType: "product",
    entityId: productId,
  });

  return {
    favorited: false,
    removed: true,
    favoriteCount: Math.max(0, Number(updated?.favoriteCount ?? 0)),
  };
}

export async function getProductAnalytics(
  productId: string,
  query: unknown = {},
) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = productAnalyticsQuerySchema.parse(query);
  const product = await getVisibleProductForActor(productId, actor);
  if (!canMutateProduct(actor, product as Record<string, unknown>)) {
    throw forbidden("You cannot access this product's analytics.");
  }
  const since = new Date();
  since.setDate(since.getDate() - filters.days);

  const [views, uniqueViewers, clicks, favorites, orderRequests, dailyViews] =
    await Promise.all([
      ProductViewModel.countDocuments({ productId }),
      ProductViewModel.distinct("viewerId", { productId }),
      ProductClickModel.countDocuments({ productId }),
      ProductFavoriteModel.countDocuments({ productId }),
      ProductClickModel.countDocuments({
        productId,
        clickType: "ORDER_REQUEST",
      }),
      ProductViewModel.aggregate([
        { $match: { productId, viewedAt: { $gte: since } } },
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

  return {
    product: serializeProduct(product as Record<string, unknown>),
    views,
    uniqueViewers: uniqueViewers.length,
    clicks,
    favorites,
    orderRequests,
    dailyViews: dailyViews.map((row) => ({
      date: String(row._id),
      views: Number(row.views ?? 0),
    })),
  };
}
