"use client";

import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiArchive,
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiEdit,
  FiEye,
  FiFileText,
  FiFilter,
  FiGrid,
  FiImage,
  FiList,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiSearch,
  FiShield,
  FiTag,
  FiTrash2,
  FiUser,
} from "react-icons/fi";

import {
  CampusDataTable,
  CampusFileUpload,
  CampusInput,
  CampusTextarea,
  CampusViewToggle,
  Empty,
  campusToast,
} from "@/components/campushub";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Drawer } from "@/components/shared/drawer";
import { Modal } from "@/components/shared/modal";
import { MultiStepProgress } from "@/components/shared/multi-step-progress";
import { Skeleton } from "@/components/shared/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import { cn } from "@/lib/utils";

type LostFoundPortal =
  | "student"
  | "campus-admin"
  | "representative"
  | "committee";
type LostFoundType = "Lost" | "Found";
type LostFoundStatus = "Open" | "Matched" | "Returned" | "Under Review";
type LostFoundViewMode = "table" | "cards";
type LostFoundDateFilter =
  | "All"
  | "Today"
  | "Yesterday"
  | "Recent"
  | "Last Week"
  | "Last Month"
  | "Older";

type LostFoundItem = {
  id: string;
  title: string;
  type: LostFoundType;
  category: string;
  status: LostFoundStatus;
  location: string;
  reportedBy: string;
  reportedAt: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  description: string;
  contact: string;
  verification: string;
  images: string[];
};

type LostFoundFormValues = {
  title: string;
  type: LostFoundType;
  category: string;
  status: LostFoundStatus;
  location: string;
  description: string;
  verification: string;
  contact: string;
  images: string[];
};

type LostFoundApiPayload = {
  data?: {
    items?: LostFoundItem[];
    item?: LostFoundItem;
  };
  error?: {
    message?: string;
  } | null;
};

type LostFoundConfirmAction = "archive" | "return" | "reopen";

type LostFoundConfirmState = {
  item: LostFoundItem;
  action: LostFoundConfirmAction;
};

const categories = [
  "All",
  "Electronics",
  "Documents",
  "Books",
  "Keys",
  "Clothing",
  "Bags",
  "Accessories",
  "Other",
];

const itemTypes = ["All", "Lost", "Found"];
const formItemTypes = ["Lost", "Found"] satisfies LostFoundType[];
const statusOptions = [
  "Open",
  "Matched",
  "Returned",
  "Under Review",
] satisfies LostFoundStatus[];
const dateFilters = [
  "All",
  "Today",
  "Yesterday",
  "Recent",
  "Last Week",
  "Last Month",
  "Older",
] satisfies LostFoundDateFilter[];
function getReferenceDate() {
  return new Date();
}

const lostFoundViewOptions = [
  { value: "table", label: "List view", icon: FiList },
  { value: "cards", label: "Grid view", icon: FiGrid },
] satisfies Array<{
  value: LostFoundViewMode;
  label: string;
  icon: IconType;
}>;

const lostFoundFormSteps = [
  {
    title: "Item",
    description:
      "Capture the item name, type, category, and current handling status.",
    icon: FiTag,
  },
  {
    title: "Details",
    description:
      "Add the location, description, and verification clues needed for recovery.",
    icon: FiFileText,
  },
  {
    title: "Photos",
    description: "Attach clear item photos to help people identify it quickly.",
    icon: FiImage,
  },
];

const statusStyles: Record<LostFoundStatus, string> = {
  Open: "border-primary/25 bg-primary/10 text-primary",
  Matched: "border-blue-500/25 bg-blue-500/10 text-blue-500",
  Returned: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
  "Under Review": "border-amber-500/25 bg-amber-500/10 text-amber-500",
};

const typeStyles: Record<LostFoundType, string> = {
  Lost: "border-rose-500/25 bg-rose-500/10 text-rose-500",
  Found: "border-primary/25 bg-primary/10 text-primary",
};

function Pill({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
        className,
      )}
    >
      {value}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: IconType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div
      className="rounded-lg border border-border bg-surface p-4"
      aria-hidden="true"
    >
      <Skeleton className="h-9 w-9 rounded-md" />
      <Skeleton className="mt-4 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

function LostFoundStatsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </>
  );
}

function ItemPhoto({
  src,
  title,
  className,
}: {
  src?: string;
  title: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        aria-label={`${title} photo placeholder`}
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-surface-muted text-muted-foreground",
          className,
        )}
      >
        <FiImage className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      aria-label={`${title} photo`}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-surface-muted",
        className,
      )}
      role="img"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.04), rgba(0,0,0,0.28)), url(${src})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    ></div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("space-y-3", className)}>
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function LostFoundSelect<T extends string>({
  value,
  options,
  placeholder,
  onValueChange,
}: {
  value: T;
  options: readonly T[];
  placeholder: string;
  onValueChange: (value: T) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as T)}
    >
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

function LostFoundForm({
  isSubmitting,
  onSubmit,
  portal,
}: {
  isSubmitting: boolean;
  onSubmit: (values: LostFoundFormValues) => void;
  portal: LostFoundPortal;
}) {
  const isManagement = portal !== "student";
  const [primaryImage, setPrimaryImage] = useState("");
  const [supportingImage, setSupportingImage] = useState("");
  const [itemType, setItemType] = useState<LostFoundType>("Lost");
  const [itemCategory, setItemCategory] = useState("Electronics");
  const [status, setStatus] = useState<LostFoundStatus>("Open");
  const [step, setStep] = useState(0);
  const isLastStep = step === lostFoundFormSteps.length - 1;

  function goNext() {
    setStep((current) => Math.min(current + 1, lostFoundFormSteps.length - 1));
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isLastStep) {
          goNext();
        }
      }}
    >
      <MultiStepProgress
        activeIndex={step}
        className="mb-8"
        maxClickableIndex={step}
        steps={lostFoundFormSteps.map((item) => ({
          label: item.title,
          icon: item.icon,
        }))}
        onStepClick={setStep}
      />
      <div className={cn("grid gap-5 md:grid-cols-2", step !== 0 && "hidden")}>
        <Field label="Item Title">
          <CampusInput
            name="title"
            placeholder="e.g. Black HP laptop in a grey sleeve"
            required
          />
        </Field>
        <Field label="Item Type">
          <LostFoundSelect
            value={itemType}
            options={formItemTypes}
            placeholder="Select item type"
            onValueChange={setItemType}
          />
        </Field>
        <Field
          label="Category"
          className={!isManagement ? "md:col-span-2" : undefined}
        >
          <LostFoundSelect
            value={itemCategory}
            options={categories.filter((category) => category !== "All")}
            placeholder="Select category"
            onValueChange={setItemCategory}
          />
        </Field>
        {isManagement ? (
          <Field label="Status">
            <LostFoundSelect
              value={status}
              options={statusOptions}
              placeholder="Select status"
              onValueChange={setStatus}
            />
          </Field>
        ) : null}
      </div>
      <div className={cn("grid gap-5", step !== 1 && "hidden")}>
        <Field label="Last Seen / Found Location">
          <CampusInput
            name="location"
            placeholder="e.g. Main library reception desk"
            required
          />
        </Field>
        <Field label="Description">
          <CampusTextarea
            name="description"
            placeholder="Describe the item, where it was lost or found, and any details that can help verify ownership."
            required
            rows={5}
          />
        </Field>
        <Field label="Verification Details">
          <CampusTextarea
            name="verification"
            placeholder="Ask claimants to identify a hidden mark, serial detail, contents, or ownership clue."
            rows={3}
          />
        </Field>
      </div>
      <div className={cn("grid gap-5 md:grid-cols-2", step !== 2 && "hidden")}>
        <Field label="Primary Item Photo">
          <CampusFileUpload
            accept="image/png,image/jpeg,image/webp"
            label="Upload"
            value={primaryImage}
            onValueChange={setPrimaryImage}
          />
        </Field>
        <Field label="Supporting Photo">
          <CampusFileUpload
            accept="image/png,image/jpeg,image/webp"
            label="Upload"
            value={supportingImage}
            onValueChange={setSupportingImage}
          />
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          disabled={step === 0 || isSubmitting}
          type="button"
          variant="secondary"
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        {isLastStep ? (
          <Button
            className="w-full sm:w-auto"
            disabled={isSubmitting}
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (!form?.reportValidity()) return;

              const formData = new FormData(form);

              onSubmit({
                title: String(formData.get("title") ?? "").trim(),
                type: itemType,
                category: itemCategory,
                status,
                location: String(formData.get("location") ?? "").trim(),
                description: String(formData.get("description") ?? "").trim(),
                verification: String(formData.get("verification") ?? "").trim(),
                contact: "",
                images: [primaryImage, supportingImage].filter(Boolean),
              });
            }}
          >
            {isSubmitting
              ? "Saving..."
              : isManagement
                ? "Save Item"
                : "Submit Report"}
          </Button>
        ) : (
          <Button
            className="w-full sm:w-auto"
            disabled={isSubmitting}
            type="button"
            onClick={goNext}
          >
            Continue
            <FiArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </form>
  );
}

function ItemDetails({ item }: { item: LostFoundItem }) {
  const detailRows: Array<{
    label: string;
    value: string;
    icon: IconType;
  }> = [
    { label: "Category", value: item.category, icon: FiTag },
    { label: "Location", value: item.location, icon: FiMapPin },
    { label: "Reported By", value: item.reportedBy, icon: FiUser },
    { label: "Reported", value: item.reportedAt, icon: FiClock },
    {
      label: "Phone / Email",
      value: item.contact || "Not provided",
      icon: FiPhone,
    },
    { label: "Verification", value: item.verification, icon: FiShield },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <ItemPhoto
          src={item.images[0]}
          title={item.title}
          className="h-64 w-full"
        />
        <div className="grid grid-cols-2 gap-3">
          {item.images.slice(1).map((image, index) => (
            <ItemPhoto
              key={image}
              src={image}
              title={`${item.title} supporting ${index + 1}`}
              className="h-28"
            />
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {item.type} item
            </p>
            <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>
          <Pill value={item.status} className={statusStyles[item.status]} />
        </div>
      </div>
      {detailRows.map(({ label, value, icon: ResolvedIcon }) => {
        return (
          <div
            key={label}
            className="flex gap-3 rounded-lg border border-border bg-background p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ResolvedIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-sm font-medium">{value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItemCard({
  item,
  onView,
}: {
  item: LostFoundItem;
  onView: (item: LostFoundItem) => void;
}) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <ItemPhoto
        src={item.images[0]}
        title={item.title}
        className="h-44 rounded-none border-0"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Pill value={item.type} className={typeStyles[item.type]} />
            <Pill
              value={item.category}
              className="border-border bg-surface-muted text-muted-foreground"
            />
          </div>
          <Pill value={item.status} className={statusStyles[item.status]} />
        </div>
        <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
        <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">
          {item.description}
        </p>
        <div className="mt-5 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <FiMapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {item.location}
          </p>
          <p className="flex items-center gap-2">
            <FiClock className="h-4 w-4 text-primary" aria-hidden="true" />
            {item.reportedAt}
          </p>
        </div>
        <Button
          className="mt-5 w-full"
          type="button"
          variant="secondary"
          onClick={() => onView(item)}
        >
          <FiEye className="h-4 w-4" aria-hidden="true" />
          View Details
        </Button>
      </div>
    </article>
  );
}

function filtersMatch(
  item: LostFoundItem,
  query: string,
  type: string,
  category: string,
  dateFilter: LostFoundDateFilter,
) {
  const search = query.trim().toLowerCase();
  const matchesSearch =
    !search ||
    [
      item.title,
      item.description,
      item.category,
      item.location,
      item.reportedBy,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search);

  return (
    matchesSearch &&
    (type === "All" || item.type === type) &&
    (category === "All" || item.category === category) &&
    matchesDateFilter(item, dateFilter)
  );
}

function getReportedDate(item: LostFoundItem) {
  const normalized = item.reportedAt.toLowerCase();

  if (normalized.startsWith("today")) {
    return getReferenceDate();
  }

  if (normalized.startsWith("yesterday")) {
    const yesterday = getReferenceDate();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  return new Date(item.reportedAt);
}

function getDateDifferenceInDays(item: LostFoundItem) {
  const reportedDate = getReportedDate(item);
  const difference = getReferenceDate().getTime() - reportedDate.getTime();

  return Math.max(0, Math.floor(difference / (1000 * 60 * 60 * 24)));
}

function matchesDateFilter(
  item: LostFoundItem,
  dateFilter: LostFoundDateFilter,
) {
  if (dateFilter === "All") return true;

  const normalized = item.reportedAt.toLowerCase();
  const daysAgo = getDateDifferenceInDays(item);

  if (dateFilter === "Today") return normalized.startsWith("today");
  if (dateFilter === "Yesterday") return normalized.startsWith("yesterday");
  if (dateFilter === "Recent") return daysAgo <= 7;
  if (dateFilter === "Last Week") return daysAgo > 7 && daysAgo <= 14;
  if (dateFilter === "Last Month") return daysAgo > 14 && daysAgo <= 30;

  return daysAgo > 30;
}

function LostFoundCardGridSkeleton() {
  return (
    <div
      className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading lost and found records"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-surface p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-6 space-y-3">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LostFoundExperience({
  portal,
  title,
  description,
}: {
  portal: LostFoundPortal;
  title?: string;
  description?: string;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [category, setCategory] = useState("All");
  const [dateFilter, setDateFilter] = useState<LostFoundDateFilter>("All");
  const [viewMode, setViewMode] = useState<LostFoundViewMode>(
    portal === "student" ? "cards" : "table",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<LostFoundItem | null>(null);
  const [confirming, setConfirming] = useState<LostFoundConfirmState | null>(
    null,
  );
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isManagement = portal !== "student";
  const activeReports = items.filter(
    (item) => item.status !== "Returned",
  ).length;
  const returnedReports = items.filter(
    (item) => item.status === "Returned",
  ).length;
  const verifiedClaims = items.filter((item) =>
    ["Matched", "Returned"].includes(item.status),
  ).length;
  const pickupPoints = new Set(
    items.map((item) => item.location).filter(Boolean),
  ).size;
  const verifiedClaimRate =
    items.length > 0
      ? `${Math.round((verifiedClaims / items.length) * 100)}%`
      : "N/A";
  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        filtersMatch(item, query, type, category, dateFilter),
      ),
    [category, dateFilter, items, query, type],
  );
  const emptyFilter =
    query ||
    (type !== "All"
      ? type
      : category !== "All"
        ? category
        : dateFilter !== "All"
          ? dateFilter
          : undefined);

  useEffect(() => {
    let active = true;

    async function loadItems() {
      setLoading(true);

      try {
        const response = await fetch("/api/lost-found?limit=100", {
          cache: "no-store",
        });
        const payload = (await response.json()) as LostFoundApiPayload;

        if (!active) return;

        if (!response.ok) {
          throw new Error(payload.error?.message ?? "Unable to load items.");
        }

        setItems(payload.data?.items ?? []);
      } catch (error) {
        if (!active) return;

        setItems([]);
        campusToast.error({
          title: "Lost & Found Not Loaded",
          description:
            error instanceof Error
              ? error.message
              : "The lost and found records could not be loaded.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadItems();

    return () => {
      active = false;
    };
  }, []);

  async function createItem(values: LostFoundFormValues) {
    setSaving(true);

    try {
      const response = await fetch("/api/lost-found", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as LostFoundApiPayload;

      if (!response.ok || !payload.data?.item) {
        throw new Error(payload.error?.message ?? "Unable to save item.");
      }

      const createdItem = payload.data.item;

      setItems((current) => [createdItem, ...current]);
      setCreateOpen(false);
      campusToast.success({
        title: isManagement ? "Item Saved" : "Report Submitted",
        description: isManagement
          ? "The lost and found item has been saved to the management queue."
          : "Your item report has been shared with the campus lost and found queue.",
      });
    } catch (error) {
      campusToast.error({
        title: isManagement ? "Item Not Saved" : "Report Not Submitted",
        description:
          error instanceof Error
            ? error.message
            : "The lost and found item could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function updateItemStatus(
    item: LostFoundItem,
    status: LostFoundStatus,
  ) {
    const response = await fetch("/api/lost-found", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    });
    const payload = (await response.json()) as LostFoundApiPayload;

    if (!response.ok || !payload.data?.item) {
      throw new Error(payload.error?.message ?? "Unable to update item.");
    }

    setItems((current) =>
      current.map((entry) =>
        entry.id === payload.data?.item?.id ? payload.data.item : entry,
      ),
    );
    if (viewing?.id === payload.data.item.id) {
      setViewing(payload.data.item);
    }
  }

  async function archiveItem(item: LostFoundItem) {
    const response = await fetch("/api/lost-found", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    const payload = (await response.json()) as LostFoundApiPayload;

    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Unable to archive item.");
    }

    setItems((current) => current.filter((entry) => entry.id !== item.id));
    if (viewing?.id === item.id) {
      setViewing(null);
    }
  }

  async function confirmItemAction() {
    if (!confirming) return;

    try {
      if (confirming.action === "archive") {
        await archiveItem(confirming.item);
      } else {
        await updateItemStatus(
          confirming.item,
          confirming.action === "reopen" ? "Open" : "Returned",
        );
      }

      campusToast.success({
        title: "Lost & Found Updated",
        description: `${confirming.item.title} has been updated.`,
      });
    } catch (error) {
      campusToast.error({
        title: "Lost & Found Not Updated",
        description:
          error instanceof Error
            ? error.message
            : "The lost and found item could not be updated.",
      });
    } finally {
      setConfirming(null);
    }
  }

  const columns: DataTableColumn<LostFoundItem>[] = [
    {
      key: "title",
      header: "Item",
      cell: (item: LostFoundItem) => (
        <div className="flex items-center gap-3">
          <ItemPhoto
            src={item.images[0]}
            title={item.title}
            className="h-12 w-16 shrink-0 rounded-md"
          />
          <div>
            <p className="font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.location}</p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (item: LostFoundItem) => (
        <Pill value={item.type} className={typeStyles[item.type]} />
      ),
    },
    { key: "category", header: "Category" },
    {
      key: "reportedBy",
      header: "Reporter",
      cell: (item: LostFoundItem) => (
        <div>
          <p>{item.reportedBy}</p>
          <p className="text-xs text-muted-foreground">{item.reportedAt}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item: LostFoundItem) => (
        <Pill value={item.status} className={statusStyles[item.status]} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-20 text-right",
      cell: (item: LostFoundItem) =>
        isManagement ? (
          <AdminActionMenu
            items={[
              {
                label: "View",
                icon: FiEye,
                onSelect: () => setViewing(item),
              },
              {
                label: "Edit",
                icon: FiEdit,
                onSelect: () => setViewing(item),
              },
              {
                label: item.status === "Returned" ? "Reopen" : "Mark returned",
                icon: FiCheckCircle,
                onSelect: () =>
                  setConfirming({
                    item,
                    action: item.status === "Returned" ? "reopen" : "return",
                  }),
              },
              {
                label: "Archive",
                icon: FiTrash2,
                destructive: true,
                onSelect: () => setConfirming({ item, action: "archive" }),
              },
            ]}
          />
        ) : (
          <Button
            className="w-full justify-center"
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => setViewing(item)}
          >
            <FiEye className="h-4 w-4" aria-hidden="true" />
            View
          </Button>
        ),
    },
  ];

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            CampusHub Lost & Found
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            {title ?? "Lost & Found"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description ??
              "Report missing items, publish found items, verify ownership, and help students recover belongings across campus."}
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          {isManagement ? "Add Item" : "Report Item"}
        </Button>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <LostFoundStatsSkeleton />
        ) : (
          <>
            <StatCard
              icon={FiArchive}
              label="Active reports"
              value={activeReports.toLocaleString()}
            />
            <StatCard
              icon={FiCheckCircle}
              label="Returned this month"
              value={returnedReports.toLocaleString()}
            />
            <StatCard
              icon={FiShield}
              label="Verified claims"
              value={verifiedClaimRate}
            />
            <StatCard
              icon={FiMapPin}
              label="Campus pickup points"
              value={pickupPoints.toLocaleString()}
            />
          </>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-background p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_150px_190px_170px_auto]">
          <label className="relative">
            <span className="sr-only">Search lost and found</span>
            <FiSearch
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <CampusInput
              className="pl-9"
              placeholder="Search items, locations, reporters"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <LostFoundSelect
            value={type}
            options={itemTypes}
            placeholder="Select type"
            onValueChange={setType}
          />
          <LostFoundSelect
            value={category}
            options={categories}
            placeholder="Select category"
            onValueChange={setCategory}
          />
          <LostFoundSelect
            value={dateFilter}
            options={dateFilters}
            placeholder="Select date"
            onValueChange={setDateFilter}
          />
          <CampusViewToggle
            className="justify-self-start lg:justify-self-end"
            value={viewMode}
            options={lostFoundViewOptions}
            onValueChange={setViewMode}
          />
        </div>
      </section>

      <section className="mt-6">
        {loading && viewMode !== "table" ? (
          <LostFoundCardGridSkeleton />
        ) : viewMode === "table" ? (
          <CampusDataTable
            columns={columns}
            data={filteredItems}
            getRowId={(item) => item.id}
            loading={loading}
            skeletonRows={6}
            empty={
              <Empty
                filterName={emptyFilter ?? "lost and found"}
                icon={FiFilter}
              />
            }
          />
        ) : filteredItems.length > 0 ? (
          <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} onView={setViewing} />
            ))}
          </div>
        ) : (
          <Empty filterName={emptyFilter ?? "lost and found"} icon={FiFilter} />
        )}
      </section>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={
          isManagement ? "Add Lost & Found Item" : "Report Lost or Found Item"
        }
        description="Provide enough context to help the right person verify and recover the item."
      >
        <LostFoundForm
          isSubmitting={saving}
          portal={portal}
          onSubmit={createItem}
        />
      </Modal>

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        title={viewing?.title ?? "Item Details"}
        description={
          viewing
            ? `${viewing.type} item reported ${viewing.reportedAt}`
            : undefined
        }
        className="max-w-xl"
      >
        {viewing ? <ItemDetails item={viewing} /> : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title={
          confirming?.action === "archive"
            ? "Archive item"
            : "Update item status"
        }
        description={
          confirming?.action === "archive"
            ? `Archive ${confirming.item.title}? It will be removed from the active lost and found queue.`
            : `Update ${confirming?.item.title ?? "this item"} to ${
                confirming?.action === "reopen" ? "Open" : "Returned"
              }?`
        }
        confirmLabel={
          confirming?.action === "archive" ? "Archive Item" : "Confirm Update"
        }
        onConfirm={confirmItemAction}
      />
    </main>
  );
}
