
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
  secondaryCustomLocation?: { lat: number; lng: number; radius: number; name?: string }; // New Field for 2nd Location
  requiresCheckOutLocation?: boolean; // New field: Mandatory location check during check-out
  status: 'ACTIVE' | 'DEACTIVATED';
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface MovementLog {
  id: string;
  staffId: string;
  staffName: string;
  checkIn?: string;
  checkOut?: string;
  location?: string;
  allowanceType?: 'LUNCH' | 'DINNER' | 'NIGHT' | 'NONE';
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
  type: 'LUNCH' | 'DINNER' | 'NIGHT';
  startTime: string; // HH:mm
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
  type?: 'REGULAR' | 'SALARY'; // New field for Salary Advance tracking
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
  type?: 'TEXT' | 'SYSTEM_MOVEMENT'; // New field to identify message type
  targetView?: string; // Where to go when clicked
}

export interface StaffLocation {
  staffId: string;
  staffName: string;
  lat: number;
  lng: number;
  timestamp: string;
  batteryLevel?: number;
  speed?: number; // m/s
}
