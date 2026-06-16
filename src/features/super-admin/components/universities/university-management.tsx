"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  FiEdit,
  FiEye,
  FiBookOpen,
  FiLoader,
  FiPlus,
  FiSearch,
  FiSlash,
} from "react-icons/fi";
import type { z } from "zod";

import {
  CampusDataTable,
  CampusFileUpload,
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
import {
  universityInputSchema,
  type UniversityInput,
} from "@/features/super-admin/lib/schemas";
import type { SerializedUniversity } from "@/features/super-admin/lib/super-admin-service";
import type { DataTableColumn } from "@/components/shared/data-table";

type UniversityManagementProps = {
  initialUniversities: SerializedUniversity[];
};

type ApiResponse<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

const statusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Onboarding", value: "ONBOARDING" },
  { label: "Inactive", value: "INACTIVE" },
] as const;

function getDefaultValues(university?: SerializedUniversity): UniversityInput {
  return {
    name: university?.name ?? "",
    shortName: university?.shortName ?? "",
    slug: university?.slug ?? "",
    description: university?.description ?? "",
    logo: university?.logo ?? "",
    coverImage: university?.coverImage ?? "",
    country: university?.country ?? "",
    region: university?.region ?? "",
    website: university?.website ?? "",
    email: university?.email ?? "",
    phone: university?.phone ?? "",
    status: university?.status ?? "ACTIVE",
  };
}

function StatusBadge({ status }: { status: SerializedUniversity["status"] }) {
  return (
    <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium">
      {status}
    </span>
  );
}

function UniversityForm({
  university,
  onSubmit,
  isSubmitting,
}: {
  university?: SerializedUniversity;
  onSubmit: (values: UniversityInput) => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof universityInputSchema>, unknown, UniversityInput>({
    resolver: zodResolver(universityInputSchema),
    defaultValues: getDefaultValues(university),
  });
  const status = watch("status");
  const logo = watch("logo");
  const coverImage = watch("coverImage");

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Name</span>
          <CampusInput
            {...register("name")}
            invalid={Boolean(errors.name)}
            placeholder="University of Dar es Salaam"
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Short Name</span>
          <CampusInput
            {...register("shortName")}
            invalid={Boolean(errors.shortName)}
            placeholder="UDSM"
          />
          {errors.shortName ? (
            <p className="text-xs text-destructive">
              {errors.shortName.message}
            </p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Slug</span>
          <CampusInput
            {...register("slug")}
            invalid={Boolean(errors.slug)}
            placeholder="university-of-dar-es-salaam"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Status</span>
          <Select
            value={status}
            onValueChange={(value) =>
              setValue("status", value as UniversityInput["status"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Country</span>
          <CampusInput
            {...register("country")}
            invalid={Boolean(errors.country)}
            placeholder="Tanzania"
          />
          {errors.country ? (
            <p className="text-xs text-destructive">{errors.country.message}</p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Region</span>
          <CampusInput
            {...register("region")}
            invalid={Boolean(errors.region)}
            placeholder="Dar es Salaam"
          />
          {errors.region ? (
            <p className="text-xs text-destructive">{errors.region.message}</p>
          ) : null}
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Website</span>
          <CampusInput
            {...register("website")}
            invalid={Boolean(errors.website)}
            placeholder="https://university.edu"
            type="url"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Email</span>
          <CampusInput
            {...register("email")}
            invalid={Boolean(errors.email)}
            placeholder="admin@university.edu"
            type="email"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Phone</span>
          <CampusInput {...register("phone")} placeholder="+255 000 000 000" />
        </label>
        <CampusFileUpload
          className="md:col-span-2"
          label="Logo Upload"
          value={logo}
          error={errors.logo?.message}
          onValueChange={(value) =>
            setValue("logo", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <CampusFileUpload
          label="Cover Image Upload"
          value={coverImage}
          error={errors.coverImage?.message}
          className="md:col-span-2"
          maxSizeMb={2}
          onValueChange={(value) =>
            setValue("coverImage", value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <CampusTextarea
            {...register("description")}
            invalid={Boolean(errors.description)}
            placeholder="Describe the university and its CampusHub readiness."
          />
          {errors.description ? (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          ) : null}
        </label>
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <FiLoader className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        {university ? "Save Changes" : "Create University"}
      </Button>
    </form>
  );
}

function UniversityDetails({
  university,
}: {
  university: SerializedUniversity;
}) {
  const rows = [
    ["Name", university.name],
    ["Short Name", university.shortName],
    ["Slug", university.slug],
    ["Country", university.country],
    ["Region", university.region],
    ["Website", university.website],
    ["Email", university.email],
    ["Phone", university.phone],
    ["Status", university.status],
    ["Created", formatDate(university.createdAt)],
    ["Updated", formatDate(university.updatedAt)],
  ];

  return (
    <div className="space-y-5">
      {university.coverImage ? (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={university.coverImage}
            alt=""
            className="h-40 w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-background text-muted-foreground">
          <FiBookOpen className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-primary">
          {university.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={university.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FiBookOpen className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div>
          <h3 className="text-base font-semibold">{university.name}</h3>
          <p className="text-sm text-muted-foreground">
            {university.shortName || university.slug}
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {university.description}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border p-3">
            <p className="text-xs uppercase tracking-normal text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm font-medium">{value || "Not set"}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border border-border bg-background p-4">
        <p className="text-sm font-semibold">Statistics Placeholder</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Colleges, departments, active users, representatives, invitations, and
          enrollment metrics will appear here as tenant modules are added.
        </p>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function UniversityManagement({
  initialUniversities,
}: UniversityManagementProps) {
  const [universities, setUniversities] = useState(initialUniversities);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<SerializedUniversity | null>(null);
  const [editing, setEditing] = useState<SerializedUniversity | null>(null);
  const [deactivating, setDeactivating] = useState<SerializedUniversity | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const filteredUniversities = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return universities;
    }

    return universities.filter((university) =>
      [
        university.name,
        university.shortName,
        university.country,
        university.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, universities]);

  async function refreshUniversities() {
    const response = await fetch("/api/super-admin/universities", {
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiResponse<{
      universities: SerializedUniversity[];
    }>;

    if (payload.data) {
      setUniversities(payload.data.universities);
    }
  }

  function createUniversity(values: UniversityInput) {
    startTransition(async () => {
      const response = await fetch("/api/super-admin/universities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as ApiResponse<{
        university: SerializedUniversity;
      }>;

      if (!response.ok || !payload.data) {
        campusToast.error({
          title: "Creation Failed",
          description:
            payload.error?.message ??
            "Unable to create university. Please try again.",
        });
        return;
      }

      setCreateOpen(false);
      await refreshUniversities();
      campusToast.success({
        title: "University Created",
        description: "The university was created successfully.",
      });
    });
  }

  function updateSelectedUniversity(values: UniversityInput) {
    if (!editing) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        `/api/super-admin/universities/${editing.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const payload = (await response.json()) as ApiResponse<{
        university: SerializedUniversity;
      }>;

      if (!response.ok || !payload.data) {
        campusToast.error({
          title: "Update Failed",
          description:
            payload.error?.message ??
            "Unable to update university. Please try again.",
        });
        return;
      }

      setEditing(null);
      await refreshUniversities();
      campusToast.success({
        title: "University Updated",
        description: "University information updated successfully.",
      });
    });
  }

  function deactivateSelectedUniversity() {
    if (!deactivating) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        `/api/super-admin/universities/${deactivating.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "deactivate" }),
        },
      );
      const payload = (await response.json()) as ApiResponse<{
        university: SerializedUniversity;
      }>;

      if (!response.ok || !payload.data) {
        campusToast.error({
          title: "Deactivation Failed",
          description:
            payload.error?.message ??
            "Unable to deactivate university. Please try again.",
        });
        return;
      }

      setDeactivating(null);
      await refreshUniversities();
      campusToast.warning({
        title: "University Deactivated",
        description: "The university has been deactivated successfully.",
      });
    });
  }

  const columns: DataTableColumn<SerializedUniversity>[] = [
    {
      key: "logo",
      header: "Logo",
      className: "w-20",
      cell: (university) => (
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-background text-primary">
          {university.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={university.logo}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FiBookOpen className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (university) => <p className="font-medium">{university.name}</p>,
    },
    { key: "shortName", header: "Short Name" },
    { key: "country", header: "Country" },
    {
      key: "status",
      header: "Status",
      cell: (university) => <StatusBadge status={university.status} />,
    },
    {
      key: "createdAt",
      header: "Created Date",
      cell: (university) => formatDate(university.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-16 text-right",
      cell: (university) => (
        <AdminActionMenu
          items={[
            {
              label: "View",
              icon: FiEye,
              onSelect: () => setViewing(university),
            },
            {
              label: "Edit",
              icon: FiEdit,
              onSelect: () => setEditing(university),
            },
            {
              label: "Deactivate",
              icon: FiSlash,
              disabled: university.status === "INACTIVE",
              onSelect: () => setDeactivating(university),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-9"
            placeholder="Search universities"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create University
        </Button>
      </div>

      <div className="mt-5">
        <CampusDataTable
          columns={columns}
          data={filteredUniversities}
          getRowId={(university) => university.id}
          empty={
            <EmptyState
              title={query ? "No matching universities" : "No universities yet"}
              description={
                query
                  ? "Adjust your search and try again."
                  : "Create the first university to unlock Campus Admin invitations."
              }
              className="mx-auto border-0 bg-transparent"
            />
          }
        />
      </div>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create University"
        description="Create a university tenant foundation for CampusHub."
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
      >
        <UniversityForm onSubmit={createUniversity} isSubmitting={isPending} />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit University"
        description="Update university details."
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
      >
        {editing ? (
          <UniversityForm
            key={editing.id}
            university={editing}
            onSubmit={updateSelectedUniversity}
            isSubmitting={isPending}
          />
        ) : null}
      </Modal>

      <Drawer
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
        title={viewing?.name ?? "University details"}
        description="University profile and operational status."
        className="max-w-xl"
      >
        {viewing ? <UniversityDetails university={viewing} /> : null}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate University"
        description={`Deactivate ${deactivating?.name ?? "this university"}? This will prevent new enrollments until reactivated.`}
        confirmLabel="Deactivate"
        destructive
        onConfirm={deactivateSelectedUniversity}
      />
    </>
  );
}
