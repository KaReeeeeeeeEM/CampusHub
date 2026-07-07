/* global console, fetch, process */
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import { hashPassword, verifyPassword } from "better-auth/crypto";

import { createPgSeedDb } from "./pg-document-db.mjs";

const PASSWORD = process.env.CAMPUSHUB_TEST_ACCOUNT_PASSWORD ?? "CampusHub@2026";
const BASE_URL = (
  process.env.CAMPUSHUB_SEED_API_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");
const RESET_ALL = process.argv.includes("--reset-all");

const seedUniversitySlugs = [
  "university-of-dar-es-salaam-api-seed",
  "university-of-dar-es-salaam",
];
const seedEmails = [
  "seed.superadmin@campushub.test",
  "seed.campus.admin@udsm.ac.tz",
  "seed.representative@udsm.ac.tz",
  "seed.teacher@udsm.ac.tz",
  "seed.student@udsm.ac.tz",
  "seed.alumni@udsm.ac.tz",
  "seed.employer@safaritech.co.tz",
];

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const env = await readFile(file, "utf8");
      for (const line of env.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const [key, ...parts] = trimmed.split("=");
        if (process.env[key]) continue;
        process.env[key] = parts.join("=").replace(/^["']|["']$/g, "");
      }
    } catch {
      // Environment variables may be supplied by the caller.
    }
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function toCookieHeader(headers) {
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);

  return setCookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function apiRequest(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      origin: BASE_URL,
      ...(body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed with ${response.status}: ${JSON.stringify(payload)}`,
    );
  }

  return { response, payload };
}

async function signInAsSuperAdmin() {
  const { response, payload } = await apiRequest("/api/auth/sign-in/email", {
    method: "POST",
    body: {
      email: "seed.superadmin@campushub.test",
      password: PASSWORD,
      rememberMe: true,
    },
  });
  const cookie = toCookieHeader(response.headers);
  assert(cookie, `Super Admin sign-in did not return a session cookie: ${JSON.stringify(payload)}`);
  return cookie;
}

async function resetSeedData(db) {
  if (RESET_ALL) {
    await db.pool.query(`DELETE FROM "session"`);
    await db.pool.query(`DELETE FROM "account"`);
    await db.pool.query(`DELETE FROM "verification"`);
    await db.pool.query(`DELETE FROM "twoFactor"`);
    await db.pool.query(`DELETE FROM "passkey"`);
    await db.pool.query(`DELETE FROM "user"`);
    await db.pool.query(`DELETE FROM app_documents`);
    return;
  }

  const universityResult = await db.pool.query(
    `
      SELECT id FROM app_documents
      WHERE collection = 'university'
        AND (id LIKE 'seed-%' OR doc->>'slug' = ANY($1::text[]))
    `,
    [seedUniversitySlugs],
  );
  const universityIds = universityResult.rows.map((row) => row.id);

  await db.pool.query(`DELETE FROM "session" WHERE "userId" = ANY($1::text[])`, [
    seedUserIds(),
  ]);
  await db.pool.query(`DELETE FROM "account" WHERE "userId" = ANY($1::text[])`, [
    seedUserIds(),
  ]);
  await db.pool.query(`DELETE FROM "twoFactor" WHERE "userId" = ANY($1::text[])`, [
    seedUserIds(),
  ]);
  await db.pool.query(`DELETE FROM "passkey" WHERE "userId" = ANY($1::text[])`, [
    seedUserIds(),
  ]);
  await db.pool.query(
    `DELETE FROM "user" WHERE id = ANY($1::text[]) OR email = ANY($2::text[]) OR email LIKE 'seed.%'`,
    [seedUserIds(), seedEmails],
  );
  await db.pool.query(
    `
      DELETE FROM app_documents
      WHERE id LIKE 'seed-%'
        OR doc->>'email' = ANY($1::text[])
        OR doc->>'email' LIKE 'seed.%'
        OR doc->>'universityId' = ANY($2::text[])
        OR (collection = 'university' AND doc->>'slug' = ANY($3::text[]))
    `,
    [seedEmails, universityIds, seedUniversitySlugs],
  );
}

function seedUserIds() {
  return [
    "seed-user-super-admin",
    "seed-user-campus-admin",
    "seed-user-representative",
    "seed-user-teacher",
    "seed-user-student",
    "seed-user-alumni",
    "seed-user-employer",
  ];
}

async function ensureSuperAdmin(db, now, passwordHash) {
  await upsertUser(db, {
    _id: "seed-user-super-admin",
    id: "seed-user-super-admin",
    name: "Aisha Mwanjale",
    email: "seed.superadmin@campushub.test",
    emailVerified: true,
    isVerified: true,
    username: "seed-superadmin",
    firstName: "Aisha",
    lastName: "Mwanjale",
    title: "Platform Operations Lead",
    intendedRole: "SUPER_ADMIN",
    role: "SUPER_ADMIN",
    roles: ["SUPER_ADMIN"],
    permissions: [],
    studentLeadershipPositions: [],
    position: "NONE",
    status: "ACTIVE",
    userType: "ADMIN",
    universityId: null,
    collegeId: null,
    departmentId: null,
    courseId: null,
    onboardingCompleted: true,
    twoFactorEnabled: false,
    profileCompletionPercentage: 100,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  await upsertAuthUser(db.pool, await db.collection("user").findOne({ _id: "seed-user-super-admin" }));
  await upsertCredentialAccount(db.pool, "seed-user-super-admin", passwordHash, now);
}

async function createHierarchy(cookie) {
  const university = await createResource(cookie, "/api/super-admin/universities", "university", {
    name: "University of Dar es Salaam",
    shortName: "UDSM",
    slug: "university-of-dar-es-salaam-api-seed",
    description:
      "A clean API-seeded university profile for validating CampusHub hierarchy and role access.",
    country: "Tanzania",
    region: "Dar es Salaam",
    website: "https://www.udsm.ac.tz",
    email: "registry@udsm.ac.tz",
    phone: "+255222410500",
    locationName: "University of Dar es Salaam Main Campus",
    locationAddress: "Mlimani, Dar es Salaam",
    locationLatitude: -6.7781,
    locationLongitude: 39.2056,
    status: "ACTIVE",
  });

  const coict = await createResource(cookie, "/api/super-admin/colleges", "college", {
    universityId: university.id,
    name: "College of Information and Communication Technologies",
    shortName: "CoICT",
    code: "COICT",
    description: "Computing, informatics, information systems, and communication technology programs.",
    status: "ACTIVE",
  });
  const coet = await createResource(cookie, "/api/super-admin/colleges", "college", {
    universityId: university.id,
    name: "College of Engineering and Technology",
    shortName: "CoET",
    code: "COET",
    description: "Engineering and applied technology programs for undergraduate and graduate students.",
    status: "ACTIVE",
  });

  const cse = await createResource(cookie, "/api/super-admin/departments", "department", {
    universityId: university.id,
    collegeId: coict.id,
    name: "Department of Computer Science and Engineering",
    code: "CSE",
    description: "Software engineering, computer science, data systems, and intelligent systems.",
    status: "ACTIVE",
  });
  const ete = await createResource(cookie, "/api/super-admin/departments", "department", {
    universityId: university.id,
    collegeId: coet.id,
    name: "Department of Electronics and Telecommunications Engineering",
    code: "ETE",
    description: "Electronics, telecommunications, embedded systems, and network engineering.",
    status: "ACTIVE",
  });

  const bcs = await createResource(cookie, "/api/super-admin/courses", "course", {
    universityId: university.id,
    departmentId: cse.id,
    name: "Bachelor of Science in Computer Science",
    code: "BSC-CS",
    durationYears: 3,
    description: "Core computer science degree covering programming, systems, data, and software practice.",
    status: "ACTIVE",
  });
  const bceit = await createResource(cookie, "/api/super-admin/courses", "course", {
    universityId: university.id,
    departmentId: ete.id,
    name: "Bachelor of Science in Computer Engineering and IT",
    code: "BSC-CEIT",
    durationYears: 4,
    description: "Computer engineering and information technology degree with hardware and systems depth.",
    status: "ACTIVE",
  });

  return { university, colleges: [coict, coet], departments: [cse, ete], courses: [bcs, bceit] };
}

async function createResource(cookie, path, key, body) {
  const { payload } = await apiRequest(path, { method: "POST", body, cookie });
  const resource = payload?.data?.[key];
  assert(resource?.id, `${path} did not return data.${key}.id`);
  return resource;
}

async function createCampusAdminThroughApi(cookie, universityId) {
  const { payload: invitationPayload } = await apiRequest(
    "/api/super-admin/campus-admin-invitations",
    {
      method: "POST",
      cookie,
      body: {
        universityId,
        expiresInDays: 30,
      },
    },
  );
  const invitationUrl = invitationPayload?.data?.invitation?.invitationUrl;
  assert(invitationUrl, "Campus Admin invitation API did not return an invitation URL.");
  const token = new URL(invitationUrl).pathname.split("/").filter(Boolean).at(-1);
  assert(token, "Campus Admin invitation URL did not contain a token.");

  const { payload } = await apiRequest("/api/campus-admin-invitations/activate", {
    method: "POST",
    body: {
      token,
      firstName: "Johnson",
      lastName: "Mmbaga",
      email: "seed.campus.admin@udsm.ac.tz",
      phone: "+255700000001",
      password: PASSWORD,
      confirmPassword: PASSWORD,
    },
  });
  assert(payload?.userId, "Campus Admin activation API did not return a userId.");
  return payload.userId;
}

async function seedRoleAccounts(db, hierarchy, campusAdminId, now, passwordHash) {
  const [coict] = hierarchy.colleges;
  const [cse] = hierarchy.departments;
  const [bcs] = hierarchy.courses;

  const accounts = [
    {
      _id: campusAdminId,
      name: "Johnson Mmbaga",
      email: "seed.campus.admin@udsm.ac.tz",
      username: "seed-campus-admin",
      firstName: "Johnson",
      lastName: "Mmbaga",
      title: "Campus Operations Lead",
      intendedRole: "CAMPUS_ADMIN",
      role: "CAMPUS_ADMIN",
      roles: ["CAMPUS_ADMIN"],
      userType: "ADMIN",
      universityId: hierarchy.university.id,
      collegeId: null,
      departmentId: null,
      courseId: null,
    },
    {
      _id: "seed-user-representative",
      name: "Neema Komba",
      email: "seed.representative@udsm.ac.tz",
      username: "seed-representative",
      firstName: "Neema",
      lastName: "Komba",
      title: "CoICT Student Representative",
      intendedRole: "REPRESENTATIVE",
      role: "STUDENT",
      roles: ["STUDENT"],
      studentLeadershipPositions: ["REPRESENTATIVE"],
      userType: "STUDENT",
      universityId: hierarchy.university.id,
      collegeId: coict.id,
      departmentId: cse.id,
      courseId: bcs.id,
      yearOfStudy: 2,
    },
    {
      _id: "seed-user-teacher",
      name: "Rehema Mushi",
      email: "seed.teacher@udsm.ac.tz",
      username: "seed-teacher",
      firstName: "Rehema",
      lastName: "Mushi",
      title: "Lecturer",
      intendedRole: "TEACHER",
      role: "TEACHER",
      roles: ["TEACHER"],
      userType: "STAFF",
      universityId: hierarchy.university.id,
      collegeId: coict.id,
      departmentId: cse.id,
      courseId: null,
      staffId: "UDSM-STAFF-001",
    },
    {
      _id: "seed-user-student",
      name: "Brian Massawe",
      email: "seed.student@udsm.ac.tz",
      username: "seed-student",
      firstName: "Brian",
      lastName: "Massawe",
      title: "Student",
      intendedRole: "STUDENT",
      role: "STUDENT",
      roles: ["STUDENT"],
      userType: "STUDENT",
      universityId: hierarchy.university.id,
      collegeId: coict.id,
      departmentId: cse.id,
      courseId: bcs.id,
      studentId: "UDSM-STU-001",
      yearOfStudy: 1,
    },
    {
      _id: "seed-user-alumni",
      name: "Lilian Mrope",
      email: "seed.alumni@udsm.ac.tz",
      username: "seed-alumni",
      firstName: "Lilian",
      lastName: "Mrope",
      title: "Alumni Mentor",
      intendedRole: "ALUMNI",
      role: "ALUMNI",
      roles: ["ALUMNI"],
      userType: "ALUMNI",
      universityId: hierarchy.university.id,
      collegeId: coict.id,
      departmentId: cse.id,
      courseId: bcs.id,
      graduatedAt: new Date("2024-11-15T00:00:00.000Z"),
    },
    {
      _id: "seed-user-employer",
      name: "Daniel Mwakyusa",
      email: "seed.employer@safaritech.co.tz",
      username: "seed-employer",
      firstName: "Daniel",
      lastName: "Mwakyusa",
      title: "Employer Partner",
      intendedRole: "EMPLOYER",
      role: "EMPLOYER",
      roles: ["EMPLOYER"],
      userType: "EMPLOYER",
      universityId: null,
      collegeId: null,
      departmentId: null,
      courseId: null,
    },
  ];

  for (const account of accounts) {
    const doc = buildUserDocument(account, now);
    await upsertUser(db, doc);
    await upsertAuthUser(db.pool, doc);
    await upsertCredentialAccount(db.pool, doc._id, passwordHash, now);
  }
}

function buildUserDocument(account, now) {
  return {
    id: account._id,
    emailVerified: true,
    isVerified: true,
    phone: "+255700000000",
    phoneNumber: "+255700000000",
    image: "",
    avatar: null,
    otherNames: null,
    nickname: null,
    permissions: [],
    studentLeadershipPositions: account.studentLeadershipPositions ?? [],
    position: "NONE",
    status: "ACTIVE",
    onboardingCompleted: true,
    twoFactorEnabled: false,
    profileCompletionPercentage: 100,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...account,
  };
}

async function upsertUser(db, user) {
  await db.collection("user").updateOne(
    { _id: user._id },
    {
      $set: user,
      $setOnInsert: {
        _id: user._id,
        id: user.id ?? user._id,
      },
    },
    { upsert: true },
  );
}

async function upsertAuthUser(pool, user) {
  await pool.query(
    `
      INSERT INTO "user" (
        "id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt",
        "intendedRole", "role", "username", "firstName", "lastName", "otherNames",
        "nickname", "avatar", "phoneNumber", "position", "status", "isVerified",
        "profileCompletionPercentage", "roles", "permissions",
        "studentLeadershipPositions", "universityId", "collegeId", "departmentId",
        "onboardingCompleted", "twoFactorEnabled"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21::jsonb, $22::jsonb,
        $23::jsonb, $24, $25, $26,
        $27, $28
      )
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "email" = EXCLUDED."email",
        "emailVerified" = EXCLUDED."emailVerified",
        "image" = EXCLUDED."image",
        "updatedAt" = EXCLUDED."updatedAt",
        "intendedRole" = EXCLUDED."intendedRole",
        "role" = EXCLUDED."role",
        "username" = EXCLUDED."username",
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "otherNames" = EXCLUDED."otherNames",
        "nickname" = EXCLUDED."nickname",
        "avatar" = EXCLUDED."avatar",
        "phoneNumber" = EXCLUDED."phoneNumber",
        "position" = EXCLUDED."position",
        "status" = EXCLUDED."status",
        "isVerified" = EXCLUDED."isVerified",
        "profileCompletionPercentage" = EXCLUDED."profileCompletionPercentage",
        "roles" = EXCLUDED."roles",
        "permissions" = EXCLUDED."permissions",
        "studentLeadershipPositions" = EXCLUDED."studentLeadershipPositions",
        "universityId" = EXCLUDED."universityId",
        "collegeId" = EXCLUDED."collegeId",
        "departmentId" = EXCLUDED."departmentId",
        "onboardingCompleted" = EXCLUDED."onboardingCompleted",
        "twoFactorEnabled" = EXCLUDED."twoFactorEnabled"
    `,
    [
      user._id,
      user.name,
      user.email,
      Boolean(user.emailVerified),
      user.image ?? user.avatar ?? null,
      user.createdAt ?? new Date(),
      user.updatedAt ?? new Date(),
      user.intendedRole ?? user.role ?? "STUDENT",
      user.role ?? "STUDENT",
      user.username ?? null,
      user.firstName ?? null,
      user.lastName ?? null,
      user.otherNames ?? null,
      user.nickname ?? null,
      user.avatar ?? null,
      user.phoneNumber ?? user.phone ?? null,
      user.position ?? "NONE",
      user.status ?? "ACTIVE",
      Boolean(user.isVerified),
      user.profileCompletionPercentage ?? 100,
      JSON.stringify(user.roles ?? [user.role ?? "STUDENT"]),
      JSON.stringify(user.permissions ?? []),
      JSON.stringify(user.studentLeadershipPositions ?? []),
      user.universityId ?? null,
      user.collegeId ?? null,
      user.departmentId ?? null,
      Boolean(user.onboardingCompleted),
      Boolean(user.twoFactorEnabled),
    ],
  );
}

async function upsertCredentialAccount(pool, userId, passwordHash, now) {
  await pool.query(
    `
      INSERT INTO "account" (
        "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, 'credential', $2, $3, $4, $4)
      ON CONFLICT ("id") DO UPDATE SET
        "accountId" = EXCLUDED."accountId",
        "providerId" = EXCLUDED."providerId",
        "userId" = EXCLUDED."userId",
        "password" = EXCLUDED."password",
        "updatedAt" = EXCLUDED."updatedAt"
    `,
    [`seed-account-${userId}`, userId, passwordHash, now],
  );
}

async function verifyHierarchy(cookie, hierarchy) {
  const checks = [
    ["/api/super-admin/universities", "universities", hierarchy.university.id],
    ["/api/super-admin/colleges", "colleges", hierarchy.colleges[0].id],
    ["/api/super-admin/departments", "departments", hierarchy.departments[0].id],
    ["/api/super-admin/courses", "courses", hierarchy.courses[0].id],
  ];

  for (const [path, key, id] of checks) {
    const { payload } = await apiRequest(path, { cookie });
    const rows = payload?.data?.[key] ?? [];
    assert(rows.some((row) => row.id === id), `${path} did not include seeded ${id}`);
  }

  const { payload: campusAdminPayload } = await apiRequest(
    `/api/universities/${hierarchy.university.id}/campus-admins`,
    { cookie },
  );
  assert(
    campusAdminPayload?.data?.campusAdmins?.some(
      (user) => user.email === "seed.campus.admin@udsm.ac.tz",
    ),
    "University campus admin API did not include the seeded Campus Admin account.",
  );
}

async function verifyAccountPasswords(db) {
  const summary = [];
  for (const email of seedEmails) {
    const user = await db.collection("user").findOne({ email });
    assert(user, `Missing seeded account document for ${email}`);
    const result = await db.pool.query(
      `SELECT "password" FROM "account" WHERE "providerId" = 'credential' AND "accountId" = $1 LIMIT 1`,
      [user._id],
    );
    const password = result.rows[0]?.password;
    assert(password, `Missing credential account for ${email}`);
    const verified = await verifyPassword({ hash: password, password: PASSWORD });
    assert(verified, `Password verification failed for ${email}`);
    summary.push({ role: user.intendedRole, email, hierarchy: user.universityId ?? "platform" });
  }
  return summary;
}

async function main() {
  await loadEnv();
  const db = await createPgSeedDb();
  const now = new Date();
  const passwordHash = await hashPassword(PASSWORD);

  try {
    await resetSeedData(db);
    await ensureSuperAdmin(db, now, passwordHash);

    const cookie = await signInAsSuperAdmin();
    const hierarchy = await createHierarchy(cookie);
    const campusAdminId = await createCampusAdminThroughApi(cookie, hierarchy.university.id);
    await seedRoleAccounts(db, hierarchy, campusAdminId, now, passwordHash);
    await verifyHierarchy(cookie, hierarchy);
    const accounts = await verifyAccountPasswords(db);

    console.table([
      { item: "universities", count: 1 },
      { item: "colleges", count: hierarchy.colleges.length },
      { item: "departments", count: hierarchy.departments.length },
      { item: "courses", count: hierarchy.courses.length },
      { item: "roleAccounts", count: accounts.length },
    ]);
    console.table(accounts);
    console.log(`Shared password: ${PASSWORD}`);
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
