export type UniversityStat = {
  label: string;
  value: string;
};

export type UniversityEvent = {
  title: string;
  date: string;
  location: string;
  description: string;
};

export type UniversityOpportunity = {
  title: string;
  type: string;
  deadline: string;
  description: string;
};

export type University = {
  slug: string;
  name: string;
  shortName: string;
  city: string;
  country: string;
  type: "Public" | "Private";
  status: "Live" | "Onboarding" | "Coming Soon";
  founded: string;
  brandColor: string;
  accentColor: string;
  tagline: string;
  description: string;
  image: string;
  colleges: string[];
  stats: UniversityStat[];
  publicEvents: UniversityEvent[];
  publicOpportunities: UniversityOpportunity[];
};

export const universities: University[] = [
  {
    slug: "university-of-dar-es-salaam",
    name: "University of Dar es Salaam",
    shortName: "UDSM",
    city: "Dar es Salaam",
    country: "Tanzania",
    type: "Public",
    status: "Onboarding",
    founded: "1970",
    brandColor: "#123C69",
    accentColor: "#4F46E5",
    tagline: "Advancing knowledge, leadership, and national development.",
    description:
      "A flagship research university with a broad academic footprint across engineering, humanities, business, education, science, and social sciences. CampusHub supports a connected digital layer for student engagement, alumni growth, and employer partnerships.",
    image: "/images/photography/university-benefits.webp",
    colleges: [
      "College of Engineering and Technology",
      "College of Information and Communication Technologies",
      "College of Natural and Applied Sciences",
      "College of Social Sciences",
      "University of Dar es Salaam Business School",
    ],
    stats: [
      { label: "Students", value: "32k+" },
      { label: "Colleges", value: "7" },
      { label: "Alumni", value: "120k+" },
      { label: "Employer partners", value: "85+" },
    ],
    publicEvents: [
      {
        title: "Innovation and Employability Week",
        date: "July 18, 2026",
        location: "Nkrumah Hall",
        description:
          "A public showcase connecting students, academic departments, alumni, and employers around digital skills and graduate readiness.",
      },
      {
        title: "Alumni Leadership Forum",
        date: "August 9, 2026",
        location: "Main Campus",
        description:
          "A moderated forum on alumni mentorship, industry partnerships, and institutional advancement.",
      },
    ],
    publicOpportunities: [
      {
        title: "Graduate Trainee Talent Pool",
        type: "Career",
        deadline: "August 30, 2026",
        description:
          "Employers can register interest to meet final-year students across business, ICT, engineering, and social science programs.",
      },
      {
        title: "Student Innovation Challenge",
        type: "Competition",
        deadline: "September 12, 2026",
        description:
          "A cross-college challenge for student teams building practical solutions for campus and community problems.",
      },
    ],
  },
  {
    slug: "sokoine-university-of-agriculture",
    name: "Sokoine University of Agriculture",
    shortName: "SUA",
    city: "Morogoro",
    country: "Tanzania",
    type: "Public",
    status: "Coming Soon",
    founded: "1984",
    brandColor: "#1F6F43",
    accentColor: "#3B82F6",
    tagline:
      "Applied research and talent for agriculture, environment, and food systems.",
    description:
      "A specialist university focused on agriculture, veterinary science, natural resources, agribusiness, and environmental systems. CampusHub positions SUA for stronger student services, public opportunities, and sector partnerships.",
    image: "/images/photography/campus-event.webp",
    colleges: [
      "College of Agriculture",
      "College of Forestry, Wildlife and Tourism",
      "College of Veterinary Medicine and Biomedical Sciences",
      "School of Agricultural Economics and Business Studies",
    ],
    stats: [
      { label: "Students", value: "14k+" },
      { label: "Colleges", value: "4" },
      { label: "Research centers", value: "12" },
      { label: "Industry programs", value: "30+" },
    ],
    publicEvents: [
      {
        title: "AgriTech Career Expo",
        date: "July 25, 2026",
        location: "Solomon Mahlangu Campus",
        description:
          "Public employer and student forum for agriculture technology, climate resilience, and food systems careers.",
      },
    ],
    publicOpportunities: [
      {
        title: "Agribusiness Internship Registry",
        type: "Internship",
        deadline: "August 22, 2026",
        description:
          "A structured opportunity pool for students seeking placements in agribusiness, research, and development organizations.",
      },
    ],
  },
  {
    slug: "muhimbili-university-of-health-and-allied-sciences",
    name: "Muhimbili University of Health and Allied Sciences",
    shortName: "MUHAS",
    city: "Dar es Salaam",
    country: "Tanzania",
    type: "Public",
    status: "Live",
    founded: "2007",
    brandColor: "#7F1D1D",
    accentColor: "#10B981",
    tagline:
      "Health science education, clinical excellence, and public impact.",
    description:
      "A leading health sciences university preparing medical, public health, pharmacy, nursing, and allied health professionals. CampusHub supports trusted communication, public health events, alumni mentoring, and employer engagement.",
    image: "/images/photography/lecture-hall.webp",
    colleges: [
      "School of Medicine",
      "School of Pharmacy",
      "School of Nursing",
      "School of Public Health and Social Sciences",
      "School of Dentistry",
    ],
    stats: [
      { label: "Students", value: "6k+" },
      { label: "Schools", value: "5" },
      { label: "Clinical partners", value: "40+" },
      { label: "Alumni", value: "28k+" },
    ],
    publicEvents: [
      {
        title: "Public Health Research Day",
        date: "August 3, 2026",
        location: "MUHAS Conference Centre",
        description:
          "Research presentations and public engagement around healthcare innovation and community health priorities.",
      },
    ],
    publicOpportunities: [
      {
        title: "Community Health Volunteer Program",
        type: "Volunteer",
        deadline: "July 29, 2026",
        description:
          "A public program for students and alumni supporting community health awareness and service learning.",
      },
    ],
  },
  {
    slug: "arden-university-college",
    name: "Arden University College",
    shortName: "AUC",
    city: "Arusha",
    country: "Tanzania",
    type: "Private",
    status: "Onboarding",
    founded: "2011",
    brandColor: "#4338CA",
    accentColor: "#64748B",
    tagline:
      "Modern professional education for enterprise and community leadership.",
    description:
      "A growing private institution focused on business, technology, law, and public administration. CampusHub gives Arden a premium path for digital student engagement and employer-facing growth.",
    image: "/images/photography/community-engagement.webp",
    colleges: [
      "Faculty of Business and Management",
      "Faculty of Computing and Digital Systems",
      "Faculty of Law and Governance",
      "Centre for Professional Development",
    ],
    stats: [
      { label: "Students", value: "4k+" },
      { label: "Faculties", value: "4" },
      { label: "Professional tracks", value: "18" },
      { label: "Partner employers", value: "22" },
    ],
    publicEvents: [
      {
        title: "Digital Careers Open Day",
        date: "September 6, 2026",
        location: "Arusha Campus",
        description:
          "A public event for prospective students, employers, and alumni exploring careers in business and digital systems.",
      },
    ],
    publicOpportunities: [
      {
        title: "Founder-in-Residence Mentorship",
        type: "Mentorship",
        deadline: "September 20, 2026",
        description:
          "A mentorship opportunity for student founders and alumni entrepreneurs preparing early-stage ventures.",
      },
    ],
  },
];

export function getUniversityBySlug(slug: string) {
  return universities.find((university) => university.slug === slug);
}

export function getUniversityOptions() {
  return universities.map((university) => ({
    label: university.name,
    value: university.slug,
  }));
}
