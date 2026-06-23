/* global console, process */
import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const at = (days, hour = 9, minute = 0) => {
  const date = new Date(now.getTime() + days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date;
};
const past = (days, hour = 10, minute = 0) => at(-days, hour, minute);

async function loadEnv() {
  try {
    const env = await readFile(".env", "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...parts] = trimmed.split("=");
      if (process.env[key]) continue;
      process.env[key] = parts.join("=").replace(/^["']|["']$/g, "");
    }
  } catch {
    // The script can still run when env vars are supplied externally.
  }
}

function withoutId(doc) {
  const rest = { ...doc };
  delete rest._id;
  delete rest.createdAt;
  return rest;
}

async function ensure(db, collectionName, filter, doc) {
  const collection = db.collection(collectionName);
  const existing = await collection.findOne(filter, { projection: { _id: 1 } });
  if (existing) {
    await collection.updateOne(
      { _id: existing._id },
      { $set: { ...withoutId(doc), updatedAt: now } },
    );
    return existing._id;
  }

  await collection.insertOne({ ...doc, createdAt: doc.createdAt ?? now, updatedAt: now });
  return doc._id;
}

async function ensureById(db, collectionName, doc) {
  return ensure(db, collectionName, { _id: doc._id }, doc);
}

async function seed() {
  await loadEnv();

  const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/campushub";
  const dbName = process.env.MONGODB_DB_NAME ?? "campushub";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const universityId = await ensure(
    db,
    "university",
    { slug: "university-of-dar-es-salaam" },
    {
      _id: "seed-uni-udsm",
      name: "University of Dar es Salaam",
      slug: "university-of-dar-es-salaam",
      shortName: "UDSM",
      domain: "udsm.ac.tz",
      country: "Tanzania",
      region: "Dar es Salaam",
      city: "Dar es Salaam",
      timezone: "Africa/Dar_es_Salaam",
      website: "https://www.udsm.ac.tz",
      email: "info@udsm.ac.tz",
      contactEmail: "info@udsm.ac.tz",
      phone: "+255222410500",
      locationName: "Mlimani Campus",
      locationAddress: "University Road, Dar es Salaam",
      locationLatitude: -6.77818,
      locationLongitude: 39.206573,
      description:
        "A public university with active student leadership, academic programs, innovation activity, and campus marketplace services.",
      subscriptionPlan: "ENTERPRISE",
      subscriptionStatus: "ACTIVE",
      settings: {
        employerAccessEnabled: true,
        employerShowcaseEnabled: true,
        marketplaceEnabled: true,
        publicProjectsEnabled: true,
        campusMapEnabled: true,
      },
      status: "ACTIVE",
    },
  );

  const collegeId = await ensure(
    db,
    "college",
    { universityId, code: "COICT" },
    {
      _id: "seed-college-coict",
      universityId,
      name: "College of Information and Communication Technology",
      shortName: "CoICT",
      code: "COICT",
      slug: "coict",
      description: "Computing, communications, software engineering, and innovation programs.",
      status: "ACTIVE",
    },
  );

  await ensure(
    db,
    "college",
    { universityId, code: "UDBS" },
    {
      _id: "seed-college-udbs",
      universityId,
      name: "University of Dar es Salaam Business School",
      shortName: "UDBS",
      code: "UDBS",
      slug: "udbs",
      description: "Business, entrepreneurship, procurement, and management programs.",
      status: "ACTIVE",
    },
  );

  const cseDepartmentId = await ensure(
    db,
    "department",
    { universityId, code: "CSE" },
    {
      _id: "seed-dept-cse",
      universityId,
      collegeId,
      name: "Computer Science and Engineering",
      code: "CSE",
      slug: "computer-science-and-engineering",
      description: "Software systems, computer engineering, networks, AI, and data science.",
      status: "ACTIVE",
    },
  );

  await ensure(
    db,
    "department",
    { universityId, code: "ETE" },
    {
      _id: "seed-dept-ete",
      universityId,
      collegeId,
      name: "Electronics and Telecommunication Engineering",
      code: "ETE",
      slug: "electronics-and-telecommunication-engineering",
      description: "Electronics, embedded systems, signal processing, and telecommunication networks.",
      status: "ACTIVE",
    },
  );

  const csCourseId = await ensure(
    db,
    "course",
    { universityId, code: "BSC-CS" },
    {
      _id: "seed-course-cs",
      universityId,
      collegeId,
      departmentId: cseDepartmentId,
      name: "Bachelor of Science in Computer Science",
      code: "BSC-CS",
      slug: "bsc-computer-science",
      durationYears: 3,
      description: "Core computer science degree covering software, systems, AI, and data.",
      status: "ACTIVE",
    },
  );

  const ceCourseId = await ensure(
    db,
    "course",
    { universityId, code: "BSC-CE" },
    {
      _id: "seed-course-ce",
      universityId,
      collegeId,
      departmentId: cseDepartmentId,
      name: "Bachelor of Science in Computer Engineering",
      code: "BSC-CE",
      slug: "bsc-computer-engineering",
      durationYears: 4,
      description: "Computer engineering degree covering hardware, networks, embedded systems, and software.",
      status: "ACTIVE",
    },
  );

  const users = {
    superAdmin: await ensure(db, "user", { email: "seed.superadmin@campushub.test" }, userDoc({
      _id: "seed-user-superadmin",
      firstName: "Aisha",
      lastName: "Mwanjale",
      email: "seed.superadmin@campushub.test",
      role: "SUPER_ADMIN",
      roles: ["SUPER_ADMIN"],
      title: "Platform Operations Lead",
    })),
    campusAdmin: await ensure(db, "user", { email: "seed.campus.admin@udsm.ac.tz" }, userDoc({
      _id: "seed-user-campus-admin",
      firstName: "Johnson",
      lastName: "Mmbaga",
      email: "seed.campus.admin@udsm.ac.tz",
      role: "CAMPUS_ADMIN",
      roles: ["CAMPUS_ADMIN"],
      title: "Campus Operations Lead",
      universityId,
      collegeId,
      departmentId: cseDepartmentId,
    })),
    representative: await ensure(db, "user", { email: "seed.representative@udsm.ac.tz" }, userDoc({
      _id: "seed-user-representative",
      firstName: "Adolf",
      lastName: "Alfred",
      email: "seed.representative@udsm.ac.tz",
      role: "STUDENT",
      roles: ["STUDENT"],
      position: "REPRESENTATIVE",
      universityId,
      collegeId,
      departmentId: cseDepartmentId,
      courseId: csCourseId,
      yearOfStudy: 2,
    })),
    teacher: await ensure(db, "user", { email: "seed.teacher@udsm.ac.tz" }, userDoc({
      _id: "seed-user-teacher",
      firstName: "Hassan",
      lastName: "Omar Waziri",
      email: "seed.teacher@udsm.ac.tz",
      role: "TEACHER",
      roles: ["TEACHER"],
      title: "Lecturer",
      universityId,
      collegeId,
      departmentId: cseDepartmentId,
    })),
    student: await ensure(db, "user", { email: "seed.student@udsm.ac.tz" }, userDoc({
      _id: "seed-user-student-fatima",
      firstName: "Fatima",
      lastName: "Juma",
      email: "seed.student@udsm.ac.tz",
      role: "STUDENT",
      roles: ["STUDENT"],
      universityId,
      collegeId,
      departmentId: cseDepartmentId,
      courseId: csCourseId,
      yearOfStudy: 2,
    })),
    studentTwo: await ensure(db, "user", { email: "seed.student.two@udsm.ac.tz" }, userDoc({
      _id: "seed-user-student-amina",
      firstName: "Amina",
      lastName: "Said",
      email: "seed.student.two@udsm.ac.tz",
      role: "STUDENT",
      roles: ["STUDENT"],
      universityId,
      collegeId,
      departmentId: cseDepartmentId,
      courseId: ceCourseId,
      yearOfStudy: 3,
    })),
    alumni: await ensure(db, "user", { email: "seed.alumni@udsm.ac.tz" }, userDoc({
      _id: "seed-user-alumni",
      firstName: "Irene",
      lastName: "Brooks",
      email: "seed.alumni@udsm.ac.tz",
      role: "ALUMNI",
      roles: ["ALUMNI"],
      title: "Product Designer",
      universityId,
      collegeId,
      departmentId: cseDepartmentId,
      courseId: csCourseId,
      graduatedAt: past(400),
      expectedGraduationYear: 2024,
    })),
    employer: await ensure(db, "user", { email: "seed.employer@safaritech.co.tz" }, userDoc({
      _id: "seed-user-employer",
      firstName: "Grace",
      lastName: "Mtei",
      email: "seed.employer@safaritech.co.tz",
      role: "EMPLOYER",
      roles: ["EMPLOYER"],
      userType: "EMPLOYER",
      title: "Talent Partner",
    })),
  };

  await ensureById(db, "representative", {
    _id: "seed-representative-adolf",
    userId: users.representative,
    universityId,
    collegeId,
    title: "CoICT Student Representative",
    status: "ACTIVE",
  });

  await Promise.all([
    ensureById(db, "student", studentDoc("seed-student-fatima", users.student, "Fatima", "Juma", 2, csCourseId, users.representative, universityId, collegeId, cseDepartmentId)),
    ensureById(db, "student", studentDoc("seed-student-amina", users.studentTwo, "Amina", "Said", 3, ceCourseId, users.representative, universityId, collegeId, cseDepartmentId)),
    ensureById(db, "student", studentDoc("seed-student-rep-adolf", users.representative, "Adolf", "Alfred", 2, csCourseId, users.representative, universityId, collegeId, cseDepartmentId)),
  ]);

  const locations = [
    ["seed-location-hall-1", "Hall of Residence 1", "HOSTEL", "Hall-1", -6.77818, 39.206573],
    ["seed-location-library", "UDSM Main Library", "LIBRARY", "LIB-1", -6.77976, 39.20785],
    ["seed-location-coict", "CoICT Innovation Hub", "ACADEMIC", "COICT-HUB", -6.77592, 39.20291],
    ["seed-location-health", "University Health Centre", "HEALTH", "UHC", -6.77704, 39.21056],
    ["seed-location-cafeteria", "Mlimani Cafeteria", "CAFETERIA", "CAF-1", -6.78038, 39.20544],
  ];
  for (const [id, name, category, code, latitude, longitude] of locations) {
    await ensureById(db, "map_locations", {
      _id: id,
      universityId,
      name,
      category,
      description: `${name} campus point.`,
      latitude,
      longitude,
      coordinates: { type: "Point", coordinates: [longitude, latitude] },
      buildingCode: code,
      openingHours: "08:00-20:00",
      contactInformation: "+255222410500",
      createdBy: users.campusAdmin,
      views: 32,
      uniqueViews: 18,
      directionRequests: 7,
      navigation: { walkingEnabled: true, drivingEnabled: true },
      status: "ACTIVE",
    });
  }

  const almanacId = await ensureById(db, "almanacs", {
    _id: "seed-almanac-2026-2027-s1",
    universityId,
    title: "2026/2027 Semester 1 Almanac",
    description: "Academic calendar for registration, classes, assessments, exams, and deadlines.",
    academicYear: "2026/2027",
    semester: "Semester 1",
    status: "ACTIVE",
  });

  const almanacEvents = [
    ["seed-almanac-event-registration", "Course registration opens", "REGISTRATION", 1, false],
    ["seed-almanac-event-add-drop", "Add/drop deadline", "REGISTRATION", 8, true],
    ["seed-almanac-event-midterm", "Mid-semester examinations", "EXAMINATION", 21, false],
    ["seed-almanac-event-final", "Final examination period", "EXAMINATION", 55, false],
  ];
  for (const [id, title, eventType, days, isDeadline] of almanacEvents) {
    await ensureById(db, "almanac_events", {
      _id: id,
      universityId,
      almanacId,
      academicYear: "2026/2027",
      semester: "Semester 1",
      title,
      description: `${title} for active CoICT students.`,
      eventType,
      startDate: at(days, 8),
      endDate: at(days, 17),
      isAllDay: false,
      isDeadline,
      visibility: "ALL_USERS",
      collegeIds: [collegeId],
      color: isDeadline ? "#ef4444" : "#4f46e5",
      createdBy: users.campusAdmin,
      reminders: [{ offsetHours: 24, channel: "IN_APP", enabled: true }],
      views: 41,
      uniqueViews: 24,
      status: "ACTIVE",
    });
  }

  await upsertGenerated(db, "announcements", [
    announcement("seed-announcement-registration", universityId, users.campusAdmin, "Registration portal opens tomorrow", "ACADEMICS", "Published registration guidance for all continuing students.", 1),
    announcement("seed-announcement-career-fair", universityId, users.campusAdmin, "CoICT career fair exhibitors confirmed", "CAREER", "Employers from fintech, healthtech, and telecom will attend.", 2),
    announcement("seed-announcement-health", universityId, users.campusAdmin, "Health centre extended hours", "HEALTH", "The university health centre is extending evening service during exams.", 3),
    announcement("seed-announcement-clubs", universityId, users.representative, "Developer Student Club onboarding", "CLUBS", "Students can join mentorship circles and weekend build sessions.", 4),
  ]);

  const eventIds = await upsertGenerated(db, "events", [
    event("seed-event-innovation-week", universityId, users.campusAdmin, "UDSM Innovation Week", "WORKSHOP", "CoICT Innovation Hub", "seed-location-coict", -6.77592, 39.20291, 5),
    event("seed-event-career-fair", universityId, users.employer, "Tech Career Fair", "CAREER", "UDSM Main Library", "seed-location-library", -6.77976, 39.20785, 9),
    event("seed-event-ai-seminar", universityId, users.teacher, "Applied AI Research Seminar", "SEMINAR", "CoICT Innovation Hub", "seed-location-coict", -6.77592, 39.20291, 14),
    event("seed-event-sports", universityId, users.representative, "Inter-college Sports Bonanza", "SPORTS", "University Sports Grounds", null, -6.78211, 39.20821, 18),
  ]);

  await upsertGenerated(db, "event_attendance", [
    attendance("seed-attendance-innovation-fatima", universityId, eventIds[0], users.student),
    attendance("seed-attendance-innovation-amina", universityId, eventIds[0], users.studentTwo),
    attendance("seed-attendance-career-alumni", universityId, eventIds[1], users.alumni),
  ]);

  const forumId = await ensureById(db, "forums", {
    _id: "seed-forum-coict-general",
    universityId,
    collegeId,
    departmentId: cseDepartmentId,
    name: "CoICT General",
    slug: "coict-general",
    description: "Academic questions, announcements, student leadership discussions, and project collaboration.",
    icon: "messages-square",
    color: "#4f46e5",
    moderatorIds: [users.representative],
    topicCount: 3,
    replyCount: 5,
    visibility: "UNIVERSITY",
    status: "ACTIVE",
  });

  await upsertGenerated(db, "forum_topics", [
    topic("seed-topic-registration-help", universityId, forumId, users.student, "How do I confirm course registration?", "I can see the almanac event, but I want to confirm the final registration steps.", 6),
    topic("seed-topic-project-team", universityId, forumId, users.studentTwo, "Looking for teammates for an AI health project", "I am building a triage assistant prototype and need a backend collaborator.", 11),
    topic("seed-topic-library-hours", universityId, forumId, users.representative, "Library study hours during exam season", "The library will remain open later during assessment weeks.", 18),
  ]);
  await upsertGenerated(db, "forum_replies", [
    reply("seed-reply-registration-teacher", universityId, "seed-topic-registration-help", users.teacher, "Confirm from the student portal and keep the generated registration receipt."),
    reply("seed-reply-project-alumni", universityId, "seed-topic-project-team", users.alumni, "I can review the UX flow and help with product framing."),
  ]);

  await upsertGenerated(db, "polls", [
    poll("seed-poll-workshop", universityId, users.representative, "Which workshop should run next?", ["React Native", "AI APIs", "Cybersecurity basics"], 3),
    poll("seed-poll-library", universityId, users.campusAdmin, "Preferred library support window", ["Morning", "Afternoon", "Evening"], 6),
  ]);
  await upsertGenerated(db, "poll_votes", [
    vote("seed-vote-workshop-fatima", universityId, "seed-poll-workshop", users.student, "option-2"),
    vote("seed-vote-workshop-amina", universityId, "seed-poll-workshop", users.studentTwo, "option-1"),
    vote("seed-vote-library-adolf", universityId, "seed-poll-library", users.representative, "option-3"),
  ]);

  await upsertGenerated(db, "suggestions", [
    suggestion("seed-suggestion-wifi", universityId, users.student, "Improve Wi-Fi near Hall 1", "Network coverage drops during evening study hours.", "IN_PROGRESS"),
    suggestion("seed-suggestion-lab", universityId, users.studentTwo, "Add more lab booking slots", "Final year project students need more evening lab slots.", "OPEN"),
    suggestion("seed-suggestion-cafeteria", universityId, users.representative, "Publish cafeteria menu earlier", "Students want meal options before leaving class.", "RESOLVED"),
  ]);

  await upsertGenerated(db, "lost_found_items", [
    lostFound("seed-lost-id", universityId, users.student, "Lost student ID card", "LOST", "Documents", "UDSM Main Library", "OPEN", "+255712000001"),
    lostFound("seed-found-laptop-charger", universityId, users.representative, "Found laptop charger", "FOUND", "Electronics", "CoICT Innovation Hub", "MATCHED", "+255713000002"),
    lostFound("seed-lost-wallet", universityId, users.studentTwo, "Lost black wallet", "LOST", "Personal Items", "Mlimani Cafeteria", "UNDER_REVIEW", "+255714000003"),
  ]);

  const projectIds = await upsertGenerated(db, "projects", [
    project("seed-project-crop", universityId, users.student, collegeId, cseDepartmentId, "Crop Disease Detection", "AI-powered crop disease screening for smallholder farmers.", 142, 26),
    project("seed-project-routing", universityId, users.representative, collegeId, cseDepartmentId, "Campus Route Navigator", "Campus wayfinding with accessible walking and driving route previews.", 211, 41),
    project("seed-project-market", universityId, users.studentTwo, collegeId, cseDepartmentId, "Student Marketplace Trust Layer", "Verification and order signal layer for student sellers.", 98, 19),
    project("seed-project-health", universityId, users.alumni, collegeId, cseDepartmentId, "Clinic Queue Insights", "Operational dashboard for university health centre queues.", 176, 34),
  ]);

  await db.collection("project_analytics").deleteMany({
    _id: { $regex: "^seed-project-analytics-" },
    projectId: { $in: projectIds },
  });

  for (let i = 0; i < projectIds.length; i += 1) {
    await ensureById(db, "project_documents", {
      _id: `seed-project-doc-${i + 1}`,
      universityId,
      projectId: projectIds[i],
      uploadedById: i === 1 ? users.representative : users.student,
      title: "Project brief",
      fileUrl: `/uploads/seed/project-${i + 1}.pdf`,
      fileType: "PDF",
      fileSize: 248000,
      downloadCount: 8 + i,
      visibility: "PUBLIC",
      status: "ACTIVE",
    });
    for (let d = 6; d >= 0; d -= 1) {
      const analyticsDate = past(d);

      await ensure(
        db,
        "project_analytics",
        { projectId: projectIds[i], date: analyticsDate },
        {
        _id: `seed-project-analytics-${i + 1}-${d}`,
        universityId,
        projectId: projectIds[i],
        date: analyticsDate,
        views: 10 + i * 4 + d,
        uniqueViews: 6 + i * 3 + d,
        stars: i + (d % 3),
        linkClicks: 3 + i,
        documentClicks: 2 + i,
        repositoryClicks: 1 + i,
        shares: d % 2,
        documentDownloads: 1 + (d % 4),
        referrers: { direct: 4 + d, employer: 2 + i },
        },
      );
    }
  }

  await upsertGenerated(db, "project_stars", [
    star("seed-star-crop-teacher", universityId, projectIds[0], users.teacher),
    star("seed-star-routing-employer", universityId, projectIds[1], users.employer),
    star("seed-star-market-alumni", universityId, projectIds[2], users.alumni),
  ]);
  await upsertGenerated(db, "project_views", [
    view("seed-view-crop-employer", universityId, projectIds[0], users.employer),
    view("seed-view-routing-teacher", universityId, projectIds[1], users.teacher),
    view("seed-view-market-employer", universityId, projectIds[2], users.employer),
  ]);

  const shopIds = await upsertGenerated(db, "shops", [
    shop("seed-shop-campus-bites", universityId, users.student, "Campus Bites", "Snacks, quick meals, and class delivery within UDSM.", "Food"),
    shop("seed-shop-gadget-hub", universityId, users.representative, "Gadget Hub", "Chargers, cables, laptop accessories, and quick repairs.", "Electronics"),
  ]);
  const productIds = await upsertGenerated(db, "products", [
    product("seed-product-sandwich", universityId, shopIds[0], users.student, "Chicken sandwich", "Fresh sandwich delivered around CoICT.", "Food", 3500),
    product("seed-product-juice", universityId, shopIds[0], users.student, "Fresh mango juice", "Cold mango juice for afternoon classes.", "Food", 2000),
    product("seed-product-usb-c", universityId, shopIds[1], users.representative, "USB-C charging cable", "Durable braided USB-C cable.", "Electronics", 12000),
    product("seed-product-laptop-clean", universityId, shopIds[1], users.representative, "Laptop cleaning service", "Keyboard, screen, and fan cleaning by appointment.", "Service", 10000),
  ]);
  await upsertGenerated(db, "order_requests", [
    orderRequest("seed-order-sandwich-amina", universityId, productIds[0], shopIds[0], users.studentTwo, users.student),
    orderRequest("seed-order-cable-fatima", universityId, productIds[2], shopIds[1], users.student, users.representative),
  ]);

  const opportunityIds = await upsertGenerated(db, "opportunities", [
    opportunity("seed-opportunity-internship", universityId, users.employer, "Software Engineering Internship", "Safaritech is hiring interns for platform engineering.", "INTERNSHIP", 14, [collegeId], [cseDepartmentId]),
    opportunity("seed-opportunity-data", universityId, users.employer, "Junior Data Analyst", "Entry-level analytics role for graduates and final year students.", "JOB", 21, [collegeId], [cseDepartmentId]),
    opportunity("seed-opportunity-hackathon", universityId, users.employer, "Open Innovation Hackathon", "Build civic-tech prototypes with mentors and employer judges.", "COMPETITION", 10, [collegeId], [cseDepartmentId]),
  ]);
  await upsertGenerated(db, "applications", [
    application("seed-application-internship-fatima", universityId, opportunityIds[0], users.student, "UNDER_REVIEW"),
    application("seed-application-data-alumni", universityId, opportunityIds[1], users.alumni, "SHORTLISTED"),
  ]);
  await upsertGenerated(db, "career_profiles", [
    careerProfile("seed-career-fatima", universityId, users.student, "Software engineering student", 82, csCourseId),
    careerProfile("seed-career-amina", universityId, users.studentTwo, "Computer engineering builder", 74, ceCourseId),
    careerProfile("seed-career-irene", universityId, users.alumni, "Product designer and startup mentor", 91, csCourseId),
  ]);
  await upsertGenerated(db, "saved_candidates", [
    {
      _id: "seed-saved-candidate-fatima",
      universityId,
      savedById: users.employer,
      employerId: users.employer,
      candidateUserId: users.student,
      candidateId: users.student,
      opportunityId: opportunityIds[0],
      notes: "Strong AI project portfolio.",
      status: "ACTIVE",
    },
    {
      _id: "seed-saved-candidate-irene",
      universityId,
      savedById: users.employer,
      employerId: users.employer,
      candidateUserId: users.alumni,
      candidateId: users.alumni,
      opportunityId: opportunityIds[1],
      notes: "Relevant product analytics experience.",
      status: "ACTIVE",
    },
  ]);

  await upsertGenerated(db, "student_documents", [
    studentDocument("seed-doc-fatima-cv", universityId, users.student, collegeId, cseDepartmentId, csCourseId, "CV", "Fatima Juma CV", "fatima-cv.pdf"),
    studentDocument("seed-doc-fatima-national-id", universityId, users.student, collegeId, cseDepartmentId, csCourseId, "NATIONAL_ID", "National ID", "fatima-national-id.pdf"),
    studentDocument("seed-doc-fatima-olevel", universityId, users.student, collegeId, cseDepartmentId, csCourseId, "O_LEVEL_CERTIFICATE", "O-Level Certificate", "fatima-olevel.pdf"),
    studentDocument("seed-doc-fatima-alevel", universityId, users.student, collegeId, cseDepartmentId, csCourseId, "A_LEVEL_CERTIFICATE", "A-Level Certificate", "fatima-alevel.pdf"),
    studentDocument("seed-doc-fatima-birth", universityId, users.student, collegeId, cseDepartmentId, csCourseId, "BIRTH_CERTIFICATE", "Birth Certificate", "fatima-birth-certificate.pdf"),
    studentDocument("seed-doc-adolf-cv", universityId, users.representative, collegeId, cseDepartmentId, csCourseId, "CV", "Representative CV", "adolf-cv.pdf"),
  ]);

  const badgeIds = await upsertGenerated(db, "badges", [
    badge("seed-badge-innovator", universityId, "Campus Innovator", "Awarded for publishing a showcase project.", "sparkles", 50),
    badge("seed-badge-helper", universityId, "Community Helper", "Awarded for useful forum replies.", "handshake", 30),
    badge("seed-badge-streak", universityId, "Streak Keeper", "Awarded for maintaining a study streak.", "flame", 25),
  ]);
  const achievementIds = await upsertGenerated(db, "achievements", [
    achievement("seed-achievement-first-project", universityId, "First Project Published", "Publish your first student project.", 100),
    achievement("seed-achievement-career-ready", universityId, "Career Ready", "Complete profile and upload required documents.", 150),
  ]);
  await upsertGenerated(db, "user_badges", [
    userBadge("seed-user-badge-fatima-innovator", universityId, users.student, badgeIds[0]),
    userBadge("seed-user-badge-adolf-helper", universityId, users.representative, badgeIds[1]),
    userBadge("seed-user-badge-amina-streak", universityId, users.studentTwo, badgeIds[2]),
  ]);
  await upsertGenerated(db, "user_achievements", [
    userAchievement("seed-user-achievement-fatima-project", universityId, users.student, achievementIds[0], 100, 100, "COMPLETED"),
    userAchievement("seed-user-achievement-amina-career", universityId, users.studentTwo, achievementIds[1], 70, 100, "IN_PROGRESS"),
  ]);
  await upsertGenerated(db, "user_xp_profiles", [
    xpProfile("seed-xp-fatima", universityId, users.student, 840, 4, 1),
    xpProfile("seed-xp-adolf", universityId, users.representative, 760, 4, 2),
    xpProfile("seed-xp-amina", universityId, users.studentTwo, 610, 3, 3),
    xpProfile("seed-xp-irene", universityId, users.alumni, 540, 3, 4),
  ]);
  await upsertGenerated(db, "xp_transactions", [
    xp("seed-xp-tx-fatima-project", universityId, users.student, "PROJECT_PUBLISHED", 100, projectIds[0]),
    xp("seed-xp-tx-adolf-poll", universityId, users.representative, "POLL_CREATED", 25, "seed-poll-workshop"),
    xp("seed-xp-tx-amina-streak", universityId, users.studentTwo, "STREAK_MAINTAINED", 15, "seed-streak-amina"),
  ]);
  await upsertGenerated(db, "streaks", [
    streak("seed-streak-fatima", universityId, users.student, 5, 9),
    streak("seed-streak-amina", universityId, users.studentTwo, 3, 7),
  ]);
  await upsertGenerated(db, "reward_events", [
    rewardEvent("seed-reward-fatima-badge", universityId, users.student, "BADGE_EARNED", "Campus Innovator unlocked", "You earned Campus Innovator for publishing a project.", 50),
    rewardEvent("seed-reward-amina-streak", universityId, users.studentTwo, "XP_EARNED", "3 day streak", "You earned XP for keeping your study streak.", 15),
  ]);

  await upsertGenerated(db, "notifications", [
    notification("seed-notif-registration-fatima", universityId, users.student, users.campusAdmin, "ALMANAC_REMINDER", "Course registration opens tomorrow", "Your registration window opens tomorrow at 08:00.", "/student/almanac", "HIGH"),
    notification("seed-notif-event-teacher", universityId, users.teacher, users.campusAdmin, "EVENT_REMINDER", "Applied AI Research Seminar", "You have an upcoming seminar at CoICT Innovation Hub.", "/teacher/events", "NORMAL"),
    notification("seed-notif-announcement-adolf", universityId, users.representative, users.campusAdmin, "ANNOUNCEMENT", "Career fair exhibitors confirmed", "Review the employer list and share it with students.", "/representative/announcements", "NORMAL"),
    notification("seed-notif-project-star-fatima", universityId, users.student, users.employer, "PROJECT_STAR", "Your project was starred", "Safaritech saved Crop Disease Detection.", "/student/showcase", "NORMAL"),
    notification("seed-notif-order-seller", universityId, users.student, users.studentTwo, "ORDER", "New marketplace order", "Amina requested Chicken sandwich from Campus Bites.", "/student/my-shop", "HIGH"),
    notification("seed-notif-superadmin", universityId, users.superAdmin, users.campusAdmin, "SYSTEM", "UDSM activity seeded", "CampusHub has live UDSM records across core modules.", "/super-admin/analytics", "NORMAL"),
  ]);

  await upsertGenerated(db, "activity_feed", [
    activity("seed-activity-project", universityId, users.student, "PROJECT_CREATED", "Crop Disease Detection was published", "SHOWCASE", "projects", projectIds[0]),
    activity("seed-activity-event", universityId, users.campusAdmin, "EVENT_CREATED", "UDSM Innovation Week was scheduled", "ACADEMIC", "events", eventIds[0]),
    activity("seed-activity-product", universityId, users.representative, "PRODUCT_CREATED", "USB-C charging cable added to Gadget Hub", "MARKETPLACE", "products", productIds[2]),
    activity("seed-activity-badge", universityId, users.student, "BADGE_EARNED", "Fatima earned Campus Innovator", "ACHIEVEMENT", "badges", badgeIds[0]),
  ]);

  await seedExpandedCampusData(db, {
    universityId,
    collegeId,
    cseDepartmentId,
    csCourseId,
    ceCourseId,
    users,
    almanacId,
    forumId,
    eventIds,
    projectIds,
    shopIds,
    productIds,
    opportunityIds,
    badgeIds,
    achievementIds,
  });

  await seedAuditLogs(db, universityId, users);

  const collections = [
    "university",
    "college",
    "department",
    "course",
    "user",
    "student",
    "announcements",
    "events",
    "almanacs",
    "almanac_events",
    "map_locations",
    "forums",
    "forum_topics",
    "polls",
    "lost_found_items",
    "projects",
    "shops",
    "products",
    "opportunities",
    "student_documents",
    "notifications",
    "activity_feed",
    "audit_logs",
  ];

  const summary = {};
  for (const name of collections) {
    summary[name] = await db.collection(name).countDocuments({ universityId });
  }
  summary.university = await db.collection("university").countDocuments({ _id: universityId });
  summary.user = await db.collection("user").countDocuments({
    email: { $regex: /^seed\./ },
  });

  await client.close();
  console.table(summary);
}

function userDoc(input) {
  const name = `${input.firstName} ${input.lastName}`;
  return {
    _id: input._id,
    name,
    email: input.email,
    username: input.email.split("@")[0].replace(/\./g, "-"),
    firstName: input.firstName,
    lastName: input.lastName,
    title: input.title,
    phone: input.phone ?? "+255700000000",
    phoneNumber: input.phone ?? "+255700000000",
    bio: input.bio ?? `${name} is active on CampusHub.`,
    image: input.image ?? "",
    coverImage: input.coverImage ?? "",
    profileSticker: "kibo-spark",
    gender: "NOT_SET",
    dateOfBirth: input.dateOfBirth ?? new Date("2001-06-12T00:00:00.000Z"),
    primaryUniversityId: input.universityId,
    primaryDepartmentId: input.departmentId,
    universityId: input.universityId,
    collegeId: input.collegeId,
    departmentId: input.departmentId,
    courseId: input.courseId,
    yearOfStudy: input.yearOfStudy,
    enrollmentYear: input.enrollmentYear ?? 2024,
    expectedGraduationYear: input.expectedGraduationYear ?? 2027,
    graduatedAt: input.graduatedAt,
    role: input.role,
    roles: input.roles,
    userType: input.userType ?? input.role,
    intendedRole: input.role,
    position: input.position ?? "NONE",
    studentLeadershipPositions: input.position === "REPRESENTATIVE" ? ["REPRESENTATIVE"] : [],
    permissions: [],
    onboardingCompleted: true,
    notificationPreferences: { inApp: true, push: false, email: false },
    profileCompletionPercentage: input.role === "EMPLOYER" ? 82 : 88,
    lastLoginAt: past(0, 8),
    lastUsedPortal: input.role,
    status: "ACTIVE",
    isVerified: true,
  };
}

function studentDoc(_id, userId, firstName, lastName, yearOfStudy, courseId, representativeId, universityId, collegeId, departmentId) {
  return {
    _id,
    userId,
    universityId,
    collegeId,
    departmentId,
    courseId,
    representativeId,
    firstName,
    lastName,
    username: `${firstName}.${lastName}`.toLowerCase(),
    email: `seed.${firstName.toLowerCase()}.${lastName.toLowerCase()}@udsm.ac.tz`,
    department: "Computer Science and Engineering",
    yearOfStudy,
    enrollmentYear: 2024,
    expectedGraduationYear: courseId === "seed-course-ce" ? 2028 : 2027,
    status: "ACTIVE",
  };
}

async function upsertGenerated(db, collection, docs) {
  const ids = [];
  for (const doc of docs) {
    ids.push(await ensureById(db, collection, doc));
  }
  return ids;
}

function announcement(_id, universityId, createdBy, title, category, content, daysAgo) {
  return {
    _id,
    universityId,
    createdBy,
    title,
    slug: _id.replace("seed-announcement-", ""),
    content,
    body: content,
    summary: content,
    category,
    priority: "NORMAL",
    targetAudience: ["STUDENTS", "TEACHERS"],
    publishedAt: past(daysAgo),
    expiresAt: at(21),
    visibility: "ALL_USERS",
    status: "PUBLISHED",
    totalViews: 84 - daysAgo,
    uniqueViews: 51 - daysAgo,
    audienceReach: 120,
    readPercentage: 62,
    attachments: [],
  };
}

function event(_id, universityId, organizerId, title, eventType, venue, locationId, latitude, longitude, days) {
  return {
    _id,
    universityId,
    organizerId,
    title,
    description: `${title} is open for CampusHub users at ${venue}.`,
    eventType,
    venue,
    locationId,
    locationName: venue,
    latitude,
    longitude,
    onlineUrl: "",
    startDate: at(days, 10),
    endDate: at(days, 13),
    startAt: at(days, 10),
    endAt: at(days, 13),
    registrationDeadline: at(days - 1, 17),
    registrationRequired: true,
    capacity: 120,
    currentAttendees: 32,
    registeredCount: 32,
    waitlistCount: 0,
    checkedInCount: 0,
    allowWaitlist: true,
    targetAudience: ["STUDENTS", "TEACHERS", "ALUMNI", "EMPLOYERS"],
    visibility: "ALL_USERS",
    qrCode: `${_id}-qr`,
    status: "OPEN",
  };
}

function attendance(_id, universityId, eventId, userId) {
  return { _id, universityId, eventId, userId, joinedAt: now, attendanceStatus: "REGISTERED" };
}

function topic(_id, universityId, forumId, authorId, title, body, viewCount) {
  return {
    _id,
    universityId,
    forumId,
    categoryId: forumId,
    authorId,
    title,
    body,
    content: body,
    tags: ["udsm", "coict"],
    replyCount: 1,
    viewCount,
    upvotes: 3,
    downvotes: 0,
    trendingScore: viewCount * 2,
    lastReplyAt: past(1),
    lastActivityAt: past(1),
    visibility: "UNIVERSITY",
    status: "ACTIVE",
  };
}

function reply(_id, universityId, topicId, authorId, body) {
  return {
    _id,
    universityId,
    topicId,
    postId: topicId,
    authorId,
    body,
    content: body,
    upvotes: 2,
    downvotes: 0,
    reactionCounts: { helpful: 2 },
    status: "ACTIVE",
  };
}

function poll(_id, universityId, creatorId, title, labels, days) {
  return {
    _id,
    universityId,
    createdById: creatorId,
    creatorId,
    title,
    description: "Vote to help student leadership and campus admin plan better.",
    pollType: "GENERAL",
    options: labels.map((label, index) => ({ optionId: `option-${index + 1}`, label, voteCount: index + 2 })),
    visibility: "UNIVERSITY",
    targetAudience: ["STUDENTS"],
    allowMultiple: false,
    allowMultipleSelection: false,
    anonymous: false,
    startsAt: past(1),
    startDate: past(1),
    endsAt: at(days),
    endDate: at(days),
    totalVotes: labels.length + 3,
    uniqueVoters: labels.length + 2,
    pollReach: 80,
    participationRate: 24,
    status: "ACTIVE",
  };
}

function vote(_id, universityId, pollId, userId, optionId) {
  return { _id, universityId, pollId, userId, optionIds: [optionId], selectedOptions: [optionId], votedAt: now };
}

function suggestion(_id, universityId, authorId, title, description, status) {
  return {
    _id,
    universityId,
    createdById: authorId,
    authorId,
    category: "Campus Experience",
    title,
    description,
    priority: "MEDIUM",
    anonymous: false,
    attachments: [],
    visibility: "UNIVERSITY",
    status,
  };
}

function lostFound(_id, universityId, reporterId, title, type, category, location, status, phone) {
  return {
    _id,
    universityId,
    reporterId,
    reporterName: "CampusHub Student",
    reporterEmail: "seed.student@udsm.ac.tz",
    reporterPhone: phone,
    title,
    type,
    category,
    status,
    location,
    description: `${title} reported at ${location}.`,
    verification: "Claimant must describe a hidden identifying detail.",
    contact: phone,
    images: [],
  };
}

function project(_id, universityId, ownerId, collegeId, departmentId, title, summary, viewCount, starCount) {
  return {
    _id,
    universityId,
    ownerId,
    collegeId,
    departmentId,
    title,
    name: title,
    slug: _id.replace("seed-project-", ""),
    summary,
    shortDescription: summary,
    description: `${summary} Built and published by UDSM CampusHub users.`,
    coverImageUrl: "",
    coverImage: "",
    projectStatus: "COMPLETED",
    category: "Technology",
    techStack: ["Next.js", "MongoDB", "AI"],
    tags: ["innovation", "udsm", "student-project"],
    skills: ["Product thinking", "Software engineering"],
    visibility: "PUBLIC",
    featured: true,
    starCount,
    viewCount,
    shareCount: 12,
    favoriteCount: starCount,
    savedCount: Math.max(4, Math.round(starCount / 2)),
    documentCount: 1,
    featuredAt: past(2),
    status: "PUBLISHED",
  };
}

function star(_id, universityId, projectId, userId) {
  return { _id, universityId, projectId, userId, createdAt: past(1) };
}

function view(_id, universityId, projectId, userId) {
  return { _id, universityId, projectId, userId, viewedAt: now, source: "showcase" };
}

function shop(_id, universityId, ownerId, name, description, category) {
  return {
    _id,
    universityId,
    ownerId,
    name,
    slug: _id.replace("seed-shop-", ""),
    description,
    category,
    location: "UDSM Mlimani Campus",
    contactPhone: "+255715000111",
    contactEmail: `${_id}@campushub.test`,
    whatsappNumber: "+255715000111",
    openingHours: "08:00-20:00",
    deliveryAvailable: true,
    pickupAvailable: true,
    verified: true,
    viewCount: 76,
    followerCount: 18,
    productCount: 2,
    orderRequestCount: 4,
    visibility: "ALL_USERS",
    status: "ACTIVE",
  };
}

function product(_id, universityId, shopId, sellerId, name, description, category, price) {
  return {
    _id,
    universityId,
    shopId,
    sellerId,
    ownerId: sellerId,
    name,
    title: name,
    description,
    category,
    productType: category === "Service" ? "SERVICE" : "PHYSICAL",
    tags: [category.toLowerCase(), "udsm"],
    images: [],
    price,
    currency: "TZS",
    availability: "IN_STOCK",
    location: "UDSM Mlimani Campus",
    stockQuantity: 20,
    condition: category === "Service" ? "SERVICE" : "NEW",
    deliveryOptions: ["PICKUP", "CAMPUS_DELIVERY"],
    favoriteCount: 6,
    viewCount: 43,
    clickCount: 14,
    orderRequestCount: 2,
    isFeatured: true,
    visibility: "ALL_USERS",
    status: "ACTIVE",
  };
}

function orderRequest(_id, universityId, productId, shopId, buyerId, sellerId) {
  return {
    _id,
    universityId,
    productId,
    shopId,
    buyerId,
    sellerId,
    quantity: 1,
    message: "Please prepare for campus pickup.",
    contactPhone: "+255716000222",
    status: "PENDING",
  };
}

function opportunity(_id, universityId, employerId, title, description, type, deadlineDays, targetColleges, targetDepartments) {
  return {
    _id,
    universityId,
    postedById: employerId,
    employerId,
    employerName: "Safaritech Tanzania",
    title,
    description,
    industry: "Technology",
    opportunityType: type,
    workType: type === "JOB" ? "FULL_TIME" : "INTERNSHIP",
    salaryRange: "TZS 500,000 - 1,200,000",
    locationType: "HYBRID",
    location: "Dar es Salaam",
    deadlineAt: at(deadlineDays),
    applicationDeadline: at(deadlineDays),
    startAt: at(deadlineDays + 14),
    requirements: ["Strong portfolio", "Good communication", "Team collaboration"],
    skills: ["JavaScript", "Data analysis", "Product thinking"],
    eligibility: ["CoICT students", "Final year students", "Alumni"],
    targetColleges,
    targetDepartments,
    targetYears: [2, 3, 4],
    applicationUrl: "",
    applicationInstructions: "Apply through CampusHub with CV and portfolio.",
    applicationCount: 2,
    savedCount: 5,
    shareCount: 3,
    viewCount: 87,
    visibility: "PUBLIC",
    status: "PUBLISHED",
  };
}

function application(_id, universityId, opportunityId, applicantId, status) {
  return {
    _id,
    universityId,
    opportunityId,
    applicantId,
    studentId: applicantId,
    cvUrl: "/uploads/seed/cv.pdf",
    resumeUrl: "/uploads/seed/cv.pdf",
    coverLetter: "I am interested in this opportunity and have attached my CampusHub portfolio.",
    attachments: [],
    answers: [],
    status,
    submittedAt: past(2),
  };
}

function careerProfile(_id, universityId, userId, headline, strength, courseId) {
  return {
    _id,
    universityId,
    userId,
    headline,
    bio: `${headline} with live CampusHub portfolio and documents.`,
    skills: ["JavaScript", "Research", "Communication"],
    languages: ["English", "Swahili"],
    certifications: ["CampusHub Portfolio Ready"],
    experience: [],
    education: [{ courseId, university: "University of Dar es Salaam" }],
    portfolioLinks: [],
    cvUrl: "/uploads/seed/cv.pdf",
    availabilityStatus: "AVAILABLE",
    preferredWorkType: ["INTERNSHIP", "FULL_TIME"],
    preferredIndustries: ["Technology", "Education"],
    graduationYear: 2027,
    profileStrength: strength,
    profileViewCount: 34,
    employerViewCount: 9,
    savedCount: 3,
    contactCount: 2,
  };
}

function studentDocument(_id, universityId, userId, collegeId, departmentId, courseId, documentType, title, fileName) {
  return {
    _id,
    userId,
    uploadedById: userId,
    universityId,
    collegeId,
    departmentId,
    courseId,
    title,
    documentType,
    fileName,
    fileUrl: `/uploads/seed/${fileName}`,
    fileType: "application/pdf",
    fileSize: 312000,
    issuingAuthority: "Verified academic office",
    referenceNumber: _id.toUpperCase(),
    issuedAt: past(700),
    verificationStatus: documentType === "CV" ? "PENDING" : "VERIFIED",
    visibility: documentType === "CV" ? "EMPLOYERS" : "PRIVATE",
    status: "ACTIVE",
    notes: "Seeded document record for repository testing.",
  };
}

function badge(_id, universityId, name, description, icon, xpReward) {
  return {
    _id,
    universityId,
    name,
    slug: _id.replace("seed-badge-", ""),
    description,
    icon,
    category: "ENGAGEMENT",
    rarity: "UNCOMMON",
    criteria: { type: "seed", threshold: 1 },
    xpReward,
    isGlobal: false,
    status: "ACTIVE",
  };
}

function achievement(_id, universityId, name, description, xpReward) {
  return {
    _id,
    universityId,
    name,
    slug: _id.replace("seed-achievement-", ""),
    description,
    requirements: { type: "seed", threshold: 1 },
    xpReward,
    visibility: "PUBLIC",
    isGlobal: false,
    status: "ACTIVE",
  };
}

function userBadge(_id, universityId, userId, badgeId) {
  return { _id, universityId, userId, badgeId, earnedAt: past(1), displayOnProfile: true, source: "seed" };
}

function userAchievement(_id, universityId, userId, achievementId, progress, targetValue, status) {
  return {
    _id,
    universityId,
    userId,
    achievementId,
    progress,
    progressValue: progress,
    targetValue,
    status,
    startedAt: past(10),
    completedAt: status === "COMPLETED" ? past(1) : undefined,
    rewardsGrantedAt: status === "COMPLETED" ? past(1) : undefined,
  };
}

function xpProfile(_id, universityId, userId, totalXp, level, rank) {
  return { _id, universityId, userId, totalXp, level, rank, weeklyXp: 120 - rank * 7, monthlyXp: 320 - rank * 10, lastActivityAt: now };
}

function xp(_id, universityId, userId, action, xpAwarded, sourceId) {
  return {
    _id,
    universityId,
    userId,
    action,
    xpAwarded,
    sourceType: "seed",
    sourceId,
    transactionType: "AWARD",
    idempotencyKey: _id,
    points: xpAwarded,
    reason: action,
  };
}

function streak(_id, universityId, userId, currentCount, longestCount) {
  return { _id, universityId, userId, streakType: "DAILY_LOGIN", currentCount, longestCount, lastActivityDate: now, recoveryTokens: 1, milestonesEarned: [3], status: "ACTIVE" };
}

function rewardEvent(_id, universityId, userId, trigger, title, description, xpValue) {
  return {
    _id,
    universityId,
    userId,
    trigger,
    title,
    description,
    reward: { type: "XP", value: xpValue },
    xp: xpValue,
    animationType: trigger === "BADGE_EARNED" ? "BADGE_POP" : "FIREWORKS",
    entityType: "seed",
    entityId: _id,
    status: "UNSEEN",
  };
}

function notification(_id, universityId, recipientId, actorId, type, title, message, actionUrl, priority) {
  const categoryByType = {
    ALMANAC_REMINDER: "EVENT",
    EVENT_REMINDER: "EVENT",
    ANNOUNCEMENT: "ANNOUNCEMENT",
    PROJECT_STAR: "SHOWCASE",
    ORDER: "MARKETPLACE",
    SYSTEM: "SYSTEM",
  };
  return {
    _id,
    universityId,
    recipientId,
    actorId,
    senderId: actorId,
    category: categoryByType[type] ?? "SYSTEM",
    type,
    title,
    body: message,
    message,
    entityType: type.toLowerCase(),
    entityId: _id,
    actionUrl,
    priority,
    status: "UNREAD",
    channels: ["IN_APP"],
    deliveredAt: now,
    expiresAt: at(30),
    metadata: { seeded: true },
  };
}

function activity(_id, universityId, actorId, activityType, title, category, entityType, entityId) {
  return {
    _id,
    universityId,
    actorId,
    actorType: "USER",
    actorSnapshot: { id: actorId },
    verb: activityType,
    activityType,
    title,
    description: title,
    entityType,
    entityId,
    visibility: "UNIVERSITY",
    category,
    audience: ["STUDENTS", "TEACHERS", "ALUMNI", "EMPLOYERS"],
    score: 10,
  };
}

async function seedExpandedCampusData(db, context) {
  const {
    universityId,
    collegeId,
    cseDepartmentId,
    csCourseId,
    ceCourseId,
    users,
    almanacId,
    forumId,
    shopIds,
    productIds,
    badgeIds,
    achievementIds,
  } = context;

  const businessCollegeId = await ensure(db, "college", { universityId, code: "UDBS" }, {
    _id: "seed-college-udbs",
    universityId,
    name: "University of Dar es Salaam Business School",
    shortName: "UDBS",
    code: "UDBS",
    slug: "udbs",
    description: "Business, entrepreneurship, procurement, accounting, and management programs.",
    status: "ACTIVE",
  });
  const scienceCollegeId = await ensure(db, "college", { universityId, code: "CONAS" }, {
    _id: "seed-college-conas",
    universityId,
    name: "College of Natural and Applied Sciences",
    shortName: "CoNAS",
    code: "CONAS",
    slug: "conas",
    description: "Natural sciences, mathematics, statistics, and applied research.",
    status: "ACTIVE",
  });
  const businessDepartmentId = await ensure(db, "department", { universityId, code: "BIM" }, {
    _id: "seed-dept-bim",
    universityId,
    collegeId: businessCollegeId,
    name: "Business Information Management",
    code: "BIM",
    slug: "business-information-management",
    description: "Information systems, enterprise analytics, digital business, and entrepreneurship.",
    status: "ACTIVE",
  });
  const statisticsDepartmentId = await ensure(db, "department", { universityId, code: "STAT" }, {
    _id: "seed-dept-statistics",
    universityId,
    collegeId: scienceCollegeId,
    name: "Statistics and Data Science",
    code: "STAT",
    slug: "statistics-and-data-science",
    description: "Statistics, applied analytics, research methods, and data science.",
    status: "ACTIVE",
  });
  const isCourseId = await ensure(db, "course", { universityId, code: "BSC-IS" }, {
    _id: "seed-course-is",
    universityId,
    collegeId: businessCollegeId,
    departmentId: businessDepartmentId,
    name: "Bachelor of Science in Information Systems",
    code: "BSC-IS",
    slug: "bsc-information-systems",
    durationYears: 3,
    description: "Information systems, product operations, enterprise platforms, and analytics.",
    status: "ACTIVE",
  });
  const dsCourseId = await ensure(db, "course", { universityId, code: "BSC-DS" }, {
    _id: "seed-course-ds",
    universityId,
    collegeId: scienceCollegeId,
    departmentId: statisticsDepartmentId,
    name: "Bachelor of Science in Data Science",
    code: "BSC-DS",
    slug: "bsc-data-science",
    durationYears: 3,
    description: "Statistical computing, machine learning, data visualization, and research.",
    status: "ACTIVE",
  });
  await ensure(db, "course", { universityId, code: "MSC-CS" }, {
    _id: "seed-course-msc-cs",
    universityId,
    collegeId,
    departmentId: cseDepartmentId,
    name: "Master of Science in Computer Science",
    code: "MSC-CS",
    slug: "msc-computer-science",
    durationYears: 2,
    description: "Graduate research program for advanced computing and applied AI.",
    status: "ACTIVE",
  });

  const extraUserSpecs = [
    ["teacherGrace", "seed.teacher.grace@udsm.ac.tz", "Grace", "Komba", "TEACHER", collegeId, cseDepartmentId, undefined, "Senior Lecturer"],
    ["teacherPeter", "seed.teacher.peter@udsm.ac.tz", "Peter", "Lema", "TEACHER", collegeId, cseDepartmentId, undefined, "AI Research Supervisor"],
    ["teacherRehema", "seed.teacher.rehema@udsm.ac.tz", "Rehema", "Msuya", "TEACHER", scienceCollegeId, statisticsDepartmentId, undefined, "Data Science Lecturer"],
    ["teacherNassor", "seed.teacher.nassor@udsm.ac.tz", "Nassor", "Mdee", "TEACHER", businessCollegeId, businessDepartmentId, undefined, "Information Systems Lecturer"],
    ["repSarah", "seed.rep.sarah@udsm.ac.tz", "Sarah", "Mhando", "STUDENT", businessCollegeId, businessDepartmentId, isCourseId, "Business School Representative", "REPRESENTATIVE", 3],
    ["repCollins", "seed.rep.collins@udsm.ac.tz", "Collins", "Mrope", "STUDENT", scienceCollegeId, statisticsDepartmentId, dsCourseId, "Science College Representative", "REPRESENTATIVE", 2],
    ["studentBrian", "seed.student.brian@udsm.ac.tz", "Brian", "Kessy", "STUDENT", collegeId, cseDepartmentId, ceCourseId, undefined, undefined, 1],
    ["studentNeema", "seed.student.neema@udsm.ac.tz", "Neema", "Paul", "STUDENT", collegeId, cseDepartmentId, csCourseId, undefined, undefined, 3],
    ["studentKelvin", "seed.student.kelvin@udsm.ac.tz", "Kelvin", "Massawe", "STUDENT", businessCollegeId, businessDepartmentId, isCourseId, undefined, undefined, 2],
    ["studentZuhura", "seed.student.zuhura@udsm.ac.tz", "Zuhura", "Haji", "STUDENT", scienceCollegeId, statisticsDepartmentId, dsCourseId, undefined, undefined, 2],
    ["studentMariam", "seed.student.mariam@udsm.ac.tz", "Mariam", "Bakari", "STUDENT", collegeId, cseDepartmentId, ceCourseId, undefined, undefined, 4],
    ["alumniJoseph", "seed.alumni.joseph@udsm.ac.tz", "Joseph", "Mwakyusa", "ALUMNI", collegeId, cseDepartmentId, csCourseId, "Backend Engineer"],
    ["alumniLilian", "seed.alumni.lilian@udsm.ac.tz", "Lilian", "Kimaro", "ALUMNI", businessCollegeId, businessDepartmentId, isCourseId, "Product Operations Analyst"],
    ["alumniIsaac", "seed.alumni.isaac@udsm.ac.tz", "Isaac", "Nnko", "ALUMNI", scienceCollegeId, statisticsDepartmentId, dsCourseId, "Data Scientist"],
    ["employerKibo", "seed.employer.kibo@kibolabs.co.tz", "Daniel", "Kahwa", "EMPLOYER", undefined, undefined, undefined, "Engineering Recruiter"],
    ["employerAfya", "seed.employer.afya@afyanet.co.tz", "Janet", "Rweyemamu", "EMPLOYER", undefined, undefined, undefined, "People Operations Manager"],
  ];

  const extraUsers = {};
  for (const [key, email, firstName, lastName, role, userCollegeId, departmentId, courseId, title, position, yearOfStudy] of extraUserSpecs) {
    extraUsers[key] = await ensure(db, "user", { email }, userDoc({
      _id: `seed-user-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      firstName,
      lastName,
      email,
      role,
      roles: [role],
      userType: role,
      title,
      position,
      universityId: role === "EMPLOYER" ? undefined : universityId,
      collegeId: userCollegeId,
      departmentId,
      courseId,
      yearOfStudy,
      graduatedAt: role === "ALUMNI" ? past(450) : undefined,
      expectedGraduationYear: role === "ALUMNI" ? 2024 : undefined,
    }));
  }

  await upsertGenerated(db, "representative", [
    {
      _id: "seed-representative-sarah",
      userId: extraUsers.repSarah,
      universityId,
      collegeId: businessCollegeId,
      title: "Business School Student Representative",
      status: "ACTIVE",
    },
    {
      _id: "seed-representative-collins",
      userId: extraUsers.repCollins,
      universityId,
      collegeId: scienceCollegeId,
      title: "Science College Student Representative",
      status: "ACTIVE",
    },
  ]);

  const studentProfiles = [
    ["seed-student-brian", extraUsers.studentBrian, "Brian", "Kessy", 1, ceCourseId, users.representative, collegeId, cseDepartmentId],
    ["seed-student-neema", extraUsers.studentNeema, "Neema", "Paul", 3, csCourseId, users.representative, collegeId, cseDepartmentId],
    ["seed-student-kelvin", extraUsers.studentKelvin, "Kelvin", "Massawe", 2, isCourseId, extraUsers.repSarah, businessCollegeId, businessDepartmentId],
    ["seed-student-zuhura", extraUsers.studentZuhura, "Zuhura", "Haji", 2, dsCourseId, extraUsers.repCollins, scienceCollegeId, statisticsDepartmentId],
    ["seed-student-mariam", extraUsers.studentMariam, "Mariam", "Bakari", 4, ceCourseId, users.representative, collegeId, cseDepartmentId],
    ["seed-student-rep-sarah", extraUsers.repSarah, "Sarah", "Mhando", 3, isCourseId, extraUsers.repSarah, businessCollegeId, businessDepartmentId],
    ["seed-student-rep-collins", extraUsers.repCollins, "Collins", "Mrope", 2, dsCourseId, extraUsers.repCollins, scienceCollegeId, statisticsDepartmentId],
  ];
  for (const [id, userId, firstName, lastName, year, courseId, representativeId, userCollegeId, departmentId] of studentProfiles) {
    await ensureById(db, "student", studentDoc(id, userId, firstName, lastName, year, courseId, representativeId, universityId, userCollegeId, departmentId));
  }

  const expandedLocations = [
    ["seed-location-nkrumah-hall", "Nkrumah Hall", "ACADEMIC", "NKR", -6.78098, 39.20393],
    ["seed-location-engineering-block", "College of Engineering Block", "LABORATORY", "ENG", -6.77688, 39.20442],
    ["seed-location-business-school", "Business School Complex", "ACADEMIC", "UDBS", -6.78154, 39.20712],
    ["seed-location-sports-ground", "UDSM Sports Grounds", "SPORTS", "SPRT", -6.78312, 39.20864],
    ["seed-location-parking-main", "Main Campus Parking", "PARKING", "PARK", -6.77908, 39.2111],
  ];
  for (const [id, name, category, code, latitude, longitude] of expandedLocations) {
    await ensureById(db, "map_locations", {
      _id: id,
      universityId,
      name,
      category,
      description: `${name} campus location.`,
      latitude,
      longitude,
      coordinates: { type: "Point", coordinates: [longitude, latitude] },
      buildingCode: code,
      openingHours: "07:30-21:00",
      contactInformation: "+255222410500",
      createdBy: users.campusAdmin,
      views: 45,
      uniqueViews: 29,
      directionRequests: 12,
      navigation: { walkingEnabled: true, drivingEnabled: true },
      status: "ACTIVE",
    });
  }

  const secondAlmanacId = await ensureById(db, "almanacs", {
    _id: "seed-almanac-2026-2027-s2",
    universityId,
    title: "2026/2027 Semester 2 Almanac",
    description: "Second semester academic milestones, examinations, and graduation events.",
    academicYear: "2026/2027",
    semester: "Semester 2",
    status: "DRAFT",
  });

  const moreAlmanacEvents = [
    ["seed-almanac-event-orientation", almanacId, "First year orientation", "ORIENTATION", 2, false, "#14b8a6"],
    ["seed-almanac-event-project-proposal", almanacId, "Final year project proposal deadline", "GENERAL", 12, true, "#f97316"],
    ["seed-almanac-event-club-registration", almanacId, "Student club registration week", "GENERAL", 16, false, "#06b6d4"],
    ["seed-almanac-event-continuous-assessment", almanacId, "Continuous assessment week", "EXAMINATION", 28, false, "#8b5cf6"],
    ["seed-almanac-event-research-day", almanacId, "Undergraduate research day", "WORKSHOP", 35, false, "#22c55e"],
    ["seed-almanac-event-industrial-practical", almanacId, "Industrial practical briefing", "WORKSHOP", 42, false, "#0ea5e9"],
    ["seed-almanac-event-tuition-deadline", almanacId, "Tuition clearance deadline", "REGISTRATION", 48, true, "#ef4444"],
    ["seed-almanac-event-results-release", almanacId, "Provisional results release", "GENERAL", 70, false, "#6366f1"],
    ["seed-almanac-event-s2-classes", secondAlmanacId, "Semester 2 classes begin", "SEMESTER_START", 105, false, "#14b8a6"],
    ["seed-almanac-event-s2-exams", secondAlmanacId, "Semester 2 final examinations", "EXAMINATION", 170, false, "#8b5cf6"],
  ];
  for (const [id, parentAlmanacId, title, eventType, days, isDeadline, color] of moreAlmanacEvents) {
    await ensureById(db, "almanac_events", {
      _id: id,
      universityId,
      almanacId: parentAlmanacId,
      academicYear: "2026/2027",
      semester: parentAlmanacId === secondAlmanacId ? "Semester 2" : "Semester 1",
      title,
      description: `${title} for eligible UDSM students and staff.`,
      eventType,
      startDate: at(days, 8),
      endDate: at(days + (eventType === "EXAMINATION" ? 5 : 0), 17),
      isAllDay: false,
      isDeadline,
      visibility: "ALL_USERS",
      collegeIds: [collegeId, businessCollegeId, scienceCollegeId],
      color,
      createdBy: users.campusAdmin,
      reminders: [
        { offsetHours: 72, channel: "IN_APP", enabled: true },
        { offsetHours: 24, channel: "PUSH", enabled: true },
      ],
      views: 60 + days,
      uniqueViews: 35 + Math.round(days / 2),
      status: "ACTIVE",
    });
  }

  await upsertGenerated(db, "announcements", [
    announcement("seed-announcement-exam-rules", universityId, users.teacher, "Examination room rules published", "ACADEMICS", "Students should carry IDs and arrive at least 30 minutes before each examination.", 1),
    announcement("seed-announcement-marketplace", universityId, users.campusAdmin, "Marketplace seller verification starts", "OFFERS", "Student shops can now request verification badges through CampusHub.", 2),
    announcement("seed-announcement-mental-health", universityId, users.campusAdmin, "Counselling office open day", "HEALTH", "The counselling office will host an open day for wellness and stress support.", 3),
    announcement("seed-announcement-sports-fixtures", universityId, extraUsers.repCollins, "Inter-college fixtures released", "SPORTS", "Football, basketball, and athletics fixtures are available for all colleges.", 4),
    announcement("seed-announcement-alumni-panel", universityId, users.alumni, "Alumni product careers panel", "CAREER", "Alumni mentors will discuss product, data, and engineering career paths.", 5),
    announcement("seed-announcement-research-grants", universityId, extraUsers.teacherRehema, "Student research mini-grants", "GENERAL", "Mini-grants are open for data science and civic technology projects.", 6),
  ]);

  const moreEventIds = await upsertGenerated(db, "events", [
    event("seed-event-data-bootcamp", universityId, extraUsers.teacherRehema, "Data Visualization Bootcamp", "WORKSHOP", "Nkrumah Hall", "seed-location-nkrumah-hall", -6.78098, 39.20393, 4),
    event("seed-event-startup-night", universityId, extraUsers.repSarah, "Student Startup Pitch Night", "SOCIAL", "Business School Complex", "seed-location-business-school", -6.78154, 39.20712, 7),
    event("seed-event-cyber-clinic", universityId, extraUsers.teacherPeter, "Cybersecurity Clinic", "SEMINAR", "College of Engineering Block", "seed-location-engineering-block", -6.77688, 39.20442, 11),
    event("seed-event-alumni-mentor", universityId, users.alumni, "Alumni Mentorship Roundtable", "CAREER", "UDSM Main Library", "seed-location-library", -6.77976, 39.20785, 15),
    event("seed-event-health-drive", universityId, users.campusAdmin, "Campus Health Screening Drive", "OTHER", "University Health Centre", "seed-location-health", -6.77704, 39.21056, 20),
    event("seed-event-open-source", universityId, extraUsers.teacherGrace, "Open Source Contribution Day", "HACKATHON", "CoICT Innovation Hub", "seed-location-coict", -6.77592, 39.20291, 24),
  ]);

  await upsertGenerated(db, "event_attendance", [
    attendance("seed-attendance-data-fatima", universityId, moreEventIds[0], users.student),
    attendance("seed-attendance-data-zuhura", universityId, moreEventIds[0], extraUsers.studentZuhura),
    attendance("seed-attendance-startup-kelvin", universityId, moreEventIds[1], extraUsers.studentKelvin),
    attendance("seed-attendance-cyber-brian", universityId, moreEventIds[2], extraUsers.studentBrian),
    attendance("seed-attendance-mentor-mariam", universityId, moreEventIds[3], extraUsers.studentMariam),
    attendance("seed-attendance-open-source-neema", universityId, moreEventIds[5], extraUsers.studentNeema),
  ]);

  const researchForumId = await ensureById(db, "forums", {
    _id: "seed-forum-research-lab",
    universityId,
    collegeId,
    departmentId: cseDepartmentId,
    name: "Research Lab",
    slug: "research-lab",
    description: "Research ideas, papers, project supervision, and academic collaboration.",
    icon: "book-open",
    color: "#14b8a6",
    moderatorIds: [users.teacher, extraUsers.teacherPeter],
    topicCount: 4,
    replyCount: 9,
    visibility: "UNIVERSITY",
    status: "ACTIVE",
  });
  await upsertGenerated(db, "forum_topics", [
    topic("seed-topic-supervision", universityId, researchForumId, extraUsers.teacherPeter, "Final year project supervision slots", "Post your project title and preferred supervision area by Friday.", 25),
    topic("seed-topic-dataset", universityId, researchForumId, extraUsers.studentZuhura, "Where can we find public health datasets?", "I am looking for open datasets for a predictive analytics prototype.", 19),
    topic("seed-topic-cloud-credits", universityId, forumId, extraUsers.studentBrian, "Cloud credits for student builders", "Can CoICT help students access cloud credits for projects?", 17),
    topic("seed-topic-hackathon-team", universityId, forumId, extraUsers.studentNeema, "Hackathon team for campus safety app", "Looking for UI and backend collaborators for the open innovation hackathon.", 23),
  ]);
  await upsertGenerated(db, "forum_replies", [
    reply("seed-reply-supervision-grace", universityId, "seed-topic-supervision", extraUsers.teacherGrace, "I can supervise projects in mobile systems and civic technology."),
    reply("seed-reply-dataset-rehema", universityId, "seed-topic-dataset", extraUsers.teacherRehema, "Start with open government data and request ethical review if you use sensitive records."),
    reply("seed-reply-cloud-alumni", universityId, "seed-topic-cloud-credits", extraUsers.alumniJoseph, "I can connect the student club to a cloud startup credits program."),
    reply("seed-reply-hackathon-adolf", universityId, "seed-topic-hackathon-team", users.representative, "Student leadership can help you recruit members this week."),
  ]);

  await upsertGenerated(db, "polls", [
    poll("seed-poll-cafeteria", universityId, extraUsers.repSarah, "Which cafeteria service needs priority improvement?", ["Queue speed", "Menu variety", "Mobile payment"], 9),
    poll("seed-poll-study-space", universityId, extraUsers.repCollins, "Preferred late-night study space", ["Main Library", "CoICT labs", "Department rooms"], 12),
    poll("seed-poll-career-support", universityId, users.teacher, "Most useful career support", ["CV reviews", "Mock interviews", "Portfolio reviews"], 15),
  ]);
  await upsertGenerated(db, "poll_votes", [
    vote("seed-vote-cafeteria-kelvin", universityId, "seed-poll-cafeteria", extraUsers.studentKelvin, "option-3"),
    vote("seed-vote-cafeteria-sarah", universityId, "seed-poll-cafeteria", extraUsers.repSarah, "option-1"),
    vote("seed-vote-study-space-zuhura", universityId, "seed-poll-study-space", extraUsers.studentZuhura, "option-1"),
    vote("seed-vote-study-space-brian", universityId, "seed-poll-study-space", extraUsers.studentBrian, "option-2"),
    vote("seed-vote-career-neema", universityId, "seed-poll-career-support", extraUsers.studentNeema, "option-3"),
  ]);

  await upsertGenerated(db, "suggestions", [
    suggestion("seed-suggestion-projector", universityId, extraUsers.teacherGrace, "Repair projectors in CoICT labs", "Several teaching rooms need stable projection equipment.", "OPEN"),
    suggestion("seed-suggestion-parking", universityId, extraUsers.teacherNassor, "Mark staff and visitor parking spaces", "Parking labels near business school are unclear.", "UNDER_REVIEW"),
    suggestion("seed-suggestion-water", universityId, extraUsers.studentMariam, "Add water refill points", "Students in engineering blocks need accessible refill stations.", "IN_PROGRESS"),
    suggestion("seed-suggestion-bus", universityId, extraUsers.studentBrian, "Publish shuttle timetable", "Campus shuttle timing should be visible in the app.", "OPEN"),
  ]);

  await upsertGenerated(db, "lost_found_items", [
    lostFound("seed-found-airpods", universityId, extraUsers.studentNeema, "Found wireless earbuds", "FOUND", "Electronics", "Nkrumah Hall", "OPEN", "+255715000004"),
    lostFound("seed-lost-calculator", universityId, extraUsers.studentBrian, "Lost scientific calculator", "LOST", "Electronics", "Engineering Block", "OPEN", "+255715000005"),
    lostFound("seed-found-notebook", universityId, extraUsers.repCollins, "Found statistics notebook", "FOUND", "Books", "Main Library", "RETURNED", "+255715000006"),
    lostFound("seed-lost-keys", universityId, extraUsers.studentKelvin, "Lost hostel keys", "LOST", "Personal Items", "Mlimani Cafeteria", "MATCHED", "+255715000007"),
  ]);

  const moreProjectIds = await upsertGenerated(db, "projects", [
    project("seed-project-smart-parking", universityId, extraUsers.studentBrian, collegeId, cseDepartmentId, "Smart Campus Parking", "Computer vision and occupancy tracking for campus parking lots.", 163, 33),
    project("seed-project-study-buddy", universityId, extraUsers.studentNeema, collegeId, cseDepartmentId, "AI Study Buddy", "Personalized revision plans using almanac deadlines and course topics.", 187, 38),
    project("seed-project-canteen", universityId, extraUsers.studentKelvin, businessCollegeId, businessDepartmentId, "Canteen Queue Analytics", "Queue and demand forecasting dashboard for campus food vendors.", 121, 21),
    project("seed-project-health-risk", universityId, extraUsers.studentZuhura, scienceCollegeId, statisticsDepartmentId, "Student Health Risk Signals", "Privacy-aware health trend analytics for campus wellness teams.", 154, 28),
    project("seed-project-alumni-network", universityId, extraUsers.alumniLilian, businessCollegeId, businessDepartmentId, "Alumni Mentorship Graph", "Matching students to alumni mentors using skills and goals.", 132, 25),
    project("seed-project-research-index", universityId, extraUsers.alumniIsaac, scienceCollegeId, statisticsDepartmentId, "Research Impact Index", "University research visibility and collaboration scoring.", 119, 22),
  ]);

  await db.collection("project_analytics").deleteMany({
    _id: { $regex: "^seed-project-analytics-expanded-" },
    projectId: { $in: moreProjectIds },
  });

  for (let i = 0; i < moreProjectIds.length; i += 1) {
    await ensureById(db, "project_documents", {
      _id: `seed-project-doc-expanded-${i + 1}`,
      universityId,
      projectId: moreProjectIds[i],
      uploadedById: i % 2 === 0 ? extraUsers.studentBrian : extraUsers.studentZuhura,
      title: i % 2 === 0 ? "Technical report" : "Research poster",
      fileUrl: `/uploads/seed/expanded-project-${i + 1}.pdf`,
      fileType: "PDF",
      fileSize: 362000 + i * 12000,
      downloadCount: 12 + i,
      visibility: "PUBLIC",
      status: "ACTIVE",
    });
    for (let d = 10; d >= 0; d -= 1) {
      const analyticsDate = past(d);

      await ensure(
        db,
        "project_analytics",
        { projectId: moreProjectIds[i], date: analyticsDate },
        {
        _id: `seed-project-analytics-expanded-${i + 1}-${d}`,
        universityId,
        projectId: moreProjectIds[i],
        date: analyticsDate,
        views: 8 + i * 5 + d,
        uniqueViews: 5 + i * 4 + d,
        stars: (i + d) % 4,
        linkClicks: 2 + i,
        documentClicks: 3 + (d % 3),
        repositoryClicks: 1 + (i % 3),
        shares: d % 3,
        documentDownloads: 2 + (d % 5),
        referrers: { direct: 5 + d, employer: 3 + i, teacher: 2 },
        },
      );
    }
  }
  await upsertGenerated(db, "project_stars", [
    star("seed-star-parking-employer-kibo", universityId, moreProjectIds[0], extraUsers.employerKibo),
    star("seed-star-study-teacher", universityId, moreProjectIds[1], users.teacher),
    star("seed-star-canteen-employer-afya", universityId, moreProjectIds[2], extraUsers.employerAfya),
    star("seed-star-health-teacher-rehema", universityId, moreProjectIds[3], extraUsers.teacherRehema),
    star("seed-star-alumni-fatima", universityId, moreProjectIds[4], users.student),
  ]);

  const moreShopIds = await upsertGenerated(db, "shops", [
    shop("seed-shop-print-point", universityId, extraUsers.studentMariam, "Print Point", "Printing, binding, scanning, and academic stationery near lecture rooms.", "Stationery"),
    shop("seed-shop-code-cafe", universityId, extraUsers.studentNeema, "Code Cafe", "Study snacks, coffee, and weekend coding meetup supplies.", "Food"),
    shop("seed-shop-repair-lab", universityId, extraUsers.studentBrian, "Repair Lab", "Phone, laptop, charger, and accessory repair service.", "Service"),
  ]);
  const moreProductIds = await upsertGenerated(db, "products", [
    product("seed-product-printing", universityId, moreShopIds[0], extraUsers.studentMariam, "A4 printing", "Black and white academic printing per page.", "Stationery", 200),
    product("seed-product-binding", universityId, moreShopIds[0], extraUsers.studentMariam, "Report binding", "Project report binding and cover page support.", "Stationery", 4000),
    product("seed-product-coffee", universityId, moreShopIds[1], extraUsers.studentNeema, "Iced coffee", "Cold coffee for evening study sessions.", "Food", 2500),
    product("seed-product-brownie", universityId, moreShopIds[1], extraUsers.studentNeema, "Chocolate brownie", "Homemade brownie for campus pickup.", "Food", 3000),
    product("seed-product-phone-repair", universityId, moreShopIds[2], extraUsers.studentBrian, "Phone screen diagnosis", "Quick screen and charging-port diagnosis.", "Service", 5000),
    product("seed-product-keyboard", universityId, moreShopIds[2], extraUsers.studentBrian, "External keyboard", "Compact USB keyboard for labs and dorm rooms.", "Electronics", 18000),
  ]);
  await upsertGenerated(db, "order_requests", [
    orderRequest("seed-order-printing-fatima", universityId, moreProductIds[0], moreShopIds[0], users.student, extraUsers.studentMariam),
    orderRequest("seed-order-coffee-brian", universityId, moreProductIds[2], moreShopIds[1], extraUsers.studentBrian, extraUsers.studentNeema),
    orderRequest("seed-order-keyboard-kelvin", universityId, moreProductIds[5], moreShopIds[2], extraUsers.studentKelvin, extraUsers.studentBrian),
  ]);
  await upsertGenerated(db, "orders", [
    {
      _id: "seed-order-completed-juice",
      universityId,
      productId: productIds[1],
      shopId: shopIds[0],
      buyerId: extraUsers.studentZuhura,
      sellerId: users.student,
      quantity: 2,
      totalAmount: 4000,
      currency: "TZS",
      status: "COMPLETED",
      createdAt: past(1),
    },
    {
      _id: "seed-order-active-printing",
      universityId,
      productId: moreProductIds[0],
      shopId: moreShopIds[0],
      buyerId: users.representative,
      sellerId: extraUsers.studentMariam,
      quantity: 30,
      totalAmount: 6000,
      currency: "TZS",
      status: "PENDING",
      createdAt: now,
    },
  ]);

  const moreOpportunityIds = await upsertGenerated(db, "opportunities", [
    opportunity("seed-opportunity-product-design", universityId, extraUsers.employerKibo, "Junior Product Designer", "Kibo Labs needs a junior designer with portfolio case studies.", "JOB", 18, [collegeId, businessCollegeId], [cseDepartmentId, businessDepartmentId]),
    opportunity("seed-opportunity-data-intern", universityId, extraUsers.employerAfya, "Health Data Internship", "AfyaNet is looking for data science interns for public health dashboards.", "INTERNSHIP", 20, [scienceCollegeId], [statisticsDepartmentId]),
    opportunity("seed-opportunity-campus-ambassador", universityId, users.employer, "Campus Ambassador Program", "Represent Safaritech on campus and coordinate student developer events.", "PART_TIME", 12, [collegeId, businessCollegeId, scienceCollegeId], [cseDepartmentId, businessDepartmentId, statisticsDepartmentId]),
    opportunity("seed-opportunity-research-fellow", universityId, extraUsers.employerKibo, "Applied AI Research Fellow", "Research fellowship for applied AI prototypes with social impact.", "FELLOWSHIP", 25, [collegeId, scienceCollegeId], [cseDepartmentId, statisticsDepartmentId]),
  ]);
  await upsertGenerated(db, "applications", [
    application("seed-application-design-neema", universityId, moreOpportunityIds[0], extraUsers.studentNeema, "SUBMITTED"),
    application("seed-application-data-zuhura", universityId, moreOpportunityIds[1], extraUsers.studentZuhura, "UNDER_REVIEW"),
    application("seed-application-ambassador-adolf", universityId, moreOpportunityIds[2], users.representative, "SHORTLISTED"),
    application("seed-application-fellow-brian", universityId, moreOpportunityIds[3], extraUsers.studentBrian, "INTERVIEW"),
  ]);
  await upsertGenerated(db, "career_profiles", [
    careerProfile("seed-career-brian", universityId, extraUsers.studentBrian, "Computer engineering student focused on IoT", 78, ceCourseId),
    careerProfile("seed-career-neema", universityId, extraUsers.studentNeema, "Frontend engineer and student mentor", 86, csCourseId),
    careerProfile("seed-career-kelvin", universityId, extraUsers.studentKelvin, "Information systems builder", 73, isCourseId),
    careerProfile("seed-career-zuhura", universityId, extraUsers.studentZuhura, "Data science student", 81, dsCourseId),
    careerProfile("seed-career-joseph", universityId, extraUsers.alumniJoseph, "Backend engineer and alumni mentor", 92, csCourseId),
    careerProfile("seed-career-lilian", universityId, extraUsers.alumniLilian, "Operations analyst and marketplace mentor", 89, isCourseId),
    careerProfile("seed-career-isaac", universityId, extraUsers.alumniIsaac, "Data scientist focused on public analytics", 94, dsCourseId),
  ]);
  await upsertGenerated(db, "saved_candidates", [
    { _id: "seed-saved-candidate-neema", universityId, savedById: extraUsers.employerKibo, employerId: extraUsers.employerKibo, candidateUserId: extraUsers.studentNeema, candidateId: extraUsers.studentNeema, opportunityId: moreOpportunityIds[0], notes: "Strong frontend portfolio.", status: "ACTIVE" },
    { _id: "seed-saved-candidate-zuhura", universityId, savedById: extraUsers.employerAfya, employerId: extraUsers.employerAfya, candidateUserId: extraUsers.studentZuhura, candidateId: extraUsers.studentZuhura, opportunityId: moreOpportunityIds[1], notes: "Relevant data science background.", status: "ACTIVE" },
    { _id: "seed-saved-candidate-brian", universityId, savedById: extraUsers.employerKibo, employerId: extraUsers.employerKibo, candidateUserId: extraUsers.studentBrian, candidateId: extraUsers.studentBrian, opportunityId: moreOpportunityIds[3], notes: "Hardware and route navigation work is promising.", status: "ACTIVE" },
  ]);

  const documentTargets = [
    [extraUsers.studentBrian, collegeId, cseDepartmentId, ceCourseId, "Brian"],
    [extraUsers.studentNeema, collegeId, cseDepartmentId, csCourseId, "Neema"],
    [extraUsers.studentKelvin, businessCollegeId, businessDepartmentId, isCourseId, "Kelvin"],
    [extraUsers.studentZuhura, scienceCollegeId, statisticsDepartmentId, dsCourseId, "Zuhura"],
    [extraUsers.repSarah, businessCollegeId, businessDepartmentId, isCourseId, "Sarah"],
  ];
  const documentDocs = [];
  for (const [userId, userCollegeId, departmentId, courseId, label] of documentTargets) {
    for (const [type, title] of [
      ["CV", `${label} CV`],
      ["NATIONAL_ID", `${label} National ID`],
      ["O_LEVEL_CERTIFICATE", `${label} O-Level Certificate`],
      ["A_LEVEL_CERTIFICATE", `${label} A-Level Certificate`],
      ["BIRTH_CERTIFICATE", `${label} Birth Certificate`],
    ]) {
      documentDocs.push(studentDocument(`seed-doc-${label.toLowerCase()}-${type.toLowerCase()}`, universityId, userId, userCollegeId, departmentId, courseId, type, title, `${label.toLowerCase()}-${type.toLowerCase()}.pdf`));
    }
  }
  await upsertGenerated(db, "student_documents", documentDocs);

  const moreBadgeIds = await upsertGenerated(db, "badges", [
    badge("seed-badge-marketplace-pro", universityId, "Marketplace Pro", "Awarded for completing marketplace orders.", "store", 40),
    badge("seed-badge-researcher", universityId, "Student Researcher", "Awarded for publishing research-oriented project work.", "book-open", 55),
    badge("seed-badge-leader", universityId, "Campus Leader", "Awarded for student leadership activity.", "users", 45),
  ]);
  const allBadgeIds = [...badgeIds, ...moreBadgeIds];
  const moreAchievementIds = await upsertGenerated(db, "achievements", [
    achievement("seed-achievement-first-sale", universityId, "First Marketplace Sale", "Complete a marketplace sale.", 80),
    achievement("seed-achievement-mentor-connected", universityId, "Mentor Connected", "Connect with an alumni or teacher mentor.", 120),
  ]);
  const allAchievementIds = [...achievementIds, ...moreAchievementIds];
  const leaderboardUsers = [
    [users.student, 840, 4, 1],
    [users.representative, 760, 4, 2],
    [extraUsers.studentNeema, 735, 4, 3],
    [extraUsers.studentBrian, 690, 3, 4],
    [extraUsers.studentZuhura, 665, 3, 5],
    [extraUsers.studentKelvin, 590, 3, 6],
    [extraUsers.repSarah, 555, 3, 7],
    [extraUsers.repCollins, 510, 2, 8],
  ];
  for (const [userId, totalXp, level, rank] of leaderboardUsers) {
    await ensure(
      db,
      "user_xp_profiles",
      { universityId, userId },
      xpProfile(`seed-xp-expanded-${String(userId)}`, universityId, userId, totalXp, level, rank),
    );
  }
  for (const [[userId], index] of leaderboardUsers.slice(0, 6).map((entry, entryIndex) => [entry, entryIndex])) {
    const badgeId = allBadgeIds[index % allBadgeIds.length];
    await ensure(
      db,
      "user_badges",
      { userId, badgeId },
      userBadge(`seed-user-badge-expanded-${index + 1}`, universityId, userId, badgeId),
    );
  }
  for (const [[userId], index] of leaderboardUsers.slice(0, 5).map((entry, entryIndex) => [entry, entryIndex])) {
    const achievementId = allAchievementIds[index % allAchievementIds.length];
    await ensure(
      db,
      "user_achievements",
      { universityId, userId, achievementId },
      userAchievement(
        `seed-user-achievement-expanded-${index + 1}`,
        universityId,
        userId,
        achievementId,
        index % 2 === 0 ? 100 : 65,
        100,
        index % 2 === 0 ? "COMPLETED" : "IN_PROGRESS",
      ),
    );
  }
  await upsertGenerated(db, "xp_transactions", leaderboardUsers.map(([userId, totalXp], index) => xp(`seed-xp-tx-expanded-${index + 1}`, universityId, userId, "PLATFORM_ACTIVITY", Math.round(totalXp / 10), `expanded-${index + 1}`)));
  for (const [[userId], index] of leaderboardUsers.slice(0, 6).map((entry, entryIndex) => [entry, entryIndex])) {
    await ensure(
      db,
      "streaks",
      { universityId, userId, streakType: "DAILY_LOGIN" },
      streak(`seed-streak-expanded-${index + 1}`, universityId, userId, 2 + index, 6 + index),
    );
  }
  await upsertGenerated(db, "reward_events", [
    rewardEvent("seed-reward-neema-achievement", universityId, extraUsers.studentNeema, "ACHIEVEMENT_UNLOCKED", "Mentor Connected unlocked", "You connected with a mentor through CampusHub.", 120),
    rewardEvent("seed-reward-brian-level", universityId, extraUsers.studentBrian, "LEVEL_UP", "Level 3 reached", "Your project and document activity moved you to level 3.", 75),
    rewardEvent("seed-reward-kelvin-sale", universityId, extraUsers.studentKelvin, "BADGE_EARNED", "Marketplace Pro unlocked", "You earned a marketplace badge.", 40),
  ]);

  const recipients = [
    users.student,
    users.studentTwo,
    users.representative,
    users.teacher,
    users.alumni,
    extraUsers.studentBrian,
    extraUsers.studentNeema,
    extraUsers.studentKelvin,
    extraUsers.studentZuhura,
    extraUsers.studentMariam,
    extraUsers.teacherGrace,
    extraUsers.teacherPeter,
    extraUsers.repSarah,
    extraUsers.repCollins,
  ];
  const notificationDocs = [];
  recipients.forEach((recipientId, index) => {
    notificationDocs.push(notification(`seed-notif-expanded-almanac-${index + 1}`, universityId, recipientId, users.campusAdmin, "ALMANAC_REMINDER", "Upcoming academic milestone", "Check your almanac for the next academic event and reminders.", "/student/almanac", "NORMAL"));
    notificationDocs.push(notification(`seed-notif-expanded-event-${index + 1}`, universityId, recipientId, users.campusAdmin, "EVENT_REMINDER", "Campus event reminder", "An event you may care about is coming up soon.", "/student/events", "NORMAL"));
  });
  notificationDocs.push(notification("seed-notif-expanded-employer-project", universityId, extraUsers.employerKibo, users.student, "PROJECT_STAR", "New student project signal", "A UDSM student project is trending in showcase.", "/employer/showcase", "NORMAL"));
  notificationDocs.push(notification("seed-notif-expanded-employer-opportunity", universityId, extraUsers.employerAfya, users.campusAdmin, "SYSTEM", "UDSM employer visibility is active", "You can review opted-in university talent and project signals.", "/employer/dashboard", "NORMAL"));
  await upsertGenerated(db, "notifications", notificationDocs);

  await upsertGenerated(db, "activity_feed", [
    activity("seed-activity-expanded-data-bootcamp", universityId, extraUsers.teacherRehema, "EVENT_CREATED", "Data Visualization Bootcamp was scheduled", "ACADEMIC", "events", moreEventIds[0]),
    activity("seed-activity-expanded-startup", universityId, extraUsers.repSarah, "EVENT_CREATED", "Student Startup Pitch Night was announced", "ACADEMIC", "events", moreEventIds[1]),
    activity("seed-activity-expanded-project-study", universityId, extraUsers.studentNeema, "PROJECT_CREATED", "AI Study Buddy was published", "SHOWCASE", "projects", moreProjectIds[1]),
    activity("seed-activity-expanded-shop-print", universityId, extraUsers.studentMariam, "PRODUCT_CREATED", "Print Point added academic services", "MARKETPLACE", "shops", moreShopIds[0]),
    activity("seed-activity-expanded-opportunity", universityId, extraUsers.employerKibo, "OPPORTUNITY_POSTED", "Junior Product Designer opportunity posted", "CAREER", "opportunities", moreOpportunityIds[0]),
    activity("seed-activity-expanded-badge", universityId, extraUsers.studentKelvin, "BADGE_EARNED", "Kelvin earned Marketplace Pro", "ACHIEVEMENT", "badges", moreBadgeIds[0]),
  ]);
}

async function seedAuditLogs(db, universityId, users) {
  const categories = ["session", "authorization", "notification", "project", "marketplace", "almanac", "user"];
  const actions = ["LOGIN_SUCCESS", "PROJECT_CREATED", "ORDER_CREATED", "ALMANAC_EVENT_CREATED", "NOTIFICATION_SENT", "USER_PROFILE_UPDATED"];
  const docs = [];
  for (let index = 0; index < 42; index += 1) {
    docs.push({
      _id: `seed-audit-${index + 1}`,
      universityId: index % 5 === 0 ? "global" : universityId,
      actorId: Object.values(users)[index % Object.values(users).length],
      userId: Object.values(users)[index % Object.values(users).length],
      userName: index % 3 === 0 ? "System" : "CampusHub Seed User",
      role: index % 4 === 0 ? "SYSTEM" : "STUDENT",
      action: actions[index % actions.length],
      category: categories[index % categories.length],
      entityType: categories[index % categories.length],
      entityId: `seed-entity-${index + 1}`,
      ipAddress: "127.0.0.1",
      status: "SUCCESS",
      metadata: { seeded: true },
      createdAt: past(index % 7, 8 + (index % 9)),
      updatedAt: now,
    });
  }
  await upsertGenerated(db, "audit_logs", docs);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
