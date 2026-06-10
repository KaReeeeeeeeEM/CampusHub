"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiEdit,
  FiEye,
  FiLoader,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { z } from "zod";

import {
  CampusDataTable,
  CampusInput,
  CampusTextarea,
  campusToast,
} from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Drawer } from "@/components/shared/drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { AdminActionMenu } from "@/features/administration/components/admin-action-menu";
import type { CampusLocation } from "@/features/campus-admin/lib/mock-data";
import type { DataTableColumn } from "@/components/shared/data-table";

const categories = [
  "Library",
  "Hostels",
  "Lecture Halls",
  "Administration",
  "Sports",
  "Medical Services",
] as const;

const locationSchema = z.object({
  name: z.string().min(2, "Location name is required."),
  category: z.enum(categories),
  code: z.string().min(2, "Code is required."),
  coordinates: z.string().min(3, "Coordinates are required."),
  description: z.string().min(10, "Description is required."),
});

type LocationInput = z.infer<typeof locationSchema>;

function LocationForm({
  location,
  onSubmit,
  isSubmitting,
}: {
  location?: CampusLocation;
  onSubmit: (values: LocationInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name ?? "",
      category: location?.category ?? "Library",
      code: location?.code ?? "",
      coordinates: location?.coordinates ?? "",
      description: location?.description ?? "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Location Name</span>
          <CampusInput {...register("name")} invalid={Boolean(errors.name)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Category</span>
          <Select
            value={watch("category")}
            onValueChange={(value) =>
              setValue("category", value as LocationInput["category"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Code</span>
          <CampusInput {...register("code")} invalid={Boolean(errors.code)} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Coordinates</span>
          <CampusInput
            {...register("coordinates")}
            invalid={Boolean(errors.coordinates)}
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(errors.description)}
          />
        </label>
      </div>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
        {location ? "Save Changes" : "Add Location"}
      </Button>
    </form>
  );
}

export function MapManagement({
  initialLocations,
}: {
  initialLocations: CampusLocation[];
}) {
  const [locations, setLocations] = useState(initialLocations);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<CampusLocation | null>(null);
  const [editing, setEditing] = useState<CampusLocation | null>(null);
  const [deleting, setDeleting] = useState<CampusLocation | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return locations;
    return locations.filter((location) =>
      [location.name, location.category, location.code]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [locations, query]);

  function createLocation(values: LocationInput) {
    startTransition(async () => {
      setLocations((current) => [
        { id: `location-${Date.now()}`, status: "ACTIVE", ...values },
        ...current,
      ]);
      setCreateOpen(false);
      campusToast.success({
        title: "Map Point Added",
        description: "The campus location was added successfully.",
      });
    });
  }

  function updateLocation(values: LocationInput) {
    if (!editing) return;
    startTransition(async () => {
      setLocations((current) =>
        current.map((location) =>
          location.id === editing.id ? { ...location, ...values } : location,
        ),
      );
      setEditing(null);
      campusToast.success({
        title: "Map Point Updated",
        description: "The campus location was updated successfully.",
      });
    });
  }

  const columns: DataTableColumn<CampusLocation>[] = [
    { key: "name", header: "Location" },
    { key: "category", header: "Category" },
    { key: "code", header: "Code" },
    { key: "status", header: "Status" },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (location) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => setViewing(location),
            },
            {
              label: "Edit",
              icon: FiEdit,
              onSelect: () => setEditing(location),
            },
            {
              label: "Delete",
              icon: FiTrash2,
              destructive: true,
              onSelect: () => setDeleting(location),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <section className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-96 overflow-hidden rounded-lg border border-border bg-surface p-5">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
          <div className="relative z-10">
            <p className="text-sm font-semibold">Map Preview</p>
            <p className="mt-1 text-sm text-muted-foreground">
              University of Dar es Salaam campus locations preview.
            </p>
          </div>
          {locations.map((location, index) => (
            <span
              key={location.id}
              className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
              style={{
                left: `${24 + index * 18}%`,
                top: `${35 + (index % 2) * 22}%`,
              }}
              title={location.name}
            >
              <FiMapPin className="h-4 w-4" />
            </span>
          ))}
        </div>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <CampusInput
                className="pl-9"
                placeholder="Search locations"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <FiPlus className="h-4 w-4" />
              Create Location
            </Button>
          </div>
          <div className="mt-5">
            <CampusDataTable
              columns={columns}
              data={filtered}
              getRowId={(location) => location.id}
              empty={
                <EmptyState
                  title={query ? "No matching locations" : "No map locations"}
                  description="Add campus locations to populate the map management table."
                  className="mx-auto border-0 bg-transparent"
                />
              }
            />
          </div>
        </div>
      </section>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Location"
      >
        <LocationForm onSubmit={createLocation} isSubmitting={isPending} />
      </Modal>
      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit Location"
      >
        {editing ? (
          <LocationForm
            location={editing}
            onSubmit={updateLocation}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>
      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "Location details"}
      >
        {viewing ? (
          <div className="space-y-3 text-sm">
            <p>{viewing.description}</p>
            <p className="text-muted-foreground">
              {viewing.category} · {viewing.coordinates}
            </p>
          </div>
        ) : null}
      </Drawer>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete Location"
        description={`Delete ${deleting?.name ?? "this location"} from the mock map?`}
        destructive
        onConfirm={() => {
          if (deleting) {
            setLocations((current) =>
              current.filter((item) => item.id !== deleting.id),
            );
            campusToast.warning({
              title: "Map Point Removed",
              description: "The mock location was removed.",
            });
          }
        }}
      />
    </>
  );
}
