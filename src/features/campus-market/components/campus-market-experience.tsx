"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiCopy,
  FiClock,
  FiEdit,
  FiEye,
  FiGrid,
  FiHeart,
  FiList,
  FiMapPin,
  FiPackage,
  FiPlus,
  FiSearch,
  FiShare2,
  FiShoppingBag,
  FiStar,
  FiTag,
  FiTrash2,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { z } from "zod";

import {
  CampusDataTable,
  CampusFileUpload,
  CampusInput,
  CampusTextarea,
  Empty,
  campusToast,
} from "@/components/campushub";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer } from "@/components/motion/stagger-container";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Drawer } from "@/components/shared/drawer";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import {
  campusDeliveryLocations,
  marketCategories,
  marketOrders,
  marketProducts,
  marketShops,
  visibilityOptions,
  type MarketOrder,
  type MarketProduct,
  type MarketShop,
  type MarketStatus,
  type MarketVisibility,
} from "@/features/campus-market/lib/mock-data";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/components/shared/data-table";

const shopSchema = z.object({
  name: z.string().min(2, "Shop name is required."),
  description: z.string().min(12, "Describe the shop."),
  contactNumber: z.string().min(8, "Contact number is required."),
  whatsappNumber: z.string().min(8, "WhatsApp number is required."),
  availabilityStatus: z.enum(["Open", "Open 24/7", "Limited Hours", "Closed"]),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  category: z.string().min(1, "Select a category."),
  locationType: z.enum(["Campus Location", "Outside Campus"]),
  campusLocation: z.string().optional(),
  outsideLocation: z.string().optional(),
  logo: z.string().optional(),
  coverImage: z.string().optional(),
});

const productSchema = z.object({
  name: z.string().min(2, "Product name is required."),
  description: z.string().min(12, "Product description is required."),
  price: z.string().min(1, "Price is required."),
  category: z.string().min(1, "Select a category."),
  stock: z.coerce.number().min(0, "Stock cannot be negative."),
  status: z.enum(["ACTIVE", "DRAFT", "PAUSED", "SOLD OUT"]),
  visibility: z.array(z.string()).min(1, "Select at least one visibility."),
  image: z.string().optional(),
});

const orderSchema = z.object({
  quantity: z.coerce.number().min(1, "Quantity is required."),
  deliveryLocation: z.string().min(1, "Choose a delivery location."),
  notes: z.string().optional(),
});

type ShopFormValues = z.infer<typeof shopSchema>;
type ProductFormValues = z.infer<typeof productSchema>;
type OrderFormValues = z.infer<typeof orderSchema>;

const shopFormSteps: Array<{
  title: string;
  description: string;
  fields: Array<keyof ShopFormValues>;
}> = [
  {
    title: "Shop Profile",
    description: "Name, category, and a short description buyers can trust.",
    fields: ["name", "category", "description"],
  },
  {
    title: "Contact & Hours",
    description: "How buyers reach you and when the shop is available.",
    fields: [
      "contactNumber",
      "whatsappNumber",
      "availabilityStatus",
      "openingTime",
      "closingTime",
    ],
  },
  {
    title: "Location",
    description: "Set whether buyers meet you on campus or outside campus.",
    fields: ["locationType", "campusLocation", "outsideLocation"],
  },
  {
    title: "Brand Media",
    description: "Add a logo and cover image to make the shop recognizable.",
    fields: ["logo", "coverImage"],
  },
];

type MarketView = "grid" | "table";

function slugifyProductName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getProductHref(product: MarketProduct) {
  return `/student/market/${slugifyProductName(product.name)}/${product.id}`;
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-500",
  DRAFT: "bg-slate-500/10 text-slate-400",
  PAUSED: "bg-amber-500/10 text-amber-500",
  "SOLD OUT": "bg-rose-500/10 text-rose-500",
  Pending: "bg-amber-500/10 text-amber-500",
  Accepted: "bg-blue-500/10 text-blue-500",
  Rejected: "bg-rose-500/10 text-rose-500",
  Completed: "bg-emerald-500/10 text-emerald-500",
  Open: "bg-emerald-500/10 text-emerald-500",
  "Limited Hours": "bg-amber-500/10 text-amber-500",
  Closed: "bg-rose-500/10 text-rose-500",
};

function MarketShell({ children }: { children: React.ReactNode }) {
  return <main className="w-full px-4 py-6 sm:px-6">{children}</main>;
}

function MarketPageHeader({
  eyebrow = "Campus Market",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <FadeIn>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </FadeIn>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <FiSearch
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <CampusInput
        className="pl-9"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        statusStyles[value] ?? "bg-primary/10 text-primary",
      )}
    >
      {value}
    </span>
  );
}

function MediaBlock({
  image,
  title,
  className,
}: {
  image: string;
  title: string;
  className?: string;
}) {
  return (
    <div
      aria-label={title}
      className={cn("bg-cover bg-center", className)}
      role="img"
      style={{ backgroundImage: `url(${image})` }}
    />
  );
}

function ProductCard({
  product,
  onOrder,
}: {
  product: MarketProduct;
  onOrder: (product: MarketProduct) => void;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
      <MediaBlock
        image={product.images[0]}
        title={product.name}
        className="aspect-[4/3] border-b border-border"
      />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{product.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {product.seller} · {product.shopName}
            </p>
          </div>
          <Button
            aria-label={`Favorite ${product.name}`}
            size="icon"
            type="button"
            variant="ghost"
            onClick={() =>
              campusToast.success({
                title: "Product Saved",
                description: `${product.name} has been added to favorites.`,
              })
            }
          >
            <FiHeart
              className={cn(
                "h-4 w-4",
                product.favorite && "fill-primary text-primary",
              )}
              aria-hidden="true"
            />
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-primary">
            {product.price}
          </p>
          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {product.category}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FiStar className="h-3.5 w-3.5 text-amber-500" />
            {product.stars}
          </span>
          <span className="inline-flex items-center gap-1">
            <FiEye className="h-3.5 w-3.5" />
            {product.views}
          </span>
          <span className="truncate text-right">{product.visibility[0]}</span>
        </div>
        <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
          <Button
            asChild
            className="w-full"
            variant="secondary"
          >
            <Link href={getProductHref(product)}>
              <FiEye className="h-4 w-4" aria-hidden="true" />
              View Product
            </Link>
          </Button>
          <Button className="w-full" type="button" onClick={() => onOrder(product)}>
            <FiShoppingBag className="h-4 w-4" aria-hidden="true" />
            Order
          </Button>
        </div>
      </div>
    </article>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function OrderProductModal({
  product,
  open,
  onOpenChange,
}: {
  product: MarketProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      quantity: 1,
      deliveryLocation: "Use Current Location",
      notes: "",
    },
  });

  function submit(values: OrderFormValues) {
    campusToast.success({
      title: "Order Submitted",
      description: `${values.quantity} item(s) requested from ${product?.seller ?? "the seller"}.`,
    });
    onOpenChange(false);
    form.reset();
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Order Product"
      description={product ? `Connect with ${product.seller} to arrange payment and delivery.` : undefined}
    >
      <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
        {product ? (
          <div className="flex gap-3 rounded-lg border border-border bg-surface-muted p-3">
            <MediaBlock
              image={product.images[0]}
              title={product.name}
              className="h-20 w-20 shrink-0 rounded-md"
            />
            <div>
              <p className="font-semibold">{product.name}</p>
              <p className="mt-1 text-sm text-primary">{product.price}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                CampusHub does not process payments. Buyers and sellers arrange payment directly.
              </p>
            </div>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity" error={form.formState.errors.quantity?.message}>
            <CampusInput
              min={1}
              type="number"
              placeholder="1"
              {...form.register("quantity")}
            />
          </Field>
          <Field
            label="Delivery Location"
            error={form.formState.errors.deliveryLocation?.message}
          >
            <Select
              value={form.watch("deliveryLocation")}
              onValueChange={(value) =>
                form.setValue("deliveryLocation", value, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose location" />
              </SelectTrigger>
              <SelectContent>
                {campusDeliveryLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <CampusTextarea
            rows={4}
            placeholder="Pickup time, preferred contact method, or delivery notes."
            {...form.register("notes")}
          />
        </Field>
        <Button className="w-full" type="submit">
          Submit Order
        </Button>
      </form>
    </Modal>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-3">
      <span className="block text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function MarketActions() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button asChild variant="secondary">
        <Link href="/student/market/my-shop">
          <FiShoppingBag className="h-4 w-4" aria-hidden="true" />
          My Shop
        </Link>
      </Button>
      <Button asChild>
        <Link href="/student/market/browse">
          <FiSearch className="h-4 w-4" aria-hidden="true" />
          Browse Products
        </Link>
      </Button>
    </div>
  );
}

export function MarketHomePageView() {
  const [orderProduct, setOrderProduct] = useState<MarketProduct | null>(null);
  const [category, setCategory] = useState("All");

  const categoryProducts = useMemo(() => {
    if (category === "All") {
      return marketProducts;
    }

    return marketProducts.filter((product) => product.category === category);
  }, [category]);

  const categoryShops = useMemo(() => {
    if (category === "All") {
      return marketShops;
    }

    return marketShops.filter((shop) => shop.category === category);
  }, [category]);

  const trending = categoryProducts.filter((product) => product.trending);
  const recommended = categoryProducts.filter((product) => product.recommended);
  const recent = categoryProducts.slice(0, 4);

  return (
    <MarketShell>
      <MarketPageHeader
        title="Campus Market"
        description="Discover products, student shops, services, and daily campus essentials. CampusHub connects buyers and sellers without handling payments."
        action={<MarketActions />}
      />
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoTile icon={FiPackage} label="Products" value="148 active listings" />
        <InfoTile icon={FiShoppingBag} label="Student Shops" value="32 verified shops" />
        <InfoTile icon={FiUsers} label="Campus Reach" value="8,400 student buyers" />
        <InfoTile icon={FiClock} label="Avg. Response" value="18 minutes" />
      </StaggerContainer>

      <section className="mt-4">
        <CategoryTabs value={category} onChange={setCategory} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Trending Products</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Fast-moving products across campus this week.
              </p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/student/market/browse">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {trending.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {trending.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOrder={setOrderProduct}
                  />
                ))}
              </div>
            ) : (
              <Empty filterName={category} icon={FiShoppingBag} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Featured Shops</CardTitle>
            <p className="text-sm text-muted-foreground">
              Trusted sellers with consistent campus activity.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryShops.length ? (
              categoryShops.map((shop) => <ShopCompactCard key={shop.id} shop={shop} />)
            ) : (
              <Empty filterName={category} icon={FiShoppingBag} />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ProductStrip title="Recently Added Products" products={recent} />
        <ProductStrip title="Recommended Products" products={recommended} />
      </section>

      <OrderProductModal
        product={orderProduct}
        open={Boolean(orderProduct)}
        onOpenChange={(open) => !open && setOrderProduct(null)}
      />
    </MarketShell>
  );
}

function ProductStrip({
  title,
  products,
}: {
  title: string;
  products: MarketProduct[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.length ? (
          products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted p-3"
            >
              <MediaBlock
                image={product.images[0]}
                title={product.name}
                className="h-14 w-14 shrink-0 rounded-md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{product.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {product.shopName} · {product.category}
                </p>
              </div>
              <p className="text-sm font-semibold text-primary">{product.price}</p>
            </div>
          ))
        ) : (
          <Empty icon={FiShoppingBag} />
        )}
      </CardContent>
    </Card>
  );
}

export function MarketProductDetailsPageView({
  productName,
  productCode,
}: {
  productName: string;
  productCode: string;
}) {
  const decodedCode = decodeURIComponent(productCode);
  const product = marketProducts.find(
    (item) =>
      item.id === decodedCode ||
      slugifyProductName(item.name) === decodeURIComponent(productName),
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [orderProduct, setOrderProduct] = useState<MarketProduct | null>(null);

  useEffect(() => {
    if (!product) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % product.images.length);
    }, 3800);

    return () => window.clearInterval(intervalId);
  }, [product]);

  if (!product) {
    return (
      <MarketShell>
        <Empty
          title="Product not found"
          description="The product link may be outdated or the listing is no longer visible."
          icon={FiPackage}
        />
        <Button asChild className="mt-4" variant="secondary">
          <Link href="/student/market">
            <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Market
          </Link>
        </Button>
      </MarketShell>
    );
  }

  const relatedProducts = marketProducts
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 3);

  const shareProduct = async () => {
    const href =
      typeof window === "undefined"
        ? getProductHref(product)
        : `${window.location.origin}${getProductHref(product)}`;

    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(href);
    }

    campusToast.info({
      title: "Product Link Copied",
      description: `${product.name} is ready to share.`,
    });
  };

  return (
    <MarketShell>
      <div className="mb-5">
        <Button asChild size="sm" variant="secondary">
          <Link href="/student/market">
            <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Market
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <FadeIn>
          <Card className="overflow-hidden">
            <div className="relative">
              <MediaBlock
                image={product.images[activeImageIndex]}
                title={product.name}
                className="aspect-[16/10] min-h-[320px] transition-all duration-500"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                      {product.shopName}
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold text-white">
                      {product.name}
                    </h1>
                  </div>
                  <StatusBadge value={product.status} />
                </div>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {product.images.map((image, index) => (
                  <Button
                    key={image}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-auto rounded-lg border border-border p-0",
                      activeImageIndex === index && "border-primary ring-2 ring-primary/20",
                    )}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <MediaBlock
                      image={image}
                      title={`${product.name} preview ${index + 1}`}
                      className="aspect-video w-full rounded-lg"
                    />
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-3xl font-semibold text-primary">
                        {product.price}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {product.description}
                      </p>
                    </div>
                    <Button
                      aria-label="Copy product link"
                      size="icon"
                      type="button"
                      variant="secondary"
                      onClick={shareProduct}
                    >
                      <FiCopy className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoTile icon={FiUser} label="Seller" value={product.seller} />
                    <InfoTile icon={FiTag} label="Category" value={product.category} />
                    <InfoTile icon={FiMapPin} label="Location" value={product.location} />
                    <InfoTile
                      icon={FiStar}
                      label="Trust"
                      value={`${product.stars} stars · ${product.views} views`}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      className="w-full"
                      type="button"
                      onClick={() => setOrderProduct(product)}
                    >
                      <FiShoppingBag className="h-4 w-4" aria-hidden="true" />
                      Order Product
                    </Button>
                    <Button
                      className="w-full"
                      type="button"
                      variant="secondary"
                      onClick={shareProduct}
                    >
                      <FiShare2 className="h-4 w-4" aria-hidden="true" />
                      Share Link
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Listing Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <InfoTile icon={FiPackage} label="Stock" value={`${product.stock} available`} />
                <InfoTile icon={FiEye} label="Visibility" value={product.visibility.join(", ")} />
                <InfoTile icon={FiClock} label="Listed" value={product.createdAt} />
                <InfoTile icon={FiHeart} label="Saved" value={product.favorite ? "In favorites" : "Not saved"} />
              </CardContent>
            </Card>
          </div>
        </FadeIn>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Related Products</h2>
            <Button asChild size="sm" variant="secondary">
              <Link href="/student/market/browse">Browse more</Link>
            </Button>
          </div>
          <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} onOrder={setOrderProduct} />
            ))}
          </StaggerContainer>
        </section>
      ) : null}

      <OrderProductModal
        product={orderProduct}
        open={Boolean(orderProduct)}
        onOpenChange={(open) => !open && setOrderProduct(null)}
      />
    </MarketShell>
  );
}

function ShopCompactCard({ shop }: { shop: MarketShop }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <div className="flex gap-3">
        <MediaBlock
          image={shop.logo}
          title={shop.name}
          className="h-12 w-12 shrink-0 rounded-md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{shop.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {shop.owner} · {shop.category}
              </p>
            </div>
            <StatusBadge value={shop.availabilityStatus} />
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FiStar className="h-3.5 w-3.5 text-amber-500" />
              {shop.rating}
            </span>
            <span>{shop.products} products</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function useProductFilters() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return marketProducts.filter((product) => {
      const matchesQuery =
        !normalized ||
        [product.name, product.seller, product.shopName, product.category].some(
          (value) => value.toLowerCase().includes(normalized),
        );
      const matchesCategory = category === "All" || product.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [category, query]);

  return { query, setQuery, category, setCategory, filteredProducts };
}

export function MarketBrowsePageView() {
  const { query, setQuery, category, setCategory, filteredProducts } =
    useProductFilters();
  const [orderProduct, setOrderProduct] = useState<MarketProduct | null>(null);

  return (
    <MarketShell>
      <MarketPageHeader
        title="Browse Products"
        description="Explore student-listed products, services, food, and campus essentials."
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search products, sellers, shops"
        />
        <CategoryTabs value={category} onChange={setCategory} />
      </div>
      {filteredProducts.length > 0 ? (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOrder={setOrderProduct}
            />
          ))}
        </StaggerContainer>
      ) : (
        <Empty filterName={category === "All" ? query : category} icon={FiShoppingBag} />
      )}
      <OrderProductModal
        product={orderProduct}
        open={Boolean(orderProduct)}
        onOpenChange={(open) => !open && setOrderProduct(null)}
      />
    </MarketShell>
  );
}

function CategoryTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {["All", ...marketCategories].map((category) => (
        <Button
          key={category}
          type="button"
          size="sm"
          variant={value === category ? "default" : "secondary"}
          onClick={() => onChange(category)}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}

export function MarketCategoriesPageView() {
  return (
    <MarketShell>
      <MarketPageHeader
        title="Market Categories"
        description="Move quickly between campus commerce categories and discover active listings."
      />
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {marketCategories.map((category) => {
          const products = marketProducts.filter(
            (product) => product.category === category,
          );
          return (
            <Card key={category} className="overflow-hidden transition-all hover:-translate-y-1 hover:border-primary/40">
              <CardHeader>
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FiTag className="h-4 w-4" aria-hidden="true" />
                </span>
                <CardTitle>{category}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {products.length} active listing{products.length === 1 ? "" : "s"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {products.slice(0, 3).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2 text-sm"
                    >
                      <span className="truncate">{product.name}</span>
                      <span className="shrink-0 text-primary">{product.price}</span>
                    </div>
                  ))}
                  {products.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No listings yet.
                    </p>
                  ) : null}
                </div>
                <Button asChild className="mt-4 w-full" variant="secondary">
                  <Link href="/student/market/browse">Browse category</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </StaggerContainer>
    </MarketShell>
  );
}

export function MarketFavoritesPageView() {
  const favorites = marketProducts.filter((product) => product.favorite);
  const [orderProduct, setOrderProduct] = useState<MarketProduct | null>(null);

  return (
    <MarketShell>
      <MarketPageHeader
        title="Favorites"
        description="Saved products and services you may want to contact later."
      />
      {favorites.length > 0 ? (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOrder={setOrderProduct}
            />
          ))}
        </StaggerContainer>
      ) : (
        <Empty
          title="No saved products"
          description="Favorite products while browsing to keep them here."
          icon={FiHeart}
        />
      )}
      <OrderProductModal
        product={orderProduct}
        open={Boolean(orderProduct)}
        onOpenChange={(open) => !open && setOrderProduct(null)}
      />
    </MarketShell>
  );
}

export function MarketMyShopPageView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<MarketShop | null>(null);
  const myShops = marketShops;

  return (
    <MarketShell>
      <MarketPageHeader
        title="My Shop"
        description="Create and manage your student shop profile, contact channels, availability, and category."
        action={
          <div className="flex gap-2">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <FiPlus className="h-4 w-4" aria-hidden="true" />
              Create Shop
            </Button>
          </div>
        }
      />
      <div className="grid auto-rows-fr gap-5 xl:grid-cols-3">
        {myShops.map((shop) => (
          <Card key={shop.id} className="flex h-full flex-col overflow-hidden">
            <MediaBlock
              image={shop.coverImage}
              title={shop.name}
              className="h-44 border-b border-border"
            />
            <CardContent className="flex flex-1 flex-col gap-5 p-5">
              <div className="flex items-start gap-4">
                <MediaBlock
                  image={shop.logo}
                  title={shop.name}
                  className="h-14 w-14 shrink-0 rounded-lg border border-border"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">{shop.name}</h2>
                    <StatusBadge value={shop.availabilityStatus} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {shop.description}
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                <InfoTile icon={FiTag} label="Category" value={shop.category} />
                <InfoTile icon={FiMapPin} label="Location" value={shop.location} />
                <InfoTile icon={FiPackage} label="Products" value={`${shop.products} listings`} />
              </div>
              <Button className="mt-auto w-full" type="button" onClick={() => setEditingShop(shop)}>
                <FiEdit className="h-4 w-4" aria-hidden="true" />
                Edit Shop
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <ShopFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Shop"
        description="Set up a student shop profile for campus buyers."
      />
      <ShopFormModal
        open={Boolean(editingShop)}
        onOpenChange={(open) => !open && setEditingShop(null)}
        title="Edit Shop"
        description="Update shop details and buyer contact information."
        initialValues={
          editingShop
            ? {
                name: editingShop.name,
                description: editingShop.description,
                contactNumber: editingShop.contactNumber,
                whatsappNumber: editingShop.whatsappNumber,
                availabilityStatus: editingShop.availabilityStatus,
                openingTime: editingShop.availabilityStatus === "Limited Hours" ? "08:00" : "",
                closingTime: editingShop.availabilityStatus === "Limited Hours" ? "18:00" : "",
                category: editingShop.category,
                locationType: campusDeliveryLocations.includes(editingShop.location)
                  ? "Campus Location"
                  : "Outside Campus",
                campusLocation: campusDeliveryLocations.includes(editingShop.location)
                  ? editingShop.location
                  : campusDeliveryLocations[1],
                outsideLocation: campusDeliveryLocations.includes(editingShop.location)
                  ? ""
                  : editingShop.location,
                logo: "",
                coverImage: "",
              }
            : undefined
        }
      />
    </MarketShell>
  );
}

function ShopFormModal({
  open,
  onOpenChange,
  title,
  description,
  initialValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initialValues?: ShopFormValues;
}) {
  const [step, setStep] = useState(0);
  const form = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    values:
      initialValues ??
      ({
        name: "",
        description: "",
        contactNumber: "",
        whatsappNumber: "",
        availabilityStatus: "Open",
        openingTime: "",
        closingTime: "",
        category: "Electronics",
        locationType: "Campus Location",
        campusLocation: "CoICT Lecture Block",
        outsideLocation: "",
        logo: "",
        coverImage: "",
      } satisfies ShopFormValues),
  });
  const availabilityStatus = form.watch("availabilityStatus");
  const locationType = form.watch("locationType");
  const currentStep = shopFormSteps[step];
  const isLastStep = step === shopFormSteps.length - 1;

  useEffect(() => {
    if (open) {
      setStep(0);
    }
  }, [open]);

  function submit(values: ShopFormValues) {
    campusToast.success({
      title: title === "Create Shop" ? "Shop Created" : "Shop Updated",
      description: `${values.name} is ready for campus buyers.`,
    });
    onOpenChange(false);
  }

  async function goToNextStep() {
    const isValid = await form.trigger(currentStep.fields);
    if (isValid) {
      setStep((current) => Math.min(current + 1, shopFormSteps.length - 1));
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
        <div className="grid gap-2 sm:grid-cols-4">
          {shopFormSteps.map((item, index) => (
            <Button
              key={item.title}
              type="button"
              variant="secondary"
              className={cn(
                "h-auto w-full flex-col items-start rounded-lg px-3 py-3 text-left transition-colors",
                index === step
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
              onClick={() => setStep(index)}
            >
              <span className="block text-xs font-semibold uppercase tracking-[0.18em]">
                Step {index + 1}
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {item.title}
              </span>
            </Button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {currentStep.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {currentStep.description}
          </p>
        </div>

        {step === 0 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Shop Name" error={form.formState.errors.name?.message}>
                <CampusInput placeholder="Neema Tech Deals" {...form.register("name")} />
              </Field>
              <Field label="Shop Category" error={form.formState.errors.category?.message}>
                <RadixSelectField
                  value={form.watch("category")}
                  onChange={(value) => form.setValue("category", value, { shouldValidate: true })}
                  placeholder="Choose category"
                  options={marketCategories}
                />
              </Field>
            </div>
            <Field label="Description" error={form.formState.errors.description?.message}>
              <CampusTextarea
                rows={5}
                placeholder="Describe what your shop sells, where buyers can meet you, and when you are available."
                {...form.register("description")}
              />
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact Number" error={form.formState.errors.contactNumber?.message}>
                <CampusInput placeholder="+255 744 120 884" {...form.register("contactNumber")} />
              </Field>
              <Field label="WhatsApp Number" error={form.formState.errors.whatsappNumber?.message}>
                <CampusInput placeholder="+255 744 120 884" {...form.register("whatsappNumber")} />
              </Field>
            </div>
            <Field label="Availability Status">
              <RadixSelectField
                value={form.watch("availabilityStatus")}
                onChange={(value) =>
                  form.setValue("availabilityStatus", value as ShopFormValues["availabilityStatus"], {
                    shouldValidate: true,
                  })
                }
                placeholder="Availability"
                options={["Open", "Open 24/7", "Limited Hours", "Closed"]}
              />
            </Field>
            {availabilityStatus === "Limited Hours" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Opening Time">
                  <CampusInput type="time" {...form.register("openingTime")} />
                </Field>
                <Field label="Closing Time">
                  <CampusInput type="time" {...form.register("closingTime")} />
                </Field>
              </div>
            ) : availabilityStatus === "Open" || availabilityStatus === "Open 24/7" ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                This shop will be shown as open 24/7.
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <Field label="Shop Location Type">
              <RadixSelectField
                value={form.watch("locationType")}
                onChange={(value) =>
                  form.setValue("locationType", value as ShopFormValues["locationType"], {
                    shouldValidate: true,
                  })
                }
                placeholder="Choose location type"
                options={["Campus Location", "Outside Campus"]}
              />
            </Field>
            {locationType === "Campus Location" ? (
              <Field label="Campus Location">
                <RadixSelectField
                  value={form.watch("campusLocation") ?? ""}
                  onChange={(value) => form.setValue("campusLocation", value, { shouldValidate: true })}
                  placeholder="Choose campus location"
                  options={campusDeliveryLocations.filter((location) => location !== "Use Current Location")}
                />
              </Field>
            ) : (
              <Field label="Outside Campus Location">
                <CampusInput
                  placeholder="Mlimani City, Sinza, or nearby off-campus pickup point"
                  {...form.register("outsideLocation")}
                />
              </Field>
            )}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <CampusFileUpload
              label="Logo"
              value={form.watch("logo")}
              onValueChange={(value) => form.setValue("logo", value)}
            />
            <CampusFileUpload
              label="Cover Image"
              value={form.watch("coverImage")}
              onValueChange={(value) => form.setValue("coverImage", value)}
            />
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            disabled={step === 0}
          >
            Back
          </Button>
          {isLastStep ? (
            <Button className="w-full sm:w-auto" type="submit">
              {title}
            </Button>
          ) : (
            <Button className="w-full sm:w-auto" type="button" onClick={goToNextStep}>
              Continue
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}

function RadixSelectField({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MarketMyProductsPageView() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<MarketView>("table");
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<MarketProduct | null>(null);
  const [deactivateProduct, setDeactivateProduct] = useState<MarketProduct | null>(null);
  const myProducts = marketProducts.filter((product) =>
    product.name.toLowerCase().includes(query.toLowerCase()),
  );

  const columns: DataTableColumn<MarketProduct>[] = [
    {
      key: "image",
      header: "Image",
      cell: (product) => (
        <MediaBlock
          image={product.images[0]}
          title={product.name}
          className="h-12 w-12 rounded-md"
        />
      ),
    },
    { key: "name", header: "Product Name" },
    { key: "category", header: "Category" },
    { key: "price", header: "Price" },
    {
      key: "visibility",
      header: "Visibility",
      cell: (product) => (
        <span className="text-sm text-muted-foreground">
          {product.visibility.join(", ")}
        </span>
      ),
    },
    { key: "views", header: "Views" },
    { key: "stars", header: "Stars" },
    {
      key: "status",
      header: "Status",
      cell: (product) => <StatusBadge value={product.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (product) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => window.location.assign(getProductHref(product)),
            },
            { label: "Edit", icon: FiEdit, onSelect: () => setEditProduct(product) },
            {
              label: "Deactivate",
              icon: FiTrash2,
              destructive: true,
              onSelect: () => setDeactivateProduct(product),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MarketShell>
      <MarketPageHeader
        title="My Products"
        description="Manage products listed through your student shop."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            Create Product
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Search my products" />
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>
      {viewMode === "table" ? (
        <CampusDataTable
          columns={columns}
          data={myProducts}
          getRowId={(product) => product.id}
          empty={<Empty filterName={query || "products"} icon={FiPackage} />}
          pageSize={5}
        />
      ) : myProducts.length > 0 ? (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {myProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOrder={() =>
                campusToast.info({
                  title: "Seller Preview",
                  description: "Orders are created by buyers from browse pages.",
                })
              }
            />
          ))}
        </StaggerContainer>
      ) : (
        <Empty filterName={query || "products"} icon={FiPackage} />
      )}
      <ProductFormModal open={createOpen} onOpenChange={setCreateOpen} title="Create Product" />
      <ProductFormModal
        open={Boolean(editProduct)}
        onOpenChange={(open) => !open && setEditProduct(null)}
        title="Edit Product"
        product={editProduct}
      />
      <ConfirmDialog
        open={Boolean(deactivateProduct)}
        onOpenChange={(open) => !open && setDeactivateProduct(null)}
        title="Deactivate Product"
        description={`Deactivate ${deactivateProduct?.name ?? "this product"} so it no longer appears to buyers.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={() =>
          campusToast.warning({
            title: "Product Deactivated",
            description: `${deactivateProduct?.name ?? "Product"} has been paused.`,
          })
        }
      />
    </MarketShell>
  );
}

function ProductFormModal({
  open,
  onOpenChange,
  title,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  product?: MarketProduct | null;
}) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    values: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product?.price ?? "",
      category: product?.category ?? "Electronics",
      stock: product?.stock ?? 1,
      status: product?.status ?? "ACTIVE",
      visibility: product?.visibility ?? ["Everyone"],
      image: "",
    },
  });
  const selectedVisibility = form.watch("visibility");

  function toggleVisibility(value: MarketVisibility) {
    const current = selectedVisibility;
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    form.setValue("visibility", next, { shouldValidate: true });
  }

  function submit(values: ProductFormValues) {
    campusToast.success({
      title: title === "Create Product" ? "Product Added" : "Product Updated",
      description: `${values.name} has been saved successfully.`,
    });
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Add product details, visibility, stock, and media for campus buyers."
    >
      <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product Name" error={form.formState.errors.name?.message}>
            <CampusInput placeholder="MacBook Pro M1 13-inch" {...form.register("name")} />
          </Field>
          <Field label="Price" error={form.formState.errors.price?.message}>
            <CampusInput placeholder="TZS 1,850,000" {...form.register("price")} />
          </Field>
          <Field label="Category" error={form.formState.errors.category?.message}>
            <RadixSelectField
              value={form.watch("category")}
              onChange={(value) => form.setValue("category", value, { shouldValidate: true })}
              placeholder="Choose category"
              options={marketCategories}
            />
          </Field>
          <Field label="Stock Quantity" error={form.formState.errors.stock?.message}>
            <CampusInput min={0} type="number" placeholder="8" {...form.register("stock")} />
          </Field>
        </div>
        <Field label="Status">
          <RadixSelectField
            value={form.watch("status")}
            onChange={(value) =>
              form.setValue("status", value as MarketStatus, { shouldValidate: true })
            }
            placeholder="Product status"
            options={["ACTIVE", "DRAFT", "PAUSED", "SOLD OUT"]}
          />
        </Field>
        <Field label="Description" error={form.formState.errors.description?.message}>
          <CampusTextarea
            rows={4}
            placeholder="Describe condition, pickup location, what is included, and any buyer requirements."
            {...form.register("description")}
          />
        </Field>
        <div>
          <p className="text-sm font-medium">Visibility</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibilityOptions.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 rounded-md border border-border bg-surface-muted px-3 py-3 text-sm"
              >
                <Checkbox
                  checked={selectedVisibility.includes(option)}
                  onChange={() => toggleVisibility(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {form.formState.errors.visibility?.message ? (
            <p className="mt-2 text-xs text-destructive">
              {form.formState.errors.visibility.message}
            </p>
          ) : null}
        </div>
        <CampusFileUpload
          label="Product Images"
          value={form.watch("image")}
          onValueChange={(value) => form.setValue("image", value)}
        />
        <Button className="w-full" type="submit">
          {title}
        </Button>
      </form>
    </Modal>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: MarketView;
  onChange: (value: MarketView) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-border bg-surface p-1">
      {[
        { value: "table" as const, icon: FiList, label: "Table" },
        { value: "grid" as const, icon: FiGrid, label: "Cards" },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.value}
            aria-label={item.label}
            className="h-9 rounded-full px-4"
            size="sm"
            type="button"
            variant={value === item.value ? "default" : "ghost"}
            onClick={() => onChange(item.value)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}

export function MarketOrdersPageView() {
  const [query, setQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<MarketOrder | null>(null);
  const filteredOrders = marketOrders.filter((order) =>
    [order.product, order.buyer, order.location, order.status]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const columns: DataTableColumn<MarketOrder>[] = [
    { key: "product", header: "Product" },
    { key: "buyer", header: "Buyer" },
    { key: "quantity", header: "Quantity" },
    { key: "location", header: "Location" },
    {
      key: "status",
      header: "Status",
      cell: (order) => <StatusBadge value={order.status} />,
    },
    { key: "date", header: "Date" },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (order) => (
        <AdminActionMenu
          items={[
            { label: "View", icon: FiEye, onSelect: () => setSelectedOrder(order) },
            {
              label: "Accept",
              icon: FiCheckCircle,
              onSelect: () =>
                campusToast.success({
                  title: "Order Accepted",
                  description: `${order.product} order has been accepted.`,
                }),
            },
            {
              label: "Reject",
              icon: FiTrash2,
              destructive: true,
              onSelect: () =>
                campusToast.warning({
                  title: "Order Rejected",
                  description: `${order.product} order has been rejected.`,
                }),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MarketShell>
      <MarketPageHeader
        title="Orders"
        description="Track buyer requests. Payments and final delivery coordination happen directly between students."
      />
      <div className="mb-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Search orders" />
      </div>
      <CampusDataTable
        columns={columns}
        data={filteredOrders}
        getRowId={(order) => order.id}
        empty={<Empty filterName={query || "orders"} icon={FiShoppingBag} />}
        pageSize={5}
      />
      <Drawer
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        title="Order Details"
        description={selectedOrder?.product}
        className="max-w-xl"
      >
        {selectedOrder ? (
          <div className="space-y-3">
            <InfoTile icon={FiPackage} label="Product" value={selectedOrder.product} />
            <InfoTile icon={FiUser} label="Buyer" value={selectedOrder.buyer} />
            <InfoTile
              icon={FiShoppingBag}
              label="Quantity"
              value={String(selectedOrder.quantity)}
            />
            <InfoTile icon={FiMapPin} label="Location" value={selectedOrder.location} />
            <InfoTile icon={FiClock} label="Date" value={selectedOrder.date} />
          </div>
        ) : null}
      </Drawer>
    </MarketShell>
  );
}
