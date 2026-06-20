import { PERMISSIONS } from "@/features/authorization/permissions";
import { hasPermission, hasRole } from "@/features/authorization/rbac";
import { executiveAnalyticsQuerySchema } from "@/features/executive-analytics/lib/executive-analytics-schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { forbidden } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/session";
import { connectMongo } from "@/lib/db/mongodb";
import {
  CollegeModel,
  DepartmentModel,
  UniversityModel,
  UserModel,
} from "@/lib/db/models";
import type { AuthUser } from "@/types/auth";

const deletedFilter = { deletedAt: null };

function canReadExecutiveAnalytics(actor: AuthUser) {
  return (
    hasRole(actor.role, ["SUPER_ADMIN", "CAMPUS_ADMIN"], actor.roles) ||
    hasPermission(actor, PERMISSIONS.AUDIT_READ) ||
    hasPermission(actor, PERMISSIONS.TENANT_MANAGE)
  );
}

function scopedUniversityId(actor: AuthUser, requested?: string) {
  if (hasRole(actor.role, ["SUPER_ADMIN"], actor.roles)) {
    return requested ?? actor.universityId ?? null;
  }

  if (!actor.universityId) throw forbidden("University scope is required.");
  if (requested && requested !== actor.universityId) {
    throw forbidden("Cannot view another university's executive analytics.");
  }

  return actor.universityId;
}

function dateRange(from?: Date, to?: Date) {
  if (!from && !to) return undefined;

  return {
    ...(from ? { $gte: from } : {}),
    ...(to ? { $lte: to } : {}),
  };
}

function startOfDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    0,
    0,
    0,
    0,
  );
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);

  return next;
}

function activeSinceFilter(baseFilter: Record<string, unknown>, since: Date) {
  return {
    ...baseFilter,
    lastLoginAt: { $gte: since },
  };
}

function normalizeCounts(items: Array<{ _id: unknown; count: number }>, key: string) {
  return items.map((item) => ({
    [key]: String(item._id ?? "UNKNOWN"),
    count: Number(item.count ?? 0),
  }));
}

function monthKeyExpression(field: string) {
  return {
    $dateToString: {
      format: "%Y-%m",
      date: `$${field}`,
    },
  };
}

export async function getExecutiveAnalytics(query: unknown = {}) {
  const actor = await requireAuth();
  if (!canReadExecutiveAnalytics(actor)) {
    throw forbidden("Executive analytics access is required.");
  }

  await connectMongo();
  const filters = executiveAnalyticsQuerySchema.parse(query);
  const universityId = scopedUniversityId(actor, filters.universityId);
  const endDate = filters.to ?? new Date();
  const fromToRange = dateRange(filters.from, filters.to);
  const dailySince = startOfDay(endDate);
  const weeklySince = addDays(startOfDay(endDate), -6);
  const monthlySince = addDays(startOfDay(endDate), -29);

  const userScope: Record<string, unknown> = {
    ...deletedFilter,
  };
  if (universityId) userScope.universityId = universityId;
  if (filters.collegeId) userScope.collegeId = filters.collegeId;
  if (filters.departmentId) userScope.departmentId = filters.departmentId;

  const organizationScope: Record<string, unknown> = {
    ...deletedFilter,
  };
  if (universityId) organizationScope.universityId = universityId;

  const collegeScope: Record<string, unknown> = {
    ...organizationScope,
  };
  if (filters.collegeId) collegeScope._id = filters.collegeId;

  const departmentScope: Record<string, unknown> = {
    ...organizationScope,
  };
  if (filters.collegeId) departmentScope.collegeId = filters.collegeId;
  if (filters.departmentId) departmentScope._id = filters.departmentId;

  const registrationFilter: Record<string, unknown> = {
    ...userScope,
  };
  if (fromToRange) registrationFilter.createdAt = fromToRange;

  const activeInRangeFilter: Record<string, unknown> = {
    ...userScope,
    status: "ACTIVE",
  };
  if (fromToRange) activeInRangeFilter.lastLoginAt = fromToRange;

  const retentionEligibleFilter: Record<string, unknown> = {
    ...userScope,
  };
  if (filters.from) {
    retentionEligibleFilter.createdAt = { $lt: filters.from };
  }

  const retainedFilter: Record<string, unknown> = {
    ...retentionEligibleFilter,
    status: "ACTIVE",
  };
  if (fromToRange) retainedFilter.lastLoginAt = fromToRange;
  else retainedFilter.lastLoginAt = { $ne: null };

  const universityScope: Record<string, unknown> = {
    ...deletedFilter,
  };
  if (universityId) universityScope._id = universityId;

  const growthDateFilter = fromToRange ? { createdAt: fromToRange } : {};

  const [
    totalUsers,
    activeUsers,
    dailyActiveUsers,
    weeklyActiveUsers,
    monthlyActiveUsers,
    newRegistrations,
    eligibleUsers,
    retainedUsers,
    usersByRole,
    registrationsByMonth,
    totalUniversities,
    activeUniversities,
    newUniversities,
    universitiesByStatus,
    totalColleges,
    activeColleges,
    newColleges,
    collegesByStatus,
    totalDepartments,
    activeDepartments,
    newDepartments,
    departmentsByStatus,
  ] = await Promise.all([
    UserModel.countDocuments(userScope),
    UserModel.countDocuments({ ...userScope, status: "ACTIVE" }),
    UserModel.countDocuments(activeSinceFilter(userScope, dailySince)),
    UserModel.countDocuments(activeSinceFilter(userScope, weeklySince)),
    UserModel.countDocuments(activeSinceFilter(userScope, monthlySince)),
    UserModel.countDocuments(registrationFilter),
    UserModel.countDocuments(retentionEligibleFilter),
    UserModel.countDocuments(retainedFilter),
    UserModel.aggregate([
      { $match: userScope },
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    UserModel.aggregate([
      { $match: registrationFilter },
      {
        $group: {
          _id: monthKeyExpression("createdAt"),
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    UniversityModel.countDocuments(universityScope),
    UniversityModel.countDocuments({ ...universityScope, status: "ACTIVE" }),
    UniversityModel.countDocuments({ ...universityScope, ...growthDateFilter }),
    UniversityModel.aggregate([
      { $match: universityScope },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    CollegeModel.countDocuments(collegeScope),
    CollegeModel.countDocuments({ ...collegeScope, status: "ACTIVE" }),
    CollegeModel.countDocuments({ ...collegeScope, ...growthDateFilter }),
    CollegeModel.aggregate([
      { $match: collegeScope },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    DepartmentModel.countDocuments(departmentScope),
    DepartmentModel.countDocuments({ ...departmentScope, status: "ACTIVE" }),
    DepartmentModel.countDocuments({ ...departmentScope, ...growthDateFilter }),
    DepartmentModel.aggregate([
      { $match: departmentScope },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const retentionRate =
    eligibleUsers > 0 ? Number(((retainedUsers / eligibleUsers) * 100).toFixed(2)) : 0;

  await writeAuditLog({
    actorId: actor.id,
    universityId: universityId ?? null,
    action: "EXECUTIVE_ANALYTICS_VIEWED",
    entityType: "executive_analytics",
    metadata: { filters },
  });

  return {
    filters: {
      universityId: universityId ?? null,
      collegeId: filters.collegeId ?? null,
      departmentId: filters.departmentId ?? null,
      from: filters.from?.toISOString() ?? null,
      to: filters.to?.toISOString() ?? null,
    },
    usage: {
      totalUsers,
      activeUsers,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      newRegistrations,
      usersByRole: normalizeCounts(usersByRole, "role"),
      registrationsByMonth: registrationsByMonth.map((item) => ({
        month: String(item._id),
        count: Number(item.count ?? 0),
      })),
    },
    retention: {
      eligibleUsers,
      retainedUsers,
      retentionRate,
    },
    growth: {
      universities: {
        total: totalUniversities,
        active: activeUniversities,
        new: newUniversities,
        byStatus: normalizeCounts(universitiesByStatus, "status"),
      },
      colleges: {
        total: totalColleges,
        active: activeColleges,
        new: newColleges,
        byStatus: normalizeCounts(collegesByStatus, "status"),
      },
      departments: {
        total: totalDepartments,
        active: activeDepartments,
        new: newDepartments,
        byStatus: normalizeCounts(departmentsByStatus, "status"),
      },
    },
  };
}
