// Reusable Company & Financial Expense Dictionary
// Supports Bengali, English, Banglish and domain terms for Depend Sourcing Ltd.

export interface CompanyDictionaryEntry {
  id: string;
  word: string; // The error/Banglish/variation (e.g. 'nasta', 'নাসতা', 'maintanance')
  suggestion: string; // The recommended spelling (e.g. 'নাস্তা', 'Maintenance')
  category: 'EXPENSE_REASON' | 'OFFICE' | 'SUPPLIER' | 'PRODUCT' | 'TRANSPORT' | 'OTHER';
  language: 'BANGLA' | 'ENGLISH' | 'BANGLISH' | 'MIXED';
  isApproved: boolean;
  notes?: string;
  addedBy?: string;
  createdAt: string;
}

export const INITIAL_COMPANY_DICTIONARY: CompanyDictionaryEntry[] = [
  // Common Office Expenses & Foods
  { id: 'cd-1', word: 'nasta', suggestion: 'নাস্তা', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-2', word: 'nashta', suggestion: 'নাস্তা', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-3', word: 'নাসতা', suggestion: 'নাস্তা', category: 'EXPENSE_REASON', language: 'BANGLA', isApproved: true },
  { id: 'cd-4', word: 'lanch', suggestion: 'লাঞ্চ', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-5', word: 'lunch', suggestion: 'লাঞ্চ', category: 'EXPENSE_REASON', language: 'ENGLISH', isApproved: true },
  { id: 'cd-6', word: 'লান্স', suggestion: 'লাঞ্চ', category: 'EXPENSE_REASON', language: 'BANGLA', isApproved: true },
  { id: 'cd-7', word: 'লান্চ', suggestion: 'লাঞ্চ', category: 'EXPENSE_REASON', language: 'BANGLA', isApproved: true },
  { id: 'cd-8', word: 'cha', suggestion: 'চা', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-9', word: 'biskut', suggestion: 'বিস্কুট', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-10', word: 'khabar', suggestion: 'খাবার', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },

  // Transport & Conveyance
  { id: 'cd-11', word: 'jatayat', suggestion: 'যাতায়াত', category: 'TRANSPORT', language: 'BANGLISH', isApproved: true },
  { id: 'cd-12', word: 'jatayat khoroch', suggestion: 'যাতায়াত খরচ', category: 'TRANSPORT', language: 'BANGLISH', isApproved: true },
  { id: 'cd-13', word: 'jattayat', suggestion: 'যাতায়াত', category: 'TRANSPORT', language: 'BANGLISH', isApproved: true },
  { id: 'cd-14', word: 'যাতায়ত', suggestion: 'যাতায়াত', category: 'TRANSPORT', language: 'BANGLA', isApproved: true },
  { id: 'cd-15', word: 'যাতায়াত', suggestion: 'যাতায়াত', category: 'TRANSPORT', language: 'BANGLA', isApproved: true },
  { id: 'cd-16', word: 'vara', suggestion: 'ভাড়া', category: 'TRANSPORT', language: 'BANGLISH', isApproved: true },
  { id: 'cd-17', word: 'bhara', suggestion: 'ভাড়া', category: 'TRANSPORT', language: 'BANGLISH', isApproved: true },
  { id: 'cd-18', word: 'ভারা', suggestion: 'ভাড়া', category: 'TRANSPORT', language: 'BANGLA', isApproved: true },
  { id: 'cd-19', word: 'riksa', suggestion: 'রিকশা', category: 'TRANSPORT', language: 'BANGLISH', isApproved: true },
  { id: 'cd-20', word: 'rickshaw', suggestion: 'রিকশা', category: 'TRANSPORT', language: 'ENGLISH', isApproved: true },
  { id: 'cd-21', word: 'রিকসা', suggestion: 'রিকশা', category: 'TRANSPORT', language: 'BANGLA', isApproved: true },
  { id: 'cd-22', word: 'রিস্কা', suggestion: 'রিকশা', category: 'TRANSPORT', language: 'BANGLA', isApproved: true },
  { id: 'cd-23', word: 'cng', suggestion: 'সিএনজি', category: 'TRANSPORT', language: 'BANGLISH', isApproved: true },
  { id: 'cd-24', word: 'dijel', suggestion: 'ডিজেল', category: 'TRANSPORT', language: 'BANGLISH', isApproved: true },
  { id: 'cd-25', word: 'diesel', suggestion: 'ডিজেল', category: 'TRANSPORT', language: 'ENGLISH', isApproved: true },
  { id: 'cd-26', word: 'অক্টেন', suggestion: 'অকটেন', category: 'TRANSPORT', language: 'BANGLA', isApproved: true },
  { id: 'cd-27', word: 'okten', suggestion: 'অকটেন', category: 'TRANSPORT', language: 'BANGLISH', isApproved: true },
  { id: 'cd-28', word: 'octane', suggestion: 'অকটেন', category: 'TRANSPORT', language: 'ENGLISH', isApproved: true },

  // Maintenance & Office Supplies
  { id: 'cd-29', word: 'maintanance', suggestion: 'Maintenance', category: 'OFFICE', language: 'ENGLISH', isApproved: true },
  { id: 'cd-30', word: 'maintainance', suggestion: 'Maintenance', category: 'OFFICE', language: 'ENGLISH', isApproved: true },
  { id: 'cd-31', word: 'electrisian', suggestion: 'Electrician', category: 'OFFICE', language: 'ENGLISH', isApproved: true },
  { id: 'cd-32', word: 'electricion', suggestion: 'Electrician', category: 'OFFICE', language: 'ENGLISH', isApproved: true },
  { id: 'cd-33', word: 'ইলেক্ট্রিশিয়ান', suggestion: 'ইলেকট্রিশিয়ান', category: 'OFFICE', language: 'BANGLA', isApproved: true },
  { id: 'cd-34', word: 'ইলেক্টনিক', suggestion: 'ইলেকট্রনিক', category: 'OFFICE', language: 'BANGLA', isApproved: true },
  { id: 'cd-35', word: 'ilektronik', suggestion: 'ইলেকট্রনিক', category: 'OFFICE', language: 'BANGLISH', isApproved: true },
  { id: 'cd-36', word: 'electronic', suggestion: 'Electronic', category: 'OFFICE', language: 'ENGLISH', isApproved: true },
  { id: 'cd-37', word: 'offce', suggestion: 'Office', category: 'OFFICE', language: 'ENGLISH', isApproved: true },
  { id: 'cd-38', word: 'ofis', suggestion: 'অফিস', category: 'OFFICE', language: 'BANGLISH', isApproved: true },
  { id: 'cd-39', word: 'khoroch', suggestion: 'খরচ', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-40', word: 'khoroc', suggestion: 'খরচ', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-41', word: 'খরজ', suggestion: 'খরচ', category: 'EXPENSE_REASON', language: 'BANGLA', isApproved: true },
  { id: 'cd-42', word: 'মলামাল', suggestion: 'মালামাল', category: 'PRODUCT', language: 'BANGLA', isApproved: true },
  { id: 'cd-43', word: 'malamal', suggestion: 'মালামাল', category: 'PRODUCT', language: 'BANGLISH', isApproved: true },

  // Buying / Purchasing & Bills
  { id: 'cd-44', word: 'kena', suggestion: 'কেনা', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-45', word: 'kinar', suggestion: 'কেনার', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-46', word: 'kroy', suggestion: 'ক্রয়', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-47', word: 'করয়', suggestion: 'ক্রয়', category: 'EXPENSE_REASON', language: 'BANGLA', isApproved: true },
  { id: 'cd-48', word: 'বিউল', suggestion: 'বিল', category: 'EXPENSE_REASON', language: 'BANGLA', isApproved: true },
  { id: 'cd-49', word: 'beel', suggestion: 'বিল', category: 'EXPENSE_REASON', language: 'BANGLISH', isApproved: true },
  { id: 'cd-50', word: 'vawchar', suggestion: 'ভাউচার', category: 'OFFICE', language: 'BANGLISH', isApproved: true },
  { id: 'cd-51', word: 'ভাওচার', suggestion: 'ভাউচার', category: 'OFFICE', language: 'BANGLA', isApproved: true },
  { id: 'cd-52', word: 'medicine', suggestion: 'ওষুধ', category: 'EXPENSE_REASON', language: 'ENGLISH', isApproved: true },
  { id: 'cd-53', word: 'মেডিসিন', suggestion: 'ওষুধ', category: 'EXPENSE_REASON', language: 'BANGLA', isApproved: true },
  { id: 'cd-54', word: 'ওষধ', suggestion: 'ওষুধ', category: 'EXPENSE_REASON', language: 'BANGLA', isApproved: true },
  { id: 'cd-55', word: 'ফ্যাক্টরি', suggestion: 'ফ্যাক্টরি', category: 'SUPPLIER', language: 'BANGLA', isApproved: true },
  { id: 'cd-56', word: 'factory', suggestion: 'ফ্যাক্টরি', category: 'SUPPLIER', language: 'ENGLISH', isApproved: true },
  { id: 'cd-57', word: 'সাপ্লায়ার', suggestion: 'সাপ্লায়ার', category: 'SUPPLIER', language: 'BANGLA', isApproved: true },
  { id: 'cd-58', word: 'suplier', suggestion: 'Supplier', category: 'SUPPLIER', language: 'ENGLISH', isApproved: true },
  { id: 'cd-59', word: 'suppler', suggestion: 'Supplier', category: 'SUPPLIER', language: 'ENGLISH', isApproved: true },
  { id: 'cd-60', word: 'মোবাইল', suggestion: 'মোবাইল', category: 'OFFICE', language: 'BANGLA', isApproved: true },
  { id: 'cd-61', word: 'mobil', suggestion: 'মোবাইল', category: 'OFFICE', language: 'BANGLISH', isApproved: true },
  { id: 'cd-62', word: 'ইন্টারনেট', suggestion: 'ইন্টারনেট', category: 'OFFICE', language: 'BANGLA', isApproved: true },
  { id: 'cd-63', word: 'net', suggestion: 'নেট বিল', category: 'OFFICE', language: 'BANGLISH', isApproved: true },
];

export interface SpellCheckSuggestion {
  id: string;
  originalWord: string;
  suggestedText: string;
  source: 'DICTIONARY' | 'AI' | 'PHONETIC';
  language: 'BANGLA' | 'ENGLISH' | 'BANGLISH' | 'MIXED';
  explanationBn?: string;
  category?: string;
  confidence?: number;
}
