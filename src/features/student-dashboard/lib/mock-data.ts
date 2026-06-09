import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Compass,
  FileText,
  Lightbulb,
  Map,
  MessageSquareText,
  PackageSearch,
  ShoppingBag,
  UsersRound,
} from "lucide-react";

export const studentProfile = {
  name: "Amina Hassan",
  university: "University of Dar es Salaam",
  college: "College of Information and Communication Technologies",
  department: "Computer Science",
  yearOfStudy: "Year 3",
  completion: 72,
};

export const announcementHighlights = [
  {
    title: "Semester registration window closes Friday",
    source: "Academic Registry",
    time: "2 hours ago",
    priority: "High",
  },
  {
    title: "ICT lab maintenance scheduled this weekend",
    source: "College ICT Office",
    time: "Yesterday",
    priority: "Normal",
  },
  {
    title: "Student leadership nomination guidelines published",
    source: "Student Affairs",
    time: "Jun 7",
    priority: "Normal",
  },
];

export const upcomingEvents = [
  {
    title: "Innovation and Employability Week",
    date: "Jul 18",
    location: "Nkrumah Hall",
    category: "Career",
  },
  {
    title: "Department research showcase",
    date: "Jul 22",
    location: "CoICT Auditorium",
    category: "Academic",
  },
  {
    title: "Campus wellness clinic",
    date: "Jul 26",
    location: "Student Centre",
    category: "Wellbeing",
  },
];

export const almanacHighlights = [
  {
    title: "Coursework submission period",
    date: "Jul 10 - Jul 24",
    description: "Departments collect mid-semester coursework assessments.",
  },
  {
    title: "Final examination timetable draft",
    date: "Aug 2",
    description: "Draft exam timetable expected for student review.",
  },
  {
    title: "Industrial practical briefing",
    date: "Aug 14",
    description:
      "Briefing for students preparing field placement documentation.",
  },
];

export const notifications = [
  {
    title: "Your profile is 72% complete",
    description:
      "Add student ID verification and interests to unlock better recommendations.",
    icon: Bell,
  },
  {
    title: "New opportunity matches your department",
    description:
      "Graduate trainee talent pool opened for ICT and engineering students.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Representative feedback window open",
    description:
      "Submit academic experience feedback for your college representative.",
    icon: MessageSquareText,
  },
];

export const quickActions = [
  {
    label: "View almanac",
    description: "Academic dates",
    href: "/student/almanac",
    icon: CalendarDays,
  },
  {
    label: "Find campus office",
    description: "Map access",
    href: "/student/campus-map",
    icon: Map,
  },
  {
    label: "Course resources",
    description: "Learning materials",
    href: "/student/almanac",
    icon: BookOpen,
  },
  {
    label: "Submit feedback",
    description: "Representative channel",
    href: "/student/suggestions",
    icon: FileText,
  },
];

export const futureModules = [
  {
    title: "Forum",
    description:
      "Student communities, discussions, and moderated academic spaces.",
    icon: MessageSquareText,
  },
  {
    title: "Suggestions",
    description:
      "Structured feedback and improvement requests for campus leadership.",
    icon: Lightbulb,
  },
  {
    title: "Opportunities",
    description:
      "Internships, competitions, scholarships, and student programs.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Alumni",
    description: "Mentorship, alumni stories, and graduate network access.",
    icon: UsersRound,
  },
  {
    title: "Marketplace",
    description: "Trusted student, campus, and partner commerce experiences.",
    icon: ShoppingBag,
  },
  {
    title: "Lost & Found",
    description: "Report, search, and recover lost campus items.",
    icon: PackageSearch,
  },
];

export const campusMapQuickAccess = {
  title: "Campus Map",
  description:
    "Quickly locate lecture halls, libraries, registrar offices, hostels, clinics, labs, and student service points.",
  landmarks: ["Library", "CoICT Block", "Student Centre", "Health Clinic"],
  icon: Compass,
};
