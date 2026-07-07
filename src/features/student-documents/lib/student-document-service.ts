import { randomUUID } from "node:crypto";

import { hasRole } from "@/features/authorization/rbac";
import {
  archiveStudentDocumentSchema,
  createStudentDocumentSchema,
  studentDocumentQuerySchema,
  updateStudentDocumentSchema,
} from "@/features/student-documents/lib/schemas";
import { forbidden, notFound } from "@/lib/api/response";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { requireAuth } from "@/lib/auth/session";
import { connectPostgres } from "@/lib/db/postgres";
import { StudentDocumentModel, StudentModel } from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null, status: "ACTIVE" };

function assertStudentActor(actor: AuthUser) {
  if (!hasRole(actor.role, ["STUDENT"], actor.roles)) {
    throw forbidden("Only students and student representatives can manage documents.");
  }

  if (!actor.universityId) {
    throw forbidden("University scope is required.");
  }

  return actor.universityId;
}

function nullableText(value: string | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";

  return text || null;
}

function nullableDate(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function serializeDocument(document: Record<string, unknown>) {
  return {
    id: String(document._id),
    userId: String(document.userId),
    universityId: String(document.universityId),
    collegeId:
      typeof document.collegeId === "string" ? document.collegeId : null,
    departmentId:
      typeof document.departmentId === "string" ? document.departmentId : null,
    courseId: typeof document.courseId === "string" ? document.courseId : null,
    title: String(document.title ?? ""),
    documentType: String(document.documentType ?? "OTHER"),
    customDocumentTypeName:
      typeof document.customDocumentTypeName === "string"
        ? document.customDocumentTypeName
        : "",
    fileName: String(document.fileName ?? ""),
    fileUrl: String(document.fileUrl ?? ""),
    fileType: typeof document.fileType === "string" ? document.fileType : "",
    fileSize:
      typeof document.fileSize === "number" ? document.fileSize : 0,
    issuingAuthority:
      typeof document.issuingAuthority === "string"
        ? document.issuingAuthority
        : "",
    referenceNumber:
      typeof document.referenceNumber === "string"
        ? document.referenceNumber
        : "",
    issuedAt: serializeDate(document.issuedAt),
    expiresAt: serializeDate(document.expiresAt),
    verificationStatus: String(document.verificationStatus ?? "PENDING"),
    visibility: String(document.visibility ?? "PRIVATE"),
    notes: typeof document.notes === "string" ? document.notes : "",
    createdAt: serializeDate(document.createdAt),
    updatedAt: serializeDate(document.updatedAt),
  };
}

async function getStudentProfile(actor: AuthUser) {
  const student = await StudentModel.findOne({ userId: actor.id }).lean();

  return {
    collegeId:
      typeof student?.collegeId === "string"
        ? student.collegeId
        : actor.collegeId,
    departmentId:
      typeof student?.departmentId === "string"
        ? student.departmentId
        : actor.departmentId,
    courseId: typeof student?.courseId === "string" ? student.courseId : null,
  };
}

export async function listStudentDocuments(query: unknown = {}) {
  const actor = await requireAuth();
  const universityId = assertStudentActor(actor);

  await connectPostgres();

  const filters = studentDocumentQuerySchema.parse(query);
  const dbFilter: Record<string, unknown> = {
    userId: actor.id,
    universityId,
    ...deletedFilter,
  };

  if (filters.documentType) dbFilter.documentType = filters.documentType;
  if (filters.verificationStatus) {
    dbFilter.verificationStatus = filters.verificationStatus;
  }
  if (filters.visibility) dbFilter.visibility = filters.visibility;
  if (filters.q) {
    dbFilter.$or = [
      { title: { $regex: filters.q, $options: "i" } },
      { fileName: { $regex: filters.q, $options: "i" } },
      { issuingAuthority: { $regex: filters.q, $options: "i" } },
      { referenceNumber: { $regex: filters.q, $options: "i" } },
      { notes: { $regex: filters.q, $options: "i" } },
    ];
  }

  const skip = (filters.page - 1) * filters.limit;
  const [documents, total, allActiveDocuments] = await Promise.all([
    StudentDocumentModel.find(dbFilter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(filters.limit)
      .lean(),
    StudentDocumentModel.countDocuments(dbFilter),
    StudentDocumentModel.find({
      userId: actor.id,
      universityId,
      ...deletedFilter,
    })
      .select("verificationStatus fileSize")
      .lean(),
  ]);

  const stats = allActiveDocuments.reduce(
    (summary, document) => {
      summary.total += 1;
      summary.totalSize +=
        typeof document.fileSize === "number" ? document.fileSize : 0;

      if (document.verificationStatus === "VERIFIED") summary.verified += 1;
      if (document.verificationStatus === "PENDING") summary.pending += 1;

      return summary;
    },
    { total: 0, verified: 0, pending: 0, totalSize: 0 },
  );

  return {
    documents: documents.map((document) =>
      serializeDocument(document as Record<string, unknown>),
    ),
    stats,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  };
}

export async function createStudentDocument(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertStudentActor(actor);

  await connectPostgres();

  const payload = createStudentDocumentSchema.parse(input);
  const studentProfile = await getStudentProfile(actor);
  const document = await StudentDocumentModel.create({
    _id: randomUUID(),
    userId: actor.id,
    uploadedById: actor.id,
    universityId,
    collegeId: studentProfile.collegeId ?? null,
    departmentId: studentProfile.departmentId ?? null,
    courseId: studentProfile.courseId ?? null,
    title: payload.title,
    documentType: payload.documentType,
    customDocumentTypeName:
      payload.documentType === "OTHER"
        ? nullableText(payload.customDocumentTypeName)
        : null,
    fileName: payload.fileName,
    fileUrl: payload.fileUrl,
    fileType: nullableText(payload.fileType),
    fileSize: payload.fileSize,
    visibility: payload.visibility,
    issuingAuthority: nullableText(payload.issuingAuthority),
    referenceNumber: nullableText(payload.referenceNumber),
    issuedAt: nullableDate(payload.issuedAt),
    expiresAt: nullableDate(payload.expiresAt),
    notes: nullableText(payload.notes),
    createdById: actor.id,
  });
  const serialized = serializeDocument(document.toObject());

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "STUDENT_DOCUMENT_CREATED",
    entityType: "student_document",
    entityId: String(document._id),
    after: serialized,
  });

  return serialized;
}

export async function updateStudentDocument(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertStudentActor(actor);

  await connectPostgres();

  const payload = updateStudentDocumentSchema.parse(input);
  const before = await StudentDocumentModel.findOne({
    _id: payload.id,
    userId: actor.id,
    universityId,
    ...deletedFilter,
  }).lean();

  if (!before) {
    throw notFound("Document was not found.");
  }

  const updates: Record<string, unknown> = {
    updatedById: actor.id,
  };

  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.documentType !== undefined) {
    updates.documentType = payload.documentType;
    if (payload.documentType !== "OTHER") {
      updates.customDocumentTypeName = null;
    }
  }
  if (payload.customDocumentTypeName !== undefined) {
    updates.customDocumentTypeName =
      payload.documentType === "OTHER" ||
      (payload.documentType === undefined && before.documentType === "OTHER")
        ? nullableText(payload.customDocumentTypeName)
        : null;
  }
  if (payload.fileName !== undefined) updates.fileName = payload.fileName;
  if (payload.fileUrl !== undefined) updates.fileUrl = payload.fileUrl;
  if (payload.fileType !== undefined) {
    updates.fileType = nullableText(payload.fileType);
  }
  if (payload.fileSize !== undefined) updates.fileSize = payload.fileSize;
  if (payload.visibility !== undefined) updates.visibility = payload.visibility;
  if (payload.issuingAuthority !== undefined) {
    updates.issuingAuthority = nullableText(payload.issuingAuthority);
  }
  if (payload.referenceNumber !== undefined) {
    updates.referenceNumber = nullableText(payload.referenceNumber);
  }
  if (payload.issuedAt !== undefined) {
    updates.issuedAt = nullableDate(payload.issuedAt);
  }
  if (payload.expiresAt !== undefined) {
    updates.expiresAt = nullableDate(payload.expiresAt);
  }
  if (payload.notes !== undefined) updates.notes = nullableText(payload.notes);

  const document = await StudentDocumentModel.findOneAndUpdate(
    {
      _id: payload.id,
      userId: actor.id,
      universityId,
      ...deletedFilter,
    },
    { $set: updates },
    { new: true },
  ).lean();

  if (!document) {
    throw notFound("Document was not found.");
  }

  const serialized = serializeDocument(document as Record<string, unknown>);

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "STUDENT_DOCUMENT_UPDATED",
    entityType: "student_document",
    entityId: payload.id,
    before: serializeDocument(before as Record<string, unknown>),
    after: serialized,
  });

  return serialized;
}

export async function archiveStudentDocument(input: unknown) {
  const actor = await requireAuth();
  const universityId = assertStudentActor(actor);

  await connectPostgres();

  const payload = archiveStudentDocumentSchema.parse(input);
  const before = await StudentDocumentModel.findOneAndUpdate(
    {
      _id: payload.id,
      userId: actor.id,
      universityId,
      ...deletedFilter,
    },
    {
      $set: {
        status: "ARCHIVED",
        deletedAt: new Date(),
        deletedById: actor.id,
        deleteReason: "Archived from student document repository.",
      },
    },
    { new: false },
  ).lean();

  if (!before) {
    throw notFound("Document was not found.");
  }

  await writeAuditLog({
    actorId: actor.id,
    universityId,
    action: "STUDENT_DOCUMENT_ARCHIVED",
    entityType: "student_document",
    entityId: payload.id,
    before: serializeDocument(before as Record<string, unknown>),
    after: null,
  });

  return { id: payload.id };
}
