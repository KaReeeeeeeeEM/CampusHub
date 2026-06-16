import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  GraduationCap,
  Handshake,
  Network,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

export const publicNavItems = [
  { label: "About", href: "/about" },
  { label: "Features", href: "/features" },
  { label: "Universities", href: "/universities" },
  { label: "Showcase", href: "/showcase" },
  { label: "Employers", href: "/employers" },
  { label: "Alumni", href: "/alumni" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

export const platformStats = [
  { value: "100+", label: "universities ready to onboard" },
  { value: "1M+", label: "student scale architecture" },
  { value: "8", label: "core stakeholder roles" },
  { value: "24/7", label: "digital campus access" },
];

export const heroSlides = [
  {
    audience: "Students",
    title: "Campus life, connected.",
    description:
      "Bring academic life, campus events, opportunities, support, and community into one trusted university ecosystem.",
    signal:
      "Campus life, opportunities, and support move into one verified student home.",
    statValue: "1M+",
    statLabel: "student-scale architecture",
    image: "/images/photography/student-benefits.webp",
    href: "/features",
  },
  {
    audience: "Universities",
    title: "Modern university engagement.",
    description:
      "Help leadership, administrators, representatives, and academic teams coordinate engagement with clarity and trust.",
    signal:
      "Institutional teams gain a shared engagement layer across every campus audience.",
    statValue: "100+",
    statLabel: "universities ready to onboard",
    image: "/images/photography/university-benefits.webp",
    href: "/universities",
  },
  {
    audience: "Employers",
    title: "Talent pipelines, simplified.",
    description:
      "Support employer partnerships, career development, candidate discovery, and future recruiting workflows.",
    signal:
      "Employers build credible pipelines with students, graduates, and campus teams.",
    statValue: "8",
    statLabel: "stakeholder roles connected",
    image: "/images/photography/employer-benefits.webp",
    href: "/employers",
  },
  {
    audience: "Alumni",
    title: "Lifelong alumni networks.",
    description:
      "Reconnect alumni with mentorship, professional networks, institutional impact, and future giving pathways.",
    signal:
      "Graduate communities stay active through mentorship, mobility, and institutional impact.",
    statValue: "24/7",
    statLabel: "digital ecosystem access",
    image: "/images/photography/alumni-benefits.webp",
    href: "/alumni",
  },
];

export const keyBenefits = [
  {
    title: "Single campus ecosystem",
    description:
      "Bring students, administrators, teachers, alumni, employers, and representatives into a single trusted platform.",
    icon: Network,
  },
  {
    title: "Multi-tenant from day one",
    description:
      "Each university gets a structured, isolated foundation while CampusHub remains ready for regional scale.",
    icon: Building2,
  },
  {
    title: "Built for measurable outcomes",
    description:
      "Support engagement, employability, student services, leadership visibility, and institutional growth.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Enterprise-ready trust layer",
    description:
      "Role-based access, tenant-aware architecture, and secure authentication patterns create a strong operating base.",
    icon: ShieldCheck,
  },
];

export const audienceBenefits = [
  {
    title: "Students",
    href: "/features",
    image: "/images/photography/student-benefits.webp",
    description:
      "A central digital home for academic life, opportunities, engagement, and campus support.",
    points: [
      "Campus identity",
      "Peer engagement",
      "Opportunities",
      "Support access",
    ],
    icon: GraduationCap,
  },
  {
    title: "Universities",
    href: "/universities",
    image: "/images/photography/university-benefits.webp",
    description:
      "A modern engagement layer for leadership, administration, representatives, and student communities.",
    points: [
      "Multi-campus readiness",
      "Governance controls",
      "Engagement visibility",
      "Role-based access",
    ],
    icon: Building2,
  },
  {
    title: "Employers",
    href: "/employers",
    image: "/images/photography/employer-benefits.webp",
    description:
      "Reach verified student and graduate communities with structured employer and hiring workflows.",
    points: [
      "Talent access",
      "Brand presence",
      "Campus recruiting",
      "Pipeline growth",
    ],
    icon: BriefcaseBusiness,
  },
  {
    title: "Alumni",
    href: "/alumni",
    image: "/images/photography/alumni-benefits.webp",
    description:
      "Keep graduates connected to their institutions, peers, mentoring paths, and career opportunities.",
    points: [
      "Mentorship",
      "Giving readiness",
      "Career network",
      "Community growth",
    ],
    icon: UsersRound,
  },
];

export const features = [
  {
    title: "Tenant-aware university spaces",
    description:
      "Create a distinct digital operating space for every university without fragmenting the platform.",
    icon: Building2,
  },
  {
    title: "Role-based experiences",
    description:
      "Prepare targeted journeys for administrators, representatives, teachers, students, alumni, and employers.",
    icon: BadgeCheck,
  },
  {
    title: "Campus engagement foundation",
    description:
      "A scalable base for future announcements, events, communities, support, and student participation modules.",
    icon: Handshake,
  },
  {
    title: "Employer ecosystem readiness",
    description:
      "Establish a trusted path for employer profiles, recruitment, marketplace expansion, and talent programs.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Alumni network readiness",
    description:
      "Support long-term graduate identity, mentoring, giving, and career mobility as future modules come online.",
    icon: UsersRound,
  },
  {
    title: "Future AI and wallet ready",
    description:
      "The architecture is prepared for intelligent services, payments, marketplace flows, and mobile apps.",
    icon: Sparkles,
  },
];

export const testimonials = [
  {
    quote:
      "CampusHub gives universities a credible path to unify campus life, alumni engagement, and employability in one ecosystem.",
    name: "Dr. Amara N.",
    role: "Deputy Vice Chancellor",
  },
  {
    quote:
      "The platform vision matches what employers need: structured access to emerging talent and stronger relationships with universities.",
    name: "Michael K.",
    role: "Talent Partnerships Lead",
  },
  {
    quote:
      "Students need more than scattered groups and noticeboards. CampusHub is designed around the reality of modern campus communities.",
    name: "Neema S.",
    role: "Campus Representative",
  },
];

export const faqs = [
  {
    question: "Is CampusHub only for students?",
    answer:
      "No. CampusHub is designed for the full university ecosystem: students, administrators, representatives, teachers, alumni, employers, and businesses.",
  },
  {
    question: "Can each university have its own environment?",
    answer:
      "Yes. CampusHub is designed as a multi-tenant platform so each institution can operate with its own structure, users, and governance model.",
  },
  {
    question: "Does CampusHub include mobile apps?",
    answer:
      "The first launch target is a Progressive Web Application. The architecture is prepared for future Android and iOS applications.",
  },
  {
    question: "What modules will be available later?",
    answer:
      "CampusHub is prepared for academic engagement, opportunities, alumni networks, employer services, marketplace features, wallet flows, and AI capabilities.",
  },
  {
    question: "How do universities join?",
    answer:
      "Universities start through a qualified onboarding conversation. Student and staff accounts are created only through authorized invitations.",
  },
];

export const pricingPlans = [
  {
    name: "Starter",
    price: "Custom",
    description:
      "For institutions preparing a controlled digital campus rollout.",
    features: [
      "University tenant setup",
      "Core roles",
      "PWA access",
      "Launch support",
    ],
  },
  {
    name: "Growth",
    price: "Custom",
    description:
      "For universities scaling engagement across departments and campuses.",
    features: [
      "Advanced tenant configuration",
      "Employer readiness",
      "Alumni readiness",
      "Priority implementation",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description:
      "For university groups, national rollouts, and ecosystem partnerships.",
    features: [
      "Multi-campus architecture",
      "Custom integrations",
      "Dedicated success planning",
      "Security review support",
    ],
  },
];
