import { z } from "zod";

import { gmailEmailMessage, isGmailAddress } from "@/lib/email/gmail-validation";

export const userRoleSchema = z.enum([
  "SUPER_ADMIN",
  "CAMPUS_ADMIN",
  "STUDENT",
  "TEACHER",
  "EMPLOYER",
  "ALUMNI",
]);

export const userPositionSchema = z.enum([
  "REPRESENTATIVE",
  "COMMITTEE_MEMBER",
  "NONE",
]);

export const userStatusSchema = z.enum([
  "ACTIVE",
  "SUSPENDED",
  "PENDING",
  "INACTIVE",
]);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .refine(isGmailAddress, gmailEmailMessage),
});

export const userProfileUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(40, "Username must be 40 characters or fewer.")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Username can only include letters, numbers, underscores, dots, and hyphens.",
    )
    .transform((value) => value.toLowerCase())
    .optional(),
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(80, "First name must be 80 characters or fewer.")
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(80, "Last name must be 80 characters or fewer.")
    .optional(),
  otherNames: z
    .string()
    .trim()
    .max(120, "Other names must be 120 characters or fewer.")
    .nullable()
    .optional(),
  nickname: z
    .string()
    .trim()
    .max(60, "Nickname must be 60 characters or fewer.")
    .nullable()
    .optional(),
  avatar: z.string().url("Avatar must be a valid URL.").nullable().optional(),
  phoneNumber: z
    .string()
    .trim()
    .min(5, "Phone number is too short.")
    .max(32, "Phone number must be 32 characters or fewer.")
    .nullable()
    .optional(),
});

export const auditEventSchema = z.object({
  actorId: z.string().min(1).nullable().optional(),
  universityId: z.string().min(1).nullable().optional(),
  action: z.enum([
    "LOGIN",
    "LOGOUT",
    "PROFILE_UPDATE",
    "PASSWORD_CHANGE",
    "PERMISSION_DENIED",
    "UNAUTHORIZED_ACCESS",
    "USER_UPDATE",
    "USER_SUSPEND",
    "USER_DELETE",
    "ROLE_CHANGE",
    "PERMISSION_CHANGE",
    "POSITION_CHANGE",
    "INVITATION_CREATED",
    "INVITATION_ACCEPTED",
    "INVITATION_REVOKED",
    "EMPLOYER_APPLICATION_SUBMITTED",
    "EMPLOYER_APPROVED",
    "EMPLOYER_REJECTED",
    "TEACHER_CREATED",
    "TEACHER_UPDATED",
    "REPRESENTATIVE_ASSIGNED",
    "REPRESENTATIVE_REMOVED",
    "CAMPUS_ADMIN_ASSIGNED",
    "CAMPUS_ADMIN_REMOVED",
    "ANNOUNCEMENT_CREATED",
    "ANNOUNCEMENT_UPDATED",
    "ANNOUNCEMENT_PUBLISHED",
    "ANNOUNCEMENT_ARCHIVED",
    "ANNOUNCEMENT_DELETED",
    "EVENT_CREATED",
    "EVENT_UPDATED",
    "EVENT_DELETED",
    "EVENT_CANCELLED",
    "EVENT_JOINED",
    "EVENT_LEFT",
    "EVENT_WAITLISTED",
    "EVENT_CHECKED_IN",
    "EVENT_QR_VALIDATED",
    "EVENT_REMINDER_SENT",
    "ALMANAC_EVENT_CREATED",
    "ALMANAC_EVENT_UPDATED",
    "ALMANAC_EVENT_DELETED",
    "ALMANAC_EVENT_ARCHIVED",
    "ALMANAC_EVENT_CANCELLED",
    "ALMANAC_REMINDER_SENT",
    "ALMANAC_REMINDER_ENGAGED",
    "MAP_LOCATION_CREATED",
    "MAP_LOCATION_UPDATED",
    "MAP_LOCATION_DELETED",
    "MAP_DIRECTION_REQUESTED",
    "NOTIFICATION_SENT",
    "NOTIFICATION_READ",
    "NOTIFICATION_ARCHIVED",
    "ACTIVITY_FEED_GENERATION_FAILED",
    "FORUM_CATEGORY_CREATED",
    "FORUM_POST_CREATED",
    "FORUM_POST_UPDATED",
    "FORUM_POST_DELETED",
    "FORUM_POST_MODERATED",
    "FORUM_COMMENT_CREATED",
    "FORUM_COMMENT_UPDATED",
    "FORUM_COMMENT_DELETED",
    "FORUM_REPORTED",
    "POLL_CREATED",
    "POLL_UPDATED",
    "POLL_CLOSED",
    "POLL_REOPENED",
    "POLL_VOTED",
    "POLL_RESULTS_EXPORTED",
    "SUGGESTION_CREATED",
    "SUGGESTION_COMMENTED",
    "SUGGESTION_ASSIGNED",
    "SUGGESTION_ESCALATED",
    "SUGGESTION_STATUS_UPDATED",
    "SUGGESTION_RESOLVED",
    "SUGGESTION_REJECTED",
    "LOST_FOUND_ITEM_CREATED",
    "LOST_FOUND_ITEM_UPDATED",
    "LOST_FOUND_ITEM_ARCHIVED",
    "STUDENT_DOCUMENT_CREATED",
    "STUDENT_DOCUMENT_UPDATED",
    "STUDENT_DOCUMENT_ARCHIVED",
    "PROJECT_CREATED",
    "PROJECT_UPDATED",
    "PROJECT_ARCHIVED",
    "PROJECT_PUBLISHED",
    "PROJECT_MEMBER_ADDED",
    "PROJECT_MEMBER_REMOVED",
    "PROJECT_LINK_ADDED",
    "PROJECT_VISIBILITY_UPDATED",
    "PROJECT_VIEWED",
    "PROJECT_STARRED",
    "PROJECT_UNSTARRED",
    "PROJECT_FAVORITED",
    "PROJECT_UNFAVORITED",
    "PROJECT_SAVED",
    "PROJECT_UNSAVED",
    "PROJECT_LINK_CLICKED",
    "PROJECT_DOCUMENT_CLICKED",
    "PROJECT_REPOSITORY_CLICKED",
    "PROJECT_SHARED",
    "SHOP_CREATED",
    "SHOP_UPDATED",
    "SHOP_PAUSED",
    "SHOP_CLOSED",
    "SHOP_VIEWED",
    "PRODUCT_CREATED",
    "PRODUCT_UPDATED",
    "PRODUCT_DELETED",
    "PRODUCT_ARCHIVED",
    "PRODUCT_VIEWED",
    "PRODUCT_CLICKED",
    "PRODUCT_FAVORITED",
    "PRODUCT_UNFAVORITED",
    "ORDER_REQUEST_CREATED",
    "ORDER_REQUEST_ACCEPTED",
    "ORDER_REQUEST_DECLINED",
    "ORDER_REQUEST_CANCELLED",
    "ORDER_REQUEST_COMPLETED",
    "MARKETPLACE_LOCATION_SAVED",
    "MARKETPLACE_LOCATION_UPDATED",
    "MARKETPLACE_LOCATION_DELETED",
    "ORDER_REQUEST_LOCATION_UPDATED",
    "NOTIFICATION_INTELLIGENCE_DISPATCHED",
    "CAREER_PROFILE_CREATED",
    "CAREER_PROFILE_UPDATED",
    "CAREER_PROFILE_CV_UPLOADED",
    "CAREER_PROFILE_SKILL_ADDED",
    "CAREER_PROFILE_CERTIFICATION_ADDED",
    "CAREER_PROFILE_EXPERIENCE_ADDED",
    "CAREER_PROFILE_PORTFOLIO_LINK_ADDED",
    "TALENT_DISCOVERY_SEARCHED",
    "TALENT_PROFILE_VIEWED",
    "CANDIDATE_SAVED",
    "CANDIDATE_UNSAVED",
    "CANDIDATE_CONTACTED",
    "OPPORTUNITY_CREATED",
    "OPPORTUNITY_UPDATED",
    "OPPORTUNITY_ARCHIVED",
    "OPPORTUNITY_SAVED",
    "OPPORTUNITY_UNSAVED",
    "OPPORTUNITY_SHARED",
    "OPPORTUNITY_VIEWED",
    "EMPLOYER_ANALYTICS_VIEWED",
    "APPLICATION_SUBMITTED",
    "APPLICATION_WITHDRAWN",
    "APPLICATION_REVIEWED",
    "APPLICATION_SHORTLISTED",
    "APPLICATION_INTERVIEW",
    "APPLICATION_REJECTED",
    "APPLICATION_HIRED",
    "ALUMNI_PROFILE_CREATED",
    "ALUMNI_PROFILE_UPDATED",
    "ALUMNI_PROFILE_VIEWED",
    "ALUMNI_SEARCHED",
    "ALUMNI_CONNECTION_REQUESTED",
    "ALUMNI_CONNECTION_RESPONDED",
    "ALUMNI_ANALYTICS_VIEWED",
    "MENTOR_PROFILE_CREATED",
    "MENTOR_PROFILE_UPDATED",
    "MENTORSHIP_REQUEST_CREATED",
    "MENTORSHIP_REQUEST_ACCEPTED",
    "MENTORSHIP_REQUEST_DECLINED",
    "MENTORSHIP_REQUEST_CANCELLED",
    "MENTORSHIP_COMPLETED",
    "MENTORSHIP_SESSION_CREATED",
    "MENTORSHIP_SESSION_UPDATED",
    "NETWORK_CONNECTION_REQUESTED",
    "NETWORK_CONNECTION_RESPONDED",
    "NETWORK_CONNECTION_BLOCKED",
    "NETWORK_FOLLOWED",
    "NETWORK_UNFOLLOWED",
    "COMMUNITY_CREATED",
    "COMMUNITY_UPDATED",
    "COMMUNITY_JOINED",
    "COMMUNITY_LEFT",
    "COMMUNITY_MODERATOR_ASSIGNED",
    "COMMUNITY_UPDATE_POSTED",
    "COMMUNITY_EVENT_CREATED",
    "COMMUNITY_POLL_CREATED",
    "SPONSORSHIP_CREATED",
    "SPONSORSHIP_UPDATED",
    "SPONSORSHIP_INTEREST_SUBMITTED",
    "SPONSORSHIP_INTEREST_APPROVED",
    "SPONSORSHIP_INTEREST_DECLINED",
    "SPONSORSHIP_INTEREST_WITHDRAWN",
    "BADGE_CREATED",
    "BADGE_DEFAULTS_SEEDED",
    "BADGE_EARNED",
    "BADGE_DISPLAY_UPDATED",
    "ACHIEVEMENT_CREATED",
    "ACHIEVEMENT_DEFAULTS_SEEDED",
    "ACHIEVEMENT_PROGRESS_UPDATED",
    "ACHIEVEMENT_COMPLETED",
    "STREAK_ACTIVITY_RECORDED",
    "STREAK_RECOVERED",
    "STREAK_RECOVERY_TOKEN_GRANTED",
    "STREAK_BADGE_GRANT_FAILED",
    "FIRST_LOGIN_BADGE_GRANT_FAILED",
    "REWARD_EVENT_CREATED",
    "REWARD_EVENT_SEEN",
    "REWARD_EVENT_ARCHIVED",
    "RANKING_VIEWED",
    "LEADERSHIP_POSITION_CREATED",
    "LEADERSHIP_POSITION_UPDATED",
    "LEADERSHIP_POSITION_REMOVED",
    "LEADERSHIP_ASSIGNED",
    "LEADERSHIP_TERM_ENDED",
    "LEADERSHIP_REMOVED",
    "LEADERSHIP_TRANSFERRED",
    "LEADERSHIP_REPORT_SUBMITTED",
    "LEADERSHIP_REPORT_REVIEWED",
    "LEADERSHIP_REPORT_APPROVED",
    "LEADERSHIP_REPORT_REJECTED",
    "LEADERSHIP_REPORT_ARCHIVED",
    "LEADERSHIP_REPORT_EXPORTED",
    "LEADERSHIP_REPORT_ANALYTICS_VIEWED",
    "COMMITTEE_CREATED",
    "COMMITTEE_MEMBER_ASSIGNED",
    "COMMITTEE_MEMBER_REMOVED",
    "COMMITTEE_ROLE_TRANSFERRED",
    "COMMITTEE_ANNOUNCEMENT_CREATED",
    "COMMITTEE_EVENT_CREATED",
    "COMMITTEE_POLL_CREATED",
    "COMMITTEE_SUGGESTION_CREATED",
    "COMMITTEE_COMMUNITY_CREATED",
    "COMMITTEE_ANALYTICS_VIEWED",
    "COMMITTEE_REPORT_CREATED",
    "COMMITTEE_MEETING_CREATED",
    "COMMITTEE_MEETING_COMPLETED",
    "GOVERNANCE_ANALYTICS_VIEWED",
    "EXECUTIVE_ANALYTICS_VIEWED",
    "STUDENT_ENGAGEMENT_ANALYTICS_VIEWED",
    "EMPLOYABILITY_ANALYTICS_VIEWED",
    "INNOVATION_ANALYTICS_VIEWED",
    "MARKETPLACE_EXECUTIVE_ANALYTICS_VIEWED",
    "RECOMMENDATIONS_VIEWED",
    "XP_AWARDED",
    "XP_REMOVED",
    "UNIVERSITY_CREATE",
    "UNIVERSITY_UPDATE",
    "UNIVERSITY_DELETE",
    "COLLEGE_CREATE",
    "COLLEGE_UPDATE",
    "COLLEGE_DELETE",
    "DEPARTMENT_CREATE",
    "DEPARTMENT_UPDATE",
    "DEPARTMENT_DELETE",
    "ASSIGNMENT_CHANGE",
  ]),
  entityType: z.string().min(1),
  entityId: z.string().min(1).nullable().optional(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type UserRoleInput = z.infer<typeof userRoleSchema>;
export type UserPositionInput = z.infer<typeof userPositionSchema>;
export type UserStatusInput = z.infer<typeof userStatusSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type UserProfileUpdateInput = z.infer<typeof userProfileUpdateSchema>;
export type AuditEventInput = z.infer<typeof auditEventSchema>;
