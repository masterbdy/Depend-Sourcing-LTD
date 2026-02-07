import React, { useState, useMemo, useRef } from 'react';
import { Receipt, Camera, CheckCircle, XCircle, Clock, Eye, Trash2, Search, Calendar, FilterX, RotateCcw, CheckCheck, Sparkles, X, Edit3, User, AlertTriangle, Eraser, FileText, ShieldAlert, Printer, Download, ImageIcon } from 'lucide-react';
import { Expense, Staff, UserRole, AppNotification, AdvanceLog } from '../types';
// @ts-ignore
import html2canvas from 'html2canvas';

interface ExpenseProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  staffList: Staff[];
  role: UserRole;
  currentUser: string | null;
  onNotify?: (title: string, message: string, type: AppNotification['type']) => void;
  advances: AdvanceLog[];
}

const ExpenseManagementView: React.FC<ExpenseProps> = ({ expenses = [], setExpenses, staffList = [], role, currentUser, advances = [] }) => {
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    staffId: '', 
    amount: 0, 
    reason: '', 
    voucherImage: '',
    date: new Date().toISOString().split('T')[0] // Default to today
  });
  const [viewingVoucher, setViewingVoucher] = useState<string | null>(null);
  
  // Correction/Edit State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState<{id: string, amount: number, reason: string, date: string} | null>(null);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Status Update Confirmation State
  const [statusConfirmData, setStatusConfirmData] = useState<{id: string, status: Expense['status']} | null>(null);

  // Voucher Generator State
  const [voucherPreviewData, setVoucherPreviewData] = useState<Expense | null>(null);
  const voucherRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // SAFE ARRAY ACCESS
  const activeStaff = (staffList || []).filter(s => s && !s.deletedAt && s.status === 'ACTIVE');
  const allStaffForFilter = (staffList || []).filter(s => s && !s.deletedAt);

  // Helper for safe date comparison
  const getSafeDateStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Real-time Duplicate Check for Modal
  const isSubmissionDuplicate = useMemo(() => {
    if (!formData.staffId || !formData.date) return false;
    return (expenses || []).some(e => 
      !e.isDeleted && 
      e.staffId === formData.staffId && 
      getSafeDateStr(e.createdAt) === formData.date
    );
  }, [formData.staffId, formData.date, expenses]);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      if (!e || e.isDeleted) return false;

      // SECURITY: Staff can only see their own expenses
      if (role === UserRole.STAFF && currentUser) {
         if (e.staffName !== currentUser) return false;
      }
      
      // Filter by Selected Staff (Dropdown)
      if (selectedStaffFilter && e.staffId !== selectedStaffFilter) {
        return false;
      }
      
      const safeReason = (e.reason || '').toLowerCase();
      const safeStaffName = (e.staffName || '').toLowerCase();
      const safeSearch = searchTerm.toLowerCase();

      const matchesSearch = 
        safeReason.includes(safeSearch) || 
        safeStaffName.includes(safeSearch);
      
      const expenseDate = new Date(e.createdAt).setHours(0, 0, 0, 0);
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

      const matchesDate = (!start || expenseDate >= start) && (!end || expenseDate <= end);

      return matchesSearch && matchesDate;
    })
    // Sort by Date Descending (Newest First)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [expenses, searchTerm, selectedStaffFilter, startDate, endDate, role, currentUser]);

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    
    // 1. Convert Bengali digits to English
    let processedText = text.replace(/[০-৯]/g, d => "0123456789"["০১২৩৪৫৬৭৮৯".indexOf(d)]);

    // 2. Normalize Separators (Unicode dashes -> standard hyphen)
    processedText = processedText.replace(/[\u2013\u2014]/g, '-');

    // --- STEP 3: EXPLICIT DATE RANGES (PRIORITY 1) ---
    // Remove date ranges BEFORE other logic to prevent misinterpretation
    // Matches: 03-02-26 to 07-02-26, 03/02/2026 - 07/02/2026
    const explicitDateRangeRegex = /(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*(?:to|থেকে|\-|–|—)\s*(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/gi;
    processedText = processedText.replace(explicitDateRangeRegex, 'SKIP_DATE_RANGE');

    // --- STEP 4: PRE-PROCESSING (Item-Amount) ---
    // Fix: "Lunch-400", "Food=150", "Lunch - 400" -> "Lunch 400"
    // This allows extracting 400 properly
    processedText = processedText.replace(/([a-zA-Z\u0980-\u09FF]+)[\s\-:=]+(\d+)/g, '$1 $2');

    // Protect currency words
    processedText = processedText.replace(/(taka|tk|bdt|টাকা)/gi, 'CURRENCY_SYMBOL');

    // --- STEP 5: OTHER EXCLUSIONS ---
    
    // A. Dates (ISO, Common formats) - Standalone dates not in ranges
    processedText = processedText.replace(/\d{4}-\d{2}-\d{2}/g, 'SKIP_DATE'); 
    processedText = processedText.replace(/\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/g, 'SKIP_DATE');
    
    // B. Phone Numbers
    processedText = processedText.replace(/01\d{9}/g, 'SKIP_PHONE');
    
    // C. Time 
    processedText = processedText.replace(/\d{1,2}:\d{2}/g, 'SKIP_TIME_COLON'); 
    processedText = processedText.replace(/\d{1,2}[:\.]\d{2}\s*(am|pm|a\.m|p\.m)/gi, 'SKIP_TIME');
    processedText = processedText.replace(/\d{1,2}\s*(am|pm|a\.m|p\.m|টা|বাজে|বাজা)/gi, 'SKIP_TIME');
    
    // D. Text-based Date Ranges (legacy keywords)
    const dateRangeRegex = /(\d+)[\s\-]*(?:থেকে|theke|to|untill|পর্যন্ত|হতে|[\-])[\s]*(\d+)[\s]*(?:তারিখ|date|tarikh|tarik)/gi;
    processedText = processedText.replace(dateRangeRegex, "SKIP_DATE_RANGE");
    
    // E. Single Date with Keyword
    const specificDateRegex = /(\d+)[\s]*(?:তারিখ|date|tarikh|sal|sale|সাল|সালে|st|nd|rd|th)/gi;
    processedText = processedText.replace(specificDateRegex, "SKIP_SINGLE_DATE");
    
    // F. Units/Measurements
    const units = ['pc', 'pcs', 'pice', 'pices', 'pitch', 'pic', 'pis', 'pich', 'p', 't', 'ta', 'ti', 'khana', 'gulo', 'got', 'pisa', 'pich', 'পিস', 'টি', 'টা', 'খানা', 'গুলো', 'dz', 'doz', 'dozen', 'dozon', 'ডজন', 'goj', 'gaz', 'yard', 'yrd', 'গজ', 'kg', 'kilo', 'keji', 'কেজি', 'gm', 'gram', 'g', 'গ্রাম', 'ltr', 'liter', 'litre', 'l', 'লিটার', 'pkt', 'packet', 'pack', 'pket', 'প্যাকেট', 'bosta', 'bosta', 'বস্তা', 'set', 'সেট', 'jo', 'jora', 'pair', 'জোড়া', 'inch', 'in', 'ইঞ্চি', 'ft', 'feet', 'ফুট', 'm', 'meter', 'মিটার', 'jon', 'জন', 'min', 'minute', 'mnt', 'মিনিট', 'hr', 'hour', 'ghonta', 'ঘন্টা', 'sec', 'second', 'সেকেন্ড'];
    const unitRegex = new RegExp(`(\\d+[\\.]?\\d*)\\s*(${units.join('|')})(?![a-zA-Z\u0980-\u09FF])`, 'gi');
    processedText = processedText.replace(unitRegex, "SKIP_UNIT");
    
    // G. Locations & Addresses
    const locPrefixes = ['road', 'rd', 'রোড', 'house', 'h', 'bas', 'basa', 'বাসা', 'বাড়ি', 'flat', 'apt', 'ফ্ল্যাট', 'sector', 'sec', 'সেক্টর', 'block', 'blk', 'ব্লক', 'lane', 'goli', 'গলি', 'level', 'lvl', 'লেভেল', 'ward', 'word', 'ওয়ার্ড', 'room', 'rm', 'রুম', 'কক্ষ', 'platfrom', 'platform', 'প্লাটফর্ম', 'counter', 'কাউন্টার', 'shop', 'dokan', 'দোকান', 'bus', 'গাড়ি', 'বাস'];
    const locRegexPrefix = new RegExp(`(${locPrefixes.join('|')})[\\s\\-\\.]*(\\d+)`, 'gi');
    processedText = processedText.replace(locRegexPrefix, "SKIP_LOC");
    
    const locSuffixes = ['floor', 'tala', 'তলা', 'level', 'no', 'nong', 'number', 'num', 'নং', 'নম্বর', 'th', 'nd', 'rd', 'st'];
    const locRegexSuffix = new RegExp(`(\\d+)[\\s\\-\\.]*(${locSuffixes.join('|')})`, 'gi');
    processedText = processedText.replace(locRegexSuffix, "SKIP_LOC");
    
    // H. Specific Place Names with numbers
    const places = ['mirpur', ' মিরপুর', 'uttara', 'উত্তরা', 'dhanmondi', 'ধানমন্ডি', 'farmgate', 'ফার্মগেট', 'mohakhali', 'মহাখালী', 'banani', 'বনানী', 'gulshan', 'গুলশান', 'badda', 'বাড্ডা', 'savar', 'সাভার', 'gazipur', 'গাজীপুর'];
    const placeRegex = new RegExp(`(${places.join('|')})\\s*(\\d+)`, 'gi');
    processedText = processedText.replace(placeRegex, "SKIP_PLACE");

    // --- SUMMATION ---
    const matches = processedText.match(/(\d+(\.\d+)?)/g);
    let total = 0;
    if (matches) {
      total = matches.reduce((sum, num) => sum + parseFloat(num), 0);
    }

    setFormData(prev => ({
      ...prev,
      reason: text,
      amount: total 
    }));
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ ...prev, voucherImage: dataUrl }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm("ছবি মুছতে চান?")) {
      setFormData(prev => ({ ...prev, voucherImage: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let targetStaffId = formData.staffId;
    if (role === UserRole.STAFF && currentUser) {
       const myself = activeStaff.find(s => s.name === currentUser);
       if (!myself) {
         alert("প্রোফাইল ডাটা পাওয়া যাচ্ছে না।");
         return;
       }
       targetStaffId = myself.id;
    }

    if (!targetStaffId) return alert("স্টাফ নির্বাচন করুন।");
    
    const staff = activeStaff.find(s => s.id === targetStaffId);
    if (!staff) return alert("স্টাফ পাওয়া যায়নি।");

    if (!formData.amount || Number(formData.amount) <= 0) return alert("টাকার পরিমাণ লিখুন।");
    if (!formData.date) return alert("তারিখ দিন।");

    if (role === UserRole.STAFF) {
        const [y, m, d] = formData.date.split('-').map(Number);
        const selectedDate = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - selectedDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) return alert(`স্টাফরা সর্বোচ্চ ১ দিন আগের বিল দিতে পারবে।`);
        if (diffDays < 0) return alert("ভবিষ্যতের তারিখ দেওয়া যাবে না।");
    }

    const submitDate = new Date(formData.date);
    const now = new Date();
    submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: targetStaffId,
      staffName: staff.name,
      amount: Number(formData.amount),
      reason: formData.reason,
      voucherImage: formData.voucherImage,
      status: 'PENDING',
      createdAt: submitDate.toISOString()
    };
    
    setExpenses(prev => [newExpense, ...prev]);
    setIsSubmitModalOpen(false);
    setFormData({ staffId: '', amount: 0, reason: '', voucherImage: '', date: new Date().toISOString().split('T')[0] });
  };

  const updateStatus = (id: string, status: Expense['status']) => {
    setStatusConfirmData({ id, status });
  };

  const confirmStatusUpdate = () => {
    if (statusConfirmData) {
      setExpenses(prev => prev.map(e => e.id === statusConfirmData.id ? { ...e, status: statusConfirmData.status } : e));
      setStatusConfirmData(null);
    }
  };

  const softDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setExpenses(prev => prev.map(e => e.id === deleteConfirmId ? { ...e, isDeleted: true } : e));
      setDeleteConfirmId(null);
    }
  };

  const handleClearHistory = () => {
    const candidates = (expenses || []).filter(e => !e.isDeleted && (e.status === 'APPROVED' || e.status === 'REJECTED'));
    const count = candidates.length;

    if (count === 0) return alert('কোনো ডাটা নেই।');

    if (window.confirm(`${count} টি পুরনো বিল (Approved/Rejected) ডিলিট করতে চান?`)) {
      setExpenses(prev => prev.map(e => (e.status === 'APPROVED' || e.status === 'REJECTED') ? { ...e, isDeleted: true } : e));
      alert('ক্লিন করা হয়েছে।');
    }
  };

  const handleApproveAll = () => {
    if (window.confirm(`সব পেন্ডিং বিল অ্যাপ্রুভ করতে চান?`)) {
      setExpenses(prev => prev.map(e => (!e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED')) ? { ...e, status: 'APPROVED' } : e));
    }
  };

  const handleOpenSubmitModal = () => {
    let initialStaffId = '';
    if (role === UserRole.STAFF && currentUser) {
      const myself = activeStaff.find(s => s.name === currentUser);
      if (myself) initialStaffId = myself.id;
    }
    
    setFormData({ staffId: initialStaffId, amount: 0, reason: '', voucherImage: '', date: new Date().toISOString().split('T')[0] });
    setIsSubmitModalOpen(true);
  };

  const openCorrectionModal = (e: Expense) => {
    const dateStr = getSafeDateStr(e.createdAt) || new Date().toISOString().split('T')[0];
    setCorrectionData({ id: e.id, amount: e.amount, reason: e.reason, date: dateStr });
    setIsCorrectionModalOpen(true);
  };

  const saveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionData || !correctionData.date) return;
    
    setExpenses(prev => prev.map(ex => {
      if (ex.id === correctionData.id) {
        try {
            const originalDate = new Date(ex.createdAt);
            const [y, m, d] = correctionData.date.split('-').map(Number);
            const updatedDate = new Date(originalDate);
            updatedDate.setFullYear(y);
            updatedDate.setMonth(m - 1);
            updatedDate.setDate(d);
            
            return { ...ex, amount: Number(correctionData.amount), reason: correctionData.reason, createdAt: updatedDate.toISOString() };
        } catch { return ex; }
      }
      return ex;
    }));
    
    setIsCorrectionModalOpen(false);
    setCorrectionData(null);
  };

  const getStaffDisplayId = (staffId: string) => {
    const staff = (staffList || []).find(s => s.id === staffId);
    return staff ? staff.staffId : '';
  };

  const generateApprovalVoucher = (expense: Expense) => {
    const staff = (staffList || []).find(s => s.id === expense.staffId);
    
    // --- LEDGER CALCULATION ---
    const staffApprovedExpenses = (expenses || [])
      .filter(e => !e.isDeleted && e.status === 'APPROVED' && e.staffId === expense.staffId)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const staffRegularAdvances = (advances || [])
      .filter(a => !a.isDeleted && a.type !== 'SALARY' && a.staffId === expense.staffId)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const balance = staffRegularAdvances - staffApprovedExpenses;
    let balanceText = '';
    let balanceColor = '#1e293b';

    if (balance < 0) {
       balanceText = `PAYABLE: ৳ ${Math.abs(balance).toLocaleString()}`;
       balanceColor = '#dc2626'; // Red
    } else {
       balanceText = `CASH IN HAND: ৳ ${balance.toLocaleString()}`;
       balanceColor = '#166534'; // Green
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const voucherHtml = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>Payment Voucher - ${expense.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Hind Siliguri', sans-serif; -webkit-print-color-adjust: exact; margin: 0; padding: 0; background: white; }
          .a4-container { width: 210mm; min-height: 297mm; padding: 40px; margin: 0 auto; background: white; position: relative; box-sizing: border-box; }
          .voucher-border { border: 3px double #1f2937; height: 100%; padding: 30px; position: relative; display: flex; flex-direction: column; }
          .watermark { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 10rem; font-weight: 900; color: rgba(22, 163, 74, 0.05); pointer-events: none; z-index: 0; white-space: nowrap; border: 10px solid rgba(22, 163, 74, 0.05); padding: 20px 50px; border-radius: 40px; }
          .stamp { position: absolute; bottom: 150px; right: 80px; border: 4px solid #166534; color: #166534; padding: 10px 20px; font-weight: 900; text-transform: uppercase; font-size: 1.2rem; transform: rotate(-10deg); opacity: 0.8; mask-image: url('https://www.transparenttextures.com/patterns/grunge-wall.png'); }
        </style>
      </head>
      <body>
        <div class="a4-container">
           <div class="voucher-border">
              <div class="watermark">APPROVED</div>
              
              <!-- Header -->
              <div class="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8 relative z-10">
                 <div class="flex gap-4">
                    <!-- Logo Placeholder -->
                    <div class="w-16 h-16 bg-gray-900 text-white flex items-center justify-center font-black text-2xl rounded-lg">DS</div>
                    <div>
                       <h1 class="text-4xl font-black uppercase tracking-tight text-gray-900">Depend Sourcing Ltd.</h1>
                       <p class="text-sm font-bold text-gray-500 tracking-[0.3em] uppercase mt-1">Promise Beyond Business</p>
                       <p class="text-xs text-gray-600 mt-2 max-w-sm">Head Office: A-14/8, Johir Complex, Savar, Dhaka.</p>
                    </div>
                 </div>
                 <div class="text-right">
                    <h2 class="text-3xl font-black text-gray-200 uppercase">Payment Voucher</h2>
                    <div class="mt-2">
                       <p class="text-sm font-bold text-gray-600">Voucher No: <span class="font-mono text-black text-lg">#${expense.id}</span></p>
                       <p class="text-sm font-bold text-gray-600">Date: <span class="font-mono text-black">${new Date(expense.createdAt).toLocaleDateString('en-GB')}</span></p>
                    </div>
                 </div>
              </div>

              <!-- Main Content -->
              <div class="flex-1 relative z-10">
                 
                 <!-- Payee Info -->
                 <div class="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
                    <div class="flex justify-between items-center mb-4">
                       <div>
                          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Paid To</p>
                          <h3 class="text-2xl font-bold text-gray-900">${expense.staffName}</h3>
                          <p class="text-sm text-gray-600 font-medium">${staff?.designation || 'Staff'} • ID: ${staff?.staffId || 'N/A'}</p>
                       </div>
                       <div class="text-right">
                          <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Method</p>
                          <p class="text-lg font-bold text-gray-800">Cash / Adjustment</p>
                       </div>
                    </div>
                 </div>

                 <!-- Payment Details -->
                 <div class="mb-8">
                    <h4 class="text-sm font-black text-gray-800 uppercase border-b border-gray-300 pb-2 mb-4">Payment Details</h4>
                    <div class="flex justify-between items-start mb-4">
                       <div class="w-2/3 pr-8">
                          <p class="text-xs font-bold text-gray-500 uppercase mb-1">Description / Particulars</p>
                          <p class="text-lg font-medium text-gray-900 leading-relaxed">${expense.reason}</p>
                       </div>
                       <div class="w-1/3 bg-gray-900 text-white p-4 rounded-xl text-center shadow-lg">
                          <p class="text-xs font-bold text-gray-400 uppercase mb-1">Total Amount</p>
                          <p class="text-3xl font-black">৳ ${expense.amount.toLocaleString()}</p>
                       </div>
                    </div>
                 </div>

                 <!-- Ledger Summary -->
                 <div class="mt-8 mb-12">
                    <h4 class="text-sm font-black text-gray-800 uppercase border-b border-gray-300 pb-2 mb-4">Account Ledger Status (Regular)</h4>
                    <table class="w-full text-sm border border-gray-300">
                       <thead>
                          <tr class="bg-gray-100 text-gray-700">
                             <th class="p-3 border-r border-gray-300 text-left w-1/3">Total Approved Expenses</th>
                             <th class="p-3 border-r border-gray-300 text-left w-1/3">Total Regular Advances</th>
                             <th class="p-3 text-right w-1/3">Net Balance</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr>
                             <td class="p-3 border-r border-gray-300 font-mono font-bold text-gray-600">৳ ${staffApprovedExpenses.toLocaleString()}</td>
                             <td class="p-3 border-r border-gray-300 font-mono font-bold text-gray-600">৳ ${staffRegularAdvances.toLocaleString()}</td>
                             <td class="p-3 text-right font-black text-lg" style="color: ${balanceColor}">
                                ${balanceText}
                             </td>
                          </tr>
                       </tbody>
                    </table>
                    <p class="text-[10px] text-gray-400 mt-2 italic">* This balance reflects the current financial standing of the staff member after this transaction.</p>
                 </div>

              </div>

              <!-- Footer Signatures -->
              <div class="mt-auto relative z-10">
                 
                 <!-- Stamp -->
                 <div class="stamp">MD APPROVED</div>

                 <div class="flex justify-between items-end pt-8 pb-4">
                    <div class="text-center">
                       <div class="border-t-2 border-gray-400 w-48 mb-2"></div>
                       <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Receiver's Signature</p>
                    </div>

                    <div class="text-center">
                       <div class="border-t-2 border-gray-400 w-48 mb-2"></div>
                       <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Accounts / Admin</p>
                    </div>

                    <div class="text-center">
                       <div class="border-t-2 border-gray-900 w-48 mb-2"></div>
                       <p class="text-sm font-bold text-gray-900">Shariful Islam</p>
                       <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Managing Director</p>
                    </div>
                 </div>

                 <div class="border-t border-gray-200 pt-4 flex justify-between items-center text-[10px] text-gray-400">
                    <p>System Generated Voucher via Billing Center App.</p>
                    <p>Printed On: ${new Date().toLocaleString()}</p>
                 </div>
              </div>
           </div>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(voucherHtml);
    printWindow.document.close();
  };

  const getStatusStyles = (status: Expense['status']) => {
    switch(status) {
      case 'APPROVED': return { 
        bg: 'bg-green-100', text: 'text-green-700', 
        cardBg: 'bg-gradient-to-br from-white to-green-50/50',
        border: 'border-green-100 hover:border-green-200',
        shadow: 'hover:shadow-green-100'
      };
      case 'PENDING': return { 
        bg: 'bg-orange-100', text: 'text-orange-700',
        cardBg: 'bg-gradient-to-br from-white to-orange-50/50',
        border: 'border-orange-100 hover:border-orange-200',
        shadow: 'hover:shadow-orange-100'
      };
      case 'VERIFIED': return { 
        bg: 'bg-blue-100', text: 'text-blue-700',
        cardBg: 'bg-gradient-to-br from-white to-blue-50/50',
        border: 'border-blue-100 hover:border-blue-200',
        shadow: 'hover:shadow-blue-100'
      };
      case 'REJECTED': return { 
        bg: 'bg-red-100', text: 'text-red-700',
        cardBg: 'bg-gradient-to-br from-white to-red-50/50',
        border: 'border-red-100 hover:border-red-200',
        shadow: 'hover:shadow-red-100'
      };
      default: return { 
        bg: 'bg-gray-100', text: 'text-gray-700',
        cardBg: 'bg-white',
        border: 'border-gray-100',
        shadow: 'hover:shadow-gray-100'
      };
    }
  };

  // --- NEW VOUCHER LOGIC (Image Download) ---
  const downloadVoucherImage = async () => {
    if (voucherRef.current) {
      const canvas = await html2canvas(voucherRef.current, {
        scale: 2, // High resolution
        backgroundColor: '#ffffff'
      });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Voucher_${voucherPreviewData?.id}.jpg`;
      link.click();
    }
  };

  const getVoucherData = () => {
    if (!voucherPreviewData) return null;
    
    // Calculate ledger for the preview
    const staffApprovedExpenses = (expenses || [])
      .filter(e => !e.isDeleted && e.status === 'APPROVED' && e.staffId === voucherPreviewData.staffId)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const staffRegularAdvances = (advances || [])
      .filter(a => !a.isDeleted && a.type !== 'SALARY' && a.staffId === voucherPreviewData.staffId)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const balance = staffRegularAdvances - staffApprovedExpenses;
    const staffInfo = (staffList || []).find(s => s.id === voucherPreviewData.staffId);

    return {
       ...voucherPreviewData,
       designation: staffInfo?.designation || 'Staff',
       staffDisplayId: staffInfo?.staffId || 'N/A',
       balance,
       totalExp: staffApprovedExpenses,
       totalAdv: staffRegularAdvances
    };
  };

  return (
    <div className="space-y-6">
      {/* ... (Header and Filters omitted for brevity, keeping existing logic) ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">খরচ ও ভাউচার ম্যানেজমেন্ট</h2>
        <div className="flex flex-wrap gap-3">
          {(role === UserRole.ADMIN || role === UserRole.MD) && (
             <button onClick={handleClearHistory} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 hover:text-red-700 border border-red-200 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"><Eraser className="w-5 h-5" /> হিস্ট্রি ক্লিন</button>
          )}
          {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
            <button onClick={handleOpenSubmitModal} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100"><Receipt className="w-5 h-5" /> নতুন বিল</button>
          )}
          {role === UserRole.MD && (
            <button onClick={handleApproveAll} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-100"><CheckCheck className="w-5 h-5" /> সব অ্যাপ্রুভ</button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">খুঁজুন</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        {(role === UserRole.ADMIN || role === UserRole.MD) && (
          <div className="w-full sm:w-auto min-w-[150px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">স্টাফ</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 appearance-none" value={selectedStaffFilter} onChange={(e) => setSelectedStaffFilter(e.target.value)}>
                <option value="">All Staff</option>
                {allStaffForFilter.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="w-full sm:w-auto"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শুরু</label><input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="w-full sm:w-auto"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শেষ</label><input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <button onClick={() => { setSearchTerm(''); setSelectedStaffFilter(''); setStartDate(''); setEndDate(''); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl"><FilterX className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExpenses.map((expense) => {
          const expenseDateStr = getSafeDateStr(expense.createdAt);
          const isDuplicate = expenses.filter(e => !e.isDeleted && e.staffId === expense.staffId && getSafeDateStr(e.createdAt) === expenseDateStr).length > 1;
          const styles = getStatusStyles(expense.status);
          const staffMember = (staffList || []).find(s => s.id === expense.staffId);

          return (
          <div key={expense.id} className={`group relative rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden ${styles.cardBg} ${styles.border} ${styles.shadow}`}>
            
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-500 pointer-events-none">
               <Receipt className="w-32 h-32" />
            </div>

            <div className="p-5 flex-1 relative z-10">
              {isDuplicate && (role === UserRole.ADMIN || role === UserRole.MD) && (
                 <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg animate-pulse"><div className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-600" /><h4 className="text-xs font-black text-red-700 uppercase">ডুপ্লিকেট বিল ডিটেক্টেড!</h4></div><p className="text-[10px] text-red-600 mt-1 font-medium leading-tight">এই তারিখে এই স্টাফের আরও একটি বিল আছে। দয়া করে চেক করুন।</p></div>
              )}

              <div className="flex justify-between items-center mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${styles.bg} ${styles.text}`}>
                  {expense.status === 'PENDING' ? 'Waiting' : expense.status}
                </span>
                <span className="text-[10px] font-bold text-gray-400 bg-white/50 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-100">
                   {new Date(expense.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              
              <div className="mb-2">
                 <h4 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 group-hover:from-indigo-600 group-hover:to-purple-600 transition-all">৳ {expense.amount.toLocaleString()}</h4>
              </div>

              <p className="text-sm text-gray-600 font-medium line-clamp-2 leading-relaxed h-10 mb-4">{expense.reason}</p>
              
              <div className="h-px w-full bg-gray-100/50 mb-4"></div>

              <div className="flex justify-between items-end">
                 <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-indigo-700 font-bold text-xs shadow-sm overflow-hidden shrink-0">
                       {staffMember && staffMember.photo ? <img src={staffMember.photo} alt={expense.staffName} className="w-full h-full object-cover" /> : (expense.staffName || '?')[0]}
                    </div>
                    <div>
                       <p className="text-xs font-bold text-gray-700 line-clamp-1">{expense.staffName}</p>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{getStaffDisplayId(expense.staffId)}</p>
                    </div>
                 </div>

                 <div className="flex gap-1 bg-white/50 rounded-lg p-0.5 backdrop-blur-sm">
                    {/* APPROVED VOUCHER DOWNLOAD - AVAILABLE TO ALL */}
                    {expense.status === 'APPROVED' && (
                        <button 
                           onClick={() => setVoucherPreviewData(expense)}
                           className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                           title="ভাউচার ছবি ডাউনলোড"
                        >
                           <ImageIcon className="w-4 h-4" />
                        </button>
                    )}
                    {/* PDF Print Button */}
                    {expense.status === 'APPROVED' && (
                        <button 
                           onClick={() => generateApprovalVoucher(expense)}
                           className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                           title="ভাউচার প্রিন্ট করুন"
                        >
                           <Printer className="w-4 h-4" />
                        </button>
                    )}

                    {((role === UserRole.ADMIN || role === UserRole.MD) && (expense.status === 'PENDING' || expense.status === 'VERIFIED')) && (
                       <button onClick={() => openCorrectionModal(expense)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
                    )}
                    {expense.voucherImage ? (
                       <button onClick={() => setViewingVoucher(expense.voucherImage!)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Voucher"><FileText className="w-4 h-4" /></button>
                    ) : (
                       <div className="p-1.5 text-gray-300" title="No Voucher"><FileText className="w-4 h-4" /></div>
                    )}
                 </div>
              </div>
            </div>

            <div className="bg-white/50 p-2 grid grid-cols-2 gap-2 border-t border-gray-100 backdrop-blur-sm">
               {role === UserRole.ADMIN && expense.status === 'PENDING' && (
                 <>
                    <button onClick={() => updateStatus(expense.id, 'VERIFIED')} className="col-span-2 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors">MD-র কাছে পাঠান</button>
                    <button onClick={() => updateStatus(expense.id, 'REJECTED')} className="bg-white text-red-600 border border-gray-200 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-colors">বাতিল</button>
                    <button onClick={() => softDelete(expense.id)} className="bg-white text-gray-400 border border-gray-200 py-1.5 rounded-lg text-xs font-bold hover:text-red-500 hover:border-red-200 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                 </>
               )}
               {role === UserRole.MD && (expense.status === 'VERIFIED' || expense.status === 'PENDING') && (
                 <>
                   <button onClick={() => updateStatus(expense.id, 'APPROVED')} className="col-span-2 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition-colors flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> অ্যাপ্রুভ করুন</button>
                   <button onClick={() => updateStatus(expense.id, 'REJECTED')} className="bg-white text-red-600 border border-gray-200 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-colors">বাতিল</button>
                   <button onClick={() => softDelete(expense.id)} className="bg-white text-gray-400 border border-gray-200 py-1.5 rounded-lg text-xs font-bold hover:text-red-500 hover:border-red-200 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                 </>
               )}
               {((role === UserRole.ADMIN && (expense.status === 'VERIFIED' || expense.status === 'APPROVED' || expense.status === 'REJECTED')) || (role === UserRole.STAFF && (expense.status === 'PENDING' || expense.status === 'REJECTED'))) && (
                  <div className="col-span-2 flex gap-2">
                     {role === UserRole.ADMIN && expense.status === 'VERIFIED' && <button onClick={() => updateStatus(expense.id, 'PENDING')} className="flex-1 bg-orange-50 text-orange-700 border border-orange-200 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-100 flex items-center justify-center gap-1"><RotateCcw className="w-3 h-3" /> ফেরত</button>}
                     <button onClick={() => softDelete(expense.id)} className="flex-1 bg-white text-gray-400 border border-gray-200 hover:border-red-200 hover:text-red-500 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" /> ডিলিট</button>
                  </div>
               )}
            </div>
          </div>
        )})}
      </div>
      
      {filteredExpenses.length === 0 && <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400"><div className="flex flex-col items-center gap-2 opacity-50"><Receipt className="w-10 h-10" /><p className="text-sm font-medium">কোনো বিল পাওয়া যায়নি</p></div></div>}

      {/* --- VOUCHER PREVIEW & DOWNLOAD MODAL --- */}
      {voucherPreviewData && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-800">ভাউচার ডাউনলোড</h3>
                 <button onClick={() => setVoucherPreviewData(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-600"/></button>
              </div>
              
              {/* SCROLLABLE AREA */}
              <div className="overflow-y-auto p-6 bg-gray-100 flex-1 flex justify-center">
                 {/* ACTUAL VOUCHER TO CAPTURE */}
                 <div ref={voucherRef} id="voucher-content" className="bg-white p-8 w-full max-w-[400px] shadow-lg relative text-gray-800 border-4 border-double border-gray-800">
                    {/* Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-45 opacity-5 pointer-events-none select-none">
                       <span className="text-6xl font-black uppercase text-black">APPROVED</span>
                    </div>

                    {/* Header */}
                    <div className="border-b-2 border-black pb-4 mb-6">
                       <h1 className="text-2xl font-black uppercase tracking-tight text-center">Depend Sourcing Ltd.</h1>
                       <p className="text-[10px] text-center uppercase tracking-[0.2em] font-bold text-gray-500 mt-1">Promise Beyond Business</p>
                    </div>

                    {/* Body */}
                    <div className="space-y-4">
                       <div className="flex justify-between items-end border-b border-dotted border-gray-300 pb-1">
                          <span className="text-xs font-bold uppercase text-gray-500">Voucher No</span>
                          <span className="font-mono font-bold text-sm">#{voucherPreviewData.id}</span>
                       </div>
                       <div className="flex justify-between items-end border-b border-dotted border-gray-300 pb-1">
                          <span className="text-xs font-bold uppercase text-gray-500">Date</span>
                          <span className="font-bold text-sm">{new Date(voucherPreviewData.createdAt).toLocaleDateString('en-GB')}</span>
                       </div>
                       
                       <div className="py-2">
                          <p className="text-xs font-bold uppercase text-gray-500 mb-1">Pay To</p>
                          <p className="font-bold text-lg">{voucherPreviewData.staffName}</p>
                          <p className="text-xs text-gray-500">ID: {getVoucherData()?.staffDisplayId} • {getVoucherData()?.designation}</p>
                       </div>

                       <div className="bg-gray-50 p-3 border border-gray-200">
                          <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">The Sum Of</p>
                          <p className="text-2xl font-black">৳ {voucherPreviewData.amount.toLocaleString()}</p>
                          <p className="text-xs italic text-gray-600 mt-1">On Account of: {voucherPreviewData.reason}</p>
                       </div>

                       {/* Status Section */}
                       <div className="border-t-2 border-dashed border-gray-300 pt-3 mt-4">
                          <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                             <span>Total Approved Exp:</span>
                             <span>৳ {getVoucherData()?.totalExp.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                             <span>Total Regular Adv:</span>
                             <span>৳ {getVoucherData()?.totalAdv.toLocaleString()}</span>
                          </div>
                          <div className={`flex justify-between text-sm font-black border-t border-gray-300 pt-1 mt-1 ${(getVoucherData()?.balance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                             <span>Net Status:</span>
                             <span>{(getVoucherData()?.balance || 0) < 0 ? 'Payable' : 'Cash In Hand'} ৳ {Math.abs(getVoucherData()?.balance || 0).toLocaleString()}</span>
                          </div>
                       </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-4 border-t border-black flex justify-between items-end">
                       <div className="text-center">
                          <p className="text-[8px] font-bold uppercase text-gray-400">Receiver's Signature</p>
                       </div>
                       <div className="text-center relative">
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-24 h-10 flex items-center justify-center opacity-80 pointer-events-none">
                             <div className="border-2 border-green-600 text-green-700 font-black text-[8px] uppercase px-1 py-0.5 rounded rotate-[-10deg] bg-white">
                                MD APPROVED
                             </div>
                          </div>
                          <p className="text-[8px] font-bold uppercase text-gray-400">Authorized Signature</p>
                       </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                       <p className="text-[8px] text-gray-400 italic">Bill Approval Proof • System Generated</p>
                    </div>
                 </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
                 <button onClick={downloadVoucherImage} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg active:scale-95">
                    <Download className="w-5 h-5" /> Download JPG
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ... (Other modals like Submit, Status Confirm, Delete Confirm, Correction remain unchanged) ... */}
      {/* Keeping previous modals rendered logic exactly as is to avoid breaking functionality */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white shrink-0">
              <h3 className="font-bold text-xl">নতুন বিল</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-indigo-200 hover:text-white">×</button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              {isSubmissionDuplicate && <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 animate-pulse"><AlertTriangle className="w-6 h-6 text-red-500 shrink-0" /><div><h4 className="font-bold text-red-700 text-sm">সতর্কতা: ডুপ্লিকেট বিল!</h4><p className="text-xs text-red-600 mt-1">নির্বাচিত তারিখে এই স্টাফের ইতিমধ্যে একটি বিল সিস্টেমে আছে।</p></div></div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">স্টাফ মেম্বার</label><select required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 text-slate-700 font-bold rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm appearance-none text-sm" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})}><option value="">স্টাফ নির্বাচন করুন</option>{activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">তারিখ</label><input type="date" required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 text-slate-700 font-bold rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm text-sm" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between"><span>খরচের কারণ ও বিবরণ</span><span className="text-xs text-indigo-600 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3"/> Auto Calculator</span></label><textarea required rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" placeholder="কারণ..." value={formData.reason} onChange={handleReasonChange} /></div>
                <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">টাকার পরিমাণ</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span><input required type="number" className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-100 text-slate-800 font-black text-base rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm placeholder:text-slate-300" placeholder="0.00" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} /></div></div>
                <div onClick={() => fileInputRef.current?.click()} className="group py-2 px-3 border-2 border-dashed border-indigo-100 hover:border-indigo-300 rounded-lg bg-indigo-50/30 hover:bg-indigo-50 cursor-pointer transition-all flex items-center justify-center gap-2 relative overflow-hidden"><input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />{formData.voucherImage ? <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3"/> ছবি যুক্ত হয়েছে <span className="text-[9px] text-gray-400 font-normal">(পরিবর্তন)</span></span> : <><Camera className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition-colors"/><span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-600">ভাউচার ছবি দিন</span></>}</div>
                <button type="submit" className={`w-full text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl ${isSubmissionDuplicate ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200'}`}>{isSubmissionDuplicate ? <><AlertTriangle className="w-5 h-5"/> তবুও সাবমিট করুন</> : 'বিল সাবমিট করুন'}</button>
              </form>
            </div>
          </div>
        </div>
      )}
      {statusConfirmData && <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200"><div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"><h3 className="font-bold text-lg mb-2">নিশ্চিত করুন</h3><p className="text-sm text-gray-500 mb-4">স্ট্যাটাস পরিবর্তন করতে চান?</p><div className="flex gap-3"><button onClick={() => setStatusConfirmData(null)} className="flex-1 py-2 border rounded-lg font-bold text-gray-600">না</button><button onClick={confirmStatusUpdate} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold">হ্যাঁ</button></div></div></div>}
      {deleteConfirmId && <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200"><div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"><div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><Trash2 className="w-6 h-6" /></div><h3 className="font-bold text-lg mb-2">ডিলিট করবেন?</h3><div className="flex gap-3 mt-4"><button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 border rounded-lg font-bold text-gray-600">না</button><button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold">হ্যাঁ</button></div></div></div>}
      {isCorrectionModalOpen && correctionData && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200"><div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden"><div className="flex justify-between items-start mb-4"><h3 className="font-bold text-lg text-gray-800">বিল সংশোধন</h3><div className="flex flex-col items-end"><label className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">তারিখ</label><input type="date" className="text-xs border border-gray-200 rounded-lg px-2 py-1 font-bold text-gray-900 bg-white focus:outline-none focus:border-orange-400 shadow-sm" value={correctionData.date} onChange={(e) => setCorrectionData({...correctionData, date: e.target.value})} /></div></div><form onSubmit={saveCorrection} className="space-y-4"><div><label className="block text-xs font-bold text-gray-600 mb-1">টাকার পরিমাণ</label><input type="number" className="w-full border border-gray-200 p-3 rounded-xl font-black text-2xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-100 outline-none transition-colors" value={correctionData.amount} onChange={e => setCorrectionData({...correctionData, amount: Number(e.target.value)})} /></div><div><label className="block text-xs font-bold text-gray-600 mb-1">কারণ</label><textarea rows={3} className="w-full border border-gray-200 p-3 rounded-xl text-sm font-medium text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-100 outline-none resize-none transition-colors" value={correctionData.reason} onChange={e => setCorrectionData({...correctionData, reason: e.target.value})} /></div><div className="flex gap-3 mt-2"><button type="button" onClick={() => setIsCorrectionModalOpen(false)} className="flex-1 border border-gray-200 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors">বাতিল</button><button type="submit" className="flex-[2] bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-colors">আপডেট করুন</button></div></form></div></div>}
      {viewingVoucher && <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200" onClick={() => setViewingVoucher(null)}><div className="relative max-w-3xl w-full max-h-screen p-2"><button onClick={() => setViewingVoucher(null)} className="absolute -top-10 right-0 text-white hover:text-red-400 transition-colors"><X className="w-8 h-8" /></button><img src={viewingVoucher} alt="Voucher" className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white" /></div></div>}
    </div>
  );
};

export default ExpenseManagementView;