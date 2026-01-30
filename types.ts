
export enum UserRole {
  ADMIN = 'ADMIN',
  MD = 'MD',
  STAFF = 'STAFF',
  KIOSK = 'KIOSK' // New Role for Factory Common Device
}

export interface Staff {
  id: string;
  name: string;
  designation: string;
  staffId: string;
  mobile?: string;
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
  // Gamification Fields
  points?: number;
  pointsMonth?: string; // Format 'YYYY-MM' to track monthly resets
  prevMonthPoints?: number; // Stores last month's final score
  prevMonthName?: string;   // Stores which month the prevPoints belong to
  lastVisitTime?: string;
  lastLuckyDrawTime?: string;
  luckyDrawCount?: number;
}

export interface MovementLog {
  id: string;
  staffId: string;
  staffName: string;
  checkIn?: string;
  checkOut?: string;
  location?: string;
  allowanceType?: 'LUNCH' | 'DINNER' | 'NIGHT' | 'HOLIDAY' | 'NONE'; // Added HOLIDAY
  amount?: number;
  isDeleted?: boolean;
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
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  role: UserRole;
  timestamp: string;
  type?: 'TEXT' | 'SYSTEM_MOVEMENT'; 
  targetView?: string; 
}

export interface StaffLocation {
  staffId: string;
  staffName: string;
  lat: number;
  lng: number;
  timestamp: string;
  batteryLevel?: number;
  speed?: number; 
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
