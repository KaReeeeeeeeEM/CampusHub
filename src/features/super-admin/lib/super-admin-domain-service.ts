import type { Model } from "@/lib/db/model-compat";

import { requireApiRole } from "@/lib/auth/authorization";
import { connectPostgres } from "@/lib/db/postgres";
import {
  AchievementModel,
  ActivityFeedModel,
  ApplicationModel,
  BadgeModel,
  MentorshipModel,
  MentorshipRequestModel,
  MentorshipSessionModel,
  NotificationModel,
  OpportunityModel,
  OrderModel,
  OrderRequestModel,
  ProductModel,
  ProjectAnalyticsModel,
  ProjectDocumentModel,
  ProjectModel,
  RewardEventModel,
  ShopModel,
  UniversityModel,
  UserAchievementModel,
  UserBadgeModel,
  UserModel,
  UserXpProfileModel,
  XpTransactionModel,
} from "@/lib/db/models";

export type SuperAdminDomainMetric = {
  label: string;
  value: number;
  description: string;
};

export type SuperAdminDomainRecord = {
  id: string;
  title: string;
  subtitle: string;
  universityName: string;
  category: string;
  status: string;
  date: string | null;
};

export type SuperAdminProjectShowcaseRecord = {
  id: string;
  title: string;
  summary: string;
  description: string;
  universityName: string;
  category: string;
  status: string;
  projectStatus: string;
  visibility: string;
  coverImage: string | null;
  repositoryUrl: string | null;
  demoUrl: string | null;
  projectUrl: string | null;
  tags: string[];
  techStack: string[];
  featured: boolean;
  views: number;
  stars: number;
  shares: number;
  documents: number;
  updatedAt: string | null;
};

export type SuperAdminDomainTab = {
  id: string;
  label: string;
  description: string;
  metrics: SuperAdminDomainMetric[];
  records: SuperAdminDomainRecord[];
};

export type SuperAdminDomainWorkspace = {
  domain: "projects" | "marketplace" | "career" | "gamification" | "notifications";
  defaultTab: string;
  tabs: SuperAdminDomainTab[];
  projects?: SuperAdminProjectShowcaseRecord[];
};

type QueryModel = Model<unknown>;

type ModuleConfig = {
  id: string;
  label: string;
  description: string;
  model: QueryModel;
  metrics: Array<{
    label: string;
    description: string;
    filter?: Record<string, unknown>;
  }>;
  record: {
    title: string[];
    subtitle: string[];
    category: string[];
    status: string[];
    date: string[];
  };
  preferUserTitle?: boolean;
  statusLabel?: (item: Record<string, unknown>) => string | null;
  recordSort?: Record<string, 1 | -1>;
  deriveDisplayedRanks?: boolean;
};

const archivedFilter = { status: { $ne: "ARCHIVED" } };
const deletedFilter = { deletedAt: null };

function readString(
  item: Record<string, unknown>,
  fields: string[],
  fallback = "Not set",
) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return value.toLocaleString();
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
  }

  return fallback;
}

function readDate(item: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string" && value.trim()) return value;
  }

  return null;
}

function readStringArray(item: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (Array.isArray(value)) {
      return value.filter((entry): entry is string => typeof entry === "string");
    }
  }

  return [];
}

function readNumber(item: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function readOptionalNumber(item: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function readBoolean(item: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = item[field];

    if (typeof value === "boolean") return value;
  }

  return false;
}

function universityNameFor(
  item: Record<string, unknown>,
  universities: Map<string, string>,
) {
  const universityId = readString(item, ["universityId"], "");
  return universityId ? universities.get(universityId) ?? "Unknown university" : "Platform-wide";
}

function userDisplayName(user: Record<string, unknown>) {
  const fullName = [user.firstName, user.lastName]
    .filter((name): name is string => typeof name === "string" && Boolean(name.trim()))
    .join(" ");

  return fullName || readString(user, ["name", "username", "email"], "Unknown user");
}

function userNameFor(item: Record<string, unknown>, users: Map<string, string>) {
  const userId = readString(
    item,
    ["userId", "recipientId", "actorId", "studentId", "mentorId", "menteeId"],
    "",
  );

  if (!userId) return null;
  return users.get(userId) ?? "Unknown user";
}

function withDisplayedRanks(records: Record<string, unknown>[]) {
  const counters = new Map<string, number>();

  return records.map((record) => {
    if (readOptionalNumber(record, ["rank"])) return record;

    const universityId = readString(record, ["universityId"], "platform");
    const nextRank = (counters.get(universityId) ?? 0) + 1;
    counters.set(universityId, nextRank);

    return {
      ...record,
      rank: nextRank,
    };
  });
}

function serializeProjectShowcaseRecord(
  project: Record<string, unknown>,
  universities: Map<string, string>,
): SuperAdminProjectShowcaseRecord {
  const title = readString(project, ["title", "name"], "Untitled project");

  return {
    id: readString(project, ["_id", "id"]),
    title,
    summary: readString(
      project,
      ["summary", "shortDescription", "description"],
      "No project summary provided.",
    ),
    description: readString(
      project,
      ["description", "summary", "shortDescription"],
      "No project description provided.",
    ),
    universityName: universityNameFor(project, universities),
    category: readString(project, ["category"], "General"),
    status: readString(project, ["status"], "Unknown"),
    projectStatus: readString(project, ["projectStatus"], "Unknown"),
    visibility: readString(project, ["visibility"], "Unknown"),
    coverImage: readString(project, ["coverImageUrl", "coverImage"], "") || null,
    repositoryUrl: readString(project, ["repositoryUrl"], "") || null,
    demoUrl: readString(project, ["demoUrl"], "") || null,
    projectUrl: readString(project, ["projectUrl"], "") || null,
    tags: readStringArray(project, ["tags"]),
    techStack: readStringArray(project, ["techStack", "skills"]),
    featured: readBoolean(project, ["featured"]),
    views: readNumber(project, ["viewCount", "views"]),
    stars: readNumber(project, ["starCount", "stars"]),
    shares: readNumber(project, ["shareCount", "shares"]),
    documents: readNumber(project, ["documentCount"]),
    updatedAt: readDate(project, ["updatedAt", "createdAt"]),
  };
}

async function buildTab(
  config: ModuleConfig,
  universities: Map<string, string>,
  users: Map<string, string>,
): Promise<SuperAdminDomainTab> {
  const [metrics, rawRecords] = await Promise.all([
    Promise.all(
      config.metrics.map(async (metric) => ({
        label: metric.label,
        description: metric.description,
        value: await config.model.countDocuments(metric.filter ?? {}),
      })),
    ),
    config.model
      .find({})
      .sort(config.recordSort ?? { updatedAt: -1, createdAt: -1 })
      .limit(12)
      .lean(),
  ]);
  const records = config.deriveDisplayedRanks
    ? withDisplayedRanks(rawRecords as Record<string, unknown>[])
    : rawRecords;

  return {
    id: config.id,
    label: config.label,
    description: config.description,
    metrics,
    records: records.map((record) => {
      const item = record as Record<string, unknown>;
      const userTitle = config.preferUserTitle ? userNameFor(item, users) : null;
      const status = config.statusLabel?.(item);

      return {
        id: readString(item, ["_id", "id"]),
        title: userTitle ?? readString(item, config.record.title, "Untitled"),
        subtitle: readString(item, config.record.subtitle, "No description"),
        universityName: universityNameFor(item, universities),
        category: readString(item, config.record.category, "General"),
        status: status ?? readString(item, config.record.status, "Unknown"),
        date: readDate(item, config.record.date),
      };
    }),
  };
}

const projectTabs: ModuleConfig[] = [
  {
    id: "projects",
    label: "Projects",
    description: "Student and alumni showcase projects across universities.",
    model: ProjectModel,
    metrics: [
      { label: "Projects", description: "All project records." },
      {
        label: "Published",
        description: "Visible project records.",
        filter: { status: "PUBLISHED" },
      },
      {
        label: "Featured",
        description: "Projects marked as featured.",
        filter: { featured: true },
      },
      { label: "Archived", description: "Archived project records.", filter: { status: "ARCHIVED" } },
    ],
    record: {
      title: ["title", "name"],
      subtitle: ["summary", "shortDescription", "description"],
      category: ["category", "projectStatus"],
      status: ["status", "projectStatus"],
      date: ["updatedAt", "createdAt"],
    },
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Project analytics snapshots and engagement totals.",
    model: ProjectAnalyticsModel,
    metrics: [
      { label: "Analytics Rows", description: "Stored project analytics rows." },
      { label: "Public Views", description: "Rows with public views.", filter: { publicViews: { $gt: 0 } } },
      { label: "Stars", description: "Rows with star activity.", filter: { stars: { $gt: 0 } } },
      { label: "Shares", description: "Rows with share activity.", filter: { shares: { $gt: 0 } } },
    ],
    record: {
      title: ["projectId", "_id"],
      subtitle: ["referrer"],
      category: ["date"],
      status: ["status"],
      date: ["date", "updatedAt", "createdAt"],
    },
  },
  {
    id: "documents",
    label: "Documents",
    description: "Documents attached to project showcase records.",
    model: ProjectDocumentModel,
    metrics: [
      { label: "Documents", description: "All uploaded project documents." },
      { label: "Active", description: "Active project documents.", filter: { status: "ACTIVE" } },
      { label: "Hidden", description: "Hidden project documents.", filter: { status: "HIDDEN" } },
      { label: "Archived", description: "Archived project documents.", filter: { status: "ARCHIVED" } },
    ],
    record: {
      title: ["title", "fileUrl"],
      subtitle: ["fileType", "projectId"],
      category: ["visibility", "fileType"],
      status: ["status"],
      date: ["updatedAt", "createdAt"],
    },
  },
];

const marketplaceTabs: ModuleConfig[] = [
  {
    id: "shops",
    label: "Shops",
    description: "Marketplace shops created by campus sellers.",
    model: ShopModel,
    metrics: [
      { label: "Shops", description: "All shop records.", filter: archivedFilter },
      { label: "Active", description: "Active shops.", filter: { status: "ACTIVE" } },
      { label: "Verified", description: "Verified shops.", filter: { verified: true } },
      { label: "Paused", description: "Paused shops.", filter: { status: "PAUSED" } },
    ],
    record: {
      title: ["name"],
      subtitle: ["description", "contactEmail"],
      category: ["category"],
      status: ["status"],
      date: ["updatedAt", "createdAt"],
    },
  },
  {
    id: "products",
    label: "Products",
    description: "Marketplace products and services listed by sellers.",
    model: ProductModel,
    metrics: [
      { label: "Products", description: "All active product records.", filter: archivedFilter },
      { label: "Active", description: "Active listings.", filter: { status: "ACTIVE" } },
      { label: "Services", description: "Service listings.", filter: { productType: "SERVICE" } },
      { label: "Featured", description: "Featured listings.", filter: { isFeatured: true } },
    ],
    record: {
      title: ["title", "name"],
      subtitle: ["description"],
      category: ["category", "productType"],
      status: ["status", "availability"],
      date: ["updatedAt", "createdAt"],
    },
  },
  {
    id: "orders",
    label: "Orders",
    description: "Marketplace orders and commerce fulfillment records.",
    model: OrderModel,
    metrics: [
      { label: "Orders", description: "All order records." },
      { label: "Pending", description: "Pending orders.", filter: { fulfillmentStatus: "PENDING" } },
      { label: "Delivered", description: "Delivered orders.", filter: { fulfillmentStatus: "DELIVERED" } },
      { label: "Paid", description: "Paid orders.", filter: { paymentStatus: "PAID" } },
    ],
    record: {
      title: ["_id"],
      subtitle: ["notes", "buyerId"],
      category: ["paymentStatus"],
      status: ["fulfillmentStatus", "paymentStatus"],
      date: ["updatedAt", "createdAt"],
    },
  },
  {
    id: "requests",
    label: "Order Requests",
    description: "Buyer requests sent to sellers before order confirmation.",
    model: OrderRequestModel,
    metrics: [
      { label: "Requests", description: "All order request records." },
      { label: "Pending", description: "Pending order requests.", filter: { status: "PENDING" } },
      { label: "Accepted", description: "Accepted order requests.", filter: { status: "ACCEPTED" } },
      { label: "Completed", description: "Completed order requests.", filter: { status: "COMPLETED" } },
    ],
    record: {
      title: ["productId", "_id"],
      subtitle: ["message", "buyerId"],
      category: ["deliveryPreference"],
      status: ["status"],
      date: ["updatedAt", "createdAt"],
    },
  },
];

const careerTabs: ModuleConfig[] = [
  {
    id: "opportunities",
    label: "Opportunities",
    description: "Career opportunities published by employers.",
    model: OpportunityModel,
    metrics: [
      { label: "Opportunities", description: "All opportunity records.", filter: archivedFilter },
      { label: "Published", description: "Published opportunities.", filter: { status: "PUBLISHED" } },
      { label: "Drafts", description: "Draft opportunities.", filter: { status: "DRAFT" } },
      { label: "Closed", description: "Closed opportunities.", filter: { status: "CLOSED" } },
    ],
    record: {
      title: ["title"],
      subtitle: ["employerName", "description"],
      category: ["opportunityType", "workType"],
      status: ["status"],
      date: ["updatedAt", "createdAt"],
    },
  },
  {
    id: "applications",
    label: "Applications",
    description: "Applications submitted to career opportunities.",
    model: ApplicationModel,
    metrics: [
      { label: "Applications", description: "All submitted applications." },
      { label: "Submitted", description: "Submitted applications.", filter: { status: "SUBMITTED" } },
      { label: "Shortlisted", description: "Shortlisted applications.", filter: { status: "SHORTLISTED" } },
      { label: "Hired", description: "Hired applications.", filter: { status: "HIRED" } },
    ],
    record: {
      title: ["opportunityId", "_id"],
      subtitle: ["studentId", "applicantId"],
      category: ["status"],
      status: ["status"],
      date: ["submittedAt", "updatedAt", "createdAt"],
    },
  },
  {
    id: "mentorship",
    label: "Mentorship",
    description: "Mentorship offers, requests, and sessions.",
    model: MentorshipModel,
    metrics: [
      { label: "Mentorships", description: "All mentorship records." },
      { label: "Active", description: "Active mentorships.", filter: { status: "ACTIVE" } },
      { label: "Requests", description: "Mentorship request records." },
      { label: "Sessions", description: "Mentorship session records." },
    ],
    record: {
      title: ["title", "_id"],
      subtitle: ["description", "mentorId"],
      category: ["category", "status"],
      status: ["status"],
      date: ["updatedAt", "createdAt"],
    },
  },
];

const gamificationTabs: ModuleConfig[] = [
  {
    id: "badges",
    label: "Badges",
    description: "Badge definitions and earned user badges.",
    model: BadgeModel,
    metrics: [
      { label: "Badges", description: "All badge definitions." },
      { label: "Active", description: "Active badge definitions.", filter: { status: "ACTIVE" } },
      { label: "Global", description: "Global badge definitions.", filter: { isGlobal: true } },
      { label: "Earned", description: "User badge records." },
    ],
    record: {
      title: ["name"],
      subtitle: ["description"],
      category: ["category", "rarity"],
      status: ["status"],
      date: ["updatedAt", "createdAt"],
    },
  },
  {
    id: "achievements",
    label: "Achievements",
    description: "Achievement definitions and user achievement progress.",
    model: AchievementModel,
    metrics: [
      { label: "Achievements", description: "All achievement definitions." },
      { label: "Active", description: "Active achievement definitions.", filter: { status: "ACTIVE" } },
      { label: "Global", description: "Global achievements.", filter: { isGlobal: true } },
      { label: "Completed", description: "Completed user achievements.", filter: { status: "COMPLETED" } },
    ],
    record: {
      title: ["name"],
      subtitle: ["description"],
      category: ["visibility"],
      status: ["status"],
      date: ["updatedAt", "createdAt"],
    },
  },
  {
    id: "xp",
    label: "XP Leaderboards",
    description: "XP balances, transactions, and leaderboard activity.",
    model: UserXpProfileModel,
    metrics: [
      { label: "XP Profiles", description: "User XP profiles." },
      { label: "Ranked", description: "Profiles with ranks.", filter: { rank: { $ne: null } } },
      { label: "Transactions", description: "XP transaction records." },
      { label: "Awards", description: "Award XP transactions.", filter: { transactionType: "AWARD" } },
    ],
    record: {
      title: ["userId", "_id"],
      subtitle: ["totalXp", "weeklyXp"],
      category: ["level"],
      status: ["rank"],
      date: ["lastActivityAt", "updatedAt", "createdAt"],
    },
    preferUserTitle: true,
    recordSort: { totalXp: -1, weeklyXp: -1, updatedAt: 1 },
    deriveDisplayedRanks: true,
    statusLabel: (item) => {
      const rank = readOptionalNumber(item, ["rank"]);
      return rank ? `Rank #${rank}` : "Unranked";
    },
  },
  {
    id: "rewards",
    label: "Reward Events",
    description: "Celebration and reward events shown to users.",
    model: RewardEventModel,
    metrics: [
      { label: "Reward Events", description: "All reward event records." },
      { label: "Unseen", description: "Unseen reward events.", filter: { status: "UNSEEN" } },
      { label: "Seen", description: "Seen reward events.", filter: { status: "SEEN" } },
      { label: "Archived", description: "Archived reward events.", filter: { status: "ARCHIVED" } },
    ],
    record: {
      title: ["title"],
      subtitle: ["description", "trigger"],
      category: ["trigger", "animationType"],
      status: ["status"],
      date: ["updatedAt", "createdAt"],
    },
  },
];

const notificationTabs: ModuleConfig[] = [
  {
    id: "notifications",
    label: "Notifications",
    description: "In-app notifications delivered across CampusHub.",
    model: NotificationModel,
    metrics: [
      { label: "Notifications", description: "All notification records.", filter: deletedFilter },
      { label: "Unread", description: "Unread notifications.", filter: { ...deletedFilter, status: "UNREAD" } },
      { label: "High Priority", description: "High or urgent notifications.", filter: { ...deletedFilter, priority: { $in: ["HIGH", "URGENT"] } } },
      { label: "Archived", description: "Archived notifications.", filter: { ...deletedFilter, status: "ARCHIVED" } },
    ],
    record: {
      title: ["title"],
      subtitle: ["message", "body"],
      category: ["category", "type"],
      status: ["status", "priority"],
      date: ["updatedAt", "createdAt"],
    },
  },
  {
    id: "activity",
    label: "Activity Feed",
    description: "Activity feed events used for engagement surfaces.",
    model: ActivityFeedModel,
    metrics: [
      { label: "Activities", description: "All activity feed records." },
      { label: "Marketplace", description: "Marketplace activities.", filter: { category: "MARKETPLACE" } },
      { label: "Showcase", description: "Showcase activities.", filter: { category: "SHOWCASE" } },
      { label: "Career", description: "Career activities.", filter: { category: "CAREER" } },
    ],
    record: {
      title: ["title"],
      subtitle: ["description", "verb"],
      category: ["category", "activityType"],
      status: ["visibility"],
      date: ["updatedAt", "createdAt"],
    },
  },
  {
    id: "rewards",
    label: "Kibo Rewards",
    description: "Reward notifications that can trigger Kibo celebrations.",
    model: RewardEventModel,
    metrics: [
      { label: "Reward Events", description: "All reward event records." },
      { label: "Unseen", description: "Unseen reward events.", filter: { status: "UNSEEN" } },
      { label: "Badge Events", description: "Badge reward events.", filter: { trigger: "BADGE_EARNED" } },
      { label: "Milestones", description: "Milestone reward events.", filter: { trigger: "MILESTONE_REACHED" } },
    ],
    record: {
      title: ["title"],
      subtitle: ["description", "trigger"],
      category: ["trigger"],
      status: ["status"],
      date: ["updatedAt", "createdAt"],
    },
  },
];

const domainConfigs = {
  projects: projectTabs,
  marketplace: marketplaceTabs,
  career: careerTabs,
  gamification: gamificationTabs,
  notifications: notificationTabs,
} as const;

const slugToDomain = {
  projects: { domain: "projects", tab: "projects" },
  "project-analytics": { domain: "projects", tab: "analytics" },
  marketplace: { domain: "marketplace", tab: "shops" },
  shops: { domain: "marketplace", tab: "shops" },
  products: { domain: "marketplace", tab: "products" },
  "marketplace-analytics": { domain: "marketplace", tab: "products" },
  opportunities: { domain: "career", tab: "opportunities" },
  mentorship: { domain: "career", tab: "mentorship" },
  "career-analytics": { domain: "career", tab: "applications" },
  badges: { domain: "gamification", tab: "badges" },
  achievements: { domain: "gamification", tab: "achievements" },
  "xp-leaderboards": { domain: "gamification", tab: "xp" },
  notifications: { domain: "notifications", tab: "notifications" },
} as const;

export function isSuperAdminDomainSlug(slug: string) {
  return slug in slugToDomain;
}

export async function getSuperAdminDomainWorkspace(
  slug: string,
): Promise<SuperAdminDomainWorkspace | null> {
  const route = slugToDomain[slug as keyof typeof slugToDomain];
  if (!route) return null;

  await requireApiRole(["SUPER_ADMIN"]);
  await connectPostgres();

  const [universities, users] = await Promise.all([
    UniversityModel.find({ deletedAt: null }).lean(),
    UserModel.find({})
      .select("_id firstName lastName name username email")
      .lean(),
  ]);
  const universityNames = new Map(
    universities.map((university) => [
      String(university._id),
      String(university.name),
    ]),
  );
  const userNames = new Map(
    users.map((user) => [
      String(user._id),
      userDisplayName(user as Record<string, unknown>),
    ]),
  );
  const tabs = await Promise.all(
    domainConfigs[route.domain].map((config) =>
      buildTab(config, universityNames, userNames),
    ),
  );
  const projectRecords =
    route.domain === "projects"
      ? (
          await ProjectModel.find({})
            .sort({ featured: -1, updatedAt: -1, createdAt: -1 })
            .limit(100)
            .lean()
        ).map((project) =>
          serializeProjectShowcaseRecord(
            project as Record<string, unknown>,
            universityNames,
          ),
        )
      : undefined;

  if (route.domain === "career") {
    const mentorshipTab = tabs.find((tab) => tab.id === "mentorship");
    if (mentorshipTab) {
      const [requests, sessions] = await Promise.all([
        MentorshipRequestModel.countDocuments({}),
        MentorshipSessionModel.countDocuments({}),
      ]);
      mentorshipTab.metrics = mentorshipTab.metrics.map((metric) => {
        if (metric.label === "Requests") return { ...metric, value: requests };
        if (metric.label === "Sessions") return { ...metric, value: sessions };
        return metric;
      });
    }
  }

  if (route.domain === "gamification") {
    const badgesTab = tabs.find((tab) => tab.id === "badges");
    const achievementsTab = tabs.find((tab) => tab.id === "achievements");
    const xpTab = tabs.find((tab) => tab.id === "xp");

    const [earnedBadges, completedAchievements, xpTransactions, xpAwards] =
      await Promise.all([
        UserBadgeModel.countDocuments({}),
        UserAchievementModel.countDocuments({ status: "COMPLETED" }),
        XpTransactionModel.countDocuments({}),
        XpTransactionModel.countDocuments({ transactionType: "AWARD" }),
      ]);

    if (badgesTab) {
      badgesTab.metrics = badgesTab.metrics.map((metric) =>
        metric.label === "Earned" ? { ...metric, value: earnedBadges } : metric,
      );
    }
    if (achievementsTab) {
      achievementsTab.metrics = achievementsTab.metrics.map((metric) =>
        metric.label === "Completed"
          ? { ...metric, value: completedAchievements }
          : metric,
      );
    }
    if (xpTab) {
      xpTab.metrics = xpTab.metrics.map((metric) => {
        if (metric.label === "Transactions") return { ...metric, value: xpTransactions };
        if (metric.label === "Awards") return { ...metric, value: xpAwards };
        return metric;
      });
    }
  }

  return {
    domain: route.domain,
    defaultTab: route.tab,
    tabs,
    projects: projectRecords,
  };
}
