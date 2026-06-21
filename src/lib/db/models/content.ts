import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  attachmentSchema,
  metadataField,
  targetAudienceSchema,
  tenantLifecycleFields,
  tenantLifecycleFieldsWithoutCreator,
  visibilityField,
} from "@/lib/db/models/model-helpers";

const announcementSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    collegeIds: { type: [String], default: [], index: true },
    departmentIds: { type: [String], default: [], index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    content: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    summary: { type: String, default: null, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    category: {
      type: String,
      enum: [
        "ACADEMICS",
        "SPORTS",
        "OFFERS",
        "CLUBS",
        "LEADERSHIP",
        "CAREER",
        "HEALTH",
        "GENERAL",
        "OTHER",
      ],
      required: true,
      trim: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
      index: true,
    },
    targetAudience: { type: targetAudienceSchema, default: () => ({}) },
    publishedAt: { type: Date, default: null, index: true },
    expiresAt: { type: Date, default: null, index: true },
    pinnedUntil: { type: Date, default: null, index: true },
    visibility: {
      type: String,
      enum: [
        "ALL_USERS",
        "STUDENTS",
        "TEACHERS",
        "ALUMNI",
        "EMPLOYERS",
        "SPECIFIC_COLLEGES",
        "SPECIFIC_DEPARTMENTS",
      ],
      default: "ALL_USERS",
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    createdBy: { type: String, required: true, index: true },
    totalViews: { type: Number, default: 0, min: 0 },
    uniqueViews: { type: Number, default: 0, min: 0 },
    audienceReach: { type: Number, default: 0, min: 0 },
    readPercentage: { type: Number, default: 0, min: 0, max: 100 },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "announcements", timestamps: true },
);

const announcementViewSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    announcementId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    viewedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "announcement_views", timestamps: true },
);

const eventSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    collegeIds: { type: [String], default: [], index: true },
    departmentIds: { type: [String], default: [], index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    eventType: {
      type: String,
      enum: [
        "ACADEMIC",
        "SPORTS",
        "CLUB",
        "WORKSHOP",
        "HACKATHON",
        "SEMINAR",
        "CAREER",
        "SOCIAL",
        "OTHER",
      ],
      required: true,
      trim: true,
      index: true,
    },
    organizerId: { type: String, required: true, index: true },
    venue: { type: String, required: true, trim: true },
    locationId: { type: String, default: null, index: true },
    locationName: { type: String, default: null, trim: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    onlineUrl: { type: String, default: null, trim: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    registrationDeadline: { type: Date, default: null, index: true },
    registrationRequired: { type: Boolean, default: false, index: true },
    capacity: { type: Number, default: null },
    currentAttendees: { type: Number, default: 0, min: 0 },
    registeredCount: { type: Number, default: 0 },
    waitlistCount: { type: Number, default: 0, min: 0 },
    checkedInCount: { type: Number, default: 0, min: 0 },
    allowWaitlist: { type: Boolean, default: true, index: true },
    bannerImage: { type: String, default: null, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    qrCode: { type: String, required: true, unique: true, index: true },
    targetAudience: { type: targetAudienceSchema, default: () => ({}) },
    visibility: {
      type: String,
      enum: [
        "ALL_USERS",
        "STUDENTS",
        "TEACHERS",
        "ALUMNI",
        "EMPLOYERS",
        "SPECIFIC_COLLEGES",
        "SPECIFIC_DEPARTMENTS",
      ],
      default: "ALL_USERS",
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "OPEN", "FULL", "ONGOING", "COMPLETED", "CANCELLED"],
      default: "DRAFT",
      index: true,
    },
    registrations: { type: Number, default: 0, min: 0 },
    attendance: { type: Number, default: 0, min: 0 },
    attendanceRate: { type: Number, default: 0, min: 0, max: 100 },
    dropOffRate: { type: Number, default: 0, min: 0, max: 100 },
    capacityUtilization: { type: Number, default: 0, min: 0, max: 100 },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "events", timestamps: true },
);

const eventAttendanceSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    joinedAt: { type: Date, default: Date.now, index: true },
    leftAt: { type: Date, default: null, index: true },
    checkedInAt: { type: Date, default: null, index: true },
    attendanceStatus: {
      type: String,
      enum: ["REGISTERED", "WAITLISTED", "CANCELLED", "CHECKED_IN", "NO_SHOW"],
      default: "REGISTERED",
      index: true,
    },
    checkedInBy: { type: String, default: null, index: true },
    metadata: metadataField,
  },
  { collection: "event_attendance", timestamps: true },
);

const almanacSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    academicYear: { type: String, default: null, trim: true, index: true },
    semester: { type: String, default: null, trim: true, index: true },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "almanacs", timestamps: true },
);

const almanacEventSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    academicYear: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    semester: { type: String, default: null, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    eventType: {
      type: String,
      enum: [
        "SEMESTER_START",
        "SEMESTER_END",
        "REGISTRATION",
        "EXAMINATION",
        "GRADUATION",
        "ORIENTATION",
        "HOLIDAY",
        "WORKSHOP",
        "GENERAL",
        "OTHER",
      ],
      required: true,
      trim: true,
      index: true,
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    isAllDay: { type: Boolean, default: true, index: true },
    visibility: {
      type: String,
      enum: ["ALL_USERS", "STUDENTS", "TEACHERS", "SPECIFIC_COLLEGES"],
      default: "ALL_USERS",
      index: true,
    },
    collegeIds: { type: [String], default: [], index: true },
    color: { type: String, default: "#2563eb", trim: true },
    createdBy: { type: String, required: true, index: true },
    reminders: {
      type: [
        {
          reminderId: { type: String, required: true },
          offsetDays: { type: Number, required: true, min: 0 },
          remindAt: { type: Date, required: true, index: true },
          label: { type: String, default: null, trim: true },
          sentAt: { type: Date, default: null },
        },
      ],
      default: [],
    },
    views: { type: Number, default: 0, min: 0 },
    uniqueViews: { type: Number, default: 0, min: 0 },
    reminderEngagement: { type: Number, default: 0, min: 0 },
    appliesTo: { type: targetAudienceSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "almanac_events", timestamps: true },
);

const almanacEventViewSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    almanacEventId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    viewedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "almanac_event_views", timestamps: true },
);

const almanacReminderEngagementSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    almanacEventId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    reminderId: { type: String, required: true, index: true },
    engagedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "almanac_reminder_engagements", timestamps: true },
);

const mapLocationSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        "ACADEMIC",
        "OFFICE",
        "HOSTEL",
        "LIBRARY",
        "CAFETERIA",
        "LABORATORY",
        "HEALTH",
        "SPORTS",
        "PARKING",
        "OTHER",
      ],
      required: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: null, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    coordinates: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    building: { type: String, default: null, trim: true },
    buildingCode: { type: String, default: null, trim: true, index: true },
    floor: { type: String, default: null, trim: true },
    room: { type: String, default: null, trim: true },
    openingHours: { type: Schema.Types.Mixed, default: null },
    contact: { type: Schema.Types.Mixed, default: null },
    contactInformation: { type: Schema.Types.Mixed, default: null },
    images: { type: [String], default: [] },
    createdBy: { type: String, required: true, index: true },
    views: { type: Number, default: 0, min: 0 },
    uniqueViews: { type: Number, default: 0, min: 0 },
    directionRequests: { type: Number, default: 0, min: 0 },
    navigation: { type: Schema.Types.Mixed, default: null },
    liveLocation: { type: Schema.Types.Mixed, default: null },
    marketplaceDelivery: {
      enabled: { type: Boolean, default: false },
      instructions: { type: String, default: null, trim: true },
    },
    eventLocation: {
      enabled: { type: Boolean, default: true },
      capacityHint: { type: Number, default: null },
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "map_locations", timestamps: true },
);

const mapLocationViewSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    locationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    viewedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "map_location_views", timestamps: true },
);

const mapDirectionRequestSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    locationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    originLatitude: { type: Number, default: null },
    originLongitude: { type: Number, default: null },
    requestedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "map_direction_requests", timestamps: true },
);

const forumSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: null, trim: true },
    icon: { type: String, default: null, trim: true },
    color: { type: String, default: null, trim: true },
    forumType: {
      type: String,
      default: "CATEGORY",
      trim: true,
      index: true,
    },
    moderatorIds: { type: [String], default: [], index: true },
    topicCount: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    visibility: visibilityField,
    status: {
      type: String,
      enum: ["ACTIVE", "LOCKED", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "forums", timestamps: true },
);

const forumTopicSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    forumId: { type: String, required: true, index: true },
    categoryId: { type: String, required: true, index: true },
    collegeId: { type: String, default: null, index: true },
    departmentId: { type: String, default: null, index: true },
    authorId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    tags: { type: [String], default: [], index: true },
    replyCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    upvotes: { type: Number, default: 0, min: 0 },
    downvotes: { type: Number, default: 0, min: 0 },
    bookmarkCount: { type: Number, default: 0, min: 0 },
    shareCount: { type: Number, default: 0, min: 0 },
    reportCount: { type: Number, default: 0, min: 0 },
    trendingScore: { type: Number, default: 0, index: true },
    lastReplyAt: { type: Date, default: null, index: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    isPinned: { type: Boolean, default: false, index: true },
    isLocked: { type: Boolean, default: false, index: true },
    visibility: {
      type: String,
      enum: ["PUBLIC", "UNIVERSITY", "COLLEGE", "DEPARTMENT"],
      default: "UNIVERSITY",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "HIDDEN", "REMOVED", "ARCHIVED", "DELETED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "forum_topics", timestamps: true },
);

const forumReplySchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    topicId: { type: String, required: true, index: true },
    postId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    parentReplyId: { type: String, default: null, index: true },
    parentCommentId: { type: String, default: null, index: true },
    body: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    upvotes: { type: Number, default: 0, min: 0 },
    downvotes: { type: Number, default: 0, min: 0 },
    reactionCounts: { type: Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ["ACTIVE", "HIDDEN", "REMOVED", "ARCHIVED", "DELETED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "forum_replies", timestamps: true },
);

const forumEngagementSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    entityType: {
      type: String,
      enum: ["POST", "COMMENT"],
      required: true,
      index: true,
    },
    entityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    engagementType: {
      type: String,
      enum: ["VIEW", "UPVOTE", "DOWNVOTE", "BOOKMARK", "SHARE"],
      required: true,
      index: true,
    },
    metadata: metadataField,
  },
  { collection: "forum_engagements", timestamps: true },
);

const pollOptionSchema = new Schema(
  {
    optionId: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    voteCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const pollSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    createdById: { type: String, required: true, index: true },
    creatorId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    pollType: {
      type: String,
      enum: [
        "GENERAL",
        "LEADERSHIP",
        "ACADEMIC",
        "EVENT",
        "SURVEY",
        "REFERENDUM",
      ],
      default: "GENERAL",
      index: true,
    },
    options: { type: [pollOptionSchema], required: true },
    visibility: {
      type: String,
      enum: ["UNIVERSITY", "COLLEGE", "DEPARTMENT", "CUSTOM"],
      default: "UNIVERSITY",
      index: true,
    },
    collegeIds: { type: [String], default: [], index: true },
    departmentIds: { type: [String], default: [], index: true },
    customAudience: { type: [String], default: [], index: true },
    targetAudience: { type: targetAudienceSchema, default: () => ({}) },
    allowMultiple: { type: Boolean, default: false },
    allowMultipleSelection: { type: Boolean, default: false },
    anonymous: { type: Boolean, default: false },
    startsAt: { type: Date, default: null, index: true },
    startDate: { type: Date, default: null, index: true },
    endsAt: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    totalVotes: { type: Number, default: 0, min: 0 },
    uniqueVoters: { type: Number, default: 0, min: 0 },
    pollReach: { type: Number, default: 0, min: 0 },
    participationRate: { type: Number, default: 0, min: 0, max: 100 },
    closedAt: { type: Date, default: null, index: true },
    reopenedAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFieldsWithoutCreator,
  },
  { collection: "polls", timestamps: true },
);

const pollVoteSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    pollId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    optionIds: { type: [String], required: true },
    selectedOptions: { type: [String], required: true },
    votedAt: { type: Date, default: Date.now, index: true },
    metadata: metadataField,
  },
  { collection: "poll_votes", timestamps: true },
);

const suggestionSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    createdById: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    anonymous: { type: Boolean, default: false, index: true },
    attachments: { type: [attachmentSchema], default: [] },
    assignedToId: { type: String, default: null, index: true },
    assignedTo: { type: String, default: null, index: true },
    resolution: { type: String, default: null, trim: true },
    rejectedReason: { type: String, default: null, trim: true },
    escalatedAt: { type: Date, default: null, index: true },
    resolvedAt: { type: Date, default: null, index: true },
    rejectedAt: { type: Date, default: null, index: true },
    visibility: visibilityField,
    status: {
      type: String,
      enum: [
        "OPEN",
        "UNDER_REVIEW",
        "IN_REVIEW",
        "IN_PROGRESS",
        "RESOLVED",
        "REJECTED",
        "CLOSED",
        "ARCHIVED",
      ],
      default: "OPEN",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFieldsWithoutCreator,
  },
  { collection: "suggestions", timestamps: true },
);

const suggestionCommentSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    suggestionId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true, trim: true },
    internal: { type: Boolean, default: false, index: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "suggestion_comments", timestamps: true },
);

const lostFoundItemSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    reporterId: { type: String, required: true, index: true },
    reporterName: { type: String, default: null, trim: true },
    reporterEmail: { type: String, default: null, trim: true },
    reporterPhone: { type: String, default: null, trim: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["LOST", "FOUND"],
      required: true,
      index: true,
    },
    category: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ["OPEN", "MATCHED", "RETURNED", "UNDER_REVIEW"],
      default: "OPEN",
      index: true,
    },
    location: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    verification: { type: String, default: null, trim: true },
    contact: { type: String, default: null, trim: true },
    images: { type: [String], default: [] },
    returnedAt: { type: Date, default: null, index: true },
    matchedAt: { type: Date, default: null, index: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "lost_found_items", timestamps: true },
);

announcementSchema.index({ universityId: 1, publishedAt: -1 });
announcementSchema.index({ universityId: 1, status: 1, expiresAt: 1 });
announcementSchema.index({ universityId: 1, slug: 1 }, { unique: true });
announcementSchema.index({ universityId: 1, category: 1, priority: 1 });
announcementSchema.index({ universityId: 1, visibility: 1, status: 1 });
announcementSchema.index({ createdBy: 1, status: 1, updatedAt: -1 });
announcementSchema.index({
  title: "text",
  content: "text",
  body: "text",
  summary: "text",
});
announcementViewSchema.index(
  { announcementId: 1, userId: 1 },
  { unique: true },
);
announcementViewSchema.index({ universityId: 1, announcementId: 1 });
announcementViewSchema.index({ userId: 1, viewedAt: -1 });
eventSchema.index({ universityId: 1, startAt: 1, status: 1 });
eventSchema.index({ locationId: 1, startAt: 1 });
eventSchema.index({ universityId: 1, organizerId: 1, status: 1 });
eventSchema.index({ universityId: 1, eventType: 1, status: 1 });
eventSchema.index({ universityId: 1, visibility: 1, status: 1 });
eventSchema.index({ title: "text", description: "text" });
eventAttendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true });
eventAttendanceSchema.index({
  universityId: 1,
  eventId: 1,
  attendanceStatus: 1,
});
eventAttendanceSchema.index({ userId: 1, joinedAt: -1 });
almanacSchema.index({ universityId: 1, academicYear: 1, semester: 1 });
almanacSchema.index({ universityId: 1, status: 1, updatedAt: -1 });
almanacSchema.index({ title: "text", description: "text" });
almanacEventSchema.index({ universityId: 1, academicYear: 1, semester: 1 });
almanacEventSchema.index({ universityId: 1, startDate: 1, endDate: 1 });
almanacEventSchema.index({ universityId: 1, visibility: 1, status: 1 });
almanacEventSchema.index({ universityId: 1, eventType: 1, startDate: 1 });
almanacEventSchema.index({ "reminders.remindAt": 1, "reminders.sentAt": 1 });
almanacEventSchema.index({ title: "text", description: "text" });
almanacEventViewSchema.index(
  { almanacEventId: 1, userId: 1 },
  { unique: true },
);
almanacEventViewSchema.index({ universityId: 1, almanacEventId: 1 });
almanacReminderEngagementSchema.index(
  { almanacEventId: 1, userId: 1, reminderId: 1 },
  { unique: true },
);
mapLocationSchema.index({ coordinates: "2dsphere" });
mapLocationSchema.index({ universityId: 1, category: 1, status: 1 });
mapLocationSchema.index({ universityId: 1, status: 1, views: -1 });
mapLocationSchema.index({
  name: "text",
  description: "text",
  buildingCode: "text",
});
mapLocationViewSchema.index({ locationId: 1, userId: 1 }, { unique: true });
mapLocationViewSchema.index({ universityId: 1, locationId: 1 });
mapDirectionRequestSchema.index({ universityId: 1, locationId: 1 });
mapDirectionRequestSchema.index({ userId: 1, requestedAt: -1 });
forumSchema.index({ universityId: 1, slug: 1 }, { unique: true });
forumSchema.index({ universityId: 1, departmentId: 1, visibility: 1 });
forumTopicSchema.index({ universityId: 1, forumId: 1, lastReplyAt: -1 });
forumTopicSchema.index({ universityId: 1, categoryId: 1, status: 1 });
forumTopicSchema.index({ universityId: 1, visibility: 1, status: 1 });
forumTopicSchema.index({
  universityId: 1,
  trendingScore: -1,
  lastActivityAt: -1,
});
forumTopicSchema.index({ title: "text", body: "text", tags: "text" });
forumReplySchema.index({ universityId: 1, topicId: 1, createdAt: 1 });
forumReplySchema.index({ universityId: 1, postId: 1, createdAt: 1 });
forumEngagementSchema.index(
  { entityType: 1, entityId: 1, userId: 1, engagementType: 1 },
  { unique: true },
);
forumEngagementSchema.index({
  universityId: 1,
  engagementType: 1,
  createdAt: -1,
});
pollSchema.index({ universityId: 1, status: 1, endsAt: 1 });
pollSchema.index({ universityId: 1, visibility: 1, status: 1 });
pollSchema.index({ universityId: 1, pollType: 1, status: 1 });
pollSchema.index({ universityId: 1, creatorId: 1, createdAt: -1 });
pollSchema.index({ title: "text", description: "text" });
pollVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });
pollVoteSchema.index({ universityId: 1, pollId: 1 });
pollVoteSchema.index({ userId: 1, createdAt: -1 });
suggestionSchema.index({ universityId: 1, status: 1, createdAt: -1 });
suggestionSchema.index({ universityId: 1, category: 1, status: 1 });
suggestionSchema.index({ universityId: 1, assignedToId: 1, status: 1 });
suggestionSchema.index({ authorId: 1, createdAt: -1 });
suggestionSchema.index({ title: "text", description: "text" });
suggestionCommentSchema.index({ suggestionId: 1, createdAt: 1 });
suggestionCommentSchema.index({ universityId: 1, authorId: 1, createdAt: -1 });
lostFoundItemSchema.index({ universityId: 1, status: 1, createdAt: -1 });
lostFoundItemSchema.index({ universityId: 1, type: 1, status: 1 });
lostFoundItemSchema.index({ universityId: 1, category: 1, status: 1 });
lostFoundItemSchema.index({ reporterId: 1, createdAt: -1 });
lostFoundItemSchema.index({
  title: "text",
  description: "text",
  location: "text",
  reporterName: "text",
});

export type AnnouncementDocument = InferSchemaType<typeof announcementSchema>;
export type AnnouncementViewDocument = InferSchemaType<
  typeof announcementViewSchema
>;
export type EventDocument = InferSchemaType<typeof eventSchema>;
export type EventAttendanceDocument = InferSchemaType<
  typeof eventAttendanceSchema
>;
export type AlmanacDocument = InferSchemaType<typeof almanacSchema>;
export type AlmanacEventDocument = InferSchemaType<typeof almanacEventSchema>;
export type AlmanacEventViewDocument = InferSchemaType<
  typeof almanacEventViewSchema
>;
export type AlmanacReminderEngagementDocument = InferSchemaType<
  typeof almanacReminderEngagementSchema
>;
export type MapLocationDocument = InferSchemaType<typeof mapLocationSchema>;
export type MapLocationViewDocument = InferSchemaType<
  typeof mapLocationViewSchema
>;
export type MapDirectionRequestDocument = InferSchemaType<
  typeof mapDirectionRequestSchema
>;
export type ForumDocument = InferSchemaType<typeof forumSchema>;
export type ForumTopicDocument = InferSchemaType<typeof forumTopicSchema>;
export type ForumReplyDocument = InferSchemaType<typeof forumReplySchema>;
export type ForumEngagementDocument = InferSchemaType<
  typeof forumEngagementSchema
>;
export type PollDocument = InferSchemaType<typeof pollSchema>;
export type PollVoteDocument = InferSchemaType<typeof pollVoteSchema>;
export type SuggestionDocument = InferSchemaType<typeof suggestionSchema>;
export type SuggestionCommentDocument = InferSchemaType<
  typeof suggestionCommentSchema
>;
export type LostFoundItemDocument = InferSchemaType<typeof lostFoundItemSchema>;

export const AnnouncementModel =
  models.Announcement ||
  model<AnnouncementDocument>("Announcement", announcementSchema);
export const AnnouncementViewModel =
  models.AnnouncementView ||
  model<AnnouncementViewDocument>("AnnouncementView", announcementViewSchema);
export const EventModel =
  models.Event || model<EventDocument>("Event", eventSchema);
export const EventAttendanceModel =
  models.EventAttendance ||
  model<EventAttendanceDocument>("EventAttendance", eventAttendanceSchema);
export const AlmanacModel =
  models.Almanac || model<AlmanacDocument>("Almanac", almanacSchema);
export const AlmanacEventModel =
  models.AlmanacEvent ||
  model<AlmanacEventDocument>("AlmanacEvent", almanacEventSchema);
export const AlmanacEventViewModel =
  models.AlmanacEventView ||
  model<AlmanacEventViewDocument>("AlmanacEventView", almanacEventViewSchema);
export const AlmanacReminderEngagementModel =
  models.AlmanacReminderEngagement ||
  model<AlmanacReminderEngagementDocument>(
    "AlmanacReminderEngagement",
    almanacReminderEngagementSchema,
  );
export const MapLocationModel =
  models.MapLocation ||
  model<MapLocationDocument>("MapLocation", mapLocationSchema);
export const MapLocationViewModel =
  models.MapLocationView ||
  model<MapLocationViewDocument>("MapLocationView", mapLocationViewSchema);
export const MapDirectionRequestModel =
  models.MapDirectionRequest ||
  model<MapDirectionRequestDocument>(
    "MapDirectionRequest",
    mapDirectionRequestSchema,
  );
export const ForumModel =
  models.Forum || model<ForumDocument>("Forum", forumSchema);
export const ForumTopicModel =
  models.ForumTopic ||
  model<ForumTopicDocument>("ForumTopic", forumTopicSchema);
export const ForumReplyModel =
  models.ForumReply ||
  model<ForumReplyDocument>("ForumReply", forumReplySchema);
export const ForumEngagementModel =
  models.ForumEngagement ||
  model<ForumEngagementDocument>("ForumEngagement", forumEngagementSchema);
export const PollModel = models.Poll || model<PollDocument>("Poll", pollSchema);
export const PollVoteModel =
  models.PollVote || model<PollVoteDocument>("PollVote", pollVoteSchema);
export const SuggestionModel =
  models.Suggestion ||
  model<SuggestionDocument>("Suggestion", suggestionSchema);
export const SuggestionCommentModel =
  models.SuggestionComment ||
  model<SuggestionCommentDocument>(
    "SuggestionComment",
    suggestionCommentSchema,
  );
export const LostFoundItemModel =
  models.LostFoundItem ||
  model<LostFoundItemDocument>("LostFoundItem", lostFoundItemSchema);
