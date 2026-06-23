"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiDownload,
  FiEdit3,
  FiEye,
  FiFileText,
  FiGrid,
  FiList,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";

import {
  CampusDataTable,
  CampusEmptyState,
  CampusInput,
  CampusSearch,
  CampusSelect,
  CampusTextarea,
  CampusViewToggle,
  campusToast,
  type CampusViewToggleOption,
} from "@/components/campushub";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Modal } from "@/components/shared/modal";
import { Skeleton } from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import { DocumentViewer } from "@/features/student-documents/components/document-viewer";
import { cn } from "@/lib/utils";

type DocumentType =
  | "CV"
  | "NATIONAL_ID"
  | "O_LEVEL_CERTIFICATE"
  | "A_LEVEL_CERTIFICATE"
  | "TRANSCRIPT"
  | "ADMISSION_LETTER"
  | "BIRTH_CERTIFICATE"
  | "PASSPORT"
  | "OTHER";

type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
type Visibility = "PRIVATE" | "UNIVERSITY" | "EMPLOYERS" | "LEADERSHIP";
type ViewMode = "list" | "grid";

type StudentDocument = {
  id: string;
  title: string;
  documentType: DocumentType;
  customDocumentTypeName: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  issuingAuthority: string;
  referenceNumber: string;
  issuedAt: string | null;
  expiresAt: string | null;
  verificationStatus: VerificationStatus;
  visibility: Visibility;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type DocumentStats = {
  total: number;
  verified: number;
  pending: number;
  totalSize: number;
};

type RepositoryResponse = {
  data: {
    documents: StudentDocument[];
    stats: DocumentStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error: { message: string } | null;
};

type MutationResponse = {
  data: {
    document: StudentDocument;
  };
  error: { message: string } | null;
};

type FormState = {
  title: string;
  documentType: DocumentType;
  customDocumentTypeName: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  visibility: Visibility;
  issuingAuthority: string;
  referenceNumber: string;
  issuedAt: string;
  expiresAt: string;
  notes: string;
};

const documentTypeOptions: Array<{ value: DocumentType; label: string }> = [
  { value: "CV", label: "CV" },
  { value: "NATIONAL_ID", label: "National ID" },
  { value: "O_LEVEL_CERTIFICATE", label: "O-level certificate" },
  { value: "A_LEVEL_CERTIFICATE", label: "A-level certificate" },
  { value: "TRANSCRIPT", label: "Transcript" },
  { value: "ADMISSION_LETTER", label: "Admission letter" },
  { value: "BIRTH_CERTIFICATE", label: "Birth certificate" },
  { value: "PASSPORT", label: "Passport" },
  { value: "OTHER", label: "Other" },
];

const verificationOptions: Array<{
  value: VerificationStatus;
  label: string;
}> = [
  { value: "PENDING", label: "Pending review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

const visibilityOptions: Array<{ value: Visibility; label: string }> = [
  { value: "PRIVATE", label: "Private" },
  { value: "UNIVERSITY", label: "University staff" },
  { value: "EMPLOYERS", label: "Employers" },
  { value: "LEADERSHIP", label: "Student leadership" },
];

const viewOptions: CampusViewToggleOption<ViewMode>[] = [
  { value: "list", label: "List view", icon: FiList },
  { value: "grid", label: "Card view", icon: FiGrid },
];

const emptyForm: FormState = {
  title: "",
  documentType: "CV",
  customDocumentTypeName: "",
  fileName: "",
  fileUrl: "",
  fileType: "",
  fileSize: 0,
  visibility: "PRIVATE",
  issuingAuthority: "",
  referenceNumber: "",
  issuedAt: "",
  expiresAt: "",
  notes: "",
};

const acceptedDocumentTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const acceptedDocumentExtensions = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx";
const maxDocumentSize = 5 * 1024 * 1024;

function getDocumentTypeLabel(value: string) {
  return (
    documentTypeOptions.find((option) => option.value === value)?.label ??
    "Document"
  );
}

function getDocumentLabel(
  document: Pick<StudentDocument, "documentType" | "customDocumentTypeName">,
) {
  if (
    document.documentType === "OTHER" &&
    document.customDocumentTypeName.trim()
  ) {
    return document.customDocumentTypeName.trim();
  }

  return getDocumentTypeLabel(document.documentType);
}

function getVisibilityLabel(value: string) {
  return (
    visibilityOptions.find((option) => option.value === value)?.label ?? value
  );
}

function getVerificationLabel(value: string) {
  return (
    verificationOptions.find((option) => option.value === value)?.label ?? value
  );
}

function formatBytes(value: number) {
  if (!value) return "0 KB";

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function dateInputValue(value: string | null) {
  if (!value) return "";

  return value.slice(0, 10);
}

function isSupportedFile(file: File) {
  return (
    acceptedDocumentTypes.includes(file.type) ||
    /\.(pdf|png|jpe?g|webp|docx?)$/i.test(file.name)
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read this file."));
    reader.readAsDataURL(file);
  });
}

async function parseApiResponse<T>(response: Response) {
  const payload = (await response.json()) as T & {
    error?: { message?: string } | null;
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return payload;
}

function FilePicker({
  value,
  fileSize,
  onFileSelected,
}: {
  value: string;
  fileSize: number;
  onFileSelected: (file: File, fileUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!isSupportedFile(file)) {
      setError("Upload a PDF, image, DOC, or DOCX file.");
      event.target.value = "";
      return;
    }

    if (file.size > maxDocumentSize) {
      setError("Document must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    try {
      const fileUrl = await readFileAsDataUrl(file);
      setError("");
      onFileSelected(file, fileUrl);
    } catch (fileError) {
      setError(
        fileError instanceof Error
          ? fileError.message
          : "Unable to read this file.",
      );
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="document-file">
        Document file
      </label>
      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FiFileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {value || "No document selected"}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, image, DOC, or DOCX. Max 5MB.
                {fileSize ? ` ${formatBytes(fileSize)} selected.` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {value ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  onFileSelected(
                    new File([], "", { type: "" }),
                    "",
                  )
                }
              >
                <FiX className="h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              <FiUpload className="h-4 w-4" aria-hidden="true" />
              Upload
            </Button>
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        id="document-file"
        className="sr-only"
        type="file"
        accept={acceptedDocumentExtensions}
        onChange={handleFileChange}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function RepositorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-20 rounded-lg" />
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: VerificationStatus }) {
  const label = getVerificationLabel(status);

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "VERIFIED" &&
          "bg-emerald-500/10 text-emerald-400",
        status === "PENDING" && "bg-amber-500/10 text-amber-400",
        status === "REJECTED" && "bg-destructive/10 text-destructive",
      )}
    >
      {label}
    </span>
  );
}

function DocumentActions({
  document,
  onView,
  onEdit,
  onArchive,
}: {
  document: StudentDocument;
  onView: (document: StudentDocument) => void;
  onEdit: (document: StudentDocument) => void;
  onArchive: (document: StudentDocument) => void;
}) {
  function downloadDocument() {
    const anchor = window.document.createElement("a");
    anchor.href = document.fileUrl;
    anchor.download = document.fileName;
    anchor.click();
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        aria-label={`View ${document.title}`}
        size="icon"
        title="View document"
        type="button"
        variant="ghost"
        onClick={() => onView(document)}
      >
        <FiEye className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        aria-label={`Download ${document.title}`}
        size="icon"
        title="Download document"
        type="button"
        variant="ghost"
        onClick={downloadDocument}
      >
        <FiDownload className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        aria-label={`Edit ${document.title}`}
        size="icon"
        title="Edit document details"
        type="button"
        variant="ghost"
        onClick={() => onEdit(document)}
      >
        <FiEdit3 className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        aria-label={`Archive ${document.title}`}
        size="icon"
        title="Archive document"
        type="button"
        variant="ghost"
        onClick={() => onArchive(document)}
      >
        <FiTrash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
      </Button>
    </div>
  );
}

function DocumentCard({
  document,
  onView,
  onEdit,
  onArchive,
}: {
  document: StudentDocument;
  onView: (document: StudentDocument) => void;
  onEdit: (document: StudentDocument) => void;
  onArchive: (document: StudentDocument) => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FiFileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <StatusPill status={document.verificationStatus} />
      </div>
      <div className="mt-5 min-h-24">
        <h3 className="line-clamp-2 text-base font-semibold">
          {document.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {getDocumentLabel(document)}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {document.fileName} · {formatBytes(document.fileSize)}
        </p>
      </div>
      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-background p-3">
          <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Visibility
          </dt>
          <dd className="mt-1">{getVisibilityLabel(document.visibility)}</dd>
        </div>
        <div className="rounded-md bg-background p-3">
          <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            Uploaded
          </dt>
          <dd className="mt-1">{formatDate(document.createdAt)}</dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-border pt-3">
        <DocumentActions
          document={document}
          onArchive={onArchive}
          onEdit={onEdit}
          onView={onView}
        />
      </div>
    </article>
  );
}

export function StudentDocumentRepository({
  portal = "student",
}: {
  portal?: "student" | "representative";
}) {
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    verified: 0,
    pending: 0,
    totalSize: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [documentType, setDocumentType] = useState<"ALL" | DocumentType>("ALL");
  const [verificationStatus, setVerificationStatus] = useState<
    "ALL" | VerificationStatus
  >("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<StudentDocument | null>(null);
  const [viewerDocument, setViewerDocument] = useState<StudentDocument | null>(
    null,
  );
  const [archiveTarget, setArchiveTarget] = useState<StudentDocument | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);

  const pageTitle =
    portal === "representative"
      ? "Representative document repository."
      : "Document repository.";
  const pageDescription =
    portal === "representative"
      ? "Keep leadership and student records such as your CV, National ID, and certificates in one verified place."
      : "Upload and manage your CV, National ID, academic certificates, and other personal documents.";

  const loadDocuments = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (documentType !== "ALL") params.set("documentType", documentType);
      if (verificationStatus !== "ALL") {
        params.set("verificationStatus", verificationStatus);
      }

      const response = await fetch(`/api/student-documents?${params}`, {
        cache: "no-store",
      });
      const payload = await parseApiResponse<RepositoryResponse>(response);

      setDocuments(payload.data.documents);
      setStats(payload.data.stats);
    } catch (error) {
      campusToast.error({
        title: "Documents could not load",
        description:
          error instanceof Error
            ? error.message
            : "Refresh the page and try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [documentType, search, verificationStatus]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDocuments();
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [loadDocuments]);

  function openCreateModal() {
    setEditingDocument(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(document: StudentDocument) {
    setEditingDocument(document);
    setForm({
      title: document.title,
      documentType: document.documentType,
      customDocumentTypeName: document.customDocumentTypeName,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      fileType: document.fileType,
      fileSize: document.fileSize,
      visibility: document.visibility,
      issuingAuthority: document.issuingAuthority,
      referenceNumber: document.referenceNumber,
      issuedAt: dateInputValue(document.issuedAt),
      expiresAt: dateInputValue(document.expiresAt),
      notes: document.notes,
    });
    setModalOpen(true);
  }

  function updateForm<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.fileName || !form.fileUrl) {
      campusToast.error({
        title: "Document file required",
        description: "Choose the file that should be stored in the repository.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        editingDocument
          ? `/api/student-documents/${editingDocument.id}`
          : "/api/student-documents",
        {
          method: editingDocument ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      await parseApiResponse<MutationResponse>(response);

      campusToast.success({
        title: editingDocument ? "Document updated" : "Document uploaded",
        description: "Your repository has been refreshed.",
      });
      setModalOpen(false);
      await loadDocuments();
    } catch (error) {
      campusToast.error({
        title: "Document was not saved",
        description:
          error instanceof Error
            ? error.message
            : "Check the document details and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function archiveDocument() {
    if (!archiveTarget) return;

    try {
      const response = await fetch(
        `/api/student-documents/${archiveTarget.id}`,
        { method: "DELETE" },
      );
      await parseApiResponse(response);
      campusToast.success({
        title: "Document archived",
        description: "The document is no longer shown in your repository.",
      });
      await loadDocuments();
    } catch (error) {
      campusToast.error({
        title: "Document was not archived",
        description:
          error instanceof Error
            ? error.message
            : "Refresh the page and try again.",
      });
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "title",
        header: "Document",
        cell: (document: StudentDocument) => (
          <div className="min-w-0">
            <p className="font-semibold">{document.title}</p>
            <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
              {document.fileName} · {formatBytes(document.fileSize)}
            </p>
          </div>
        ),
      },
      {
        key: "documentType",
        header: "Type",
        cell: (document: StudentDocument) =>
          getDocumentLabel(document),
      },
      {
        key: "verificationStatus",
        header: "Status",
        cell: (document: StudentDocument) => (
          <StatusPill status={document.verificationStatus} />
        ),
      },
      {
        key: "visibility",
        header: "Visibility",
        cell: (document: StudentDocument) =>
          getVisibilityLabel(document.visibility),
      },
      {
        key: "createdAt",
        header: "Uploaded",
        cell: (document: StudentDocument) => formatDate(document.createdAt),
      },
      {
        key: "actions",
        header: "Actions",
        className: "text-right",
        cell: (document: StudentDocument) => (
          <DocumentActions
            document={document}
            onArchive={setArchiveTarget}
            onEdit={openEditModal}
            onView={setViewerDocument}
          />
        ),
      },
    ],
    [],
  );

  return (
    <main className="w-full max-w-none space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Documents
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
            {pageTitle}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            {pageDescription}
          </p>
        </div>
        <Button type="button" onClick={openCreateModal}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Upload Document
        </Button>
      </div>

      {loading && documents.length === 0 ? (
        <RepositorySkeleton />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            {[
              ["Total documents", String(stats.total), FiFileText],
              ["Verified", String(stats.verified), FiShield],
              ["Pending review", String(stats.pending), FiUpload],
              ["Repository size", formatBytes(stats.totalSize), FiDownload],
            ].map(([label, value, Icon]) => (
              <div
                key={label as string}
                className="rounded-lg border border-border bg-surface p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="mt-5 text-2xl font-semibold">{value as string}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {label as string}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto] lg:items-center">
              <CampusSearch
                placeholder="Search documents, file names, or issuing authority"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <CampusSelect
                aria-label="Filter by document type"
                value={documentType}
                onChange={(event) =>
                  setDocumentType(event.target.value as "ALL" | DocumentType)
                }
              >
                <option value="ALL">All document types</option>
                {documentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CampusSelect>
              <CampusSelect
                aria-label="Filter by verification status"
                value={verificationStatus}
                onChange={(event) =>
                  setVerificationStatus(
                    event.target.value as "ALL" | VerificationStatus,
                  )
                }
              >
                <option value="ALL">All statuses</option>
                {verificationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CampusSelect>
              <CampusViewToggle
                value={viewMode}
                options={viewOptions}
                onValueChange={setViewMode}
              />
            </div>
          </section>

          {viewMode === "list" ? (
            <CampusDataTable
              columns={columns}
              data={documents}
              empty={
                <CampusEmptyState
                  className="mx-auto"
                  title="No documents uploaded"
                  description="Upload your CV, National ID, certificates, or other academic records when ready."
                  actionLabel="Upload Document"
                  onAction={openCreateModal}
                />
              }
              getRowId={(document) => document.id}
              loading={loading}
              pageSize={8}
              skeletonRows={6}
            />
          ) : (
            <section className="space-y-4">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-64 rounded-lg" />
                  ))}
                </div>
              ) : documents.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {documents.map((document) => (
                    <DocumentCard
                      key={document.id}
                      document={document}
                      onArchive={setArchiveTarget}
                      onEdit={openEditModal}
                      onView={setViewerDocument}
                    />
                  ))}
                </div>
              ) : (
                <CampusEmptyState
                  className="mx-auto"
                  title="No documents uploaded"
                  description="Upload your CV, National ID, certificates, or other academic records when ready."
                  actionLabel="Upload Document"
                  onAction={openCreateModal}
                />
              )}
            </section>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        title={editingDocument ? "Edit Document" : "Upload Document"}
        description="Store documents in your repository with clear labels, controlled types, and visibility."
        className="max-w-4xl"
        onOpenChange={setModalOpen}
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block space-y-3">
              <span className="text-sm font-medium">Document title</span>
              <CampusInput
                placeholder="e.g. Updated CV for internships"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </label>
            <label className="block space-y-3">
              <span className="text-sm font-medium">Document type</span>
              <CampusSelect
                value={form.documentType}
                onChange={(event) =>
                  updateForm("documentType", event.target.value as DocumentType)
                }
              >
                {documentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CampusSelect>
            </label>
            {form.documentType === "OTHER" ? (
              <label className="block space-y-3 md:col-span-2">
                <span className="text-sm font-medium">Other document name</span>
                <CampusInput
                  placeholder="e.g. Professional certificate, award letter"
                  value={form.customDocumentTypeName}
                  onChange={(event) =>
                    updateForm("customDocumentTypeName", event.target.value)
                  }
                />
              </label>
            ) : null}
          </div>

          <FilePicker
            value={form.fileName}
            fileSize={form.fileSize}
            onFileSelected={(file, fileUrl) => {
              if (!fileUrl) {
                updateForm("fileName", "");
                updateForm("fileUrl", "");
                updateForm("fileType", "");
                updateForm("fileSize", 0);
                return;
              }

              updateForm("fileName", file.name);
              updateForm("fileUrl", fileUrl);
              updateForm("fileType", file.type);
              updateForm("fileSize", file.size);
            }}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block space-y-3">
              <span className="text-sm font-medium">Visibility</span>
              <CampusSelect
                value={form.visibility}
                onChange={(event) =>
                  updateForm("visibility", event.target.value as Visibility)
                }
              >
                {visibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CampusSelect>
            </label>
            <label className="block space-y-3">
              <span className="text-sm font-medium">Issuing authority</span>
              <CampusInput
                placeholder="e.g. NECTA, NIDA, University registrar"
                value={form.issuingAuthority}
                onChange={(event) =>
                  updateForm("issuingAuthority", event.target.value)
                }
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="block space-y-3">
              <span className="text-sm font-medium">Reference number</span>
              <CampusInput
                placeholder="e.g. Certificate or ID number"
                value={form.referenceNumber}
                onChange={(event) =>
                  updateForm("referenceNumber", event.target.value)
                }
              />
            </label>
            <label className="block space-y-3">
              <span className="text-sm font-medium">Issued date</span>
              <CampusInput
                type="date"
                value={form.issuedAt}
                onChange={(event) => updateForm("issuedAt", event.target.value)}
              />
            </label>
            <label className="block space-y-3">
              <span className="text-sm font-medium">Expiry date</span>
              <CampusInput
                type="date"
                value={form.expiresAt}
                onChange={(event) =>
                  updateForm("expiresAt", event.target.value)
                }
              />
            </label>
          </div>

          <label className="block space-y-3">
            <span className="text-sm font-medium">Notes</span>
            <CampusTextarea
              placeholder="Add context, verification notes, or where this document should be used."
              rows={5}
              value={form.notes}
              onChange={(event) => updateForm("notes", event.target.value)}
            />
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingDocument
                  ? "Save Changes"
                  : "Upload Document"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive document?"
        description={
          archiveTarget
            ? `${archiveTarget.title} will be removed from your active repository.`
            : "This document will be removed from your active repository."
        }
        confirmLabel="Archive"
        destructive
        onConfirm={archiveDocument}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
      />

      <DocumentViewer
        document={viewerDocument}
        open={Boolean(viewerDocument)}
        onOpenChange={(open) => {
          if (!open) setViewerDocument(null);
        }}
      />
    </main>
  );
}
