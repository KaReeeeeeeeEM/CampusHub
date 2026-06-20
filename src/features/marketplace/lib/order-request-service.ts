import { randomUUID } from "node:crypto";

import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { createSystemNotification } from "@/features/notifications/lib/notification-engine";
import { resolveMarketplaceLocation } from "@/features/marketplace/lib/location-service";
import { attachOrderRequestLocationSchema } from "@/features/marketplace/lib/location-schemas";
import {
  createOrderRequestSchema,
  orderRequestQuerySchema,
  orderRequestStatusMessageSchema,
} from "@/features/marketplace/lib/order-request-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden, notFound } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import { OrderRequestModel, ProductModel, ShopModel } from "@/lib/db/models";
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

function canCreateOrderRequest(actor: AuthUser) {
  return hasPermission(actor, PERMISSIONS.MARKETPLACE_ORDER_CREATE);
}

function visibleProductFilter(actor: AuthUser) {
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

function canReadRequest(actor: AuthUser, request: Record<string, unknown>) {
  return (
    canManageMarketplace(actor) ||
    request.buyerId === actor.id ||
    request.sellerId === actor.id
  );
}

function canSellerTransition(
  actor: AuthUser,
  request: Record<string, unknown>,
) {
  return canManageMarketplace(actor) || request.sellerId === actor.id;
}

function canBuyerCancel(actor: AuthUser, request: Record<string, unknown>) {
  return canManageMarketplace(actor) || request.buyerId === actor.id;
}

function serializeOrderRequest(request: Record<string, unknown>) {
  return {
    id: String(request._id),
    productId: String(request.productId),
    shopId: String(request.shopId),
    buyerId: String(request.buyerId),
    sellerId: String(request.sellerId),
    universityId: String(request.universityId),
    message: typeof request.message === "string" ? request.message : null,
    quantity: Number(request.quantity ?? 1),
    deliveryPreference: String(request.deliveryPreference),
    deliveryLocation:
      typeof request.deliveryLocation === "object" && request.deliveryLocation
        ? request.deliveryLocation
        : null,
    savedLocationId:
      typeof request.savedLocationId === "string"
        ? request.savedLocationId
        : null,
    mapLocationId:
      typeof request.mapLocationId === "string" ? request.mapLocationId : null,
    status: String(request.status),
    respondedAt: serializeDate(request.respondedAt),
    completedAt: serializeDate(request.completedAt),
    cancelledAt: serializeDate(request.cancelledAt),
    metadata: request.metadata ?? null,
    createdAt: serializeDate(request.createdAt),
    updatedAt: serializeDate(request.updatedAt),
  };
}

async function getVisibleRequest(requestId: string, actor: AuthUser) {
  const request = await OrderRequestModel.findOne({
    _id: requestId,
    universityId: requireUniversity(actor),
    ...deletedFilter,
  }).lean();

  if (!request || !canReadRequest(actor, request as Record<string, unknown>)) {
    throw notFound("Order request not found.");
  }

  return request;
}

async function notifyUser(input: {
  recipientId: string;
  senderId: string;
  request: Record<string, unknown>;
  title: string;
  message: string;
}) {
  if (input.recipientId === input.senderId) return;

  await createSystemNotification({
    target: { recipientId: input.recipientId },
    senderId: input.senderId,
    type: "ORDER",
    title: input.title,
    message: input.message,
    entityType: "order_request",
    entityId: String(input.request._id),
    actionUrl: `/market/requests/${String(input.request._id)}`,
    priority: "NORMAL",
    metadata: {
      productId: input.request.productId,
      status: input.request.status,
    },
  });
}

export async function createOrderRequest(input: unknown) {
  const actor = await requireAuth();
  if (!canCreateOrderRequest(actor)) {
    throw forbidden("Order request access is required.");
  }
  await connectMongo();
  const payload = createOrderRequestSchema.parse(input);
  const product = await ProductModel.findOne({
    _id: payload.productId,
    $and: [{ $or: visibleProductFilter(actor) }],
  }).lean();

  if (!product) throw notFound("Product not found.");
  if (product.ownerId === actor.id || product.sellerId === actor.id) {
    throw forbidden("You cannot request your own product.");
  }

  const locationResult = payload.deliveryLocation
    ? await resolveMarketplaceLocation(payload.deliveryLocation, actor)
    : null;

  const request = await OrderRequestModel.create({
    _id: randomUUID(),
    universityId: product.universityId,
    productId: product._id,
    shopId: product.shopId,
    buyerId: actor.id,
    sellerId: product.ownerId ?? product.sellerId,
    message: payload.message ?? null,
    quantity: payload.quantity,
    deliveryPreference: payload.deliveryPreference,
    deliveryLocation: locationResult?.location ?? null,
    savedLocationId: locationResult?.savedLocationId ?? null,
    mapLocationId: locationResult?.mapLocationId ?? null,
    status: "PENDING",
    createdById: actor.id,
  });

  await Promise.all([
    ProductModel.updateOne(
      { _id: product._id },
      { $inc: { orderRequestCount: 1 } },
    ),
    ShopModel.updateOne(
      { _id: product.shopId },
      { $inc: { orderRequestCount: 1 } },
    ),
    notifyUser({
      recipientId: String(product.ownerId ?? product.sellerId),
      senderId: actor.id,
      request: request.toObject(),
      title: "New order request",
      message: "A buyer sent a request for one of your marketplace listings.",
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(product.universityId),
      action: "ORDER_REQUEST_CREATED",
      entityType: "order_request",
      entityId: String(request._id),
      after: serializeOrderRequest(request.toObject()),
    }),
  ]);

  return serializeOrderRequest(request.toObject());
}

export async function listOrderRequests(query: unknown = {}) {
  const actor = await requireAuth();
  await connectMongo();
  const filters = orderRequestQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    universityId: requireUniversity(actor),
    ...deletedFilter,
  };

  if (!canManageMarketplace(actor)) {
    if (filters.role === "BUYER") dbFilter.buyerId = actor.id;
    else if (filters.role === "SELLER") dbFilter.sellerId = actor.id;
    else dbFilter.$or = [{ buyerId: actor.id }, { sellerId: actor.id }];
  }
  if (filters.productId) dbFilter.productId = filters.productId;
  if (filters.shopId) dbFilter.shopId = filters.shopId;
  if (filters.buyerId) dbFilter.buyerId = filters.buyerId;
  if (filters.sellerId) dbFilter.sellerId = filters.sellerId;
  if (filters.status) dbFilter.status = filters.status;
  if (filters.cursor) dbFilter.createdAt = { $lt: new Date(filters.cursor) };

  const requests = await OrderRequestModel.find(dbFilter)
    .sort({ createdAt: -1 })
    .limit(filters.limit)
    .lean();

  return requests.map((request) =>
    serializeOrderRequest(request as Record<string, unknown>),
  );
}

export async function getOrderRequest(requestId: string) {
  const actor = await requireAuth();
  await connectMongo();
  const request = await getVisibleRequest(requestId, actor);

  return serializeOrderRequest(request as Record<string, unknown>);
}

export async function updateOrderRequestLocation(
  requestId: string,
  input: unknown,
) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = attachOrderRequestLocationSchema.parse(input);
  const request = await getVisibleRequest(requestId, actor);

  if (!canBuyerCancel(actor, request as Record<string, unknown>)) {
    throw forbidden("Only the buyer can update the delivery location.");
  }
  if (!["PENDING", "ACCEPTED"].includes(String(request.status))) {
    throw forbidden("Only pending or accepted requests can be updated.");
  }

  const locationResult = await resolveMarketplaceLocation(
    payload.deliveryLocation,
    actor,
  );

  const updated = await OrderRequestModel.findOneAndUpdate(
    {
      _id: requestId,
      universityId: requireUniversity(actor),
      ...deletedFilter,
    },
    {
      $set: {
        deliveryLocation: locationResult.location,
        savedLocationId: locationResult.savedLocationId,
        mapLocationId: locationResult.mapLocationId,
        updatedById: actor.id,
      },
    },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Order request not found.");

  await writeAuditLog({
    actorId: actor.id,
    universityId: String(request.universityId),
    action: "ORDER_REQUEST_LOCATION_UPDATED",
    entityType: "order_request",
    entityId: requestId,
    before: serializeOrderRequest(request as Record<string, unknown>),
    after: serializeOrderRequest(updated as Record<string, unknown>),
  });

  return serializeOrderRequest(updated as Record<string, unknown>);
}

async function transitionOrderRequest(
  requestId: string,
  status: "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED",
  auditAction:
    | "ORDER_REQUEST_ACCEPTED"
    | "ORDER_REQUEST_DECLINED"
    | "ORDER_REQUEST_COMPLETED"
    | "ORDER_REQUEST_CANCELLED",
  input: unknown = {},
) {
  const actor = await requireAuth();
  await connectMongo();
  const payload = orderRequestStatusMessageSchema.parse(input);
  const request = await getVisibleRequest(requestId, actor);

  if (status === "CANCELLED") {
    if (!canBuyerCancel(actor, request as Record<string, unknown>)) {
      throw forbidden("Only the buyer can cancel this request.");
    }
    if (!["PENDING", "ACCEPTED"].includes(String(request.status))) {
      throw forbidden("Only pending or accepted requests can be cancelled.");
    }
  } else {
    if (!canSellerTransition(actor, request as Record<string, unknown>)) {
      throw forbidden("Only the seller can update this request.");
    }
    if (status === "COMPLETED" && request.status !== "ACCEPTED") {
      throw forbidden("Only accepted requests can be completed.");
    }
    if (
      ["ACCEPTED", "DECLINED"].includes(status) &&
      request.status !== "PENDING"
    ) {
      throw forbidden("Only pending requests can be accepted or declined.");
    }
  }

  const now = new Date();
  const update: Record<string, unknown> = {
    status,
    updatedById: actor.id,
  };
  if (status === "ACCEPTED" || status === "DECLINED") update.respondedAt = now;
  if (status === "COMPLETED") update.completedAt = now;
  if (status === "CANCELLED") update.cancelledAt = now;
  if (payload.message) update.metadata = { statusMessage: payload.message };

  const updated = await OrderRequestModel.findOneAndUpdate(
    { _id: requestId, ...deletedFilter },
    { $set: update },
    { new: true },
  ).lean();
  if (!updated) throw notFound("Order request not found.");

  const notifyRecipient =
    status === "CANCELLED" ? String(request.sellerId) : String(request.buyerId);
  const statusText = status.toLowerCase().replace("_", " ");

  await Promise.all([
    notifyUser({
      recipientId: notifyRecipient,
      senderId: actor.id,
      request: updated as Record<string, unknown>,
      title: `Order request ${statusText}`,
      message:
        payload.message ?? `Your marketplace order request was ${statusText}.`,
    }),
    writeAuditLog({
      actorId: actor.id,
      universityId: String(request.universityId),
      action: auditAction,
      entityType: "order_request",
      entityId: requestId,
      before: serializeOrderRequest(request as Record<string, unknown>),
      after: serializeOrderRequest(updated as Record<string, unknown>),
    }),
  ]);

  return serializeOrderRequest(updated as Record<string, unknown>);
}

export function acceptOrderRequest(requestId: string, input: unknown = {}) {
  return transitionOrderRequest(
    requestId,
    "ACCEPTED",
    "ORDER_REQUEST_ACCEPTED",
    input,
  );
}

export function declineOrderRequest(requestId: string, input: unknown = {}) {
  return transitionOrderRequest(
    requestId,
    "DECLINED",
    "ORDER_REQUEST_DECLINED",
    input,
  );
}

export function cancelOrderRequest(requestId: string, input: unknown = {}) {
  return transitionOrderRequest(
    requestId,
    "CANCELLED",
    "ORDER_REQUEST_CANCELLED",
    input,
  );
}

export function completeOrderRequest(requestId: string, input: unknown = {}) {
  return transitionOrderRequest(
    requestId,
    "COMPLETED",
    "ORDER_REQUEST_COMPLETED",
    input,
  );
}
