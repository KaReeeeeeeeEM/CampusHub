import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import {
  marketplaceAnalyticsQuerySchema,
  type MarketplaceAnalyticsTimeFilter,
} from "@/features/marketplace/lib/marketplace-analytics-schemas";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  OrderRequestModel,
  ProductClickModel,
  ProductFavoriteModel,
  ProductModel,
  ProductViewModel,
  ShopModel,
  ShopViewModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";
import type { PipelineStage } from "mongoose";

const deletedFilter = { deletedAt: null };

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function canManageMarketplace(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.MARKETPLACE_MANAGE) ||
    hasPermission(actor, PERMISSIONS.MARKETPLACE_MODERATE)
  );
}

function resolveUniversityId(actor: AuthUser, requestedUniversityId?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    if (!requestedUniversityId && !actor.universityId) {
      throw forbidden("University scope is required.");
    }

    return requestedUniversityId ?? actor.universityId;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requestedUniversityId && requestedUniversityId !== actor.universityId) {
    throw forbidden(
      "Cannot access another university's marketplace analytics.",
    );
  }

  return actor.universityId;
}

function getRangeStart(timeFilter: MarketplaceAnalyticsTimeFilter) {
  const now = new Date();
  const start = new Date(now);

  if (timeFilter === "ALL_TIME") return null;
  if (timeFilter === "TODAY") {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (timeFilter === "WEEK") start.setDate(start.getDate() - 7);
  if (timeFilter === "MONTH") start.setMonth(start.getMonth() - 1);
  if (timeFilter === "YEAR") start.setFullYear(start.getFullYear() - 1);

  return start;
}

function withDateRange(field: string, start: Date | null) {
  return start ? { [field]: { $gte: start } } : {};
}

function serializeProduct(product: Record<string, unknown>) {
  return {
    id: String(product._id),
    shopId: String(product.shopId),
    ownerId: String(product.ownerId ?? product.sellerId),
    title:
      typeof product.title === "string"
        ? product.title
        : typeof product.name === "string"
          ? product.name
          : "",
    category: String(product.category ?? ""),
    productType: String(product.productType ?? "PHYSICAL"),
    price: Number(product.price ?? 0),
    currency: String(product.currency ?? "TZS"),
    status: String(product.status ?? "ACTIVE"),
    featured: Boolean(product.isFeatured),
    createdAt: serializeDate(product.createdAt),
  };
}

function serializeShop(shop: Record<string, unknown>) {
  return {
    id: String(shop._id),
    ownerId: String(shop.ownerId),
    name: String(shop.name),
    slug: String(shop.slug),
    category: String(shop.category ?? ""),
    status: String(shop.status ?? "ACTIVE"),
    verified: Boolean(shop.verified),
    createdAt: serializeDate(shop.createdAt),
  };
}

async function countGrouped(input: {
  model: typeof ProductViewModel;
  match: Record<string, unknown>;
  groupField: string;
}) {
  const rows = await input.model.aggregate([
    { $match: input.match },
    { $group: { _id: `$${input.groupField}`, count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [String(row._id), Number(row.count ?? 0)]));
}

function buildSeriesPipeline(input: {
  match: Record<string, unknown>;
  dateField: string;
}): PipelineStage[] {
  return [
    { $match: input.match },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: `$${input.dateField}` },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];
}

export async function getMarketplaceAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = marketplaceAnalyticsQuerySchema.parse(query);
  const universityId = resolveUniversityId(actor, filters.universityId);
  const canManage = canManageMarketplace(actor);
  const ownerId = canManage ? filters.ownerId : actor.id;
  const rangeStart = getRangeStart(filters.timeFilter);

  const shopFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };
  if (ownerId) shopFilter.ownerId = ownerId;
  if (filters.shopId) shopFilter._id = filters.shopId;

  const shops = await ShopModel.find(shopFilter)
    .select("_id ownerId name slug category status verified createdAt")
    .lean();
  const shopIds = shops.map((shop) => String(shop._id));

  const productFilter: Record<string, unknown> = {
    universityId,
    ...deletedFilter,
  };
  if (ownerId) productFilter.ownerId = ownerId;
  if (filters.shopId) productFilter.shopId = filters.shopId;

  const products = await ProductModel.find(productFilter)
    .select(
      "_id shopId ownerId sellerId title name category productType price currency status isFeatured createdAt",
    )
    .lean();
  const productIds = products.map((product) => String(product._id));

  const productViewMatch = {
    universityId,
    productId: { $in: productIds },
    ...withDateRange("viewedAt", rangeStart),
  };
  const shopViewMatch = {
    universityId,
    shopId: { $in: shopIds },
    ...withDateRange("viewedAt", rangeStart),
  };
  const clickMatch = {
    universityId,
    productId: { $in: productIds },
    ...withDateRange("clickedAt", rangeStart),
  };
  const favoriteMatch = {
    universityId,
    productId: { $in: productIds },
    ...withDateRange("createdAt", rangeStart),
  };
  const orderRequestMatch = {
    universityId,
    productId: { $in: productIds },
    shopId: { $in: shopIds },
    ...withDateRange("createdAt", rangeStart),
  };

  const [
    shopViews,
    productViews,
    clicks,
    favorites,
    orderRequests,
    productViewCounts,
    productClickCounts,
    productFavoriteCounts,
    productRequestCounts,
    shopViewCounts,
    shopRequestCounts,
    dailyProductViews,
    dailyShopViews,
    dailyClicks,
    dailyFavorites,
    dailyOrderRequests,
  ] = await Promise.all([
    ShopViewModel.countDocuments(shopViewMatch),
    ProductViewModel.countDocuments(productViewMatch),
    ProductClickModel.countDocuments(clickMatch),
    ProductFavoriteModel.countDocuments(favoriteMatch),
    OrderRequestModel.countDocuments(orderRequestMatch),
    countGrouped({
      model: ProductViewModel,
      match: productViewMatch,
      groupField: "productId",
    }),
    countGrouped({
      model: ProductClickModel,
      match: clickMatch,
      groupField: "productId",
    }),
    countGrouped({
      model: ProductFavoriteModel,
      match: favoriteMatch,
      groupField: "productId",
    }),
    countGrouped({
      model: OrderRequestModel,
      match: orderRequestMatch,
      groupField: "productId",
    }),
    countGrouped({
      model: ShopViewModel,
      match: shopViewMatch,
      groupField: "shopId",
    }),
    countGrouped({
      model: OrderRequestModel,
      match: orderRequestMatch,
      groupField: "shopId",
    }),
    ProductViewModel.aggregate(
      buildSeriesPipeline({ match: productViewMatch, dateField: "viewedAt" }),
    ),
    ShopViewModel.aggregate(
      buildSeriesPipeline({ match: shopViewMatch, dateField: "viewedAt" }),
    ),
    ProductClickModel.aggregate(
      buildSeriesPipeline({ match: clickMatch, dateField: "clickedAt" }),
    ),
    ProductFavoriteModel.aggregate(
      buildSeriesPipeline({ match: favoriteMatch, dateField: "createdAt" }),
    ),
    OrderRequestModel.aggregate(
      buildSeriesPipeline({ match: orderRequestMatch, dateField: "createdAt" }),
    ),
  ]);

  const topProducts = products
    .map((product) => {
      const id = String(product._id);
      const metrics = {
        views: productViewCounts.get(id) ?? 0,
        clicks: productClickCounts.get(id) ?? 0,
        favorites: productFavoriteCounts.get(id) ?? 0,
        orderRequests: productRequestCounts.get(id) ?? 0,
      };

      return {
        product: serializeProduct(product as Record<string, unknown>),
        metrics,
        score:
          metrics.views +
          metrics.clicks * 2 +
          metrics.favorites * 3 +
          metrics.orderRequests * 5,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, filters.limit);

  const topShops = shops
    .map((shop) => {
      const id = String(shop._id);
      const relatedProducts = products.filter(
        (product) => String(product.shopId) === id,
      );
      const productMetrics = relatedProducts.reduce(
        (totals, product) => {
          const productId = String(product._id);

          return {
            views: totals.views + (productViewCounts.get(productId) ?? 0),
            clicks: totals.clicks + (productClickCounts.get(productId) ?? 0),
            favorites:
              totals.favorites + (productFavoriteCounts.get(productId) ?? 0),
          };
        },
        { views: 0, clicks: 0, favorites: 0 },
      );
      const metrics = {
        shopViews: shopViewCounts.get(id) ?? 0,
        productViews: productMetrics.views,
        clicks: productMetrics.clicks,
        favorites: productMetrics.favorites,
        orderRequests: shopRequestCounts.get(id) ?? 0,
        productCount: relatedProducts.length,
      };

      return {
        shop: serializeShop(shop as Record<string, unknown>),
        metrics,
        score:
          metrics.shopViews +
          metrics.productViews +
          metrics.clicks * 2 +
          metrics.favorites * 3 +
          metrics.orderRequests * 5,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, filters.limit);

  const serializeSeries = (rows: { _id: unknown; count: unknown }[]) =>
    rows.map((row) => ({
      date: String(row._id),
      count: Number(row.count ?? 0),
    }));

  return {
    scope: {
      universityId,
      ownerId: ownerId ?? null,
      shopId: filters.shopId ?? null,
      managedScope: canManage && !ownerId,
      timeFilter: filters.timeFilter,
      from: serializeDate(rangeStart),
      to: new Date().toISOString(),
    },
    totals: {
      shopViews,
      productViews,
      clicks,
      favorites,
      orderRequests,
      topProductCount: topProducts.length,
      topShopCount: topShops.length,
    },
    topProducts,
    topShops,
    series: {
      productViews: serializeSeries(dailyProductViews),
      shopViews: serializeSeries(dailyShopViews),
      clicks: serializeSeries(dailyClicks),
      favorites: serializeSeries(dailyFavorites),
      orderRequests: serializeSeries(dailyOrderRequests),
    },
  };
}
