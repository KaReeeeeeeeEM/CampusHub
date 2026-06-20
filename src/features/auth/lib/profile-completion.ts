type ProfileCompletionUser = {
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  position?: string | null;
  isVerified?: boolean | null;
};

const PROFILE_COMPLETION_FIELDS: Array<keyof ProfileCompletionUser> = [
  "email",
  "username",
  "firstName",
  "lastName",
  "avatar",
  "phoneNumber",
  "role",
  "position",
  "isVerified",
];

function hasCompletedField(
  user: ProfileCompletionUser,
  field: keyof ProfileCompletionUser,
) {
  const value = user[field];

  if (typeof value === "boolean") {
    return value;
  }

  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function calculateProfileCompletionPercentage(
  user: ProfileCompletionUser,
) {
  const completed = PROFILE_COMPLETION_FIELDS.filter((field) =>
    hasCompletedField(user, field),
  ).length;

  return Math.round((completed / PROFILE_COMPLETION_FIELDS.length) * 100);
}
