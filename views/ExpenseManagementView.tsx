
import React, { useState, useMemo, useRef } from 'react';
import { Receipt, Camera, CheckCircle, XCircle, Clock, Eye, Trash2, Search, Calendar, FilterX, RotateCcw, CheckCheck, Sparkles, X, Edit3, User, AlertTriangle, Eraser } from 'lucide-react';
import { Expense, Staff, UserRole, AppNotification } from '../types';

interface ExpenseProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  staffList: Staff[];
  role: UserRole;
  currentUser: string | null;
  onNotify?: (title: string, message: string, type: AppNotification['type']) => void;
}

const ExpenseManagementView: React.FC<ExpenseProps> = ({ expenses = [], setExpenses, staffList = [], role, currentUser }) => {
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
    });
  }, [expenses, searchTerm, selectedStaffFilter, startDate, endDate, role, currentUser]);

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    
    // 1. Convert Bengali digits to English
    const banglaToEng = (str: string) => str.replace(/[০-৯]/g, d => "0123456789"["০১২৩৪৫৬৭৮৯".indexOf(d)]);
    let processedText = banglaToEng(text);

    // --- STEP 0: PROTECT CURRENCY WORDS ---
    // We replace words like "Taka", "Tk", "টাকা" with a safe placeholder so they are NOT treated as units later.
    processedText = processedText.replace(/(taka|tk|bdt|টাকা)/gi, 'CURRENCY_SYMBOL');

    // --- SMART EXCLUSION LOGIC (Advanced) ---
    
    // A. Dates (ISO, Common formats)
    processedText = processedText.replace(/\d{4}-\d{2}-\d{2}/g, 'SKIP_DATE'); 
    processedText = processedText.replace(/\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/g, 'SKIP_DATE');

    // B. Phone Numbers (01xxxxxxxxx)
    processedText = processedText.replace(/01\d{9}/g, 'SKIP_PHONE');

    // C. Time 
    // 1. Colon separated (e.g. 08:30, 10:45) - Treat as time
    processedText = processedText.replace(/\d{1,2}:\d{2}/g, 'SKIP_TIME_COLON'); 
    
    // 2. Time with suffix (10.30 am, 5 pm, 10 ta)
    processedText = processedText.replace(/\d{1,2}[:\.]\d{2}\s*(am|pm|a\.m|p\.m)/gi, 'SKIP_TIME');
    processedText = processedText.replace(/\d{1,2}\s*(am|pm|a\.m|p\.m|টা|বাজে|বাজা)/gi, 'SKIP_TIME');

    // D. Date Ranges ("22 theke 28 tarikh", "22-28 tarikh", "22 হতে 28 তারিখ")
    const dateRangeRegex = /(\d+)[\s\-]*(?:থেকে|theke|to|untill|পর্যন্ত|হতে|[\-])[\s]*(\d+)[\s]*(?:তারিখ|date|tarikh|tarik)/gi;
    processedText = processedText.replace(dateRangeRegex, "SKIP_DATE_RANGE");

    // E. Single Date with Keyword ("5 tarikh", "10 date", "2023 sale")
    const specificDateRegex = /(\d+)[\s]*(?:তারিখ|date|tarikh|sal|sale|সাল|সালে|st|nd|rd|th)/gi;
    processedText = processedText.replace(specificDateRegex, "SKIP_SINGLE_DATE");

    // F. Units/Measurements (Piece, Dozen, Yard, KG, Minute, Hour etc.)
    const units = [
        'pc', 'pcs', 'pice', 'pices', 'pitch', 'pic', 'pis', 'pich', // Piece
        'p', 't', 'ta', 'ti', 'khana', 'gulo', 'got', // Bengali count
        'pisa', 'pich', 'পিস', 'টি', 'টা', 'খানা', 'গুলো',
        'dz', 'doz', 'dozen', 'dozon', 'ডজন',
        'goj', 'gaz', 'yard', 'yrd', 'গজ',
        'kg', 'kilo', 'keji', 'কেজি',
        'gm', 'gram', 'g', 'গ্রাম',
        'ltr', 'liter', 'litre', 'l', 'লিটার',
        'pkt', 'packet', 'pack', 'pket', 'প্যাকেট',
        'bosta', 'bosta', 'বস্তা',
        'set', 'সেট',
        'jo', 'jora', 'pair', 'জোড়া',
        'inch', 'in', 'ইঞ্চি',
        'ft', 'feet', 'ফুট',
        'm', 'meter', 'মিটার',
        'jon', 'জন', // People count
        // Time Units
        'min', 'minute', 'mnt', 'মিনিট',
        'hr', 'hour', 'ghonta', 'ঘন্টা',
        'sec', 'second', 'সেকেন্ড'
    ];
    
    // Regex Update: Added boundary check `(?![a-zA-Z\u0980-\u09FF])`
    const unitRegex = new RegExp(`(\\d+[\\.]?\\d*)\\s*(${units.join('|')})(?![a-zA-Z\u0980-\u09FF])`, 'gi');
    processedText = processedText.replace(unitRegex, "SKIP_UNIT");

    // G. Locations & Addresses
    const locPrefixes = [
        'road', 'rd', 'রোড',
        'house', 'h', 'bas', 'basa', 'বাসা', 'বাড়ি',
        'flat', 'apt', 'ফ্ল্যাট',
        'sector', 'sec', 'সেক্টর',
        'block', 'blk', 'ব্লক',
        'lane', 'goli', 'গলি',
        'level', 'lvl', 'লেভেল',
        'ward', 'word', 'ওয়ার্ড',
        'room', 'rm', 'রুম', 'কক্ষ',
        'platfrom', 'platform', 'প্লাটফর্ম',
        'counter', 'কাউন্টার',
        'shop', 'dokan', 'দোকান',
        'bus', 'গাড়ি', 'বাস'
    ];
    const locRegexPrefix = new RegExp(`(${locPrefixes.join('|')})[\\s\\-\\.]*(\\d+)`, 'gi');
    processedText = processedText.replace(locRegexPrefix, "SKIP_LOC");

    const locSuffixes = [
        'floor', 'tala', 'তলা',
        'level', 'no', 'nong', 'number', 'num', 'নং', 'নম্বর',
        'th', 'nd', 'rd', 'st'
    ];
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">খরচ ও ভাউচার ম্যানেজমেন্ট</h2>
        <div className="flex flex-wrap gap-3">
          {(role === UserRole.ADMIN || role === UserRole.MD) && (
             <button
               onClick={handleClearHistory}
               className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 hover:text-red-700 border border-red-200 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
             >
               <Trash2 className="w-5 h-5" /> হিস্ট্রি ক্লিন
             </button>
          )}
          {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
            <button 
              onClick={handleOpenSubmitModal}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100"
            >
              <Receipt className="w-5 h-5" /> নতুন বিল
            </button>
          )}
          
          {role === UserRole.MD && (
            <button 
              onClick={handleApproveAll}
              className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-100"
            >
              <CheckCheck className="w-5 h-5" /> সব অ্যাপ্রুভ
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">খুঁজুন</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {(role === UserRole.ADMIN || role === UserRole.MD) && (
          <div className="w-full sm:w-auto min-w-[150px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">স্টাফ</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select 
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 appearance-none"
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
              >
                <option value="">All Staff</option>
                {allStaffForFilter.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শুরু</label>
          <input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শেষ</label>
          <input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={() => { setSearchTerm(''); setSelectedStaffFilter(''); setStartDate(''); setEndDate(''); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl">
          <FilterX className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExpenses.map((expense) => (
          <div key={expense.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-all">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  expense.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                  expense.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                  expense.status === 'VERIFIED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {expense.status}
                </span>
                
                <div className="flex items-center gap-2">
                  {((role === UserRole.ADMIN || role === UserRole.MD) && (expense.status === 'PENDING' || expense.status === 'VERIFIED')) && (
                    <button onClick={() => openCorrectionModal(expense)} className="text-orange-500 hover:bg-orange-50 p-1 rounded-full"><Edit3 className="w-4 h-4" /></button>
                  )}
                  {expense.voucherImage && (
                    <button onClick={() => setViewingVoucher(expense.voucherImage!)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-full"><Eye className="w-4 h-4" /></button>
                  )}
                  <p className="text-xs text-gray-400">{new Date(expense.createdAt).toLocaleDateString('bn-BD')}</p>
                </div>
              </div>
              
              <h4 className="text-lg font-bold text-gray-800 mb-1">৳ {expense.amount.toLocaleString()}</h4>
              <p className="text-sm text-gray-600 mb-4 font-medium h-10 line-clamp-2">{expense.reason}</p>
              
              <div className="flex items-center gap-3 py-3 border-t border-gray-50">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                  {(expense.staffName || '?')[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">{expense.staffName}</p>
                  <p className="text-[10px] text-gray-400">ID: {getStaffDisplayId(expense.staffId)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 flex gap-2 border-t border-gray-100">
               {role === UserRole.ADMIN && (
                 <>
                   {expense.status === 'PENDING' && (
                     <>
                        <button onClick={() => updateStatus(expense.id, 'VERIFIED')} className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm">MD-র কাছে পাঠান</button>
                        <button onClick={() => updateStatus(expense.id, 'REJECTED')} className="flex-1 bg-white text-red-600 border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-50">বাতিল</button>
                        <button onClick={() => softDelete(expense.id)} className="px-3 bg-white text-gray-400 border border-gray-200 py-2 rounded-lg hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                     </>
                   )}
                   {expense.status === 'VERIFIED' && (
                     <>
                        <button onClick={() => updateStatus(expense.id, 'PENDING')} className="flex-1 bg-orange-50 text-orange-700 border border-orange-200 py-2 rounded-lg text-xs font-bold hover:bg-orange-100 flex items-center justify-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> ফেরত</button>
                        <button onClick={() => softDelete(expense.id)} className="flex-1 bg-red-50 text-red-700 border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" /> ডিলিট</button>
                     </>
                   )}
                 </>
               )}

               {role === UserRole.MD && (expense.status === 'VERIFIED' || expense.status === 'PENDING') && (
                 <>
                   <button onClick={() => updateStatus(expense.id, 'APPROVED')} className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm"><CheckCircle className="w-4 h-4 inline mr-1"/> অ্যাপ্রুভ</button>
                   <button onClick={() => updateStatus(expense.id, 'REJECTED')} className="flex-1 bg-white text-red-600 border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-50">বাতিল</button>
                 </>
               )}

               {((role === UserRole.ADMIN && (expense.status === 'APPROVED' || expense.status === 'REJECTED')) || (role === UserRole.STAFF && (expense.status === 'PENDING' || expense.status === 'REJECTED'))) && (
                  <button onClick={() => softDelete(expense.id)} className="w-full bg-white text-gray-400 border border-gray-200 hover:border-red-200 hover:text-red-500 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> ডিলিট করুন
                  </button>
               )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals omitted for brevity but logic is same as before, just rendering carefully */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white shrink-0">
              <h3 className="font-bold text-xl">নতুন বিল</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-indigo-200 hover:text-white">×</button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Simplified form */}
                <select required className="w-full px-4 py-2 border rounded-lg" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})}>
                   <option value="">স্টাফ নির্বাচন করুন</option>
                   {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input type="date" required className="w-full px-4 py-2 border rounded-lg" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                    <span>খরচের কারণ ও বিবরণ</span>
                    <span className="text-xs text-indigo-600 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3"/> Auto Calculator</span>
                  </label>
                  <textarea required rows={3} className="w-full px-4 py-2 border rounded-lg" placeholder="কারণ..." value={formData.reason} onChange={handleReasonChange} />
                </div>

                <input required type="number" className="w-full px-4 py-2 border rounded-lg font-bold" placeholder="টাকা" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
                <div onClick={() => fileInputRef.current?.click()} className="p-2 border border-dashed rounded-lg bg-gray-50 text-center cursor-pointer">
                   {formData.voucherImage ? <span className="text-green-600 font-bold">ছবি যুক্ত হয়েছে</span> : <span className="text-gray-500">ভাউচার ছবি দিন</span>}
                   <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">সাবমিট</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {statusConfirmData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center">
             <h3 className="font-bold text-lg mb-2">নিশ্চিত করুন</h3>
             <p className="text-sm text-gray-500 mb-4">স্ট্যাটাস পরিবর্তন করতে চান?</p>
             <div className="flex gap-3">
                <button onClick={() => setStatusConfirmData(null)} className="flex-1 py-2 border rounded-lg">না</button>
                <button onClick={confirmStatusUpdate} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg">হ্যাঁ</button>
             </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center">
             <h3 className="font-bold text-lg mb-2">ডিলিট করবেন?</h3>
             <div className="flex gap-3 mt-4">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 border rounded-lg">না</button>
                <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg">হ্যাঁ</button>
             </div>
          </div>
        </div>
      )}

      {isCorrectionModalOpen && correctionData && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
               <h3 className="font-bold mb-4">সংশোধন</h3>
               <form onSubmit={saveCorrection} className="space-y-3">
                  <input type="number" className="w-full border p-2 rounded" value={correctionData.amount} onChange={e => setCorrectionData({...correctionData, amount: Number(e.target.value)})} />
                  <textarea className="w-full border p-2 rounded" value={correctionData.reason} onChange={e => setCorrectionData({...correctionData, reason: e.target.value})} />
                  <button type="submit" className="w-full bg-orange-500 text-white py-2 rounded font-bold">আপডেট</button>
                  <button type="button" onClick={() => setIsCorrectionModalOpen(false)} className="w-full border py-2 rounded font-bold">বাতিল</button>
               </form>
            </div>
         </div>
      )}

      {viewingVoucher && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90" onClick={() => setViewingVoucher(null)}>
           <img src={viewingVoucher} className="max-w-full max-h-[85vh] rounded" />
           <button onClick={() => setViewingVoucher(null)} className="absolute top-4 right-4 text-white text-xl">X</button>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagementView;
