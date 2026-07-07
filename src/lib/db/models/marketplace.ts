import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

import {
  metadataField,
  tenantLifecycleFields,
  visibilityField,
} from "@/lib/db/models/model-helpers";

const shopSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: null, trim: true },
    logo: { type: String, default: null, trim: true },
    logoUrl: { type: String, default: null, trim: true },
    bannerImage: { type: String, default: null, trim: true },
    coverImageUrl: { type: String, default: null, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    locationId: { type: String, default: null, index: true },
    location: { type: Schema.Types.Mixed, default: null },
    contactPhone: { type: String, default: null, trim: true },
    contactEmail: { type: String, default: null, trim: true, lowercase: true },
    whatsappNumber: { type: String, default: null, trim: true },
    openingHours: { type: Schema.Types.Mixed, default: null },
    deliveryAvailable: { type: Boolean, default: false, index: true },
    pickupAvailable: { type: Boolean, default: true, index: true },
    verified: { type: Boolean, default: false, index: true },
    viewCount: { type: Number, default: 0, index: true },
    followerCount: { type: Number, default: 0, index: true },
    productCount: { type: Number, default: 0, index: true },
    orderRequestCount: { type: Number, default: 0, index: true },
    visibility: visibilityField,
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING_APPROVAL",
        "ACTIVE",
        "PAUSED",
        "SUSPENDED",
        "CLOSED",
        "ARCHIVED",
      ],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "shops", timestamps: true },
);

const productSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    shopId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    productType: {
      type: String,
      enum: ["PHYSICAL", "DIGITAL", "SERVICE"],
      default: "PHYSICAL",
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    images: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0, index: true },
    currency: { type: String, default: "TZS", uppercase: true, trim: true },
    availability: {
      type: String,
      default: "AVAILABLE",
      trim: true,
      index: true,
    },
    location: { type: Schema.Types.Mixed, default: null },
    stockQuantity: { type: Number, default: 0, min: 0 },
    condition: {
      type: String,
      enum: ["NEW", "USED", "REFURBISHED", "SERVICE"],
      default: "NEW",
      index: true,
    },
    deliveryOptions: { type: [String], default: [] },
    favoriteCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0, index: true },
    orderRequestCount: { type: Number, default: 0, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    visibility: {
      type: String,
      enum: [
        "ALL_USERS",
        "STUDENTS",
        "TEACHERS",
        "ALUMNI",
        "EMPLOYERS",
        "CUSTOM",
        ...visibilityField.enum,
      ],
      default: "ALL_USERS",
      index: true,
    },
    customAudience: { type: [String], default: [], index: true },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "OUT_OF_STOCK", "PAUSED", "HIDDEN", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "products", timestamps: true },
);

const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: null },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    shopId: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "TZS", uppercase: true, trim: true },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELED"],
      default: "PENDING",
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "READY", "DELIVERED", "CANCELED"],
      default: "PENDING",
      index: true,
    },
    deliveryLocation: { type: Schema.Types.Mixed, default: null },
    pickupLocationId: { type: String, default: null, index: true },
    notes: { type: String, default: null, trim: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "orders", timestamps: true },
);

const orderRequestSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    shopId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    message: { type: String, default: null, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    deliveryPreference: {
      type: String,
      enum: ["MEETUP", "PICKUP", "CAMPUS_DELIVERY", "CUSTOM"],
      required: true,
      index: true,
    },
    deliveryLocation: { type: Schema.Types.Mixed, default: null },
    savedLocationId: { type: String, default: null, index: true },
    mapLocationId: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "DECLINED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    respondedAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null, index: true },
    cancelledAt: { type: Date, default: null, index: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "order_requests", timestamps: true },
);

const marketplaceSavedLocationSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    label: { type: String, required: true, trim: true },
    locationType: {
      type: String,
      enum: ["CAMPUS_LOCATION", "MAP_LOCATION", "CURRENT_LOCATION", "CUSTOM"],
      required: true,
      index: true,
    },
    mapLocationId: { type: String, default: null, index: true },
    name: { type: String, default: null, trim: true },
    address: { type: String, default: null, trim: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    instructions: { type: String, default: null, trim: true },
    useCount: { type: Number, default: 0, index: true },
    lastUsedAt: { type: Date, default: null, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "marketplace_saved_locations", timestamps: true },
);

const productFavoriteSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
  },
  { collection: "product_favorites", timestamps: true },
);

const productViewSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    viewerId: { type: String, required: true, index: true },
    viewedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "product_views", timestamps: true },
);

const productClickSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    clickType: {
      type: String,
      enum: ["DETAIL", "CONTACT", "ORDER_REQUEST", "EXTERNAL_LINK"],
      default: "DETAIL",
      index: true,
    },
    clickedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "product_clicks", timestamps: true },
);

const shopViewSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    shopId: { type: String, required: true, index: true },
    viewerId: { type: String, required: true, index: true },
    viewedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "shop_views", timestamps: true },
);

shopSchema.index({ universityId: 1, slug: 1 }, { unique: true });
shopSchema.index({ universityId: 1, category: 1, status: 1 });
shopSchema.index({ universityId: 1, ownerId: 1, status: 1 });
shopSchema.index({ universityId: 1, verified: 1, status: 1 });
shopSchema.index({ universityId: 1, viewCount: -1 });
shopSchema.index({ name: "text", description: "text" });
productSchema.index({ universityId: 1, shopId: 1, status: 1 });
productSchema.index({ universityId: 1, category: 1, price: 1 });
productSchema.index({ universityId: 1, productType: 1, status: 1 });
productSchema.index({ universityId: 1, visibility: 1, status: 1 });
productSchema.index({ universityId: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ shopId: 1, ownerId: 1, status: 1 });
productSchema.index({ universityId: 1, viewCount: -1, favoriteCount: -1 });
productSchema.index({ name: "text", description: "text", tags: "text" });
orderSchema.index({ universityId: 1, buyerId: 1, createdAt: -1 });
orderSchema.index({ universityId: 1, sellerId: 1, fulfillmentStatus: 1 });
orderSchema.index({ universityId: 1, shopId: 1, createdAt: -1 });
orderRequestSchema.index({ universityId: 1, buyerId: 1, createdAt: -1 });
orderRequestSchema.index({ universityId: 1, sellerId: 1, status: 1 });
orderRequestSchema.index({ productId: 1, status: 1, createdAt: -1 });
orderRequestSchema.index({ shopId: 1, status: 1, createdAt: -1 });
orderRequestSchema.index({ universityId: 1, createdAt: -1 });
orderRequestSchema.index({ savedLocationId: 1, createdAt: -1 });
orderRequestSchema.index({ mapLocationId: 1, createdAt: -1 });
marketplaceSavedLocationSchema.index({
  universityId: 1,
  userId: 1,
  lastUsedAt: -1,
});
marketplaceSavedLocationSchema.index({ userId: 1, isDefault: 1 });
marketplaceSavedLocationSchema.index({ mapLocationId: 1, userId: 1 });
productFavoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });
productFavoriteSchema.index({ universityId: 1, userId: 1, createdAt: -1 });
productFavoriteSchema.index({ universityId: 1, productId: 1, createdAt: -1 });
productViewSchema.index({ productId: 1, viewerId: 1, viewedAt: -1 });
productViewSchema.index({ universityId: 1, productId: 1, viewedAt: -1 });
productClickSchema.index({ productId: 1, clickType: 1, clickedAt: -1 });
productClickSchema.index({ universityId: 1, productId: 1, clickedAt: -1 });
shopViewSchema.index({ shopId: 1, viewerId: 1, viewedAt: -1 });
shopViewSchema.index({ universityId: 1, shopId: 1, viewedAt: -1 });

export type ShopDocument = InferSchemaType<typeof shopSchema>;
export type ProductDocument = InferSchemaType<typeof productSchema>;
export type OrderDocument = InferSchemaType<typeof orderSchema>;
export type OrderRequestDocument = InferSchemaType<typeof orderRequestSchema>;
export type MarketplaceSavedLocationDocument = InferSchemaType<
  typeof marketplaceSavedLocationSchema
>;
export type ProductFavoriteDocument = InferSchemaType<
  typeof productFavoriteSchema
>;
export type ProductViewDocument = InferSchemaType<typeof productViewSchema>;
export type ProductClickDocument = InferSchemaType<typeof productClickSchema>;
export type ShopViewDocument = InferSchemaType<typeof shopViewSchema>;

export const ShopModel = models.Shop || model<ShopDocument>("Shop", shopSchema);
export const ProductModel =
  models.Product || model<ProductDocument>("Product", productSchema);
export const OrderModel =
  models.Order || model<OrderDocument>("Order", orderSchema);
export const OrderRequestModel =
  models.OrderRequest ||
  model<OrderRequestDocument>("OrderRequest", orderRequestSchema);
export const MarketplaceSavedLocationModel =
  models.MarketplaceSavedLocation ||
  model<MarketplaceSavedLocationDocument>(
    "MarketplaceSavedLocation",
    marketplaceSavedLocationSchema,
  );
export const ProductFavoriteModel =
  models.ProductFavorite ||
  model<ProductFavoriteDocument>("ProductFavorite", productFavoriteSchema);
export const ProductViewModel =
  models.ProductView ||
  model<ProductViewDocument>("ProductView", productViewSchema);
export const ProductClickModel =
  models.ProductClick ||
  model<ProductClickDocument>("ProductClick", productClickSchema);
export const ShopViewModel =
  models.ShopView || model<ShopViewDocument>("ShopView", shopViewSchema);
