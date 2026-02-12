import { Staff, UserRole, BillingRule, Product } from './types';

export const INITIAL_STAFF: Staff[] = [
  { id: '1', name: 'আব্দুল করিম', staffId: 'ST-001', designation: 'অফিস সহকারী', mobile: '01711000000', basicSalary: 12000, status: 'ACTIVE', createdAt: '2024-01-01T10:00:00.000Z', workLocation: 'HEAD_OFFICE', requiresCheckOutLocation: true },
  { id: '2', name: 'রহিম উদ্দিন', staffId: 'ST-002', designation: 'ড্রাইভার', mobile: '01811000000', basicSalary: 15000, status: 'ACTIVE', createdAt: '2024-01-15T11:30:00.000Z', workLocation: 'FIELD', requiresCheckOutLocation: false },
  { id: '3', name: 'কামাল হোসেন', staffId: 'ST-003', designation: 'কুরিয়ার', mobile: '01911000000', basicSalary: 10000, status: 'ACTIVE', createdAt: '2024-02-05T09:45:00.000Z', workLocation: 'HEAD_OFFICE', requiresCheckOutLocation: true },
];

export const INITIAL_BILLING_RULES: BillingRule[] = [
  { type: 'LUNCH', startTime: '13:00', endTime: '14:00', amount: 150, minPeople: 4 },
  { type: 'NIGHT', startTime: '21:15', amount: 200 },
  { type: 'DINNER', startTime: '22:00', amount: 250 },
  { type: 'HOLIDAY', startTime: '00:00', amount: 500 }, // Added Holiday Rule (Friday)
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: '100% Cotton Yarn (30/1)',
    category: 'Yarn (সুতা)',
    priceRange: '$3.50 - $4.20 / kg',
    moq: '500 kg',
    image: 'https://images.unsplash.com/photo-1522543598688-66236fa79621?auto=format&fit=crop&q=80&w=600',
    description: 'Premium quality combed cotton yarn for knitting. Available in various counts (20s, 24s, 30s).',
    tags: ['Combed', 'Knitting', 'Export Quality']
  },
  {
    id: '2',
    name: 'Single Jersey Fabric (160 GSM)',
    category: 'Fabric (ফেব্রিক)',
    priceRange: '$5.00 - $6.50 / kg',
    moq: '1000 kg',
    image: 'https://images.unsplash.com/photo-1613521239827-37c229971903?auto=format&fit=crop&q=80&w=600',
    description: 'Soft and durable single jersey fabric, ready for dyeing. 100% Cotton or CVC available.',
    tags: ['Knit', 'Grey Fabric', 'Soft']
  },
  {
    id: '3',
    name: 'Denim Fabric (12oz)',
    category: 'Fabric (ফেব্রিক)',
    priceRange: '$2.50 - $3.50 / yard',
    moq: '2000 yards',
    image: 'https://images.unsplash.com/photo-1584598147703-b478ef43b900?auto=format&fit=crop&q=80&w=600',
    description: 'High-quality indigo denim fabric. Slub and non-slub varieties available for jeans manufacturing.',
    tags: ['Woven', 'Denim', 'Indigo']
  },
  {
    id: '4',
    name: 'Metal Shank Buttons',
    category: 'Accessories',
    priceRange: '$0.50 - $1.00 / gross',
    moq: '100 Gross',
    image: 'https://images.unsplash.com/photo-1596956697003-7b4d13c72b26?auto=format&fit=crop&q=80&w=600',
    description: 'Durable metal buttons with custom logo engraving options. Anti-rust coating.',
    tags: ['Trims', 'Metal', 'Custom']
  },
  {
    id: '5',
    name: 'Nylon Zippers (Invisible)',
    category: 'Accessories',
    priceRange: '$0.10 - $0.25 / pc',
    moq: '5000 pcs',
    image: 'https://images.unsplash.com/photo-1599694467866-b333a286241d?auto=format&fit=crop&q=80&w=600',
    description: 'High-grade nylon invisible zippers for ladies wear and fashion items. YKK standards.',
    tags: ['Zippers', 'Nylon', 'Fashion']
  },
  {
    id: '6',
    name: 'Polyester Sewing Thread',
    category: 'Yarn (সুতা)',
    priceRange: '$1.00 - $1.50 / cone',
    moq: '500 cones',
    image: 'https://images.unsplash.com/photo-1626885365322-297075c3f9fd?auto=format&fit=crop&q=80&w=600',
    description: 'High tenacity polyester sewing thread (40/2, 50/2). Available in all Pantone colors.',
    tags: ['Sewing', 'High Strength']
  },
  {
    id: '7',
    name: 'Lycra / Spandex Yarn',
    category: 'Yarn (সুতা)',
    priceRange: '$8.00 - $12.00 / kg',
    moq: '100 kg',
    image: 'https://images.unsplash.com/photo-1620799140408-ed5341cd2431?auto=format&fit=crop&q=80&w=600',
    description: 'Premium elastane yarn for stretch fabrics. 20D, 30D, 40D available.',
    tags: ['Stretch', 'Elastane']
  },
  {
    id: '8',
    name: 'Woven Labels & Tags',
    category: 'Accessories',
    priceRange: '$0.02 - $0.05 / pc',
    moq: '10000 pcs',
    image: 'https://images.unsplash.com/photo-1599694467770-077b963b6559?auto=format&fit=crop&q=80&w=600',
    description: 'Custom woven labels, hang tags, and care labels. High definition weaving.',
    tags: ['Branding', 'Labels']
  }
];

// OFFICE START TIME CHANGED TO 9:00 AM
export const OFFICE_START_TIME = '09:00'; 
export const OFFICE_END_TIME = '20:00'; // 8:00 PM

// MULTIPLE WORK LOCATIONS CONFIGURATION
// You need to update the Lat/Lng for Head Office and Factory correctly
export const WORK_LOCATIONS = {
  'HEAD_OFFICE': {
    name: 'হেড অফিস (ঢাকা)',
    lat: 23.8103, // Example: Dhaka
    lng: 90.4125,
    allowedRadiusMeters: 200
  },
  'FACTORY': {
    name: 'ফ্যাক্টরি (টঙ্গী/গাজীপুর)',
    lat: 23.8859, // Example: Tongi (Update this with real coordinates)
    lng: 90.3984,
    allowedRadiusMeters: 300 // Factory might need larger radius
  },
  'FIELD': {
    name: 'ফিল্ড / ড্রাইভার (Anywhere)',
    lat: 0,
    lng: 0,
    allowedRadiusMeters: 99999999 // No restriction
  }
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'ম্যানেজার (আপনি)',
  [UserRole.MD]: 'ব্যবস্থাপনা পরিচালক (MD)',
  [UserRole.STAFF]: 'স্টাফ মেম্বার',
  [UserRole.KIOSK]: 'ফ্যাক্টরি কিয়স্ক (ডিভাইস)',
  [UserRole.GUEST]: 'গেস্ট ইউজার',
};

// Fixed Firebase Configuration
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAer9GCRz3DAAOkrhA9OiVVTcCmVBQPqhY",
  authDomain: "depend-with-mehedi.firebaseapp.com",
  projectId: "depend-with-mehedi",
  databaseURL: "https://depend-with-mehedi-default-rtdb.firebaseio.com",
  storageBucket: "depend-with-mehedi.firebasestorage.app",
  messagingSenderId: "388384301540",
  appId: "1:388384301540:web:7e710df2c267b133e8a7f1",
  measurementId: "G-FZ75S1C3XS"
};