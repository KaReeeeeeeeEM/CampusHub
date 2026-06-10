import type {
  SerializedCollege,
  SerializedDepartment,
  SerializedRepresentativeInvitation,
  SerializedTeacherInvitation,
} from "@/features/campus-admin/lib/campus-admin-service";

export type MockTeacher = SerializedTeacherInvitation & {
  photo: string | null;
};

export type MockRepresentative = SerializedRepresentativeInvitation & {
  photo: string | null;
  position: string;
};

export type CampusLocation = {
  id: string;
  name: string;
  category:
    | "Library"
    | "Hostels"
    | "Lecture Halls"
    | "Administration"
    | "Sports"
    | "Medical Services";
  code: string;
  status: "ACTIVE" | "INACTIVE";
  coordinates: string;
  description: string;
};

export type AlmanacEvent = {
  id: string;
  title: string;
  type: "Academic Date" | "Deadline" | "Event" | "Examination";
  date: string;
  audience: string;
  status: "UPCOMING" | "PUBLISHED" | "DRAFT";
  description: string;
};

const now = new Date();

function daysFromNow(days: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export const mockColleges: SerializedCollege[] = [
  {
    id: "college-ict",
    universityId: "udsm",
    name: "College of Information and Communication Technologies",
    shortName: "CoICT",
    slug: "college-of-ict",
    description:
      "The technology college coordinating computing, electronics, telecommunications, and digital innovation programs.",
    logo: "",
    status: "ACTIVE",
    createdAt: daysFromNow(-120),
    updatedAt: daysFromNow(-8),
  },
  {
    id: "college-engineering",
    universityId: "udsm",
    name: "College of Engineering and Technology",
    shortName: "CoET",
    slug: "college-of-engineering",
    description:
      "Engineering programs across civil, mechanical, electrical, chemical, and industrial systems.",
    logo: "",
    status: "ACTIVE",
    createdAt: daysFromNow(-100),
    updatedAt: daysFromNow(-12),
  },
  {
    id: "business-school",
    universityId: "udsm",
    name: "University Business School",
    shortName: "UBS",
    slug: "university-business-school",
    description:
      "Business, finance, accounting, marketing, and entrepreneurship programs.",
    logo: "",
    status: "ACTIVE",
    createdAt: daysFromNow(-80),
    updatedAt: daysFromNow(-15),
  },
];

export const mockDepartments: SerializedDepartment[] = [
  {
    id: "department-cs",
    universityId: "udsm",
    collegeId: "college-ict",
    collegeName: "College of Information and Communication Technologies",
    name: "Department of Computer Science",
    code: "CS",
    description:
      "Software engineering, data systems, algorithms, AI, and computing research.",
    status: "ACTIVE",
    createdAt: daysFromNow(-70),
    updatedAt: daysFromNow(-5),
  },
  {
    id: "department-electronics",
    universityId: "udsm",
    collegeId: "college-ict",
    collegeName: "College of Information and Communication Technologies",
    name: "Department of Electronics and Telecommunications",
    code: "ETE",
    description:
      "Electronics, networks, embedded systems, communications, and signal processing.",
    status: "ACTIVE",
    createdAt: daysFromNow(-64),
    updatedAt: daysFromNow(-10),
  },
  {
    id: "department-civil",
    universityId: "udsm",
    collegeId: "college-engineering",
    collegeName: "College of Engineering and Technology",
    name: "Department of Civil Engineering",
    code: "CE",
    description:
      "Infrastructure, transport, construction materials, water systems, and urban engineering.",
    status: "ACTIVE",
    createdAt: daysFromNow(-55),
    updatedAt: daysFromNow(-11),
  },
];

export const mockTeachers: MockTeacher[] = [
  {
    id: "teacher-sarah-mushi",
    universityId: "udsm",
    departmentId: "department-cs",
    departmentName: "Department of Computer Science",
    firstName: "Dr. Sarah",
    lastName: "Mushi",
    email: "sarah.mushi@udsm.ac.tz",
    phone: "+255 754 221 908",
    status: "SENT",
    invitationUrl: "https://campushub.local/teachers/activate/sarah-mushi",
    expiresAt: daysFromNow(14),
    createdAt: daysFromNow(-4),
    photo: null,
  },
  {
    id: "teacher-joseph-mbelwa",
    universityId: "udsm",
    departmentId: "department-electronics",
    departmentName: "Department of Electronics and Telecommunications",
    firstName: "Prof. Joseph",
    lastName: "Mbelwa",
    email: "joseph.mbelwa@udsm.ac.tz",
    phone: "+255 713 440 112",
    status: "ACCEPTED",
    invitationUrl: "https://campushub.local/teachers/activate/joseph-mbelwa",
    expiresAt: daysFromNow(7),
    createdAt: daysFromNow(-12),
    photo: null,
  },
  {
    id: "teacher-amina-suleiman",
    universityId: "udsm",
    departmentId: "department-cs",
    departmentName: "Department of Computer Science",
    firstName: "Dr. Amina",
    lastName: "Suleiman",
    email: "amina.suleiman@udsm.ac.tz",
    phone: "+255 786 992 104",
    status: "SENT",
    invitationUrl: "https://campushub.local/teachers/activate/amina-suleiman",
    expiresAt: daysFromNow(20),
    createdAt: daysFromNow(-2),
    photo: null,
  },
];

export const mockRepresentatives: MockRepresentative[] = [
  {
    id: "rep-neema-sanga",
    universityId: "udsm",
    collegeId: "college-ict",
    collegeName: "College of Information and Communication Technologies",
    firstName: "Neema",
    lastName: "Sanga",
    email: "neema.sanga@student.udsm.ac.tz",
    phone: "+255 765 224 119",
    status: "ACCEPTED",
    invitationUrl: "https://campushub.local/representatives/activate/neema",
    expiresAt: daysFromNow(11),
    createdAt: daysFromNow(-15),
    photo: null,
    position: "College Representative",
  },
  {
    id: "rep-brian-massawe",
    universityId: "udsm",
    collegeId: "college-engineering",
    collegeName: "College of Engineering and Technology",
    firstName: "Brian",
    lastName: "Massawe",
    email: "brian.massawe@student.udsm.ac.tz",
    phone: "+255 718 554 203",
    status: "SENT",
    invitationUrl: "https://campushub.local/representatives/activate/brian",
    expiresAt: daysFromNow(16),
    createdAt: daysFromNow(-3),
    photo: null,
    position: "Engineering Representative",
  },
];

export const mockCampusLocations: CampusLocation[] = [
  {
    id: "loc-main-library",
    name: "Dr. Wilbert Chagula Library",
    category: "Library",
    code: "LIB-01",
    status: "ACTIVE",
    coordinates: "-6.7786, 39.2054",
    description: "Main study, research, journal, and digital access library.",
  },
  {
    id: "loc-coict-block",
    name: "CoICT Lecture Block",
    category: "Lecture Halls",
    code: "LH-ICT",
    status: "ACTIVE",
    coordinates: "-6.7768, 39.2041",
    description: "Lecture halls, labs, and project rooms for ICT students.",
  },
  {
    id: "loc-health-center",
    name: "University Health Centre",
    category: "Medical Services",
    code: "MED-01",
    status: "ACTIVE",
    coordinates: "-6.7802, 39.2063",
    description: "Primary medical services for students and staff.",
  },
];

export const mockAlmanacEvents: AlmanacEvent[] = [
  {
    id: "event-semester-registration",
    title: "Semester II Registration Opens",
    type: "Academic Date",
    date: daysFromNow(5),
    audience: "All Students",
    status: "PUBLISHED",
    description:
      "Online registration opens for continuing undergraduate and postgraduate students.",
  },
  {
    id: "event-course-add-drop",
    title: "Course Add/Drop Deadline",
    type: "Deadline",
    date: daysFromNow(18),
    audience: "Students and Academic Advisors",
    status: "UPCOMING",
    description:
      "Final date to add or drop courses before academic records are locked.",
  },
  {
    id: "event-mid-semester",
    title: "Mid-Semester Examination Week",
    type: "Examination",
    date: daysFromNow(34),
    audience: "All Colleges",
    status: "DRAFT",
    description:
      "College-level mid-semester assessments and continuous assessment reviews.",
  },
];
