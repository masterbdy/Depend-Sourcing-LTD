
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
  lunchLimit?: number; // Custom per-staff Lunch Bill Limit (Optional, overrides default BillingRule LUNCH amount)
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
  mobileBillPaidUpto?: string; // Stores the month up to which mobile bill is paid (e.g., '2024-09')
  webAuthnCredential?: {
    id: string; // Base64URL encoded credential ID
    rawId: string; // Base64URL encoded rawId
    publicKey?: string; // Optional, might need later, actually passkeys in pure client side might just use ID
  };
  notes?: StaffNote[]; // Profile Notes
  hasChineseAcademyAccess?: boolean; // Chinese Academy authorization
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

export type BillSyncStatus =
  | 'DRAFT'
  | 'SENDING'
  | 'SAVED_OFFLINE'
  | 'SYNCING'
  | 'SUBMITTED'
  | 'FAILED'
  | 'CONFLICT';

export interface Expense {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  reason: string;
  category?: string;
  voucherImage?: string;
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  submittedAt?: string;
  submitLocation?: { lat: number; lng: number };
  syncStatus?: BillSyncStatus;
  lastSyncAttempt?: string;
  syncError?: string;
  clientSubmissionId?: string;
  auditTrail?: {
    action: string;
    details: string;
    timestamp: string;
    actor?: string;
  }[];
  editLogs?: {
    editedAt: string;
    editedBy: string;
    previousAmount: number;
    newAmount: number;
    previousReason: string;
    newReason: string;
    location?: { lat: number; lng: number };
  }[];
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

export interface CustomPopup {
  id: string;
  targetUserId: string; // The staffId of the targeted user
  title: string;
  message: string;
  icon?: string;
  timestamp: string;
  seenBy?: string[]; // To track who saw it
}

export interface SavedLocation {
  id: string;
  companyName: string;
  lat: number;
  lng: number;
  address?: string;
  notes?: string;
  transportInfo?: string;
  addedBy: string;
  addedAt: string;
  isDeleted?: boolean;
}

// ==========================================
// Safe Update & Recovery Center Types
// ==========================================

export type RecoveryHealthStatus =
  | 'HEALTHY'
  | 'ATTENTION_REQUIRED'
  | 'OFFLINE'
  | 'CHECKING'
  | 'UNKNOWN';

export type UpdateCheckStatus =
  | 'UP_TO_DATE'
  | 'UPDATE_AVAILABLE'
  | 'CHECK_FAILED'
  | 'UNAVAILABLE';

export interface AppVersionInfo {
  currentVersion: string;
  latestVersion?: string;
  buildIdentifier: string;
  buildTimestamp: string;
  status: UpdateCheckStatus;
  releaseNotes?: string;
  lastChecked?: string;
  isUpdateAvailable: boolean;
}

export interface DataConflictRecord {
  id: string;
  recordId: string;
  recordType: 'expense';
  detectedAt: string;
  localVersion: Expense;
  serverVersion: Partial<Expense>;
  conflictReason: string;
  status: 'UNRESOLVED' | 'RESOLVED';
  resolutionType?: 'USE_SERVER' | 'USE_LOCAL' | 'KEEP_BOTH';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface QueueRetryItem {
  id: string;
  billId: string;
  staffName: string;
  amount: number;
  reason: string;
  createdAt: string;
  lastSyncAttempt: string;
  syncStatus: BillSyncStatus;
  syncError?: string;
  attempts: number;
  nextEligibleRetry?: number;
  isEligibleForRetry: boolean;
}

export interface CacheCollectionIntegrity {
  name: string;
  count: number;
  status: 'OK' | 'EMPTY' | 'CORRUPTED';
  error?: string;
  lastVerified: string;
}

export interface CacheIntegrityReport {
  isHealthy: boolean;
  indexedDbAvailable: boolean;
  localStorageAvailable: boolean;
  collections: Record<string, CacheCollectionIntegrity>;
  storageQuota?: {
    usageMb: number;
    quotaMb: number;
    percentUsed: number;
  };
  timestamp: string;
}

export interface SafeBackupManifest {
  manifestVersion: string;
  appName: string;
  schemaVersion: string;
  exportedAt: string;
  exportedBy: string;
  recordCounts: Record<string, number>;
  checksum: string;
  securityDisclaimer: string;
}

export interface ImportPreviewSummary {
  isValid: boolean;
  error?: string;
  manifest?: SafeBackupManifest;
  counts: {
    staffToAdd: number;
    staffToUpdate: number;
    expensesToAdd: number;
    expensesToUpdate: number;
    fundsCount: number;
    advancesCount: number;
    rulesCount: number;
    notesCount: number;
  };
  conflictsWithOfflineQueue: number;
  requiresConfirmation: boolean;
}

