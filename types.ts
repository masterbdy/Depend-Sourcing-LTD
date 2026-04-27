
export enum UserRole {
  ADMIN = 'ADMIN',
  MD = 'MD',
  STAFF = 'STAFF',
  KIOSK = 'KIOSK', // New Role for Factory Common Device
  GUEST = 'GUEST' // New Role for Product Viewers
}

export interface Reaction {
  userId: string;
  userName: string;
  emoji: string;
}

export interface NoteProduct {
  id: string; // Unique ID for mapping in UI
  code?: string;
  purchasePrice?: number;
  sellingPrice?: number;
}

export interface AppNote {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  date: string;
  createdBy: string;
  isDeleted?: boolean;
  purchasePrice?: number; // legacy
  sellingPrice?: number;  // legacy
  productCode?: string;   // legacy
  products?: NoteProduct[];
}

export interface StaffNote {
  id: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  createdBy: string;
}

export interface Staff {
  id: string;
  name: string;
  designation: string;
  staffId: string;
  mobile?: string;
  email?: string; // New Field 
  basicSalary?: number;
  password?: string;
  photo?: string;
  role?: UserRole; 
  workLocation?: 'HEAD_OFFICE' | 'FACTORY' | 'FIELD' | 'CUSTOM'; 
  customLocation?: { lat: number; lng: number; radius: number; name?: string }; 
  secondaryCustomLocation?: { lat: number; lng: number; radius: number; name?: string }; 
  requiresCheckOutLocation?: boolean; 
  status: 'ACTIVE' | 'DEACTIVATED';
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  isHardDeleted?: boolean;
  dateOfBirth?: string; // New: Birthday Field (YYYY-MM-DD)
  // Gamification Fields
  points?: number;
  pointsMonth?: string; // Format 'YYYY-MM' to track monthly resets
  prevMonthPoints?: number; // Stores last month's final score
  prevMonthName?: string;   // Stores which month the prevPoints belong to
  lastVisitTime?: string;
  lastLuckyDrawTime?: string;
  luckyDrawCount?: number;
  lastDevice?: string; // New Field for Device Tracking
  fcmToken?: string; // Firebase Cloud Messaging Token
  notes?: StaffNote[]; // Profile Notes
}

export interface MovementLog {
  id: string;
  staffId: string;
  staffName: string;
  checkIn?: string;
  checkOut?: string;
  location?: string;
  purpose?: string; // New: Reason for movement
  transportMode?: string; // New: Bus, Rickshaw, etc.
  transportCost?: number; // New: Actual Transport Cost
  authorizedBy?: string; // New: Who authorized/sent the staff
  allowanceType?: 'LUNCH' | 'DINNER' | 'NIGHT' | 'HOLIDAY' | 'NONE'; // Added HOLIDAY
  amount?: number;
  isDeleted?: boolean;
  isHardDeleted?: boolean;
}

export interface Attendance {
  id: string;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO String
  checkOutTime?: string; // ISO String
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE';
  isManualByAdmin: boolean; // True if admin forced check-in
  note?: string;
  location?: { lat: number; lng: number; address?: string };
}

export interface Expense {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason: string;
  voucherImage?: string;
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  isDeleted?: boolean;
  isHardDeleted?: boolean;
}

export interface BillingRule {
  type: 'LUNCH' | 'DINNER' | 'NIGHT' | 'HOLIDAY'; // Added HOLIDAY
  startTime: string; // HH:mm (Irrelevant for HOLIDAY but kept for type consistency)
  endTime?: string;  // HH:mm
  amount: number;
  minPeople?: number;
}

export interface FundEntry {
  id: string;
  amount: number;
  note: string;
  date: string;
  isDeleted?: boolean;
  isHardDeleted?: boolean;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'URGENT' | 'NORMAL';
  postedBy: string;
  role: string;
  date: string;
  isDeleted?: boolean;
  isHardDeleted?: boolean;
  reactions?: Reaction[]; // Added reactions
}

export interface AdvanceLog {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  note?: string;
  date: string;
  givenBy: string;
  isDeleted?: boolean;
  isHardDeleted?: boolean;
  type?: 'REGULAR' | 'SALARY'; 
}

export interface Complaint {
  id: string;
  submittedBy: string; // Complainer Name
  submittedById: string;
  againstStaffId: string; // Accused ID
  againstStaffName: string; // Accused Name
  subject: string;
  description: string;
  date: string;
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  isDeleted?: boolean;
  isHardDeleted?: boolean;
  type?: 'COMPLAINT' | 'SUGGESTION'; // Added Type to distinguish
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  role: UserRole;
  timestamp: string;
  type?: 'TEXT' | 'SYSTEM_MOVEMENT'; 
  targetView?: string; 
  reactions?: Reaction[];
  hiddenFor?: string[]; // Array of users who deleted this message for themselves
}

export interface StaffLocation {
  staffId: string;
  staffName: string;
  lat: number;
  lng: number;
  timestamp: string;
  batteryLevel?: number;
  speed?: number; 
  deviceName?: string; // New Field
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  timestamp: string;
  isRead: boolean;
  link?: string; // Tab ID to navigate to
}

// New Types for Product Catalog
export interface Product {
  id: string;
  name: string;
  category: string;
  priceRange: string;
  moq: string; // Minimum Order Quantity
  image: string;
  description: string;
  tags: string[];
  isHardDeleted?: boolean;
}

export interface PhoneBookEntry {
  id: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email?: string;
  address?: string;
  note?: string;
  category: 'CLIENT' | 'SUPPLIER' | 'PARTNER' | 'OTHER';
  isDeleted?: boolean;
  isHardDeleted?: boolean;
}