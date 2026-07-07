import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

import {
  metadataField,
  tenantLifecycleFields,
  visibilityField,
} from "@/lib/db/models/model-helpers";

const mediaAssetSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    caption: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    summary: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    coverImageUrl: { type: String, default: null, trim: true },
    coverImage: { type: String, default: null, trim: true },
    projectStatus: {
      type: String,
      enum: ["IDEA", "IN_PROGRESS", "COMPLETED", "ARCHIVED"],
      default: "IDEA",
      index: true,
    },
    category: { type: String, required: true, trim: true, index: true },
    techStack: { type: [String], default: [], index: true },
    media: { type: [mediaAssetSchema], default: [] },
    tags: { type: [String], default: [], index: true },
    skills: { type: [String], default: [], index: true },
    teamMemberIds: { type: [String], default: [], index: true },
    supervisorId: { type: String, default: null, index: true },
    repositoryUrl: { type: String, default: null, trim: true },
    demoUrl: { type: String, default: null, trim: true },
    projectUrl: { type: String, default: null, trim: true },
    visibility: {
      type: String,
      enum: [
        "PUBLIC",
        "UNIVERSITY",
        "COLLEGE",
        "DEPARTMENT",
        "CUSTOM_ROLES",
        "PRIVATE",
      ],
      default: "UNIVERSITY",
      index: true,
    },
    roleVisibility: { type: [String], default: [], index: true },
    featured: { type: Boolean, default: false, index: true },
    starCount: { type: Number, default: 0, index: true },
    viewCount: { type: Number, default: 0, index: true },
    shareCount: { type: Number, default: 0, index: true },
    favoriteCount: { type: Number, default: 0, index: true },
    savedCount: { type: Number, default: 0, index: true },
    documentCount: { type: Number, default: 0 },
    featuredAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "HIDDEN"],
      default: "DRAFT",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "projects", timestamps: true },
);

const projectMemberSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["OWNER", "CO_OWNER", "CONTRIBUTOR", "MENTOR"],
      required: true,
      index: true,
    },
    joinedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "project_members", timestamps: true },
);

const projectStarSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
  },
  { collection: "project_stars", timestamps: true },
);

const projectFavoriteSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["FAVORITE", "SAVED"],
      required: true,
      index: true,
    },
  },
  { collection: "project_favorites", timestamps: true },
);

const projectViewSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    viewerId: { type: String, default: null, index: true },
    anonymousId: { type: String, default: null, index: true },
    visitorType: {
      type: String,
      enum: ["AUTHENTICATED", "PUBLIC"],
      default: "AUTHENTICATED",
      index: true,
    },
    source: { type: String, default: null, trim: true, index: true },
    viewedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "project_views", timestamps: true },
);

const projectEngagementSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    userId: { type: String, default: null, index: true },
    anonymousId: { type: String, default: null, index: true },
    engagementType: {
      type: String,
      enum: ["LINK_CLICK", "DOCUMENT_CLICK", "REPOSITORY_CLICK", "SHARE"],
      required: true,
      index: true,
    },
    linkId: { type: String, default: null, index: true },
    url: { type: String, default: null, trim: true },
    referrer: { type: String, default: null, trim: true, index: true },
    occurredAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "project_engagements", timestamps: true },
);

const projectDocumentSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    uploadedById: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    fileType: { type: String, default: null, trim: true, index: true },
    fileSize: { type: Number, default: null },
    downloadCount: { type: Number, default: 0 },
    visibility: visibilityField,
    status: {
      type: String,
      enum: ["ACTIVE", "HIDDEN", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "project_documents", timestamps: true },
);

const projectAnalyticsSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    views: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    publicViews: { type: Number, default: 0 },
    publicUniqueViews: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    linkClicks: { type: Number, default: 0 },
    documentClicks: { type: Number, default: 0 },
    repositoryClicks: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    documentDownloads: { type: Number, default: 0 },
    referrers: { type: Schema.Types.Mixed, default: null },
    metadata: metadataField,
  },
  { collection: "project_analytics", timestamps: true },
);

projectSchema.index({ universityId: 1, slug: 1 }, { unique: true });
projectSchema.index({ universityId: 1, departmentId: 1, status: 1 });
projectSchema.index({ universityId: 1, visibility: 1, status: 1 });
projectSchema.index({ universityId: 1, category: 1, projectStatus: 1 });
projectSchema.index({ universityId: 1, featured: 1, featuredAt: -1 });
projectSchema.index({ universityId: 1, starCount: -1, viewCount: -1 });
projectSchema.index({ universityId: 1, status: 1, viewCount: -1 });
projectSchema.index({ universityId: 1, status: 1, starCount: -1 });
projectSchema.index({ universityId: 1, status: 1, shareCount: -1 });
projectSchema.index({ universityId: 1, status: 1, createdAt: -1 });
projectSchema.index({ collegeId: 1, status: 1, starCount: -1 });
projectSchema.index({ departmentId: 1, status: 1, starCount: -1 });
projectSchema.index({
  title: "text",
  summary: "text",
  shortDescription: "text",
  description: "text",
  tags: "text",
  skills: "text",
  techStack: "text",
});
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ universityId: 1, userId: 1 });
projectStarSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectStarSchema.index({ universityId: 1, projectId: 1 });
projectStarSchema.index({ projectId: 1, createdAt: -1 });
projectFavoriteSchema.index(
  { projectId: 1, userId: 1, type: 1 },
  { unique: true },
);
projectFavoriteSchema.index({ universityId: 1, userId: 1, type: 1 });
projectFavoriteSchema.index({ projectId: 1, type: 1, createdAt: -1 });
projectViewSchema.index({ projectId: 1, viewedAt: -1 });
projectViewSchema.index({ universityId: 1, viewedAt: -1 });
projectViewSchema.index({ projectId: 1, viewerId: 1, viewedAt: -1 });
projectViewSchema.index({ projectId: 1, anonymousId: 1, viewedAt: -1 });
projectViewSchema.index({ projectId: 1, visitorType: 1, viewedAt: -1 });
projectEngagementSchema.index({
  projectId: 1,
  engagementType: 1,
  occurredAt: -1,
});
projectEngagementSchema.index({
  universityId: 1,
  engagementType: 1,
  occurredAt: -1,
});
projectDocumentSchema.index({ projectId: 1, visibility: 1, status: 1 });
projectAnalyticsSchema.index({ projectId: 1, date: 1 }, { unique: true });
projectAnalyticsSchema.index({ universityId: 1, date: -1 });

export type ProjectDocument = InferSchemaType<typeof projectSchema>;
export type ProjectMemberDocument = InferSchemaType<typeof projectMemberSchema>;
export type ProjectStarDocument = InferSchemaType<typeof projectStarSchema>;
export type ProjectFavoriteDocument = InferSchemaType<
  typeof projectFavoriteSchema
>;
export type ProjectViewDocument = InferSchemaType<typeof projectViewSchema>;
export type ProjectEngagementDocument = InferSchemaType<
  typeof projectEngagementSchema
>;
export type ProjectFileDocument = InferSchemaType<typeof projectDocumentSchema>;
export type ProjectAnalyticsDocument = InferSchemaType<
  typeof projectAnalyticsSchema
>;

export const ProjectModel =
  models.Project || model<ProjectDocument>("Project", projectSchema);
export const ProjectMemberModel =
  models.ProjectMember ||
  model<ProjectMemberDocument>("ProjectMember", projectMemberSchema);
export const ProjectStarModel =
  models.ProjectStar ||
  model<ProjectStarDocument>("ProjectStar", projectStarSchema);
export const ProjectFavoriteModel =
  models.ProjectFavorite ||
  model<ProjectFavoriteDocument>("ProjectFavorite", projectFavoriteSchema);
export const ProjectViewModel =
  models.ProjectView ||
  model<ProjectViewDocument>("ProjectView", projectViewSchema);
export const ProjectEngagementModel =
  models.ProjectEngagement ||
  model<ProjectEngagementDocument>(
    "ProjectEngagement",
    projectEngagementSchema,
  );
export const ProjectDocumentModel =
  models.ProjectDocument ||
  model<ProjectFileDocument>("ProjectDocument", projectDocumentSchema);
export const ProjectAnalyticsModel =
  models.ProjectAnalytics ||
  model<ProjectAnalyticsDocument>("ProjectAnalytics", projectAnalyticsSchema);
