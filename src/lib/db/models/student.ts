import { model, models, Schema, type InferSchemaType } from "@/lib/db/model-compat";

const studentSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    universityId: {
      type: String,
      required: true,
      index: true,
    },
    collegeId: {
      type: String,
      required: true,
      index: true,
    },
    departmentId: {
      type: String,
      required: true,
      index: true,
    },
    courseId: {
      type: String,
      required: true,
      index: true,
    },
    invitationId: {
      type: String,
      required: true,
      index: true,
    },
    representativeId: {
      type: String,
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    otherNames: {
      type: String,
      default: null,
      trim: true,
    },
    nickname: {
      type: String,
      default: null,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    yearOfStudy: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    enrollmentYear: {
      type: Number,
      required: true,
      index: true,
    },
    expectedGraduationYear: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED"],
      default: "PENDING_VERIFICATION",
      index: true,
    },
  },
  {
    collection: "student",
    timestamps: true,
  },
);

export type StudentDocument = InferSchemaType<typeof studentSchema>;

export const StudentModel =
  models.Student || model<StudentDocument>("Student", studentSchema);
