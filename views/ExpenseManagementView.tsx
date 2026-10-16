import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt,
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  Search,
  Calendar,
  FilterX,
  RotateCcw,
  CheckCheck,
  Sparkles,
  Image as ImageIcon,
  X,
  Edit3,
  Eraser,
  AlertTriangle,
  User,
  ChevronDown,
  Printer,
  Loader2,
  Images,
  MessageCircle,
  SpellCheck,
  Wand2,
  BookOpen,
  Cloud,
  CloudOff,
  RefreshCw,
  Send,
  AlertOctagon,
} from 'lucide-react';
import { Expense, Staff, UserRole, AdvanceLog, BillSyncStatus, BillingRule } from '../types';
import {
  submitExpenseBill,
  getUnsyncedBillCount,
  retryExpenseBillSync,
  syncAllPendingBills,
  generateSubmissionId,
  SubmissionResult,
} from '../services/billSyncService';
import {
  detectLunchExpense,
  validateLunchPolicy,
  getLunchLimitAmount,
} from '../services/lunchPolicyService';
import {
  CompanyDictionaryEntry,
  SpellCheckSuggestion,
} from '../services/companyDictionary';
import {
  getStoredCompanyDictionary,
  saveCompanyDictionary,
  getSpellCheckerSettings,
  saveSpellCheckerSettings,
  checkTextOffline,
  checkTextWithAI,
  detectInputLanguage,
  SpellCheckerSettings,
  getLevenshteinDistance,
} from '../services/spellCheckerService';
import SpellCheckerAssistant from './SpellCheckerAssistant';
import DictionaryManagerModal from './DictionaryManagerModal';
import { PaymentVoucherModal } from '../components/PaymentVoucherModal';
import {
  generatePremiumVoucherHTML,
  printCorporateVoucher,
  downloadCorporateVoucherPNG,
  formatVoucherWhatsAppText,
  formatToInternationalPhone,
} from '../services/voucherService';

interface ExpenseProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  staffList: Staff[];
  role: UserRole;
  currentUser: string | null;
  advances: AdvanceLog[];
  onOpenProfile?: (staffId: string) => void;
  allowedBackdateDays?: number;
  typoDictionary?: Record<string, string>;
  setTypoDictionary?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  typoSuggestions?: any[];
  setTypoSuggestions?: React.Dispatch<React.SetStateAction<any[]>>;
  firebaseConfig?: any;
  isCloudEnabled?: boolean;
  billingRules?: BillingRule[];
}

// In-memory date string caching to prevent repeated Date allocations per render
const dateCache = new Map<string, string>();
function getLocalDateStr(d: Date = new Date()): string {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
}

function getSafeDateStr(dateStr?: string): string {
  if (!dateStr) return '';
  const cached = dateCache.get(dateStr);
  if (cached !== undefined) return cached;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      dateCache.set(dateStr, '');
      return '';
    }
    const res = getLocalDateStr(d);
    if (dateCache.size > 2000) dateCache.clear();
    dateCache.set(dateStr, res);
    return res;
  } catch {
    return '';
  }
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------------
// SUBMIT EXPENSE MODAL (Isolated Component for Instant 0ms Typing & Manual AI Check)
// ---------------------------------------------------------------------------------
interface SubmitExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  activeStaff: Staff[];
  role: UserRole;
  currentUser: string | null;
  allowedBackdateDays: number;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  firebaseConfig?: any;
  combinedDict: CompanyDictionaryEntry[];
  spellSettings: SpellCheckerSettings;
  typoDictionary?: Record<string, string>;
  setTypoDictionary?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  typoSuggestions?: any[];
  setTypoSuggestions?: React.Dispatch<React.SetStateAction<any[]>>;
  onUnsyncedCountChange: () => void;
  billingRules?: BillingRule[];
}

const SubmitExpenseModal: React.FC<SubmitExpenseModalProps> = ({
  isOpen,
  onClose,
  staffList,
  activeStaff,
  role,
  currentUser,
  allowedBackdateDays,
  expenses,
  setExpenses,
  firebaseConfig,
  combinedDict,
  spellSettings,
  typoDictionary,
  setTypoDictionary,
  typoSuggestions,
  setTypoSuggestions,
  onUnsyncedCountChange,
  billingRules = [],
}) => {
  const initialStaffId = useMemo(() => {
    if (role === UserRole.STAFF && currentUser) {
      const myself = activeStaff.find((s) => s.name === currentUser);
      if (myself) return myself.id;
    }
    return '';
  }, [role, currentUser, activeStaff]);

  const lunchLimit = getLunchLimitAmount(billingRules);

  const [formData, setFormData] = useState({
    staffId: initialStaffId,
    amount: 0,
    reason: '',
    category: 'GENERAL',
    voucherImage: '',
    date: getLocalDateStr(),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    status: BillSyncStatus;
    billId: string;
    submittedAt: string;
    message: string;
    error?: string;
  } | null>(null);

  // Policy validation & Category Clarification states
  const [clarificationPrompt, setClarificationPrompt] = useState<{
    message: string;
    detectedTerm?: string;
    pendingData: typeof formData;
  } | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Fast memoized local lunch detection (< 0.05ms, zero network, zero typing latency)
  const detectedLunch = useMemo(() => {
    return detectLunchExpense(formData.reason, formData.category);
  }, [formData.reason, formData.category]);

  const submissionIdRef = useRef<string>(generateSubmissionId());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const reasonTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Manual Spell Check States
  const [wordSuggestions, setWordSuggestions] = useState<SpellCheckSuggestion[]>([]);
  const [fullSentenceSuggestions, setFullSentenceSuggestions] = useState<string[]>([]);
  const [detectedLang, setDetectedLang] = useState<'BANGLA' | 'ENGLISH' | 'BANGLISH' | 'MIXED'>('MIXED');
  const [isCheckingSpell, setIsCheckingSpell] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [targetScopeLabel, setTargetScopeLabel] = useState<string>('');
  const activeSpellAbortRef = useRef<AbortController | null>(null);
  const latestReasonRef = useRef<string>(formData.reason);
  latestReasonRef.current = formData.reason;

  // Local-First Draft Auto-Save & Recovery
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('ais_bill_draft_v1');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          setFormData((prev) => ({
            staffId: prev.staffId || parsed.staffId || '',
            amount: prev.amount || parsed.amount || 0,
            reason: prev.reason || parsed.reason || '',
            category: prev.category || parsed.category || 'GENERAL',
            voucherImage: prev.voucherImage || parsed.voucherImage || '',
            date: prev.date || parsed.date || getLocalDateStr(),
          }));
        }
      }
    } catch {}
  }, []);

  const draftTimerRef = useRef<any>(null);
  const persistDraft = (data: typeof formData) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('ais_bill_draft_v1', JSON.stringify(data));
      } catch {}
    }, 400);
  };

  // Date Logic for Restrictions
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - allowedBackdateDays);
  const maxDateStr = getLocalDateStr(today);
  const minDateStr = getLocalDateStr(minDate);

  // Real-time duplicate check: ONLY runs when staffId or date changes
  const duplicateCheck = useMemo(() => {
    if (!formData.staffId || !formData.date) return [];
    return expenses.filter(
      (e) =>
        !e.isDeleted &&
        e.status !== 'REJECTED' &&
        e.staffId === formData.staffId &&
        getSafeDateStr(e.createdAt) === formData.date
    );
  }, [expenses, formData.staffId, formData.date]);

  // MANUAL "AI বানান পরীক্ষা" TRIGGER (Only starts when user explicitly clicks the button)
  const handleManualSpellCheck = async () => {
    const textarea = reasonTextareaRef.current;
    const fullText = (latestReasonRef.current || formData.reason || '').trim();
    let textToCheck = fullText;
    let isSelection = false;

    // Check if user highlighted a specific word or phrase in the textarea
    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      const sel = (formData.reason || '').substring(textarea.selectionStart, textarea.selectionEnd).trim();
      if (sel.length >= 2) {
        textToCheck = sel;
        isSelection = true;
      }
    }

    if (!textToCheck || textToCheck.length < 2) {
      setStatusMessage({
        type: 'info',
        text: 'বানান পরীক্ষা করার জন্য খরচের বিবরণ বা বাক্য লিখুন।',
      });
      return;
    }

    // Prevent duplicate in-flight requests
    if (isCheckingSpell) return;

    if (activeSpellAbortRef.current) {
      activeSpellAbortRef.current.abort();
      activeSpellAbortRef.current = null;
    }

    const abortCtrl = new AbortController();
    activeSpellAbortRef.current = abortCtrl;
    setIsCheckingSpell(true);
    setStatusMessage(null);
    setTargetScopeLabel(isSelection ? `নির্বাচিত অংশ: "${textToCheck.substring(0, 15)}..."` : 'সম্পূর্ণ বিবরণ');

    try {
      const result = await checkTextWithAI(textToCheck, spellSettings, combinedDict, abortCtrl.signal);
      if (abortCtrl.signal.aborted) return;

      if (result.wordSuggestions.length === 0 && result.fullSentenceSuggestions.length === 0) {
        setStatusMessage({
          type: 'success',
          text: '✅ কোনো বানান ভুল পাওয়া যায়নি। আপনার লেখা নির্ভুল!',
        });
        setWordSuggestions([]);
        setFullSentenceSuggestions([]);
      } else {
        setWordSuggestions(result.wordSuggestions);
        setFullSentenceSuggestions(result.fullSentenceSuggestions);
        setDetectedLang(result.detectedLanguage);
        setStatusMessage(null);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('Manual spell check error', e);
        setStatusMessage({
          type: 'error',
          text: '⚠️ AI বানান পরীক্ষা সংযোগ ব্যর্থ হয়েছে। আপনার লেখা অক্ষত আছে এবং আপনি স্বাভাবিকভাবেই বিল সাবমিট করতে পারেন।',
        });
      }
    } finally {
      if (activeSpellAbortRef.current === abortCtrl) {
        activeSpellAbortRef.current = null;
        setIsCheckingSpell(false);
      }
    }
  };

  // Apply single word replacement — Financial amounts, dates, and staff are strictly preserved
  const handleApplyWordSuggestion = (originalWord: string, replacement: string) => {
    setFormData((prev) => {
      const regex = new RegExp(`(^|\\s|[.,!?;:])(${escapeRegExp(originalWord)})($|\\s|[.,!?;:])`, 'gi');
      const updatedReason = prev.reason.replace(regex, `$1${replacement}$3`);
      const updated = { ...prev, reason: updatedReason };
      persistDraft(updated);
      return updated;
    });
    setWordSuggestions((prev) => prev.filter((s) => s.originalWord.toLowerCase() !== originalWord.toLowerCase()));
  };

  // Apply full sentence replacement
  const handleApplyFullSentence = (newSentence: string) => {
    setFormData((prev) => {
      const updated = { ...prev, reason: newSentence };
      persistDraft(updated);
      return updated;
    });
    setWordSuggestions([]);
    setFullSentenceSuggestions([]);
    setStatusMessage(null);
  };

  // Purely immediate input handler: updates state & runs auto-calculator with ZERO AI latency
  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    latestReasonRef.current = text;

    // Fast local auto-calculator for expenses (Bengali & English digits)
    const banglaToEng = (str: string) => str.replace(/[০-৯]/g, (d) => '0123456789'['০১২৩৪৫৬৭৮৯'.indexOf(d)]);
    let processedText = banglaToEng(text);
    const exclusionPattern =
      /(মিরপুর|উত্তরা|সেক্টর|রোড|বাসা|ফ্ল্যাট|লেভেল|তলা|ব্লক|লেন|ওয়ার্ড|নম্বর|নং|প্লাটফর্ম|গাড়ি|বাস নং|Mirpur|Uttara|Sector|Road|House|Flat|Level|Floor|Block|Lane|Ward|No|Num)[\s\-\.]*[0-9]+/gi;
    processedText = processedText.replace(exclusionPattern, (match) => match.replace(/[0-9]/g, 'X'));
    const matches = processedText.match(/(\d+(\.\d+)?)/g);
    let total = 0;
    if (matches) total = matches.reduce((sum, num) => sum + parseFloat(num), 0);

    const next = { ...formData, reason: text, amount: total > 0 ? total : formData.amount };
    setFormData(next);
    persistDraft(next);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const next = { ...formData, voucherImage: canvas.toDataURL('image/jpeg', 0.7) };
          setFormData(next);
          persistDraft(next);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('আপনি কি নিশ্চিত যে ছবি মুছে ফেলতে চান?')) {
      const next = { ...formData, voucherImage: '' };
      setFormData(next);
      persistDraft(next);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const executeSubmission = async (
    dataToSubmit: typeof formData,
    userConfirmedAsLunch: boolean = false,
    userClarifiedNotLunch: boolean = false
  ) => {
    let targetStaffId = dataToSubmit.staffId;
    if (role === UserRole.STAFF && currentUser) {
      const myself = activeStaff.find((s) => s.name === currentUser);
      if (!myself) {
        alert('আপনার প্রোফাইল ডাটা পাওয়া যাচ্ছে না।');
        return;
      }
      targetStaffId = myself.id;
    }
    if (!targetStaffId) {
      alert('স্টাফ নির্বাচন করা হয়নি।');
      return;
    }
    const staff = activeStaff.find((s) => s.id === targetStaffId);
    if (!staff) {
      alert('স্টাফ পাওয়া যায়নি।');
      return;
    }
    if (!dataToSubmit.amount || Number(dataToSubmit.amount) <= 0) {
      alert('টাকার সঠিক পরিমাণ লিখুন।');
      return;
    }
    if (!dataToSubmit.date) {
      alert('তারিখ নির্বাচন করুন।');
      return;
    }

    if (role === UserRole.STAFF) {
      if (dataToSubmit.date < minDateStr) {
        alert(`দুঃখিত! আপনি সর্বোচ্চ ${allowedBackdateDays} দিন আগের বিল সাবমিট করতে পারবেন।`);
        return;
      }
      if (dataToSubmit.date > maxDateStr) {
        alert('ভবিষ্যতের তারিখের বিল সাবমিট করা যাবে না।');
        return;
      }
    }

    // STRICT TRUSTED POLICY VALIDATION
    const policyValidation = validateLunchPolicy({
      amount: Number(dataToSubmit.amount),
      reason: dataToSubmit.reason,
      category: userConfirmedAsLunch ? 'LUNCH' : dataToSubmit.category,
      role,
      actorName: staff.name,
      billingRules,
      userConfirmedCategoryAsLunch: userConfirmedAsLunch,
      userClarifiedNotLunch: userClarifiedNotLunch,
    });

    // Check for category mismatch or ambiguous detection requiring user confirmation
    if (policyValidation.requiresClarification && !userConfirmedAsLunch && !userClarifiedNotLunch) {
      setClarificationPrompt({
        message: policyValidation.clarificationMessage || 'ক্যাটাগরি স্পষ্টকরণ প্রয়োজন',
        detectedTerm: policyValidation.category,
        pendingData: { ...dataToSubmit },
      });
      return;
    }

    // Check for policy violation (e.g. staff exceeding lunch limit)
    if (!policyValidation.allowed && policyValidation.policyError) {
      setPolicyError(policyValidation.policyError);
      return;
    }

    setPolicyError(null);
    setClarificationPrompt(null);
    setIsSubmitting(true);

    let submitLocation: { lat: number; lng: number } | undefined;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        submitLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (err) {
        console.warn('Could not get location for bill submission', err);
      }
    }

    const submitDate = new Date(dataToSubmit.date);
    const now = new Date();
    submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const billId = submissionIdRef.current || generateSubmissionId();
    submissionIdRef.current = billId;

    const newExpenseDraft: Omit<Expense, 'syncStatus' | 'lastSyncAttempt' | 'clientSubmissionId'> = {
      id: billId,
      staffId: targetStaffId,
      staffName: staff.name,
      amount: Number(dataToSubmit.amount),
      reason: dataToSubmit.reason,
      category: policyValidation.category,
      voucherImage: dataToSubmit.voucherImage,
      status: 'PENDING',
      createdAt: submitDate.toISOString(),
      submittedAt: new Date().toISOString(),
      submitLocation,
    };

    // Typo suggestions tracking with fast Levenshtein
    if (setTypoSuggestions) {
      const words = dataToSubmit.reason.split(/[\s,\-\.\/?!;'":\(\)\[\]{}|\\_]+/).filter(Boolean);
      const baseWords = Array.from(new Set(Object.values(typoDictionary || {})));
      const newSuggestions: any[] = [];
      words.forEach((word) => {
        if (word.length < 3) return;
        if (/^[০-৯0-9.,]+$/.test(word)) return;
        if (typoDictionary && typoDictionary[word]) return;
        if (baseWords.includes(word)) return;
        if (typoSuggestions?.some((s) => s.wrong === word && s.status === 'PENDING')) return;

        let bestMatch = null;
        let minDistance = 999;
        for (const bw of baseWords) {
          const d = getLevenshteinDistance(word, bw);
          if (d < minDistance) {
            minDistance = d;
            bestMatch = bw;
          }
        }

        const maxAllowedDistance = word.length > 5 ? 2 : 1;
        if (minDistance > 0 && minDistance <= maxAllowedDistance && bestMatch) {
          newSuggestions.push({
            id: Math.random().toString(36).substr(2, 9),
            wrong: word,
            suggested: bestMatch,
            status: 'PENDING',
            staffName: staff.name,
            timestamp: new Date().toISOString(),
          });
        }
      });

      if (newSuggestions.length > 0) {
        setTypoSuggestions((prev) => [...prev, ...newSuggestions]);
      }
    }

    try {
      const { result, updatedExpense } = await submitExpenseBill(
        newExpenseDraft,
        billId,
        firebaseConfig,
        {
          userRole: role,
          billingRules,
          userConfirmedCategoryAsLunch: userConfirmedAsLunch,
          userClarifiedNotLunch: userClarifiedNotLunch,
        }
      );
      setExpenses((prev) => [updatedExpense, ...prev.filter((e) => e.id !== updatedExpense.id)]);
      setSubmissionFeedback({
        status: result.status,
        billId: result.billId,
        submittedAt: result.submittedAt,
        message: result.message,
        error: result.error,
      });

      // Clear local-first draft on successful submission
      try {
        localStorage.removeItem('ais_bill_draft_v1');
      } catch {}
    } catch (err: any) {
      console.error('Submission failed unexpectedly:', err);
      const fallbackExpense: Expense = {
        ...newExpenseDraft,
        syncStatus: 'SAVED_OFFLINE',
        lastSyncAttempt: new Date().toISOString(),
        syncError: err?.message || 'অজ্ঞাত ত্রুটি',
      };
      setExpenses((prev) => [fallbackExpense, ...prev.filter((e) => e.id !== fallbackExpense.id)]);
      setSubmissionFeedback({
        status: 'SAVED_OFFLINE',
        billId: fallbackExpense.id,
        submittedAt: new Date().toISOString(),
        message: '⚠️ বিল অফলাইনে সংরক্ষিত হয়েছে। পরে সার্ভারে পাঠানো হবে।',
        error: err?.message,
      });
    } finally {
      setIsSubmitting(false);
      onUnsyncedCountChange();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSubmission(formData, false, false);
  };

  const handleCloseFeedback = () => {
    setSubmissionFeedback(null);
    submissionIdRef.current = generateSubmissionId();
    onClose();
  };

  const handleRetrySubmission = async () => {
    if (!submissionFeedback) return;
    setIsSubmitting(true);
    try {
      const existing = expenses.find((e) => e.id === submissionFeedback.billId) || {
        id: submissionFeedback.billId,
        staffId: formData.staffId,
        staffName: activeStaff.find((s) => s.id === formData.staffId)?.name || currentUser || 'Staff',
        amount: Number(formData.amount),
        reason: formData.reason,
        voucherImage: formData.voucherImage,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
      };
      const res = await retryExpenseBillSync(existing, firebaseConfig);
      setExpenses((prev) => prev.map((e) => (e.id === res.updatedExpense.id ? res.updatedExpense : e)));
      setSubmissionFeedback({
        status: res.status,
        billId: res.updatedExpense.id,
        submittedAt: res.updatedExpense.submittedAt || new Date().toISOString(),
        message: res.message,
        error: res.updatedExpense.syncError,
      });
    } catch (err: any) {
      alert(`পুনরায় চেষ্টা ব্যর্থ: ${err?.message}`);
    } finally {
      setIsSubmitting(false);
      onUnsyncedCountChange();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div
          className={`p-5 border-b flex justify-between items-center text-white shrink-0 transition-colors ${
            submissionFeedback
              ? submissionFeedback.status === 'SUBMITTED'
                ? 'bg-emerald-600'
                : submissionFeedback.status === 'SAVED_OFFLINE'
                ? 'bg-amber-600'
                : 'bg-red-600'
              : 'bg-indigo-600'
          }`}
        >
          <h3 className="font-bold text-lg flex items-center gap-2">
            {submissionFeedback ? (
              submissionFeedback.status === 'SUBMITTED' ? (
                <>
                  <CheckCircle className="w-5 h-5" /> বিল জমা নিশ্চিতকরণ
                </>
              ) : submissionFeedback.status === 'SAVED_OFFLINE' ? (
                <>
                  <CloudOff className="w-5 h-5" /> অফলাইন সংরক্ষণ নিশ্চিতকরণ
                </>
              ) : (
                <>
                  <AlertOctagon className="w-5 h-5" /> জমা ব্যর্থ
                </>
              )
            ) : (
              'নতুন বিল জমা দিন'
            )}
          </h3>
          <button onClick={handleCloseFeedback} className="text-white/80 hover:text-white transition-colors text-2xl leading-none">
            ×
          </button>
        </div>

        {submissionFeedback ? (
          <div className="flex flex-col flex-1 p-6 space-y-5 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              {submissionFeedback.status === 'SUBMITTED' ? (
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm animate-bounce">
                  <CheckCircle className="w-10 h-10" />
                </div>
              ) : submissionFeedback.status === 'SAVED_OFFLINE' ? (
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
                  <CloudOff className="w-10 h-10" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-sm">
                  <AlertOctagon className="w-10 h-10" />
                </div>
              )}

              <h3 className="text-lg font-black text-gray-800 dark:text-white leading-snug">
                {submissionFeedback.message}
              </h3>

              {submissionFeedback.status === 'SUBMITTED' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Firebase Realtime Database থেকে সফল সার্ভার রাইট কনফার্মেশন পাওয়া গেছে।
                </p>
              )}
              {submissionFeedback.status === 'SAVED_OFFLINE' && (
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  ডিভাইসটি অফলাইনে থাকায় বিলটি লোকাল স্টোরেজে নিরাপদে রাখা হয়েছে। ইন্টারনেট পেলেই স্বয়ংক্রিয়ভাবে সার্ভারে সিঙ্ক হবে।
                </p>
              )}
              {submissionFeedback.status === 'FAILED' && submissionFeedback.error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-xl border border-red-200 dark:border-red-800 font-mono">
                  ত্রুটি: {submissionFeedback.error}
                </p>
              )}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700/60 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400 font-medium">রেফারেন্স আইডি:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{submissionFeedback.billId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400 font-medium">জমার সময়:</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  {new Date(submissionFeedback.submittedAt).toLocaleDateString('bn-BD', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  •{' '}
                  {new Date(submissionFeedback.submittedAt).toLocaleTimeString('bn-BD', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400 font-medium">টাকার পরিমাণ:</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">
                  ৳ {Number(formData.amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400 font-medium">ট্রান্সপোর্ট স্ট্যাটাস:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    submissionFeedback.status === 'SUBMITTED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : submissionFeedback.status === 'SAVED_OFFLINE'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                  }`}
                >
                  {submissionFeedback.status === 'SUBMITTED'
                    ? '☁️ সার্ভারে জমা'
                    : submissionFeedback.status === 'SAVED_OFFLINE'
                    ? '💾 অফলাইনে সংরক্ষিত'
                    : '❌ সিঙ্ক ব্যর্থ'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-500 dark:text-gray-400 font-medium">অনুমোদন স্ট্যাটাস:</span>
                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                  ⏳ পেন্ডিং (অপেক্ষারত)
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {submissionFeedback.status === 'FAILED' ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetrySubmission}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95 shadow-md"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    পুনরায় চেষ্টা করুন (Retry)
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseFeedback}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs transition-all"
                  >
                    পরে সিঙ্ক করুন
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseFeedback}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-98"
                >
                  ঠিক আছে (সম্পন্ন)
                </button>
              )}
            </div>
          </div>
        ) : (
          <form id="expense-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto p-4 custom-scrollbar flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">স্টাফ নির্বাচন করুন</label>
                {role === UserRole.STAFF ? (
                  <div className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between cursor-not-allowed">
                    <span>{currentUser}</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded uppercase">
                      Self
                    </span>
                  </div>
                ) : (
                  <select
                    required
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60"
                    value={formData.staffId}
                    onChange={(e) => {
                      const next = { ...formData, staffId: e.target.value };
                      setFormData(next);
                      persistDraft(next);
                    }}
                  >
                    <option value="">নির্বাচন করুন</option>
                    {activeStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ক্যাটাগরি (Category)
                  </label>
                  <select
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold disabled:opacity-60 cursor-pointer"
                    value={formData.category}
                    onChange={(e) => {
                      const next = { ...formData, category: e.target.value };
                      setFormData(next);
                      persistDraft(next);
                      if (policyError) setPolicyError(null);
                    }}
                  >
                    <option value="GENERAL">সাধারণ (General)</option>
                    <option value="LUNCH">লাঞ্চ (Lunch)</option>
                    <option value="TRANSPORT">যাতায়াত (Transport)</option>
                    <option value="SNACKS">নাস্তা (Snacks)</option>
                    <option value="OFFICE">অফিস খরচ (Office)</option>
                    <option value="OTHER">অন্যান্য (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">তারিখ (Date)</label>
                  <input
                    type="date"
                    required
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold disabled:opacity-60"
                    value={formData.date}
                    onChange={(e) => {
                      const next = { ...formData, date: e.target.value };
                      setFormData(next);
                      persistDraft(next);
                    }}
                    min={role === UserRole.STAFF ? minDateStr : undefined}
                    max={maxDateStr}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">টাকার পরিমাণ</label>
                  {formData.category === 'LUNCH' && (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                      লাঞ্চ সীমা: ৳{lunchLimit}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                  <input
                    required
                    type="number"
                    disabled={isSubmitting}
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg text-gray-800 dark:text-white disabled:opacity-60"
                    placeholder="0.00"
                    value={formData.amount || ''}
                    onChange={(e) => {
                      const next = { ...formData, amount: Number(e.target.value) };
                      setFormData(next);
                      persistDraft(next);
                      if (policyError) setPolicyError(null);
                    }}
                  />
                </div>
              </div>

              {/* Policy Error Banner */}
              {policyError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                  <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-bold block">লাঞ্চ লিমিট পলিসি সতর্কতা:</span>
                    <p className="leading-relaxed font-medium">{policyError}</p>
                  </div>
                </div>
              )}

              {/* Category Clarification Prompt */}
              {clarificationPrompt && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 rounded-xl space-y-2.5 animate-in fade-in duration-200 shadow-xs">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ক্যাটাগরি স্পষ্টকরণ (Category Clarification)</span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    {clarificationPrompt.message}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...clarificationPrompt.pendingData, category: 'LUNCH' };
                        setFormData(updated);
                        persistDraft(updated);
                        executeSubmission(updated, true, false);
                      }}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      ✓ হ্যাঁ, এটি লাঞ্চ বিল
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        executeSubmission(clarificationPrompt.pendingData, false, true);
                      }}
                      className="flex-1 py-2 px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      ✕ না, অন্যান্য খরচ
                    </button>
                  </div>
                </div>
              )}

              {/* Non-intrusive Live Category Suggestion */}
              {formData.category !== 'LUNCH' && detectedLunch.isLunch && detectedLunch.confidence !== 'NONE' && (
                <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-2 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                    <span className="text-base">💡</span>
                    <span>বিবরণে <b>"{detectedLunch.detectedTerm}"</b> চিহ্নিত হয়েছে।</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...formData, category: 'LUNCH' };
                      setFormData(next);
                      persistDraft(next);
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer shadow-2xs"
                  >
                    লাঞ্চ ক্যাটাগরি সেট করুন
                  </button>
                </div>
              )}

              {duplicateCheck.length > 0 && (
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-xl flex flex-col gap-2 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-black text-xs uppercase tracking-widest">
                    <AlertTriangle className="w-4 h-4" /> সতর্কতা: ইতিমধ্যে বিল আছে!
                  </div>
                  <p className="text-xs font-bold text-orange-800 dark:text-orange-300 leading-relaxed">
                    এই স্টাফের নামের সাথে <u>{new Date(formData.date).toLocaleDateString('bn-BD')}</u> তারিখে ইতিমধ্যে{' '}
                    <span className="text-lg">{duplicateCheck.length}</span> টি বিল আছে।
                  </p>
                  <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg max-h-24 overflow-y-auto custom-scrollbar">
                    {duplicateCheck.map((e) => (
                      <div
                        key={e.id}
                        className="flex justify-between text-[10px] font-bold text-orange-600 dark:text-orange-400 border-b border-orange-100 dark:border-orange-800/30 last:border-0 py-1"
                      >
                        <span>{e.reason.substring(0, 20)}...</span>
                        <span>৳ {e.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    খরচের কারণ ও বিবরণ
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Auto Calculator
                    </span>
                    <button
                      type="button"
                      onClick={handleManualSpellCheck}
                      disabled={isCheckingSpell}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-all shadow-xs active:scale-95 disabled:opacity-60 cursor-pointer"
                      title="লেখা বা নির্বাচিত অংশের বানান AI দিয়ে পরীক্ষা করুন"
                    >
                      {isCheckingSpell ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                          <span>পরীক্ষা হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>AI বানান পরীক্ষা</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  ref={reasonTextareaRef}
                  required
                  rows={2}
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60"
                  placeholder="যেমন: নাস্তা ৫০, রিক্সা ভাড়া ১০০..."
                  value={formData.reason}
                  onChange={handleReasonChange}
                />

                <SpellCheckerAssistant
                  value={formData.reason}
                  onApplyWord={handleApplyWordSuggestion}
                  onApplyFullSentence={handleApplyFullSentence}
                  wordSuggestions={wordSuggestions}
                  fullSentenceSuggestions={fullSentenceSuggestions}
                  detectedLanguage={detectedLang}
                  isLoading={isCheckingSpell}
                  statusMessage={statusMessage}
                  targetScopeLabel={targetScopeLabel}
                  onDismissSuggestion={(id) => {
                    setWordSuggestions((prev) => prev.filter((s) => s.id !== id));
                  }}
                  onDismissAll={() => {
                    setWordSuggestions([]);
                    setFullSentenceSuggestions([]);
                    setStatusMessage(null);
                  }}
                  onManualTrigger={handleManualSpellCheck}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ভাউচার ছবি</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50"
                  >
                    <ImageIcon className="w-4 h-4" /> গ্যালারি
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-indigo-100 dark:border-indigo-800 transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" /> ক্যামেরা
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleImageUpload} />

                {formData.voucherImage ? (
                  <div className="relative h-24 w-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <img src={formData.voucherImage} alt="Preview" className="h-full w-full object-contain" />
                    {!isSubmitting && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-sm hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-24 w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-400">
                    <p className="text-xs">কোনো ছবি নির্বাচন করা হয়নি</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75 disabled:cursor-wait"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>বিল জমা হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>বিল জমা দিন (Submit Bill)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

// -------------------------------------------------------------------------------------
// CORRECTION EXPENSE MODAL (Isolated Component for Instant 0ms Typing & Manual AI Check)
// -------------------------------------------------------------------------------------
interface CorrectionExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  correctionData: { id: string; amount: number; reason: string; category?: string; date: string; voucherImage: string };
  currentUser: string | null;
  role: UserRole;
  billingRules?: BillingRule[];
  onSave: (data: { id: string; amount: number; reason: string; category?: string; date: string; voucherImage: string }) => Promise<void>;
  combinedDict?: CompanyDictionaryEntry[];
  spellSettings?: SpellCheckerSettings;
}

const CorrectionExpenseModal: React.FC<CorrectionExpenseModalProps> = ({
  isOpen,
  onClose,
  correctionData: initialData,
  currentUser,
  role,
  billingRules = [],
  onSave,
  combinedDict = [],
  spellSettings = getSpellCheckerSettings(),
}) => {
  const [data, setData] = useState({
    ...initialData,
    category: initialData.category || 'GENERAL',
  });
  const lunchLimit = getLunchLimitAmount(billingRules);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const reasonTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Policy validation states for Correction
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [clarificationPrompt, setClarificationPrompt] = useState<{
    message: string;
    detectedTerm?: string;
    pendingData: typeof data;
  } | null>(null);

  const detectedLunch = useMemo(() => {
    return detectLunchExpense(data.reason, data.category);
  }, [data.reason, data.category]);

  // Manual Spell Check States for Correction Modal
  const [wordSuggestions, setWordSuggestions] = useState<SpellCheckSuggestion[]>([]);
  const [fullSentenceSuggestions, setFullSentenceSuggestions] = useState<string[]>([]);
  const [detectedLang, setDetectedLang] = useState<'BANGLA' | 'ENGLISH' | 'BANGLISH' | 'MIXED'>('MIXED');
  const [isCheckingSpell, setIsCheckingSpell] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [targetScopeLabel, setTargetScopeLabel] = useState<string>('');
  const activeSpellAbortRef = useRef<AbortController | null>(null);

  const handleManualSpellCheck = async () => {
    const textarea = reasonTextareaRef.current;
    const fullText = (data.reason || '').trim();
    let textToCheck = fullText;
    let isSelection = false;

    if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
      const sel = (data.reason || '').substring(textarea.selectionStart, textarea.selectionEnd).trim();
      if (sel.length >= 2) {
        textToCheck = sel;
        isSelection = true;
      }
    }

    if (!textToCheck || textToCheck.length < 2) {
      setStatusMessage({
        type: 'info',
        text: 'বানান পরীক্ষা করার জন্য কারণ বা বিবরণ লিখুন।',
      });
      return;
    }

    if (isCheckingSpell) return;

    if (activeSpellAbortRef.current) {
      activeSpellAbortRef.current.abort();
      activeSpellAbortRef.current = null;
    }

    const abortCtrl = new AbortController();
    activeSpellAbortRef.current = abortCtrl;
    setIsCheckingSpell(true);
    setStatusMessage(null);
    setTargetScopeLabel(isSelection ? `নির্বাচিত অংশ: "${textToCheck.substring(0, 15)}..."` : 'সম্পূর্ণ নোট');

    try {
      const result = await checkTextWithAI(textToCheck, spellSettings, combinedDict, abortCtrl.signal);
      if (abortCtrl.signal.aborted) return;

      if (result.wordSuggestions.length === 0 && result.fullSentenceSuggestions.length === 0) {
        setStatusMessage({
          type: 'success',
          text: '✅ কোনো বানান ভুল পাওয়া যায়নি। আপনার লেখা নির্ভুল!',
        });
        setWordSuggestions([]);
        setFullSentenceSuggestions([]);
      } else {
        setWordSuggestions(result.wordSuggestions);
        setFullSentenceSuggestions(result.fullSentenceSuggestions);
        setDetectedLang(result.detectedLanguage);
        setStatusMessage(null);
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('Manual spell check error in correction', e);
        setStatusMessage({
          type: 'error',
          text: '⚠️ AI বানান পরীক্ষা সংযোগ ব্যর্থ হয়েছে। আপনার লেখা অক্ষত আছে।',
        });
      }
    } finally {
      if (activeSpellAbortRef.current === abortCtrl) {
        activeSpellAbortRef.current = null;
        setIsCheckingSpell(false);
      }
    }
  };

  const handleApplyWordSuggestion = (originalWord: string, replacement: string) => {
    setData((prev) => {
      const regex = new RegExp(`(^|\\s|[.,!?;:])(${escapeRegExp(originalWord)})($|\\s|[.,!?;:])`, 'gi');
      const updatedReason = prev.reason.replace(regex, `$1${replacement}$3`);
      return { ...prev, reason: updatedReason };
    });
    setWordSuggestions((prev) => prev.filter((s) => s.originalWord.toLowerCase() !== originalWord.toLowerCase()));
  };

  const handleApplyFullSentence = (newSentence: string) => {
    setData((prev) => ({
      ...prev,
      reason: newSentence,
    }));
    setWordSuggestions([]);
    setFullSentenceSuggestions([]);
    setStatusMessage(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          setData((prev) => ({ ...prev, voucherImage: canvas.toDataURL('image/jpeg', 0.7) }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setData((prev) => ({ ...prev, voucherImage: '' }));
  };

  const executeSave = async (
    dataToSave: typeof data,
    confirmedAsLunch: boolean = false,
    clarifiedNotLunch: boolean = false
  ) => {
    const policyValidation = validateLunchPolicy({
      amount: Number(dataToSave.amount),
      reason: dataToSave.reason,
      category: confirmedAsLunch ? 'LUNCH' : dataToSave.category,
      role,
      actorName: currentUser || 'User',
      billingRules,
      userConfirmedCategoryAsLunch: confirmedAsLunch,
      userClarifiedNotLunch: clarifiedNotLunch,
    });

    if (policyValidation.requiresClarification && !confirmedAsLunch && !clarifiedNotLunch) {
      setClarificationPrompt({
        message: policyValidation.clarificationMessage || 'ক্যাটাগরি স্পষ্টকরণ প্রয়োজন',
        detectedTerm: policyValidation.category,
        pendingData: { ...dataToSave },
      });
      return;
    }

    if (!policyValidation.allowed && policyValidation.policyError) {
      setPolicyError(policyValidation.policyError);
      return;
    }

    setPolicyError(null);
    setClarificationPrompt(null);
    setIsSubmitting(true);
    try {
      await onSave({
        ...dataToSave,
        category: policyValidation.category,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSave(data, false, false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-orange-500 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg">বিল সংশোধন (Correction)</h3>
          <button onClick={onClose} className="text-orange-100 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                ক্যাটাগরি (Category)
              </label>
              <select
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-gray-800 dark:text-white text-sm cursor-pointer"
                value={data.category || 'GENERAL'}
                onChange={(e) => {
                  setData({ ...data, category: e.target.value });
                  if (policyError) setPolicyError(null);
                }}
              >
                <option value="GENERAL">সাধারণ (General)</option>
                <option value="LUNCH">লাঞ্চ (Lunch)</option>
                <option value="TRANSPORT">যাতায়াত (Transport)</option>
                <option value="SNACKS">নাস্তা (Snacks)</option>
                <option value="OFFICE">অফিস খরচ (Office)</option>
                <option value="OTHER">অন্যান্য (Other)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">তারিখ (Date)</label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-gray-800 dark:text-white"
                value={data.date}
                onChange={(e) => setData({ ...data, date: e.target.value })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">সঠিক টাকার পরিমাণ</label>
                {data.category === 'LUNCH' && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    লাঞ্চ সীমা: ৳{lunchLimit}
                  </span>
                )}
              </div>
              <input
                type="number"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-xl text-gray-800 dark:text-white"
                value={data.amount}
                onChange={(e) => {
                  setData({ ...data, amount: Number(e.target.value) });
                  if (policyError) setPolicyError(null);
                }}
              />
            </div>

            {/* Policy Error Banner */}
            {policyError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold block">লাঞ্চ লিমিট পলিসি সতর্কতা:</span>
                  <p className="leading-relaxed font-medium">{policyError}</p>
                </div>
              </div>
            )}

            {/* Clarification Dialog */}
            {clarificationPrompt && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 rounded-xl space-y-2.5 animate-in fade-in duration-200 shadow-xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>ক্যাটাগরি স্পষ্টকরণ (Clarification)</span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                  {clarificationPrompt.message}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...clarificationPrompt.pendingData, category: 'LUNCH' };
                      setData(updated);
                      executeSave(updated, true, false);
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    ✓ হ্যাঁ, এটি লাঞ্চ বিল
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      executeSave(clarificationPrompt.pendingData, false, true);
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    ✕ না, অন্যান্য খরচ
                  </button>
                </div>
              </div>
            )}

            {/* Non-intrusive Live Suggestion Chip */}
            {data.category !== 'LUNCH' && detectedLunch.isLunch && detectedLunch.confidence !== 'NONE' && (
              <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-2 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium">
                  <span className="text-base">💡</span>
                  <span>বিবরণে <b>"{detectedLunch.detectedTerm}"</b> চিহ্নিত হয়েছে।</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setData({ ...data, category: 'LUNCH' });
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shrink-0 transition-colors cursor-pointer shadow-2xs"
                >
                  লাঞ্চ ক্যাটাগরি সেট করুন
                </button>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                  সংশোধিত কারণ/নোট
                </label>
                <button
                  type="button"
                  onClick={handleManualSpellCheck}
                  disabled={isCheckingSpell}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-lg text-[11px] font-bold border border-orange-200 dark:border-orange-800 transition-all shadow-xs active:scale-95 disabled:opacity-60 cursor-pointer"
                  title="সংশোধিত লেখার বানান AI দিয়ে পরীক্ষা করুন"
                >
                  {isCheckingSpell ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-orange-600 dark:text-orange-400" />
                      <span>পরীক্ষা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                      <span>AI বানান পরীক্ষা</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                ref={reasonTextareaRef}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium dark:text-gray-200"
                value={data.reason}
                onChange={(e) => setData({ ...data, reason: e.target.value })}
              />

              <SpellCheckerAssistant
                value={data.reason}
                onApplyWord={handleApplyWordSuggestion}
                onApplyFullSentence={handleApplyFullSentence}
                wordSuggestions={wordSuggestions}
                fullSentenceSuggestions={fullSentenceSuggestions}
                detectedLanguage={detectedLang}
                isLoading={isCheckingSpell}
                statusMessage={statusMessage}
                targetScopeLabel={targetScopeLabel}
                onDismissSuggestion={(id) => {
                  setWordSuggestions((prev) => prev.filter((s) => s.id !== id));
                }}
                onDismissAll={() => {
                  setWordSuggestions([]);
                  setFullSentenceSuggestions([]);
                  setStatusMessage(null);
                }}
                onManualTrigger={handleManualSpellCheck}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">ভাউচার ছবি (Voucher)</label>

              {data.voucherImage ? (
                <div className="relative h-32 w-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden group">
                  <img src={data.voucherImage} alt="Voucher" className="h-full w-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="p-2 bg-white rounded-full text-gray-700 hover:text-indigo-600 transition-colors"
                      title="Change"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-600 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" /> গ্যালারি
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-indigo-100 dark:border-indigo-800 transition-colors"
                  >
                    <Camera className="w-4 h-4" /> ক্যামেরা
                  </button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleImageUpload} />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
              {isSubmitting ? 'সেইভ হচ্ছে...' : 'সেইভ করুন'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

// -------------------------------------------------------------
// EXPENSE CARD (Memoized for High-Speed List Rendering)
// -------------------------------------------------------------
interface ExpenseCardProps {
  expense: Expense;
  role: UserRole;
  currentUser: string | null;
  isDuplicate: boolean;
  staffMember?: Staff;
  staffDisplayId: string;
  isDownloading: boolean;
  isSyncing: boolean;
  onOpenCorrection: (e: Expense) => void;
  onViewVoucher: (img: string) => void;
  onViewHistory: (e: Expense) => void;
  onOpenProfile?: (staffId: string) => void;
  onPreviewVoucher: (e: Expense) => void;
  onPrintPDF: (e: Expense) => void;
  onDownloadPNG: (e: Expense) => void;
  onWhatsAppShare: (e: Expense) => void;
  onUpdateStatus: (id: string, status: Expense['status']) => void;
  onRequestDelete: (e: Expense) => void;
  onRetrySync: (e: Expense) => void;
}

const ExpenseCard = React.memo<ExpenseCardProps>(({
  expense,
  role,
  currentUser,
  isDuplicate,
  staffMember,
  staffDisplayId,
  isDownloading,
  isSyncing,
  onOpenCorrection,
  onViewVoucher,
  onViewHistory,
  onOpenProfile,
  onPreviewVoucher,
  onPrintPDF,
  onDownloadPNG,
  onWhatsAppShare,
  onUpdateStatus,
  onRequestDelete,
  onRetrySync,
}) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden flex flex-col hover:shadow-md transition-all ${
        isDuplicate && (role === UserRole.ADMIN || role === UserRole.MD)
          ? 'border-red-300 ring-2 ring-red-100'
          : 'border-gray-100 dark:border-gray-700'
      }`}
    >
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* BUSINESS APPROVAL STATUS */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                expense.status === 'APPROVED'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : expense.status === 'REJECTED'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : expense.status === 'VERIFIED'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              }`}
            >
              {expense.status === 'PENDING'
                ? 'পেন্ডিং'
                : expense.status === 'VERIFIED'
                ? 'ভেরিফাইড (MD)'
                : expense.status === 'APPROVED'
                ? 'অনুমোদিত'
                : 'প্রত্যাখ্যাত'}
            </span>

            {/* CATEGORY BADGE */}
            {expense.category && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  expense.category === 'LUNCH'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                {expense.category === 'LUNCH'
                  ? '🍲 লাঞ্চ'
                  : expense.category === 'TRANSPORT'
                  ? '🚗 যাতায়াত'
                  : expense.category === 'SNACKS'
                  ? '☕ নাস্তা'
                  : expense.category === 'OFFICE'
                  ? '🏢 অফিস'
                  : expense.category}
              </span>
            )}

            {/* TRANSPORT / SYNC STATUS BADGE */}
            {expense.syncStatus === 'SAVED_OFFLINE' ? (
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                title="অফলাইনে সংরক্ষিত (সার্ভারে সিঙ্ক বাকি)"
              >
                <CloudOff className="w-2.5 h-2.5 text-amber-500" /> 💾 অফলাইনে সংরক্ষিত
              </span>
            ) : expense.syncStatus === 'FAILED' ? (
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
                title={expense.syncError || 'সিঙ্ক ব্যর্থ'}
              >
                <AlertOctagon className="w-2.5 h-2.5 text-red-500" /> ❌ সিঙ্ক ব্যর্থ
              </span>
            ) : expense.syncStatus === 'SYNCING' ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <RefreshCw className="w-2.5 h-2.5 text-blue-500 animate-spin" /> 🔄 সিঙ্ক হচ্ছে...
              </span>
            ) : expense.syncStatus === 'SENDING' ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <Loader2 className="w-2.5 h-2.5 text-purple-500 animate-spin" /> ⏳ পাঠানো হচ্ছে
              </span>
            ) : (
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                title="Firebase সার্ভারে স্থায়ীভাবে সংরক্ষিত"
              >
                <Cloud className="w-2.5 h-2.5 text-emerald-500" /> ☁️ সার্ভারে সংরক্ষিত
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* EDIT Button Logic */}
            {(role === UserRole.ADMIN ||
              (role === UserRole.MD && expense.status === 'VERIFIED') ||
              (role === UserRole.STAFF && expense.staffName === currentUser && expense.status === 'PENDING')) && (
              <button
                onClick={() => onOpenCorrection(expense)}
                className="text-orange-500 hover:text-orange-700 transition-colors p-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full"
                title="বিল সংশোধন করুন"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {expense.voucherImage && (
              <button
                onClick={() => onViewVoucher(expense.voucherImage!)}
                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full"
                title="ভাউচার দেখুন"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onViewHistory(expense)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full"
              title="হিস্ট্রি ও লোকেশন"
            >
              <Clock className="w-4 h-4" />
            </button>
            <div className="text-right pl-1">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-bold">
                {new Date(expense.createdAt).toLocaleDateString('bn-BD', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 opacity-80">
                {new Date(expense.createdAt).toLocaleTimeString('bn-BD', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* REFERENCE ID & TIME BAR */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 font-mono py-1 px-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-lg mb-2.5 border border-gray-100 dark:border-gray-700/50">
          <span title="ইউনিক বিল রেফারেন্স আইডি">
            Ref:{' '}
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              #{expense.clientSubmissionId ? expense.clientSubmissionId.replace('bill_', '') : expense.id.substring(0, 8)}
            </span>
          </span>
          <span title="জমার সময়">
            {new Date(expense.submittedAt || expense.createdAt).toLocaleTimeString('bn-BD', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-1">৳ {expense.amount.toLocaleString()}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium h-10 line-clamp-2">{expense.reason}</p>
        {isDuplicate && (role === UserRole.ADMIN || role === UserRole.MD) && (
          <div className="mb-3 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-[10px] font-black flex items-center gap-1.5 border border-red-200 animate-pulse">
            <AlertTriangle className="w-4 h-4" /> সতর্কতা: ডুপ্লিকেট এন্ট্রি!
          </div>
        )}

        {/* RETRY BUTTON FOR OFFLINE / FAILED BILLS */}
        {(expense.syncStatus === 'SAVED_OFFLINE' || expense.syncStatus === 'FAILED') && (
          <div className="mb-3 space-y-1 bg-amber-50/60 dark:bg-amber-950/20 p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
            {expense.syncError && (
              <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold truncate" title={expense.syncError}>
                ⚠️ {expense.syncError}
              </p>
            )}
            <button
              type="button"
              onClick={() => onRetrySync(expense)}
              disabled={isSyncing}
              className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>সার্ভারে সিঙ্ক হচ্ছে...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>সার্ভারে সিঙ্ক করুন</span>
                </>
              )}
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 py-3 border-t border-gray-50 dark:border-gray-700">
          <div
            onClick={() => onOpenProfile && onOpenProfile(expense.staffId)}
            className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs cursor-pointer hover:ring-2 hover:ring-indigo-200 transition-all overflow-hidden"
          >
            {staffMember && staffMember.photo ? (
              <img src={staffMember.photo} alt={expense.staffName} className="w-full h-full object-cover" />
            ) : (
              expense.staffName[0]
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{expense.staffName}</p>
            <p className="text-[10px] text-gray-400">ID: {staffDisplayId}</p>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/80">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onPreviewVoucher(expense)}
              className="flex-1 min-w-[95px] bg-[#142B4A] hover:bg-[#1E3A5F] active:scale-95 text-white py-1.5 px-2.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm border border-[#C6A45A]/30"
              title="কর্পোরেট ভাউচার প্রিভিউ ও পূর্ণাঙ্গ বিবরণ"
            >
              <Eye className="w-3 h-3 text-[#C6A45A]" />
              <span>ভাউচার ভিউ</span>
            </button>
            <button
              onClick={() => onPrintPDF(expense)}
              className="flex-1 min-w-[85px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all border border-slate-200 dark:border-slate-700"
              title="PDF সংরক্ষণ বা প্রিন্ট করুন"
            >
              <Printer className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span>PDF/Print</span>
            </button>
            <button
              onClick={() => onDownloadPNG(expense)}
              disabled={isDownloading}
              className="flex-1 min-w-[70px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              title="PNG ছবি হিসেবে ডাউনলোড করুন"
            >
              {isDownloading ? (
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
              ) : (
                <ImageIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              )}
              <span>PNG</span>
            </button>
            <button
              onClick={() => onWhatsAppShare(expense)}
              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 active:scale-95 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all border border-emerald-200 dark:border-emerald-800"
              title="WhatsApp-এ ভাউচার বিবরণ পাঠান"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700/30 p-3 flex gap-2 border-t border-gray-100 dark:border-gray-700">
        {role === UserRole.ADMIN && (
          <>
            {expense.status === 'PENDING' && (
              <>
                <button
                  onClick={() => onUpdateStatus(expense.id, 'VERIFIED')}
                  className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  MD-র কাছে পাঠান
                </button>
                <button
                  onClick={() => onUpdateStatus(expense.id, 'REJECTED')}
                  className="flex-1 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 py-2 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  onClick={() => onRequestDelete(expense)}
                  className="px-3 bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 py-2 rounded-lg hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            {expense.status === 'VERIFIED' && (
              <>
                <button
                  onClick={() => onUpdateStatus(expense.id, 'PENDING')}
                  className="flex-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 py-2 rounded-lg text-xs font-bold hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> ফেরত আনুন
                </button>
                <button
                  onClick={() => onRequestDelete(expense)}
                  className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 py-2 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ডিলিট করুন
                </button>
              </>
            )}
          </>
        )}
        {role === UserRole.MD && (
          <>
            {expense.status === 'VERIFIED' && (
              <>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(expense.id, 'APPROVED')}
                  className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer active:scale-95"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" /> অ্যাপ্রুভ করুন
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(expense.id, 'REJECTED')}
                  className="flex-1 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 py-2 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer active:scale-95"
                >
                  বাতিল
                </button>
              </>
            )}
            {expense.status === 'PENDING' && (
              <div className="flex-[2] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-not-allowed select-none">
                <Clock className="w-3 h-3" /> অ্যাডমিন ভেরিফিকেশন বাকি
              </div>
            )}
          </>
        )}
        {(role === UserRole.ADMIN || role === UserRole.MD) &&
          (expense.status === 'APPROVED' || expense.status === 'REJECTED') && (
            <button
              onClick={() => onRequestDelete(expense)}
              className="w-full bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 hover:text-red-500 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> রেকর্ড মুছে ফেলুন
            </button>
          )}
      </div>
    </div>
  );
});

// -------------------------------------------------------------
// MAIN EXPENSE MANAGEMENT VIEW COMPONENT
// -------------------------------------------------------------
const ExpenseManagementView: React.FC<ExpenseProps> = ({
  expenses,
  setExpenses,
  staffList,
  role,
  currentUser,
  advances = [],
  onOpenProfile,
  allowedBackdateDays = 1,
  typoDictionary = {},
  setTypoDictionary,
  typoSuggestions = [],
  setTypoSuggestions,
  firebaseConfig,
  isCloudEnabled = true,
  billingRules = [],
}) => {
  // Modal open states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<{
    id: string;
    amount: number;
    reason: string;
    category?: string;
    date: string;
    voucherImage: string;
  } | null>(null);

  // Voucher preview & image preview states
  const [viewingVoucher, setViewingVoucher] = useState<string | null>(null);
  const [previewVoucherExpense, setPreviewVoucherExpense] = useState<Expense | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);
  const [historyExpense, setHistoryExpense] = useState<Expense | null>(null);

  // Downloading State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  // Transport & Sync status states
  const [unsyncedCount, setUnsyncedCount] = useState<number>(() => getUnsyncedBillCount());
  const [syncStatusFilter, setSyncStatusFilter] = useState('');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncBannerMessage, setSyncBannerMessage] = useState<string | null>(null);
  const [syncingBillId, setSyncingBillId] = useState<string | null>(null);

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination / Progressive Rendering: displays first 30 cards, user can load more with 1 click
  const [visibleCount, setVisibleCount] = useState(30);

  // Dictionary & Spell checker modal
  const [companyDict, setCompanyDict] = useState<CompanyDictionaryEntry[]>(() => getStoredCompanyDictionary());
  const [spellSettings, setSpellSettings] = useState<SpellCheckerSettings>(() => getSpellCheckerSettings());
  const [isDictModalOpen, setIsDictModalOpen] = useState(false);

  // Sync dictionary updates
  const handleSaveCompanyDict = (updated: CompanyDictionaryEntry[]) => {
    setCompanyDict(updated);
    saveCompanyDictionary(updated);
  };

  const handleSaveSpellSettings = (updated: SpellCheckerSettings) => {
    setSpellSettings(updated);
    saveSpellCheckerSettings(updated);
  };

  // Compile unified dictionary including typo_dictionary and typo_suggestions collections (MEMOIZED)
  const combinedDict = useMemo(() => {
    const combined: CompanyDictionaryEntry[] = [...companyDict];

    if (typoDictionary) {
      Object.entries(typoDictionary).forEach(([wrongWord, correctWord]) => {
        if (!combined.some((e) => e.word.toLowerCase() === wrongWord.toLowerCase())) {
          combined.push({
            id: `td-${wrongWord}`,
            word: wrongWord,
            suggestion: correctWord,
            category: 'EXPENSE_REASON',
            language: detectInputLanguage(wrongWord),
            isApproved: true,
            createdAt: '',
          });
        }
      });
    }

    if (Array.isArray(typoSuggestions)) {
      typoSuggestions.forEach((sugg) => {
        const wrong = sugg.wrong;
        const correct = sugg.suggested || sugg.correct;
        if (wrong && correct && sugg.status !== 'REJECTED') {
          if (!combined.some((e) => e.word.toLowerCase() === wrong.toLowerCase())) {
            combined.push({
              id: sugg.id || `ts-${wrong}`,
              word: wrong,
              suggestion: correct,
              category: 'EXPENSE_REASON',
              language: detectInputLanguage(wrong),
              isApproved: true,
              createdAt: sugg.timestamp || '',
            });
          }
        }
      });
    }

    return combined;
  }, [companyDict, typoDictionary, typoSuggestions]);

  // Fast staff map for O(1) lookups
  const staffMap = useMemo(() => {
    return new Map(staffList.map((s) => [s.id, s]));
  }, [staffList]);

  const activeStaff = useMemo(() => {
    return staffList.filter((s) => !s.deletedAt && s.status === 'ACTIVE');
  }, [staffList]);

  // Fast duplicate lookup map for O(1) checks in list rendering (avoids O(N^2) inner array filtering)
  const duplicateKeyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i];
      if (!e.isDeleted && e.status !== 'REJECTED') {
        const key = `${e.staffId}_${getSafeDateStr(e.createdAt)}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return counts;
  }, [expenses]);

  // Periodically check unsynced count & auto-sync on network reconnect
  useEffect(() => {
    const updateCount = () => setUnsyncedCount(getUnsyncedBillCount());

    const handleReconnection = async () => {
      updateCount();
      const unsynced = expenses.filter(
        (e) => !e.isDeleted && (e.syncStatus === 'SAVED_OFFLINE' || e.syncStatus === 'FAILED')
      );
      if (unsynced.length > 0 && !isSyncingAll) {
        setIsSyncingAll(true);
        try {
          const res = await syncAllPendingBills(expenses, firebaseConfig);
          setExpenses(res.updatedExpenses);
          if (res.syncedCount > 0) {
            setSyncBannerMessage(`✅ নেটওয়ার্ক ফিরে আসায় ${res.syncedCount} টি বিল সার্ভারে স্বয়ংক্রিয়ভাবে সিঙ্ক হয়েছে।`);
            setTimeout(() => setSyncBannerMessage(null), 6000);
          }
        } catch (e) {
          console.warn('Auto-sync on reconnection failed', e);
        } finally {
          setIsSyncingAll(false);
          updateCount();
        }
      }
    };

    window.addEventListener('online', handleReconnection);
    window.addEventListener('offline-sync-warning', updateCount);
    window.addEventListener('bill-sync-updated', updateCount);
    const interval = setInterval(updateCount, 5000);
    return () => {
      window.removeEventListener('online', handleReconnection);
      window.removeEventListener('offline-sync-warning', updateCount);
      window.removeEventListener('bill-sync-updated', updateCount);
      clearInterval(interval);
    };
  }, [expenses, firebaseConfig, isSyncingAll, setExpenses]);

  // Helper: Prepare voucher options for an expense
  const getVoucherOptionsForExpense = useCallback(
    (expense: Expense) => {
      const staff = staffMap.get(expense.staffId);
      let companyLogo = '';
      try {
        companyLogo = localStorage.getItem('company_logo') || '';
      } catch {}
      return {
        expense,
        staff,
        staffList,
        expenses,
        advances,
        companyLogo,
      };
    },
    [staffMap, staffList, expenses, advances]
  );

  const handleDownloadPNG = async (expense: Expense) => {
    setDownloadingId(expense.id);
    try {
      await downloadCorporateVoucherPNG(getVoucherOptionsForExpense(expense));
    } catch (e) {
      console.error('Voucher PNG Download Error', e);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBulkDownload = async () => {
    const latestExpensesMap = new Map<string, Expense>();
    expenses.forEach((e) => {
      if (!e.isDeleted && e.status === 'APPROVED') {
        const existing = latestExpensesMap.get(e.staffId);
        if (!existing) latestExpensesMap.set(e.staffId, e);
        else if (new Date(e.createdAt) > new Date(existing.createdAt)) latestExpensesMap.set(e.staffId, e);
      }
    });
    const targetExpenses = Array.from(latestExpensesMap.values());
    if (targetExpenses.length === 0) {
      alert('কোনো অনুমোদিত বিল পাওয়া যায়নি।');
      return;
    }
    if (window.confirm(`সর্বমোট ${targetExpenses.length} জন স্টাফের লাস্ট ভাউচার ডাউনলোড করতে চান?`)) {
      setIsBulkDownloading(true);
      for (let i = 0; i < targetExpenses.length; i++) {
        setBulkProgress(`${i + 1}/${targetExpenses.length}`);
        try {
          await downloadCorporateVoucherPNG(getVoucherOptionsForExpense(targetExpenses[i]));
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch (err) {
          console.error(err);
        }
      }
      setBulkProgress('');
      setIsBulkDownloading(false);
    }
  };

  const handlePrintPDF = async (expense: Expense) => {
    try {
      await printCorporateVoucher(getVoucherOptionsForExpense(expense));
    } catch (err) {
      console.error('Print Voucher Error', err);
    }
  };

  // Filtered expenses with reset for pagination on query change
  const filteredExpenses = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    return expenses
      .filter((e) => {
        if (e.isDeleted) return false;
        if (role === UserRole.STAFF && currentUser) {
          if (e.staffName !== currentUser) return false;
        }
        if (selectedStaffFilter && e.staffId !== selectedStaffFilter) return false;
        if (statusFilter && e.status !== statusFilter) return false;
        if (syncStatusFilter) {
          if (syncStatusFilter === 'SUBMITTED' && e.syncStatus && e.syncStatus !== 'SUBMITTED') return false;
          if (syncStatusFilter === 'SAVED_OFFLINE' && e.syncStatus !== 'SAVED_OFFLINE') return false;
          if (syncStatusFilter === 'FAILED' && e.syncStatus !== 'FAILED') return false;
        }

        const matchesSearch =
          !lowerSearch ||
          (e.reason && e.reason.toLowerCase().includes(lowerSearch)) ||
          (e.staffName && e.staffName.toLowerCase().includes(lowerSearch));

        if (!matchesSearch) return false;

        if (start || end) {
          const expenseDate = new Date(e.createdAt).setHours(0, 0, 0, 0);
          if (start && expenseDate < start) return false;
          if (end && expenseDate > end) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [expenses, searchTerm, startDate, endDate, role, currentUser, selectedStaffFilter, statusFilter, syncStatusFilter]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(30);
  }, [searchTerm, startDate, endDate, selectedStaffFilter, statusFilter, syncStatusFilter]);

  const displayedExpenses = useMemo(() => {
    return filteredExpenses.slice(0, visibleCount);
  }, [filteredExpenses, visibleCount]);

  const handleSyncAll = async () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    setSyncProgress('');
    try {
      const res = await syncAllPendingBills(expenses, firebaseConfig, (curr, tot) => {
        setSyncProgress(`${curr}/${tot}`);
      });
      setExpenses(res.updatedExpenses);
      if (res.syncedCount > 0) {
        setSyncBannerMessage(`✅ ${res.syncedCount} টি বিল সফলভাবে সার্ভারে জমা হয়েছে!`);
      } else if (res.failedCount > 0) {
        setSyncBannerMessage(`⚠️ ${res.failedCount} টি বিল সার্ভারে জমা হতে পারেনি। ইন্টারনেট কানেকশন চেক করুন।`);
      }
      setTimeout(() => setSyncBannerMessage(null), 5000);
    } catch (err: any) {
      alert(`সিঙ্ক ত্রুটি: ${err?.message || 'অজ্ঞাত সমস্যা'}`);
    } finally {
      setIsSyncingAll(false);
      setSyncProgress('');
      setUnsyncedCount(getUnsyncedBillCount());
    }
  };

  const handleRetrySingleBill = useCallback(
    async (expense: Expense) => {
      setSyncingBillId(expense.id);
      try {
        const res = await retryExpenseBillSync(expense, firebaseConfig);
        setExpenses((prev) => prev.map((e) => (e.id === res.updatedExpense.id ? res.updatedExpense : e)));
        if (res.success) {
          setSyncBannerMessage(
            `✅ বিল #${res.updatedExpense.clientSubmissionId ? res.updatedExpense.clientSubmissionId.replace('bill_', '') : res.updatedExpense.id.substring(0, 8)} সার্ভারে সিঙ্ক হয়েছে!`
          );
          setTimeout(() => setSyncBannerMessage(null), 4000);
        } else {
          alert(res.message);
        }
      } catch (err: any) {
        alert(`সিঙ্ক ব্যর্থ: ${err?.message || 'সার্ভার সমস্যা'}`);
      } finally {
        setSyncingBillId(null);
        setUnsyncedCount(getUnsyncedBillCount());
      }
    },
    [firebaseConfig, setExpenses]
  );

  const updateStatus = useCallback(
    async (id: string, status: Expense['status']) => {
      if (status === 'REJECTED' && !window.confirm('আপনি কি নিশ্চিত যে এই বিলটি বাতিল (Reject) করতে চান?')) return;

      setExpenses((prevExpenses) => prevExpenses.map((e) => (e.id === id ? { ...e, status } : e)));

      const expense = expenses.find((e) => e.id === id);
      if (expense) {
        const staff = staffMap.get(expense.staffId);
        if (staff) {
          import('../services/emailService').then(({ sendBillStatusEmailToStaff }) => {
            const targetEmail = staff.email || `${staff.name.replace(/\s+/g, '').toLowerCase()}@depend.com`;
            sendBillStatusEmailToStaff(targetEmail, staff.name, expense.amount, expense.reason, status);
          });
        }
      }
    },
    [expenses, staffMap, setExpenses]
  );

  const requestDelete = useCallback((expense: Expense) => setDeleteConfirmExpense(expense), []);
  const confirmDelete = () => {
    if (deleteConfirmExpense) {
      setExpenses((prev) => prev.map((e) => (e.id === deleteConfirmExpense.id ? { ...e, isDeleted: true } : e)));
      setDeleteConfirmExpense(null);
    }
  };

  const handleApproveAll = async () => {
    const pendingCount = expenses.filter(
      (e) => !e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED')
    ).length;
    if (pendingCount === 0) {
      alert('কোনো পেন্ডিং বা ভেরিফাইড বিল নেই।');
      return;
    }
    if (window.confirm(`আপনি কি নিশ্চিত যে ${pendingCount} টি বিল একসাথে অ্যাপ্রুভ করতে চান?`)) {
      setExpenses((prevExpenses) =>
        prevExpenses.map((e) =>
          !e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED') ? { ...e, status: 'APPROVED' } : e
        )
      );

      const { sendBillStatusEmailToStaff } = await import('../services/emailService');
      expenses
        .filter((e) => !e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED'))
        .forEach((expense) => {
          const staff = staffMap.get(expense.staffId);
          if (staff) {
            const targetEmail = staff.email || `${staff.name.replace(/\s+/g, '').toLowerCase()}@depend.com`;
            sendBillStatusEmailToStaff(targetEmail, staff.name, expense.amount, expense.reason, 'APPROVED');
          }
        });
    }
  };

  const openCorrectionModal = useCallback((e: Expense) => {
    const dateStr = getSafeDateStr(e.createdAt) || new Date().toISOString().split('T')[0];
    setCorrectionTarget({
      id: e.id,
      amount: e.amount,
      reason: e.reason,
      category: e.category,
      date: dateStr,
      voucherImage: e.voucherImage || '',
    });
    setIsCorrectionModalOpen(true);
  }, []);

  const saveCorrection = async (data: { id: string; amount: number; reason: string; category?: string; date: string; voucherImage: string }) => {
    let editLocation: { lat: number; lng: number } | undefined;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        editLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (err) {
        console.warn('Could not get location for edit', err);
      }
    }

    setExpenses((prev) =>
      prev.map((ex) => {
        if (ex.id === data.id) {
          const originalDate = new Date(ex.createdAt);
          const [y, m, d] = data.date.split('-').map(Number);
          const updatedDate = new Date(originalDate);
          updatedDate.setFullYear(y);
          updatedDate.setMonth(m - 1);
          updatedDate.setDate(d);

          const newEditLog = {
            editedAt: new Date().toISOString(),
            editedBy: currentUser || 'Unknown',
            previousAmount: ex.amount,
            newAmount: Number(data.amount),
            previousReason: ex.reason,
            newReason: data.reason,
            location: editLocation,
          };
          const updatedEditLogs = [...(ex.editLogs || []), newEditLog];

          return {
            ...ex,
            amount: Number(data.amount),
            reason: data.reason,
            category: data.category,
            createdAt: updatedDate.toISOString(),
            voucherImage: data.voucherImage,
            editLogs: updatedEditLogs,
          };
        }
        return ex;
      })
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedStaffFilter('');
    setStatusFilter('');
    setSyncStatusFilter('');
  };

  const unsyncedBills = useMemo(() => {
    return expenses.filter((e) => !e.isDeleted && (e.syncStatus === 'SAVED_OFFLINE' || e.syncStatus === 'FAILED'));
  }, [expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">খরচ ও ভাউচার ম্যানেজমেন্ট</h2>
        <div className="flex flex-wrap gap-2">
          {(role === UserRole.ADMIN || role === UserRole.MD) && (
            <button
              onClick={() => setIsDictModalOpen(true)}
              className="h-9 px-3.5 rounded-full bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 border border-indigo-100 dark:border-gray-700 font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 outline-none"
              title="কোম্পানি ডিকশনারি ও বানান চেকার সেটিংস"
            >
              <BookOpen className="w-3.5 h-3.5" /> <span>ডিকশনারি & AI বানান</span>
            </button>
          )}
          {(role === UserRole.ADMIN || role === UserRole.MD) && (
            <button
              onClick={handleBulkDownload}
              disabled={isBulkDownloading}
              className="h-9 px-4 rounded-full bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 border border-indigo-100 dark:border-gray-700 font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 outline-none disabled:opacity-50"
            >
              {isBulkDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Images className="w-3.5 h-3.5" />}
              <span>{isBulkDownloading ? `Processing ${bulkProgress}...` : 'Daily Vouchers'}</span>
            </button>
          )}
          {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="h-9 px-5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 outline-none active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">New Bill</span>
            </button>
          )}
          {role === UserRole.MD && (
            <button
              onClick={handleApproveAll}
              className="h-9 px-5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-2 outline-none active:scale-95"
            >
              <CheckCheck className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">Approve All</span>
            </button>
          )}
        </div>
      </div>

      {/* SYNC BANNER FEEDBACK MESSAGE */}
      {syncBannerMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{syncBannerMessage}</span>
          </div>
          <button onClick={() => setSyncBannerMessage(null)} className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 p-1 text-sm font-black">
            ×
          </button>
        </div>
      )}

      {/* UNSYNCED BILLS BANNER */}
      {unsyncedBills.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-400">
              <CloudOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span>{unsyncedBills.length} টি বিল সার্ভারে সিঙ্ক বাকি</span>
                <span className="text-[10px] bg-amber-200 dark:bg-amber-900/80 px-2 py-0.5 rounded-full uppercase font-black tracking-wider text-amber-800 dark:text-amber-300">
                  অফলাইনে সংরক্ষিত
                </span>
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                বিলগুলো আপনার ডিভাইসে নিরাপদে আছে। ইন্টারনেট পেলেই এক ক্লিকে সার্ভারে পাঠান।
              </p>
            </div>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-200 dark:shadow-none disabled:opacity-50"
          >
            {isSyncingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>সিঙ্ক হচ্ছে {syncProgress}...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>সব সিঙ্ক করুন ({unsyncedBills.length})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 backdrop-blur-xl p-2 rounded-[2rem] shadow-sm shadow-indigo-100/50 dark:shadow-none border border-indigo-100/50 dark:border-gray-700 flex flex-col lg:flex-row items-center gap-2 mb-6 transition-all">
        <div className="relative flex-1 w-full lg:w-auto group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="block w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border-none rounded-full text-xs font-bold text-slate-600 dark:text-gray-300 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-gray-600 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 outline-none h-9 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {(role === UserRole.ADMIN || role === UserRole.MD) && (
          <div className="relative w-full lg:w-40 group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500 group-focus-within:text-purple-500 transition-colors" />
            </div>
            <select
              className="block w-full pl-9 pr-8 py-2 bg-white dark:bg-gray-800 border-none rounded-full text-xs font-bold text-slate-600 dark:text-gray-300 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-purple-100 dark:focus:ring-gray-600 transition-all appearance-none cursor-pointer outline-none h-9 shadow-sm"
              value={selectedStaffFilter}
              onChange={(e) => setSelectedStaffFilter(e.target.value)}
            >
              <option value="">All Staff</option>
              {activeStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="h-3 w-3 text-slate-300" />
            </div>
          </div>
        )}
        <div className="relative w-full lg:w-32 group">
          <select
            className="block w-full pl-4 pr-8 py-2 bg-white dark:bg-gray-800 border-none rounded-full text-xs font-bold text-slate-600 dark:text-gray-300 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-gray-600 transition-all appearance-none cursor-pointer outline-none h-9 shadow-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            {(role === UserRole.ADMIN || role === UserRole.MD) && <option value="VERIFIED">Verified</option>}
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="h-3 w-3 text-slate-300" />
          </div>
        </div>
        <div className="relative w-full lg:w-36 group">
          <select
            className="block w-full pl-4 pr-8 py-2 bg-white dark:bg-gray-800 border-none rounded-full text-xs font-bold text-slate-600 dark:text-gray-300 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-gray-600 transition-all appearance-none cursor-pointer outline-none h-9 shadow-sm"
            value={syncStatusFilter}
            onChange={(e) => setSyncStatusFilter(e.target.value)}
          >
            <option value="">সকল সিঙ্ক</option>
            <option value="SUBMITTED">☁️ সার্ভারে জমা</option>
            <option value="SAVED_OFFLINE">💾 অফলাইনে জমা</option>
            <option value="FAILED">❌ সিঙ্ক ব্যর্থ</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ChevronDown className="h-3 w-3 text-slate-300" />
          </div>
        </div>
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-full px-1 py-1 border border-indigo-50 dark:border-gray-700 h-9 w-full lg:w-auto shadow-sm">
          <div className="relative flex-1 min-w-[100px]">
            <input
              type="date"
              className="block w-full pl-3 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-500 dark:text-gray-400 focus:ring-0 cursor-pointer h-full outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <span className="text-slate-300 dark:text-gray-600 text-[10px] font-bold px-1">to</span>
          <div className="relative flex-1 min-w-[100px]">
            <input
              type="date"
              className="block w-full pl-1 pr-3 py-1 bg-transparent border-none text-[10px] font-bold text-slate-500 dark:text-gray-400 focus:ring-0 cursor-pointer h-full text-right outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 w-full lg:w-auto justify-end">
          <button
            onClick={clearFilters}
            className="w-9 h-9 flex items-center justify-center bg-white dark:bg-gray-800 text-slate-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all border border-slate-100 dark:border-gray-700 shadow-sm outline-none"
            title="Reset Filters"
          >
            <FilterX className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* EXPENSES GRID LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedExpenses.map((expense) => {
          const expenseDateStr = getSafeDateStr(expense.createdAt);
          const isDuplicate = (duplicateKeyCounts.get(`${expense.staffId}_${expenseDateStr}`) || 0) > 1;
          const staffMember = staffMap.get(expense.staffId);
          const staffDisplayId = staffMember ? staffMember.staffId : '';

          return (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              role={role}
              currentUser={currentUser}
              isDuplicate={isDuplicate}
              staffMember={staffMember}
              staffDisplayId={staffDisplayId}
              isDownloading={downloadingId === expense.id}
              isSyncing={syncingBillId === expense.id}
              onOpenCorrection={openCorrectionModal}
              onViewVoucher={setViewingVoucher}
              onViewHistory={setHistoryExpense}
              onOpenProfile={onOpenProfile}
              onPreviewVoucher={setPreviewVoucherExpense}
              onPrintPDF={handlePrintPDF}
              onDownloadPNG={handleDownloadPNG}
              onWhatsAppShare={(exp) => {
                const text = formatVoucherWhatsAppText({
                  expense: exp,
                  staff: staffMember,
                  staffList,
                  expenses,
                  advances,
                });
                const phoneVal = staffMember?.mobile ? formatToInternationalPhone(staffMember.mobile) : null;
                const waUrl = phoneVal?.valid
                  ? `https://wa.me/${phoneVal.international}?text=${text}`
                  : `https://api.whatsapp.com/send?text=${text}`;
                window.open(waUrl, '_blank');
              }}
              onUpdateStatus={updateStatus}
              onRequestDelete={requestDelete}
              onRetrySync={handleRetrySingleBill}
            />
          );
        })}

        {filteredExpenses.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
            কোনো বিল পাওয়া যায়নি
          </div>
        )}

        {/* PROGRESSIVE RENDERING "SHOW MORE" CONTROLS */}
        {filteredExpenses.length > visibleCount && (
          <div className="col-span-full py-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 30)}
              className="px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-full border border-indigo-200 dark:border-gray-700 shadow-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>
                আরো ৩০টি বিল দেখুন ({Math.min(visibleCount + 30, filteredExpenses.length)} / {filteredExpenses.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setVisibleCount(filteredExpenses.length)}
              className="px-4 py-2.5 text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200 text-xs font-semibold hover:underline"
            >
              সবগুলো দেখুন ({filteredExpenses.length} টি)
            </button>
          </div>
        )}
      </div>

      {/* NEW BILL SUBMIT MODAL (Isolated, 0ms Typing Latency & Manual AI Check) */}
      <SubmitExpenseModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        staffList={staffList}
        activeStaff={activeStaff}
        role={role}
        currentUser={currentUser}
        allowedBackdateDays={allowedBackdateDays}
        expenses={expenses}
        setExpenses={setExpenses}
        firebaseConfig={firebaseConfig}
        combinedDict={combinedDict}
        spellSettings={spellSettings}
        typoDictionary={typoDictionary}
        setTypoDictionary={setTypoDictionary}
        typoSuggestions={typoSuggestions}
        setTypoSuggestions={setTypoSuggestions}
        onUnsyncedCountChange={() => setUnsyncedCount(getUnsyncedBillCount())}
        billingRules={billingRules}
      />

      {/* CORRECTION MODAL (Isolated, 0ms Typing Latency & Manual AI Check) */}
      {isCorrectionModalOpen && correctionTarget && (
        <CorrectionExpenseModal
          isOpen={isCorrectionModalOpen}
          onClose={() => {
            setIsCorrectionModalOpen(false);
            setCorrectionTarget(null);
          }}
          correctionData={correctionTarget}
          currentUser={currentUser}
          role={role}
          billingRules={billingRules}
          onSave={saveCorrection}
          combinedDict={combinedDict}
          spellSettings={spellSettings}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmExpense &&
        createPortal(
          <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">আপনি কি নিশ্চিত?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {deleteConfirmExpense.status === 'APPROVED'
                    ? `আপনি ৳${deleteConfirmExpense.amount} টাকার একটি "অনুমোদিত" (Approved) বিল ডিলিট করতে চাচ্ছেন।`
                    : deleteConfirmExpense.status === 'PENDING'
                    ? `আপনি ৳${deleteConfirmExpense.amount} টাকার একটি "পেন্ডিং" (Pending) বিল ডিলিট করতে চাচ্ছেন।`
                    : deleteConfirmExpense.status === 'VERIFIED'
                    ? `এই বিলটি ভেরিফাই করা হয়েছে (MD-এর অনুমোদনের অপেক্ষায়)। আপনি কি এটি ডিলিট করতে চান?`
                    : deleteConfirmExpense.status === 'REJECTED'
                    ? `আপনি একটি "বাতিল করা" (Rejected) বিল ডিলিট করছেন।`
                    : `আপনি কি নিশ্চিত যে এই বিলটি ডিলিট করতে চান?`}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirmExpense(null)}
                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    না, বাতিল করুন
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                  >
                    হ্যাঁ, ডিলিট করুন
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* FULL RECEIPT IMAGE PREVIEW */}
      {viewingVoucher &&
        createPortal(
          <div
            className="fixed inset-0 z-[1002] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in duration-200"
            onClick={() => setViewingVoucher(null)}
          >
            <div className="relative max-w-3xl w-full max-h-screen p-2">
              <button
                onClick={() => setViewingVoucher(null)}
                className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              <img
                src={viewingVoucher}
                alt="Voucher Full View"
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white"
              />
            </div>
          </div>,
          document.body
        )}

      {/* ACTIVITY & LOCATION HISTORY MODAL */}
      {historyExpense &&
        createPortal(
          <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                <h3 className="text-lg font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" /> অ্যাক্টিভিটি হিস্ট্রি
                </h3>
                <button
                  onClick={() => setHistoryExpense(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">সাবমিশন (Submission)</h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">তারিখ ও সময়</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          {historyExpense.submittedAt
                            ? new Date(historyExpense.submittedAt).toLocaleString('bn-BD')
                            : 'অজানা'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 mb-1">লোকেশন</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          {historyExpense.submitLocation ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${historyExpense.submitLocation.lat},${historyExpense.submitLocation.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline"
                            >
                              ম্যাপে দেখুন
                            </a>
                          ) : (
                            'পাওয়া যায়নি'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {historyExpense.editLogs && historyExpense.editLogs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">এডিট হিস্ট্রি (Edits)</h4>
                    <div className="space-y-3">
                      {historyExpense.editLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 border border-orange-100 dark:border-orange-900/30"
                        >
                          <div className="flex justify-between items-start mb-2 pb-2 border-b border-orange-100 dark:border-orange-800/30">
                            <div>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{log.editedBy}</p>
                              <p className="text-[10px] text-gray-500">{new Date(log.editedAt).toLocaleString('bn-BD')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500">লোকেশন</p>
                              {log.location ? (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${log.location.lat},${log.location.lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 text-[10px] hover:underline font-bold"
                                >
                                  ম্যাপে দেখুন
                                </a>
                              ) : (
                                <span className="text-[10px] text-gray-400">পাওয়া যায়নি</span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500">আগে:</span>{' '}
                              <span className="line-through text-red-500 font-medium">৳{log.previousAmount}</span>
                              <br />
                              <span className="text-gray-500 line-clamp-1">{log.previousReason}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">নতুন:</span>{' '}
                              <span className="text-green-600 font-bold">৳{log.newAmount}</span>
                              <br />
                              <span className="text-gray-800 dark:text-gray-200 line-clamp-1">{log.newReason}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* COMPANY DICTIONARY & AI SPELL SETTINGS MODAL */}
      <DictionaryManagerModal
        isOpen={isDictModalOpen}
        onClose={() => setIsDictModalOpen(false)}
        dictionary={companyDict}
        onSaveDictionary={handleSaveCompanyDict}
        settings={spellSettings}
        onSaveSettings={handleSaveSpellSettings}
        isAdmin={role === UserRole.ADMIN || role === UserRole.MD}
        typoDictionary={typoDictionary}
        onSaveTypoDictionary={setTypoDictionary}
        typoSuggestions={typoSuggestions}
        onSaveTypoSuggestions={setTypoSuggestions}
      />

      {/* PAYMENT VOUCHER CORPORATE PREVIEW MODAL */}
      {previewVoucherExpense && (
        <PaymentVoucherModal
          isOpen={!!previewVoucherExpense}
          onClose={() => setPreviewVoucherExpense(null)}
          expense={previewVoucherExpense}
          staffList={staffList}
          expenses={expenses}
          advances={advances}
          role={role}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default ExpenseManagementView;