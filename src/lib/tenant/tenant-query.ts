import type { Query, Schema } from "@/lib/db/model-compat";

import { forbidden } from "@/lib/api/response";

type TenantQueryOptions = {
  universityId?: string;
  skipTenantScope?: boolean;
};

export function requireTenantId(universityId?: string | null) {
  if (!universityId) {
    throw forbidden("University context is required.");
  }

  return universityId;
}

export function withUniversityFilter(
  universityId: string,
  filter: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    $and: [filter, { universityId }],
  };
}

export function assertTenantFilter(filter: Record<string, unknown>) {
  if (!("universityId" in filter)) {
    throw forbidden("Tenant-scoped queries must include universityId.");
  }

  return filter;
}

export function applyUniversityScope<ResultType, DocType>(
  query: Query<ResultType, DocType>,
  universityId: string,
) {
  return query.where({ universityId }) as Query<ResultType, DocType>;
}

export function tenantScopedSchemaPlugin(schema: Schema) {
  if (!schema.path("universityId")) {
    schema.add({
      universityId: {
        type: String,
        required: true,
        index: true,
      },
    });
  }

  schema.pre(
    [
      "countDocuments",
      "deleteMany",
      "deleteOne",
      "find",
      "findOne",
      "findOneAndDelete",
      "findOneAndUpdate",
      "updateMany",
      "updateOne",
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function enforceTenantScope(this: any) {
      const options = this.getOptions() as TenantQueryOptions;

      if (options.skipTenantScope) {
        return;
      }

      if (!options.universityId) {
        throw forbidden("Tenant-scoped query missing universityId option.");
      }

      this.where({ universityId: options.universityId });
    },
  );
}
