import { model, models, Schema, type InferSchemaType } from "mongoose";

import {
  attachmentSchema,
  metadataField,
  tenantLifecycleFields,
  visibilityField,
} from "@/lib/db/models/model-helpers";

const opportunitySchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    postedById: { type: String, required: true, index: true },
    employerId: { type: String, required: true, index: true },
    employerName: { type: String, default: null, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    industry: { type: String, default: null, trim: true, index: true },
    opportunityType: {
      type: String,
      enum: [
        "INTERNSHIP",
        "JOB",
        "PART_TIME",
        "FULL_TIME",
        "FREELANCE",
        "VOLUNTEER",
        "SCHOLARSHIP",
        "COMPETITION",
        "FELLOWSHIP",
        "GRANT",
        "EVENT",
        "TRAINING",
      ],
      required: true,
      index: true,
    },
    workType: {
      type: String,
      enum: ["INTERNSHIP", "PART_TIME", "FULL_TIME", "FREELANCE", "VOLUNTEER"],
      required: true,
      index: true,
    },
    salaryRange: { type: Schema.Types.Mixed, default: null },
    locationType: {
      type: String,
      enum: ["ONSITE", "REMOTE", "HYBRID"],
      default: "ONSITE",
      index: true,
    },
    location: { type: String, default: null, trim: true },
    deadlineAt: { type: Date, default: null, index: true },
    applicationDeadline: { type: Date, default: null, index: true },
    startAt: { type: Date, default: null, index: true },
    requirements: { type: [String], default: [], index: true },
    skills: { type: [String], default: [], index: true },
    eligibility: { type: Schema.Types.Mixed, default: null },
    targetColleges: { type: [String], default: [], index: true },
    targetDepartments: { type: [String], default: [], index: true },
    targetYears: { type: [String], default: [], index: true },
    applicationUrl: { type: String, default: null, trim: true },
    applicationInstructions: { type: String, default: null, trim: true },
    applicationCount: { type: Number, default: 0 },
    savedCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0, index: true },
    viewCount: { type: Number, default: 0, index: true },
    visibility: visibilityField,
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "CLOSED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "opportunities", timestamps: true },
);

const savedCandidateSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    savedById: { type: String, required: true, index: true },
    candidateUserId: { type: String, required: true, index: true },
    opportunityId: { type: String, default: null, index: true },
    notes: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
    metadata: metadataField,
  },
  { collection: "saved_candidates", timestamps: true },
);

const savedOpportunitySchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    opportunityId: { type: String, required: true, index: true },
  },
  { collection: "saved_opportunities", timestamps: true },
);

const applicationSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    opportunityId: { type: String, required: true, index: true },
    applicantId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    cvUrl: { type: String, default: null, trim: true },
    resumeUrl: { type: String, default: null, trim: true },
    coverLetter: { type: String, default: null, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    answers: { type: Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "UNDER_REVIEW",
        "SHORTLISTED",
        "INTERVIEW",
        "REJECTED",
        "HIRED",
        "ACCEPTED",
        "WITHDRAWN",
      ],
      default: "SUBMITTED",
      index: true,
    },
    submittedAt: { type: Date, default: Date.now, index: true },
    reviewedById: { type: String, default: null, index: true },
    reviewedAt: { type: Date, default: null, index: true },
    withdrawnAt: { type: Date, default: null, index: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "applications", timestamps: true },
);

const applicationStatusEventSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    applicationId: { type: String, required: true, index: true },
    opportunityId: { type: String, required: true, index: true },
    employerId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    fromStatus: {
      type: String,
      enum: [
        "SUBMITTED",
        "UNDER_REVIEW",
        "SHORTLISTED",
        "INTERVIEW",
        "REJECTED",
        "HIRED",
        "ACCEPTED",
        "WITHDRAWN",
        null,
      ],
      default: null,
      index: true,
    },
    toStatus: {
      type: String,
      enum: [
        "SUBMITTED",
        "UNDER_REVIEW",
        "SHORTLISTED",
        "INTERVIEW",
        "REJECTED",
        "HIRED",
        "ACCEPTED",
        "WITHDRAWN",
      ],
      required: true,
      index: true,
    },
    changedById: { type: String, required: true, index: true },
    changedAt: { type: Date, default: Date.now, index: true },
    note: { type: String, default: null, trim: true },
    metadata: metadataField,
  },
  { collection: "application_status_events", timestamps: true },
);

const opportunityViewSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    opportunityId: { type: String, required: true, index: true },
    employerId: { type: String, required: true, index: true },
    viewerId: { type: String, required: true, index: true },
    viewerRole: { type: String, required: true, trim: true, index: true },
    viewerType: {
      type: String,
      enum: ["STUDENT", "ALUMNI", "TEACHER", "EMPLOYER", "ADMIN", "OTHER"],
      required: true,
      index: true,
    },
    viewedAt: { type: Date, default: Date.now, index: true },
    source: { type: String, default: null, trim: true, index: true },
    metadata: metadataField,
  },
  { collection: "opportunity_views", timestamps: true },
);

const careerProfileSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    headline: { type: String, default: null, trim: true },
    bio: { type: String, default: null, trim: true },
    skills: { type: [String], default: [], index: true },
    languages: { type: [String], default: [], index: true },
    certifications: { type: [Schema.Types.Mixed], default: [] },
    experience: { type: [Schema.Types.Mixed], default: [] },
    education: { type: [Schema.Types.Mixed], default: [] },
    portfolioLinks: { type: [Schema.Types.Mixed], default: [] },
    cvUrl: { type: String, default: null, trim: true },
    availabilityStatus: {
      type: String,
      enum: ["AVAILABLE", "OPEN", "NOT_AVAILABLE"],
      default: "OPEN",
      index: true,
    },
    preferredWorkType: {
      type: [String],
      enum: ["INTERNSHIP", "PART_TIME", "FULL_TIME", "FREELANCE", "VOLUNTEER"],
      default: [],
      index: true,
    },
    preferredIndustries: { type: [String], default: [], index: true },
    graduationYear: { type: Number, default: null, index: true },
    profileStrength: { type: Number, default: 0, index: true },
    profileViewCount: { type: Number, default: 0, index: true },
    employerViewCount: { type: Number, default: 0, index: true },
    savedCount: { type: Number, default: 0, index: true },
    contactCount: { type: Number, default: 0, index: true },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "career_profiles", timestamps: true },
);

const careerProfileViewSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    profileUserId: { type: String, required: true, index: true },
    profileId: { type: String, required: true, index: true },
    viewerId: { type: String, required: true, index: true },
    viewerRole: { type: String, required: true, trim: true, index: true },
    viewerType: {
      type: String,
      enum: ["EMPLOYER", "ADMIN", "SELF", "OTHER"],
      required: true,
      index: true,
    },
    viewedAt: { type: Date, default: Date.now, index: true },
    source: { type: String, default: null, trim: true, index: true },
    metadata: metadataField,
  },
  { collection: "career_profile_views", timestamps: true },
);

const mentorshipSchema = new Schema(
  {
    _id: { type: String, required: true },
    universityId: { type: String, required: true, index: true },
    mentorId: { type: String, required: true, index: true },
    menteeId: { type: String, required: true, index: true },
    topic: { type: String, required: true, trim: true, index: true },
    goals: { type: [String], default: [] },
    requestedById: { type: String, required: true, index: true },
    startedAt: { type: Date, default: null, index: true },
    endedAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: [
        "REQUESTED",
        "ACCEPTED",
        "DECLINED",
        "ACTIVE",
        "COMPLETED",
        "CANCELED",
      ],
      default: "REQUESTED",
      index: true,
    },
    metadata: metadataField,
    ...tenantLifecycleFields,
  },
  { collection: "mentorships", timestamps: true },
);

opportunitySchema.index({ universityId: 1, opportunityType: 1, deadlineAt: 1 });
opportunitySchema.index({
  universityId: 1,
  workType: 1,
  applicationDeadline: 1,
});
opportunitySchema.index({ universityId: 1, status: 1, deadlineAt: 1 });
opportunitySchema.index({ universityId: 1, industry: 1, status: 1 });
opportunitySchema.index({ universityId: 1, employerId: 1, status: 1 });
opportunitySchema.index({ universityId: 1, targetDepartments: 1 });
opportunitySchema.index({
  title: "text",
  description: "text",
  industry: "text",
  requirements: "text",
  skills: "text",
});
savedCandidateSchema.index(
  { savedById: 1, candidateUserId: 1, opportunityId: 1 },
  { unique: true },
);
savedCandidateSchema.index({ universityId: 1, savedById: 1, createdAt: -1 });
savedOpportunitySchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
savedOpportunitySchema.index({ universityId: 1, userId: 1, createdAt: -1 });
applicationSchema.index({ opportunityId: 1, applicantId: 1 }, { unique: true });
applicationSchema.index({ opportunityId: 1, studentId: 1 }, { unique: true });
applicationSchema.index({ universityId: 1, status: 1, submittedAt: -1 });
applicationSchema.index({ applicantId: 1, submittedAt: -1 });
applicationSchema.index({ studentId: 1, submittedAt: -1 });
applicationSchema.index({ opportunityId: 1, status: 1, submittedAt: -1 });
applicationStatusEventSchema.index({
  universityId: 1,
  employerId: 1,
  toStatus: 1,
  changedAt: -1,
});
applicationStatusEventSchema.index({
  opportunityId: 1,
  toStatus: 1,
  changedAt: -1,
});
applicationStatusEventSchema.index({ studentId: 1, changedAt: -1 });
opportunityViewSchema.index({ opportunityId: 1, viewedAt: -1 });
opportunityViewSchema.index({
  universityId: 1,
  employerId: 1,
  viewedAt: -1,
});
opportunityViewSchema.index({
  universityId: 1,
  viewerType: 1,
  viewedAt: -1,
});
careerProfileSchema.index({ userId: 1 }, { unique: true });
careerProfileSchema.index({ universityId: 1, availabilityStatus: 1 });
careerProfileSchema.index({ universityId: 1, preferredWorkType: 1 });
careerProfileSchema.index({ universityId: 1, graduationYear: 1 });
careerProfileSchema.index({ universityId: 1, skills: 1 });
careerProfileSchema.index({ universityId: 1, profileStrength: -1 });
careerProfileSchema.index({
  headline: "text",
  bio: "text",
  skills: "text",
  preferredIndustries: "text",
});
careerProfileViewSchema.index({ profileUserId: 1, viewedAt: -1 });
careerProfileViewSchema.index({ universityId: 1, viewerId: 1, viewedAt: -1 });
careerProfileViewSchema.index({
  universityId: 1,
  viewerType: 1,
  viewedAt: -1,
});
mentorshipSchema.index({ universityId: 1, mentorId: 1, status: 1 });
mentorshipSchema.index({ universityId: 1, menteeId: 1, status: 1 });

export type OpportunityDocument = InferSchemaType<typeof opportunitySchema>;
export type SavedCandidateDocument = InferSchemaType<
  typeof savedCandidateSchema
>;
export type SavedOpportunityDocument = InferSchemaType<
  typeof savedOpportunitySchema
>;
export type ApplicationDocument = InferSchemaType<typeof applicationSchema>;
export type ApplicationStatusEventDocument = InferSchemaType<
  typeof applicationStatusEventSchema
>;
export type OpportunityViewDocument = InferSchemaType<
  typeof opportunityViewSchema
>;
export type CareerProfileDocument = InferSchemaType<typeof careerProfileSchema>;
export type CareerProfileViewDocument = InferSchemaType<
  typeof careerProfileViewSchema
>;
export type MentorshipDocument = InferSchemaType<typeof mentorshipSchema>;

export const OpportunityModel =
  models.Opportunity ||
  model<OpportunityDocument>("Opportunity", opportunitySchema);
export const SavedCandidateModel =
  models.SavedCandidate ||
  model<SavedCandidateDocument>("SavedCandidate", savedCandidateSchema);
export const SavedOpportunityModel =
  models.SavedOpportunity ||
  model<SavedOpportunityDocument>("SavedOpportunity", savedOpportunitySchema);
export const ApplicationModel =
  models.Application ||
  model<ApplicationDocument>("Application", applicationSchema);
export const ApplicationStatusEventModel =
  models.ApplicationStatusEvent ||
  model<ApplicationStatusEventDocument>(
    "ApplicationStatusEvent",
    applicationStatusEventSchema,
  );
export const OpportunityViewModel =
  models.OpportunityView ||
  model<OpportunityViewDocument>("OpportunityView", opportunityViewSchema);
export const CareerProfileModel =
  models.CareerProfile ||
  model<CareerProfileDocument>("CareerProfile", careerProfileSchema);
export const CareerProfileViewModel =
  models.CareerProfileView ||
  model<CareerProfileViewDocument>(
    "CareerProfileView",
    careerProfileViewSchema,
  );
export const MentorshipModel =
  models.Mentorship ||
  model<MentorshipDocument>("Mentorship", mentorshipSchema);
