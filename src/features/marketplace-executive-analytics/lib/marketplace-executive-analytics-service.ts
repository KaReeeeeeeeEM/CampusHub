import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { marketplaceExecutiveAnalyticsQuerySchema } from "@/features/marketplace-executive-analytics/lib/marketplace-executive-analytics-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import {
  OrderRequestModel,
  ProductClickModel,
  ProductModel,
  ProductViewModel,
  ShopModel,
  ShopViewModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

type CountRow = {
  _id: unknown;
  count: number;
};

function canReadMarketplaceExecutiveAnalytics(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.AUDIT_READ) ||
    hasPermission(actor, PERMISSIONS.TENANT_MANAGE) ||
    hasPermission(actor, PERMISSIONS.MARKETPLACE_MANAGE) ||
    hasPermission(actor, PERMISSIONS.MARKETPLACE_MODERATE)
  );
}

function scopedUniversityId(actor: AuthUser, requested?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requested ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden(
      "Cannot view another university's marketplace executive analytics.",
    );
  }

  return actor.universityId;
}

function dateRange(from?: Date, to?: Date) {
  if (!from && !to) return undefined;

  return {
    ...(from ? { $gte: from } : {}),
    ...(to ? { $lte: to } : {}),
  };
}

function addDateFilter(
  filter: Record<string, unknown>,
  field: string,
  from?: Date,
  to?: Date,
) {
  const range = dateRange(from, to);
  if (range) filter[field] = range;

  return filter;
}

function dayTrendPipeline(match: Record<string, unknown>, dateField: string) {
  return [
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: `$${dateField}`,
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];
}

function normalizeTrend(rows: CountRow[]) {
  return rows.map((row) => ({
    date: String(row._id),
    count: Number(row.count ?? 0),
  }));
}

function serializeProduct(product: Record<string, unknown>) {
  return {
    id: String(product._id),
    universityId: String(product.universityId),
    shopId: String(product.shopId),
    sellerId: String(product.sellerId ?? product.ownerId),
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
    viewCount: Number(product.viewCount ?? 0),
    clickCount: Number(product.clickCount ?? 0),
    favoriteCount: Number(product.favoriteCount ?? 0),
    orderRequestCount: Number(product.orderRequestCount ?? 0),
  };
}

function revenuePipeline(input: {
  match: Record<string, unknown>;
  statuses?: string[];
}) {
  return [
    {
      $match: {
        ...input.match,
        ...(input.statuses ? { status: { $in: input.statuses } } : {}),
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.currency",
        estimatedRevenue: {
          $sum: { $multiply: ["$quantity", "$product.price"] },
        },
        orderRequests: { $sum: 1 },
      },
    },
    { $sort: { estimatedRevenue: -1 as const } },
  ];
}

function normalizeRevenue(
  rows: Array<{ _id: unknown; estimatedRevenue: number; orderRequests: number }>,
) {
  return rows.map((row) => ({
    currency: String(row._id ?? "TZS"),
    estimatedRevenue: Number(row.estimatedRevenue ?? 0),
    orderRequests: Number(row.orderRequests ?? 0),
  }));
}

export async function getMarketplaceExecutiveAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadMarketplaceExecutiveAnalytics(actor)) {
    throw forbidden("Marketplace executive analytics access is required.");
  }

  await connectPostgres();
  const filters = marketplaceExecutiveAnalyticsQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);

  const shopScope: Record<string, unknown> = { ...deletedFilter };
  const productScope: Record<string, unknown> = { ...deletedFilter };
  const orderRequestScope: Record<string, unknown> = { ...deletedFilter };
  const productViewScope: Record<string, unknown> = {};
  const productClickScope: Record<string, unknown> = {};
  const shopViewScope: Record<string, unknown> = {};

  if (universityId) {
    shopScope.universityId = universityId;
    productScope.universityId = universityId;
    orderRequestScope.universityId = universityId;
    productViewScope.universityId = universityId;
    productClickScope.universityId = universityId;
    shopViewScope.universityId = universityId;
  }

  const createdShopScope = addDateFilter(
    { ...shopScope },
    "createdAt",
    filters.from,
    filters.to,
  );
  const createdProductScope = addDateFilter(
    { ...productScope },
    "createdAt",
    filters.from,
    filters.to,
  );
  const orderRequestDateScope = addDateFilter(
    { ...orderRequestScope },
    "createdAt",
    filters.from,
    filters.to,
  );
  const productViewDateScope = addDateFilter(
    { ...productViewScope },
    "viewedAt",
    filters.from,
    filters.to,
  );
  const productClickDateScope = addDateFilter(
    { ...productClickScope },
    "clickedAt",
    filters.from,
    filters.to,
  );
  const shopViewDateScope = addDateFilter(
    { ...shopViewScope },
    "viewedAt",
    filters.from,
    filters.to,
  );

  const [
    totalShops,
    activeShops,
    shopsCreated,
    totalProducts,
    activeProducts,
    productsCreated,
    servicesOffered,
    ordersRequested,
    acceptedOrderRequests,
    completedOrderRequests,
    productViews,
    productClicks,
    shopViews,
    revenueAllRequested,
    revenueAccepted,
    revenueCompleted,
    topCategories,
    topViewedProducts,
    mostActiveSellers,
    topUniversities,
    shopGrowthTrend,
    productGrowthTrend,
    orderRequestTrend,
    serviceGrowthTrend,
    productViewTrend,
    sellerActivityTrend,
  ] = await Promise.all([
    ShopModel.countDocuments(shopScope),
    ShopModel.countDocuments({ ...shopScope, status: "ACTIVE" }),
    ShopModel.countDocuments(createdShopScope),
    ProductModel.countDocuments(productScope),
    ProductModel.countDocuments({ ...productScope, status: "ACTIVE" }),
    ProductModel.countDocuments(createdProductScope),
    ProductModel.countDocuments({
      ...createdProductScope,
      productType: "SERVICE",
    }),
    OrderRequestModel.countDocuments(orderRequestDateScope),
    OrderRequestModel.countDocuments({
      ...orderRequestDateScope,
      status: "ACCEPTED",
    }),
    OrderRequestModel.countDocuments({
      ...orderRequestDateScope,
      status: "COMPLETED",
    }),
    ProductViewModel.countDocuments(productViewDateScope),
    ProductClickModel.countDocuments(productClickDateScope),
    ShopViewModel.countDocuments(shopViewDateScope),
    OrderRequestModel.aggregate(revenuePipeline({ match: orderRequestDateScope })),
    OrderRequestModel.aggregate(
      revenuePipeline({
        match: orderRequestDateScope,
        statuses: ["ACCEPTED", "COMPLETED"],
      }),
    ),
    OrderRequestModel.aggregate(
      revenuePipeline({
        match: orderRequestDateScope,
        statuses: ["COMPLETED"],
      }),
    ),
    ProductModel.aggregate([
      { $match: createdProductScope },
      {
        $group: {
          _id: "$category",
          products: { $sum: 1 },
          services: {
            $sum: { $cond: [{ $eq: ["$productType", "SERVICE"] }, 1, 0] },
          },
          views: { $sum: "$viewCount" },
          orderRequests: { $sum: "$orderRequestCount" },
          revenuePotential: { $sum: "$price" },
        },
      },
      { $sort: { products: -1 as const, orderRequests: -1 as const } },
      { $limit: filters.limit },
    ]),
    ProductModel.aggregate([
      { $match: productScope },
      { $sort: { viewCount: -1 as const, orderRequestCount: -1 as const } },
      { $limit: filters.limit },
    ]),
    ProductModel.aggregate([
      { $match: productScope },
      {
        $group: {
          _id: "$sellerId",
          products: { $sum: 1 },
          services: {
            $sum: { $cond: [{ $eq: ["$productType", "SERVICE"] }, 1, 0] },
          },
          views: { $sum: "$viewCount" },
          clicks: { $sum: "$clickCount" },
          orderRequests: { $sum: "$orderRequestCount" },
          revenuePotential: { $sum: "$price" },
        },
      },
      {
        $addFields: {
          sellerActivityScore: {
            $add: [
              { $multiply: ["$products", 10] },
              "$views",
              { $multiply: ["$clicks", 2] },
              { $multiply: ["$orderRequests", 5] },
            ],
          },
        },
      },
      { $sort: { sellerActivityScore: -1 as const, products: -1 as const } },
      { $limit: filters.limit },
      {
        $lookup: {
          from: "user",
          localField: "_id",
          foreignField: "_id",
          as: "seller",
        },
      },
      { $addFields: { seller: { $first: "$seller" } } },
    ]),
    ProductModel.aggregate([
      { $match: productScope },
      {
        $group: {
          _id: "$universityId",
          products: { $sum: 1 },
          services: {
            $sum: { $cond: [{ $eq: ["$productType", "SERVICE"] }, 1, 0] },
          },
          views: { $sum: "$viewCount" },
          clicks: { $sum: "$clickCount" },
          orderRequests: { $sum: "$orderRequestCount" },
          revenuePotential: { $sum: "$price" },
        },
      },
      {
        $lookup: {
          from: "shops",
          let: { universityId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$universityId", "$$universityId"] },
                ...deletedFilter,
              },
            },
            { $count: "shops" },
          ],
          as: "shopCounts",
        },
      },
      {
        $lookup: {
          from: "university",
          localField: "_id",
          foreignField: "_id",
          as: "university",
        },
      },
      {
        $addFields: {
          shops: { $ifNull: [{ $first: "$shopCounts.shops" }, 0] },
          university: { $first: "$university" },
          marketplaceScore: {
            $add: [
              { $multiply: ["$products", 10] },
              "$views",
              { $multiply: ["$clicks", 2] },
              { $multiply: ["$orderRequests", 5] },
            ],
          },
        },
      },
      { $sort: { marketplaceScore: -1 as const, products: -1 as const } },
      { $limit: filters.limit },
    ]),
    ShopModel.aggregate(dayTrendPipeline(createdShopScope, "createdAt")),
    ProductModel.aggregate(dayTrendPipeline(createdProductScope, "createdAt")),
    OrderRequestModel.aggregate(
      dayTrendPipeline(orderRequestDateScope, "createdAt"),
    ),
    ProductModel.aggregate(
      dayTrendPipeline(
        { ...createdProductScope, productType: "SERVICE" },
        "createdAt",
      ),
    ),
    ProductViewModel.aggregate(
      dayTrendPipeline(productViewDateScope, "viewedAt"),
    ),
    OrderRequestModel.aggregate([
      { $match: orderRequestDateScope },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          sellers: { $addToSet: "$sellerId" },
          orderRequests: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          sellers: { $size: "$sellers" },
          orderRequests: 1,
        },
      },
      { $sort: { _id: 1 as const } },
    ]),
  ]);

  await writeAuditLog({
    actorId: actor.id,
    universityId: universityId ?? null,
    action: "MARKETPLACE_EXECUTIVE_ANALYTICS_VIEWED",
    entityType: "marketplace_executive_analytics",
    metadata: { filters },
  });

  return {
    filters: {
      universityId: universityId ?? null,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
      limit: filters.limit,
    },
    summary: {
      totalShops,
      activeShops,
      shopsCreated,
      totalProducts,
      activeProducts,
      productsCreated,
      servicesOffered,
      ordersRequested,
      acceptedOrderRequests,
      completedOrderRequests,
      productViews,
      productClicks,
      shopViews,
      marketplaceGrowthScore:
        shopsCreated * 20 +
        productsCreated * 10 +
        servicesOffered * 12 +
        ordersRequested * 5 +
        productViews,
    },
    revenueEstimates: {
      requested: normalizeRevenue(revenueAllRequested),
      acceptedPipeline: normalizeRevenue(revenueAccepted),
      completed: normalizeRevenue(revenueCompleted),
      note: "Revenue is estimated from order requests as quantity multiplied by product price. Payments are not implemented.",
    },
    rankings: {
      mostViewedProducts: topViewedProducts.map((product, index) => ({
        rank: index + 1,
        product: serializeProduct(product as Record<string, unknown>),
      })),
      mostActiveSellers: mostActiveSellers.map((row, index) => ({
        rank: index + 1,
        sellerId: String(row._id),
        name: typeof row.seller?.name === "string" ? row.seller.name : null,
        email: typeof row.seller?.email === "string" ? row.seller.email : null,
        products: Number(row.products ?? 0),
        services: Number(row.services ?? 0),
        views: Number(row.views ?? 0),
        clicks: Number(row.clicks ?? 0),
        orderRequests: Number(row.orderRequests ?? 0),
        revenuePotential: Number(row.revenuePotential ?? 0),
        sellerActivityScore: Number(row.sellerActivityScore ?? 0),
      })),
      topUniversities: topUniversities.map((row, index) => ({
        rank: index + 1,
        universityId: String(row._id),
        name:
          typeof row.university?.name === "string" ? row.university.name : null,
        shortName:
          typeof row.university?.shortName === "string"
            ? row.university.shortName
            : null,
        shops: Number(row.shops ?? 0),
        products: Number(row.products ?? 0),
        services: Number(row.services ?? 0),
        views: Number(row.views ?? 0),
        clicks: Number(row.clicks ?? 0),
        orderRequests: Number(row.orderRequests ?? 0),
        revenuePotential: Number(row.revenuePotential ?? 0),
        marketplaceScore: Number(row.marketplaceScore ?? 0),
      })),
    },
    metrics: {
      marketplaceGrowth: {
        shopsCreated,
        productsCreated,
        servicesOffered,
        ordersRequested,
      },
      topCategories: topCategories.map((row) => ({
        category: String(row._id ?? "UNKNOWN"),
        products: Number(row.products ?? 0),
        services: Number(row.services ?? 0),
        views: Number(row.views ?? 0),
        orderRequests: Number(row.orderRequests ?? 0),
        revenuePotential: Number(row.revenuePotential ?? 0),
      })),
      sellerActivity: {
        activeSellerCount: mostActiveSellers.length,
        orderRequestsPerActiveShop:
          activeShops > 0
            ? Number((ordersRequested / activeShops).toFixed(2))
            : 0,
        productsPerActiveShop:
          activeShops > 0 ? Number((activeProducts / activeShops).toFixed(2)) : 0,
      },
    },
    trends: {
      shopsCreated: normalizeTrend(shopGrowthTrend),
      productsCreated: normalizeTrend(productGrowthTrend),
      servicesOffered: normalizeTrend(serviceGrowthTrend),
      orderRequests: normalizeTrend(orderRequestTrend),
      productViews: normalizeTrend(productViewTrend),
      sellerActivity: sellerActivityTrend.map((row) => ({
        date: String(row._id),
        activeSellers: Number(row.sellers ?? 0),
        orderRequests: Number(row.orderRequests ?? 0),
      })),
    },
  };
}
