export type MarketVisibility =
  | "Everyone"
  | "Students Only"
  | "Teachers Only"
  | "Alumni Only"
  | "Employers Only";

export type MarketStatus = "ACTIVE" | "DRAFT" | "PAUSED" | "SOLD OUT";

export type MarketProduct = {
  id: string;
  name: string;
  description: string;
  seller: string;
  shopName: string;
  price: string;
  category: string;
  images: string[];
  stars: number;
  views: number;
  visibility: MarketVisibility[];
  location: string;
  stock: number;
  status: MarketStatus;
  createdAt: string;
  trending?: boolean;
  recommended?: boolean;
  favorite?: boolean;
};

export type MarketShop = {
  id: string;
  name: string;
  owner: string;
  logo: string;
  coverImage: string;
  description: string;
  contactNumber: string;
  whatsappNumber: string;
  availabilityStatus: "Open" | "Limited Hours" | "Closed";
  category: string;
  location: string;
  rating: number;
  products: number;
};

export type MarketOrder = {
  id: string;
  product: string;
  buyer: string;
  quantity: number;
  location: string;
  status: "Pending" | "Accepted" | "Rejected" | "Completed";
  date: string;
};

export const marketCategories = [
  "Electronics",
  "Books",
  "Fashion",
  "Food",
  "Room Essentials",
  "Beauty",
  "Services",
  "Transport",
];

export const visibilityOptions: MarketVisibility[] = [
  "Everyone",
  "Students Only",
  "Teachers Only",
  "Alumni Only",
  "Employers Only",
];

export const campusDeliveryLocations = [
  "Use Current Location",
  "CoICT Lecture Block",
  "Dr. Wilbert Chagula Library",
  "Main Student Cafeteria",
  "Hostel Block C",
  "College of Engineering Workshop",
  "Business School Courtyard",
];

export const marketProducts: MarketProduct[] = [
  {
    id: "product-1",
    name: "MacBook Pro M1 13-inch",
    description:
      "Well-maintained MacBook Pro with 16GB RAM and 512GB SSD. Includes charger, sleeve, and a clean battery cycle count for coursework and design projects.",
    seller: "Neema Sanga",
    shopName: "Neema Tech Deals",
    price: "TZS 1,850,000",
    category: "Electronics",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
    ],
    stars: 4.8,
    views: 426,
    visibility: ["Everyone", "Students Only"],
    location: "CoICT Lecture Block",
    stock: 1,
    status: "ACTIVE",
    createdAt: "Jun 10, 2026",
    trending: true,
    recommended: true,
    favorite: true,
  },
  {
    id: "product-2",
    name: "Engineering Drawing Kit",
    description:
      "Complete technical drawing kit with compass, set squares, scale ruler, pencils, and carry case. Ideal for first-year engineering students.",
    seller: "Baraka Mollel",
    shopName: "Campus Supplies TZ",
    price: "TZS 38,000",
    category: "Books",
    images: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    ],
    stars: 4.6,
    views: 188,
    visibility: ["Students Only"],
    location: "College of Engineering Workshop",
    stock: 12,
    status: "ACTIVE",
    createdAt: "Jun 9, 2026",
    trending: true,
  },
  {
    id: "product-3",
    name: "Study Desk Lamp",
    description:
      "Rechargeable LED desk lamp with three brightness modes. Good for hostel rooms, library work, and late-night revision sessions.",
    seller: "Amina Said",
    shopName: "Hostel Essentials",
    price: "TZS 24,000",
    category: "Room Essentials",
    images: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=80",
    ],
    stars: 4.7,
    views: 302,
    visibility: ["Everyone"],
    location: "Hostel Block C",
    stock: 8,
    status: "ACTIVE",
    createdAt: "Jun 8, 2026",
    recommended: true,
  },
  {
    id: "product-4",
    name: "Campus Meal Box",
    description:
      "Fresh rice, chicken, vegetables, and fruit packed for lunch delivery around campus. Orders close daily at 10:00 AM.",
    seller: "Josephine Mwakyusa",
    shopName: "Mama Jo Campus Meals",
    price: "TZS 7,500",
    category: "Food",
    images: [
      "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80",
    ],
    stars: 4.9,
    views: 782,
    visibility: ["Everyone", "Students Only", "Teachers Only"],
    location: "Main Student Cafeteria",
    stock: 35,
    status: "ACTIVE",
    createdAt: "Jun 11, 2026",
    trending: true,
    recommended: true,
  },
  {
    id: "product-5",
    name: "Graduation Blazer Rental",
    description:
      "Clean formal blazers available for presentations, interviews, graduation shoots, and professional campus events.",
    seller: "Faraja Komba",
    shopName: "Smart Wear Campus",
    price: "TZS 15,000/day",
    category: "Fashion",
    images: [
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=80",
    ],
    stars: 4.5,
    views: 211,
    visibility: ["Students Only", "Alumni Only"],
    location: "Business School Courtyard",
    stock: 9,
    status: "ACTIVE",
    createdAt: "Jun 7, 2026",
  },
  {
    id: "product-6",
    name: "CV Review Session",
    description:
      "One-on-one CV and LinkedIn review for internships, graduate programs, and employer networking events.",
    seller: "Michael Lema",
    shopName: "Career Boost Lab",
    price: "TZS 20,000",
    category: "Services",
    images: [
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=1200&q=80",
    ],
    stars: 4.9,
    views: 344,
    visibility: ["Students Only", "Alumni Only"],
    location: "Dr. Wilbert Chagula Library",
    stock: 6,
    status: "ACTIVE",
    createdAt: "Jun 6, 2026",
    favorite: true,
  },
];

export const marketShops: MarketShop[] = [
  {
    id: "shop-1",
    name: "Neema Tech Deals",
    owner: "Neema Sanga",
    logo: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=400&q=80",
    coverImage:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    description:
      "Verified campus electronics, accessories, laptop rentals, and repair referrals for students.",
    contactNumber: "+255 744 120 884",
    whatsappNumber: "+255 744 120 884",
    availabilityStatus: "Open",
    category: "Electronics",
    location: "CoICT Lecture Block",
    rating: 4.8,
    products: 18,
  },
  {
    id: "shop-2",
    name: "Campus Supplies TZ",
    owner: "Baraka Mollel",
    logo: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80",
    coverImage:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
    description:
      "Affordable books, stationery, lab coats, drawing tools, and semester essentials.",
    contactNumber: "+255 713 882 441",
    whatsappNumber: "+255 713 882 441",
    availabilityStatus: "Limited Hours",
    category: "Books",
    location: "College of Engineering Workshop",
    rating: 4.6,
    products: 42,
  },
  {
    id: "shop-3",
    name: "Mama Jo Campus Meals",
    owner: "Josephine Mwakyusa",
    logo: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80",
    coverImage:
      "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=80",
    description:
      "Fresh daily meals, snacks, and event catering delivered around student spaces.",
    contactNumber: "+255 768 410 992",
    whatsappNumber: "+255 768 410 992",
    availabilityStatus: "Open",
    category: "Food",
    location: "Main Student Cafeteria",
    rating: 4.9,
    products: 12,
  },
];

export const marketOrders: MarketOrder[] = [
  {
    id: "order-1",
    product: "Campus Meal Box",
    buyer: "David Peter",
    quantity: 2,
    location: "CoICT Lecture Block",
    status: "Pending",
    date: "Jun 12, 2026",
  },
  {
    id: "order-2",
    product: "Study Desk Lamp",
    buyer: "Hawa Ally",
    quantity: 1,
    location: "Hostel Block C",
    status: "Accepted",
    date: "Jun 11, 2026",
  },
  {
    id: "order-3",
    product: "CV Review Session",
    buyer: "Brian Paulo",
    quantity: 1,
    location: "Dr. Wilbert Chagula Library",
    status: "Completed",
    date: "Jun 9, 2026",
  },
];
