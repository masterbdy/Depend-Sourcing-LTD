
import { Staff, UserRole, BillingRule } from './types';

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

// OFFICE START TIME CHANGED TO 9:00 AM
export const OFFICE_START_TIME = '09:00'; 

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
