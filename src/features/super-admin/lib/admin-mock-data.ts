export type SuperAdminUser = {
  id: string;
  photo: string;
  name: string;
  email: string;
  role: string;
  position: string;
  university: string;
  college: string;
  department: string;
  status: "Active" | "Suspended" | "Pending";
  lastActive: string;
  phone: string;
  country: string;
};

export const superAdminUsers: SuperAdminUser[] = [
  {
    id: "usr-001",
    photo: "AM",
    name: "Amina Mushi",
    email: "amina.mushi@udsm.ac.tz",
    role: "Student",
    position: "Representative",
    university: "University of Dar es Salaam",
    college: "College of ICT",
    department: "Computer Science",
    status: "Active",
    lastActive: "5 min ago",
    phone: "+255 712 204 118",
    country: "Tanzania",
  },
  {
    id: "usr-002",
    photo: "JM",
    name: "Joseph Mbelwa",
    email: "joseph.mbelwa@udsm.ac.tz",
    role: "Teacher",
    position: "Senior Lecturer",
    university: "University of Dar es Salaam",
    college: "College of ICT",
    department: "Electronics and Telecommunications",
    status: "Active",
    lastActive: "28 min ago",
    phone: "+255 754 440 929",
    country: "Tanzania",
  },
  {
    id: "usr-003",
    photo: "NS",
    name: "Neema Sanga",
    email: "neema.sanga@udsm.ac.tz",
    role: "Student",
    position: "Committee Member",
    university: "University of Dar es Salaam",
    college: "College of ICT",
    department: "Computer Science",
    status: "Active",
    lastActive: "1 hour ago",
    phone: "+255 765 884 011",
    country: "Tanzania",
  },
  {
    id: "usr-004",
    photo: "DK",
    name: "Daniel Kato",
    email: "daniel.kato@ifm.ac.tz",
    role: "Campus Admin",
    position: "University Administrator",
    university: "Institute of Finance Management",
    college: "Business School",
    department: "Administration",
    status: "Active",
    lastActive: "Today",
    phone: "+255 713 448 200",
    country: "Tanzania",
  },
  {
    id: "usr-005",
    photo: "FR",
    name: "Faraja Robert",
    email: "faraja@techbridge.co.tz",
    role: "Employer",
    position: "Talent Partner",
    university: "Ecosystem-wide",
    college: "Employer Network",
    department: "Talent Acquisition",
    status: "Pending",
    lastActive: "Yesterday",
    phone: "+255 746 901 110",
    country: "Tanzania",
  },
  {
    id: "usr-006",
    photo: "BM",
    name: "Brian Massawe",
    email: "brian.massawe@udsm.ac.tz",
    role: "Student",
    position: "Student",
    university: "University of Dar es Salaam",
    college: "College of ICT",
    department: "Computer Science",
    status: "Active",
    lastActive: "2 hours ago",
    phone: "+255 767 310 901",
    country: "Tanzania",
  },
  {
    id: "usr-007",
    photo: "AS",
    name: "Asha Said",
    email: "asha.said@alumni.udsm.ac.tz",
    role: "Alumni",
    position: "Product Manager",
    university: "University of Dar es Salaam",
    college: "College of ICT",
    department: "Computer Science",
    status: "Active",
    lastActive: "3 days ago",
    phone: "+255 755 419 002",
    country: "Tanzania",
  },
  {
    id: "usr-008",
    photo: "PS",
    name: "Peter Seme",
    email: "peter.seme@cbe.ac.tz",
    role: "Teacher",
    position: "Department Coordinator",
    university: "College of Business Education",
    college: "Faculty of Business",
    department: "Procurement",
    status: "Suspended",
    lastActive: "May 31, 2026",
    phone: "+255 713 222 408",
    country: "Tanzania",
  },
];

export type SuperAdminAuditLog = {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  university: string;
  action: string;
  category: string;
  entity: string;
  ipAddress: string;
  status: "Success" | "Warning" | "Failed";
  metadata: string;
};

export const superAdminAuditLogs: SuperAdminAuditLog[] = [
  {
    id: "log-001",
    timestamp: "2026-06-12 14:32",
    user: "Amina Mushi",
    role: "Student",
    university: "University of Dar es Salaam",
    action: "Created showcase project",
    category: "Projects",
    entity: "AfyaTrack AI",
    ipAddress: "41.59.82.14",
    status: "Success",
    metadata: "Visibility: Role-Based, Category: Health Innovation",
  },
  {
    id: "log-002",
    timestamp: "2026-06-12 13:55",
    user: "Daniel Kato",
    role: "Campus Admin",
    university: "Institute of Finance Management",
    action: "Invited campus administrator",
    category: "Users",
    entity: "Campus Admin Invitation",
    ipAddress: "196.45.110.22",
    status: "Success",
    metadata: "Invitation expires in 7 days",
  },
  {
    id: "log-003",
    timestamp: "2026-06-12 12:20",
    user: "Faraja Robert",
    role: "Employer",
    university: "Ecosystem-wide",
    action: "Submitted employer application",
    category: "Marketplace",
    entity: "TechBridge Talent",
    ipAddress: "102.89.13.44",
    status: "Warning",
    metadata: "Application pending review",
  },
  {
    id: "log-004",
    timestamp: "2026-06-11 17:44",
    user: "Joseph Mbelwa",
    role: "Teacher",
    university: "University of Dar es Salaam",
    action: "Created almanac event",
    category: "Events",
    entity: "Mid-Semester Examination Week",
    ipAddress: "41.93.45.10",
    status: "Success",
    metadata: "Audience: College of ICT",
  },
  {
    id: "log-005",
    timestamp: "2026-06-11 10:08",
    user: "Peter Seme",
    role: "Teacher",
    university: "College of Business Education",
    action: "Failed login attempt",
    category: "Logins",
    entity: "Authentication",
    ipAddress: "41.188.12.55",
    status: "Failed",
    metadata: "Reason: account suspended",
  },
  {
    id: "log-006",
    timestamp: "2026-06-10 09:25",
    user: "Neema Sanga",
    role: "Student",
    university: "University of Dar es Salaam",
    action: "Created announcement",
    category: "Announcements",
    entity: "AI Workshop RSVP Reminder",
    ipAddress: "102.90.18.71",
    status: "Success",
    metadata: "Category: Technology, Audience: College of ICT",
  },
];

export const activityTrend = [
  { label: "Mon", actions: 86, logins: 52 },
  { label: "Tue", actions: 112, logins: 67 },
  { label: "Wed", actions: 94, logins: 61 },
  { label: "Thu", actions: 145, logins: 88 },
  { label: "Fri", actions: 168, logins: 104 },
  { label: "Sat", actions: 74, logins: 41 },
  { label: "Sun", actions: 91, logins: 57 },
];

export const activityDistribution = [
  { name: "Logins", value: 38, color: "#3478F6" },
  { name: "Projects", value: 18, color: "#60DDA0" },
  { name: "Marketplace", value: 14, color: "#F59E0B" },
  { name: "Events", value: 12, color: "#7C3AED" },
  { name: "Announcements", value: 10, color: "#EF4444" },
  { name: "Forums", value: 8, color: "#14B8A6" },
];
