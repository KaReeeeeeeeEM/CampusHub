import { randomUUID } from "node:crypto";

import {
  auditEventSchema,
  type AuditEventInput,
} from "@/features/auth/lib/schemas";
import { connectPostgres } from "@/lib/db/postgres";
import { AuditLogModel } from "@/lib/db/models";

export async function writeAuditLog(input: AuditEventInput) {
  const event = auditEventSchema.parse(input);

  await connectPostgres();

  await AuditLogModel.create({
    _id: randomUUID(),
    universityId: event.universityId ?? null,
    actorId: event.actorId ?? null,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId ?? null,
    before: event.before ?? null,
    after: event.after ?? null,
    ipAddress: event.ipAddress ?? null,
    userAgent: event.userAgent ?? null,
    requestId: event.requestId ?? null,
    severity: "INFO",
    metadata: event.metadata ?? null,
  });
}

export async function writeAuthAuditLog(input: AuditEventInput) {
  try {
    await writeAuditLog(input);
  } catch (error) {
    console.error("Failed to write CampusHub auth audit log.", error);
  }
}
