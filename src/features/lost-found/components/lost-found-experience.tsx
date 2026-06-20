"use client";

import { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  FiArchive,
  FiCheckCircle,
  FiClock,
  FiEdit,
  FiEye,
  FiFilter,
  FiGrid,
  FiList,
  FiMapPin,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import { cn } from "@/lib/utils";

type LostFoundPortal = "student" | "campus-admin" | "representative" | "committee";
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
  description: string;
  contact: string;
  verification: string;
  images: string[];
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

const lostFoundItems: LostFoundItem[] = [];

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

function ItemPhoto({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
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
    >
    </div>
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
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as T)}>
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
  onSubmit,
  portal,
}: {
  onSubmit: () => void;
  portal: LostFoundPortal;
}) {
  const isManagement = portal !== "student";
  const [primaryImage, setPrimaryImage] = useState("");
  const [supportingImage, setSupportingImage] = useState("");
  const [itemType, setItemType] = useState<LostFoundType>("Lost");
  const [itemCategory, setItemCategory] = useState("Electronics");
  const [status, setStatus] = useState<LostFoundStatus>("Open");

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Item Title">
          <CampusInput placeholder="Describe the missing or found item" />
        </Field>
        <Field label="Item Type">
          <LostFoundSelect
            value={itemType}
            options={formItemTypes}
            placeholder="Select item type"
            onValueChange={setItemType}
          />
        </Field>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Category">
          <LostFoundSelect
            value={itemCategory}
            options={categories.filter((category) => category !== "All")}
            placeholder="Select category"
            onValueChange={setItemCategory}
          />
        </Field>
        <Field label="Last Seen / Found Location">
          <CampusInput placeholder="Where was the item last seen or found?" />
        </Field>
      </div>
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
      <Field label="Description">
        <CampusTextarea
          placeholder="Describe the item, where it was lost or found, and any details that can help verify ownership."
          rows={5}
        />
      </Field>
      <Field label="Verification Details">
        <CampusTextarea
          placeholder="Ask claimants to identify a hidden mark, serial detail, contents, or ownership clue."
          rows={3}
        />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
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
      <Button className="w-full" type="submit">
        {isManagement ? "Save Item" : "Submit Report"}
      </Button>
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
    { label: "Contact", value: item.contact, icon: FiArchive },
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
      <ItemPhoto src={item.images[0]} title={item.title} className="h-44 rounded-none border-0" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Pill value={item.type} className={typeStyles[item.type]} />
            <Pill value={item.category} className="border-border bg-surface-muted text-muted-foreground" />
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
    [item.title, item.description, item.category, item.location, item.reportedBy]
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
  const [confirming, setConfirming] = useState<LostFoundItem | null>(null);

  const isManagement = portal !== "student";
  const activeReports = lostFoundItems.filter(
    (item) => item.status !== "Returned",
  ).length;
  const returnedReports = lostFoundItems.filter(
    (item) => item.status === "Returned",
  ).length;
  const verifiedClaims = lostFoundItems.filter((item) =>
    ["Matched", "Returned"].includes(item.status),
  ).length;
  const pickupPoints = new Set(
    lostFoundItems.map((item) => item.location).filter(Boolean),
  ).size;
  const verifiedClaimRate =
    lostFoundItems.length > 0
      ? `${Math.round((verifiedClaims / lostFoundItems.length) * 100)}%`
      : "N/A";
  const filteredItems = useMemo(
    () =>
      lostFoundItems.filter((item) =>
        filtersMatch(item, query, type, category, dateFilter),
      ),
    [category, dateFilter, query, type],
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
      cell: (item: LostFoundItem) => (
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
                onSelect: () => setConfirming(item),
              },
              {
                label: "Archive",
                icon: FiTrash2,
                destructive: true,
                onSelect: () => setConfirming(item),
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
        )
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
        {viewMode === "table" ? (
          <CampusDataTable
            columns={columns}
            data={filteredItems}
            getRowId={(item) => item.id}
            pageSize={6}
            empty={<Empty filterName={emptyFilter ?? "lost and found"} icon={FiFilter} />}
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
        title={isManagement ? "Add Lost & Found Item" : "Report Lost or Found Item"}
        description="Provide enough context to help the right person verify and recover the item."
      >
        <LostFoundForm
          portal={portal}
          onSubmit={() => {
            setCreateOpen(false);
            campusToast.success({
              title: isManagement ? "Item Saved" : "Report Submitted",
              description: isManagement
                ? "The lost and found item has been saved to the management queue."
                : "Your item report has been shared with the campus lost and found queue.",
            });
          }}
        />
      </Modal>

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        title={viewing?.title ?? "Item Details"}
        description={viewing ? `${viewing.type} item reported ${viewing.reportedAt}` : undefined}
        className="max-w-xl"
      >
        {viewing ? <ItemDetails item={viewing} /> : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Update item status"
        description="This is a UI-only action. In production this would update the lost and found record and notify the reporter."
        confirmLabel="Confirm Update"
        onConfirm={() => {
          campusToast.info({
            title: "Lost & Found Updated",
            description: `${confirming?.title ?? "The item"} has been updated successfully.`,
          });
        }}
      />
    </main>
  );
}
