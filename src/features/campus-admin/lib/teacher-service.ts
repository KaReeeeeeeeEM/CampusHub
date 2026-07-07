import { PERMISSIONS } from "@/features/authorization/permissions";
import { passwordSchema } from "@/features/auth/lib/schemas";
import { writeAuditLog } from "@/lib/audit/audit-log-service";
import { auth, getAcquisitionSecret } from "@/lib/auth/auth";
import { requireAuthorizedResource } from "@/lib/auth/authorization";
import { connectPostgres } from "@/lib/db/postgres";
import { CollegeModel, DepartmentModel, UserModel } from "@/lib/db/models";
import { z } from "zod";

export const createTeacherSchema = z.object({
  collegeId: z.string().min(1),
  departmentId: z.string().min(1),
  username: z.string().min(3).max(40),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  otherNames: z.string().max(120).optional(),
  nickname: z.string().max(60).optional(),
  email: z.string().email(),
  password: passwordSchema,
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;

export async function createTeacher(input: CreateTeacherInput) {
  const payload = createTeacherSchema.parse(input);
  const actor = await requireAuthorizedResource({
    permission: PERMISSIONS.USER_CREATE,
    resource: {
      collegeId: payload.collegeId,
      departmentId: payload.departmentId,
    },
  });

  if (!actor.universityId) {
    throw new Error("Campus Admin must be assigned to a university.");
  }

  await connectPostgres();

  const [college, department, existingUser] = await Promise.all([
    CollegeModel.findOne({
      _id: payload.collegeId,
      universityId: actor.universityId,
      status: "ACTIVE",
    }).lean(),
    DepartmentModel.findOne({
      _id: payload.departmentId,
      universityId: actor.universityId,
      collegeId: payload.collegeId,
      status: "ACTIVE",
    }).lean(),
    UserModel.findOne({ email: payload.email.toLowerCase() }).lean(),
  ]);

  if (!college || !department) {
    throw new Error("Active college and department are required.");
  }

  if (existingUser) {
    throw new Error("A CampusHub account already exists for this email.");
  }

  const name = [payload.firstName, payload.otherNames, payload.lastName]
    .filter(Boolean)
    .join(" ");
  const response = await auth.api.signUpEmail({
    body: {
      name,
      email: payload.email.toLowerCase(),
      password: payload.password,
      callbackURL: "/verification-success",
      intendedRole: "TEACHER",
      username: payload.username,
      firstName: payload.firstName,
      lastName: payload.lastName,
      otherNames: payload.otherNames ?? "",
      nickname: payload.nickname ?? "",
      universityId: actor.universityId,
      collegeId: payload.collegeId,
      departmentId: payload.departmentId,
      acquisitionSource: "TEACHER_CREATION",
      acquisitionToken: getAcquisitionSecret(),
    },
  });

  await writeAuditLog({
    actorId: actor.id,
    universityId: actor.universityId,
    action: "TEACHER_CREATED",
    entityType: "user",
    entityId: response.user.id,
    after: {
      role: "TEACHER",
      universityId: actor.universityId,
      collegeId: payload.collegeId,
      departmentId: payload.departmentId,
      email: payload.email.toLowerCase(),
    },
  });

  return {
    id: response.user.id,
    email: response.user.email,
    role: "TEACHER",
    universityId: actor.universityId,
    collegeId: payload.collegeId,
    departmentId: payload.departmentId,
  };
}
