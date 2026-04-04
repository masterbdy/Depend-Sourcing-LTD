import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Edit3, Trash2, UserPlus, X, Calendar, FilterX, Phone, Banknote, Users, User, UserCheck, UserX, ArrowUpDown, ShieldCheck, ShieldAlert, Eye, EyeOff, Lock, Camera, Image as ImageIcon, Briefcase, Wallet, ArrowRight, Coins, Crown, UserCog, History, CalendarClock, MapPin, LocateFixed, Globe, ToggleLeft, ToggleRight, Map, MonitorSmartphone, Gift, Star, MoreVertical, WalletCards, AlertTriangle, CheckCircle, RotateCcw, TrendingDown, Maximize2, Minimize2, ChevronDown, Sparkles, CreditCard, ExternalLink, Laptop, Cake } from 'lucide-react';
import { Staff, UserRole, Expense, AdvanceLog } from '../types';
import { ROLE_LABELS } from '../constants';

interface StaffProps {
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  role: UserRole;
  expenses: Expense[];
  advances: AdvanceLog[];
  setAdvances: React.Dispatch<React.SetStateAction<AdvanceLog[]>>;
  currentUser: string | null;
  onUpdatePoints?: (staffId: string, points: number, reason: string) => void;
  highlightStaffId?: string | null;
  setHighlightStaffId?: React.Dispatch<React.SetStateAction<string | null>>;
}

const StaffManagementView: React.FC<StaffProps> = ({ staffList = [], setStaffList, role, expenses = [], advances = [], setAdvances, currentUser, onUpdatePoints, highlightStaffId, setHighlightStaffId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest'); 
  
  // Expanded Card State
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  // Profile/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Status Change Confirmation State
  const [statusConfirmData, setStatusConfirmData] = useState<{id: string, newStatus: 'ACTIVE' | 'DEACTIVATED'} | null>(null);

  // Penalty Confirmation State
  const [showPenaltyConfirm, setShowPenaltyConfirm] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({ 
    name: '', 
    staffId: '', 
    designation: '', 
    mobile: '', 
    basicSalary: 0, 
    password: '', 
    photo: '',
    role: UserRole.STAFF,
    workLocation: 'HEAD_OFFICE' as Staff['workLocation'],
    requiresCheckOutLocation: true,
    dateOfBirth: '',
    // Custom location fields 1
    customLat: 0,
    customLng: 0,
    customRadius: 200,
    customLocName: '',
    // Custom location fields 2
    hasSecondLoc: false,
    customLat2: 0,
    customLng2: 0,
    customRadius2: 200,
    customLocName2: ''
  });
  
  // Advance Money Modal State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceFormData, setAdvanceFormData] = useState<{
    staffId: string;
    amount: number;
    note: string;
    date: string;
    type: 'REGULAR' | 'SALARY';
  }>({ 
    staffId: '', 
    amount: 0, 
    note: '',
    date: new Date().toISOString().split('T')[0],
    type: 'REGULAR'
  });

  // Repayment/Adjustment Modal State
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [repayFormData, setRepayFormData] = useState<{
    staffId: string;
    amount: number;
    note: string;
    date: string;
    type: 'REGULAR' | 'SALARY';
  }>({
    staffId: '',
    amount: 0,
    note: 'Adjustment',
    date: new Date().toISOString().split('T')[0],
    type: 'SALARY' // Default to salary
  });

  // Gift/Penalty Points Modal State
  const [isGiftPointModalOpen, setIsGiftPointModalOpen] = useState(false);
  const [giftPointData, setGiftPointData] = useState<{staffId: string, points: number}>({ staffId: '', points: 5 });
  const [pointMode, setPointMode] = useState<'GIFT' | 'PENALTY'>('GIFT');

  // History Modal State
  const [historyStaff, setHistoryStaff] = useState<Staff | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStaff = role === UserRole.STAFF;
  const canManageMoney = role === UserRole.ADMIN || role === UserRole.MD;

  // Handle Highlight/Auto-Scroll
  useEffect(() => {
    if (highlightStaffId) {
        setExpandedStaffId(highlightStaffId);
        setTimeout(() => {
            const element = document.getElementById(`staff-card-${highlightStaffId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
        
        if (setHighlightStaffId) {
            setTimeout(() => setHighlightStaffId(null), 1000);
        }
    }
  }, [highlightStaffId, setHighlightStaffId]);

  // Helper to format large numbers
  const formatPoints = (num: number) => {
    if (num >= 100000) return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num;
  };

  // Helper for Premium Currency Formatting
  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount).toLocaleString('en-US');
    const colorClass = isNegative ? 'text-red-400' : 'text-emerald-400';
    
    return (
      <span className={`font-mono font-black tracking-tighter flex items-baseline truncate text-xl md:text-2xl ${colorClass}`} title={`৳${absAmount}`}>
        {isNegative && <span className="mr-1">-</span>}
        <span className="font-sans font-bold opacity-60 mr-1 text-xs">৳</span>
        {absAmount}
      </span>
    );
  };

  const formatCurrencyLight = (amount: number, colorClass: string) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount).toLocaleString('en-US');
    
    return (
      <span className={`font-mono font-black text-xl md:text-2xl tracking-tighter flex items-baseline truncate ${colorClass}`} title={`৳${absAmount}`}>
        {isNegative && <span className="mr-1">-</span>}
        <span className="font-sans font-bold opacity-50 mr-1 text-xs">৳</span>
        {absAmount}
      </span>
    );
  };

  // --- STAFF FORM HANDLERS ---
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    
    let customLocationData = undefined;
    let secondaryLocationData = undefined;

    if (formData.workLocation === 'CUSTOM') {
      customLocationData = {
        lat: Number(formData.customLat),
        lng: Number(formData.customLng),
        radius: Number(formData.customRadius),
        name: formData.customLocName || 'Custom Location 1'
      };

      if (formData.hasSecondLoc) {
        secondaryLocationData = {
          lat: Number(formData.customLat2),
          lng: Number(formData.customLng2),
          radius: Number(formData.customRadius2),
          name: formData.customLocName2 || 'Custom Location 2'
        };
      }
    }

    if (editingStaff) {
      if (isStaff && editingStaff.name !== currentUser) {
        alert("You cannot edit other staff members.");
        return;
      }
      setStaffList(prev => prev.map(s => s && s.id === editingStaff.id ? { 
        ...s, 
        ...formData, 
        customLocation: customLocationData,
        secondaryCustomLocation: secondaryLocationData,
        updatedAt: now 
      } : s));
    } else {
      if (role !== UserRole.ADMIN) {
         alert("দুঃখিত! নতুন স্টাফ শুধুমাত্র অ্যাডমিন যুক্ত করতে পারেন।");
         return;
      }

      const newStaff: Staff = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        staffId: formData.staffId,
        designation: formData.designation,
        mobile: formData.mobile,
        basicSalary: formData.basicSalary,
        password: formData.password || `${formData.name}@`,
        photo: formData.photo,
        role: formData.role, 
        workLocation: formData.workLocation,
        requiresCheckOutLocation: formData.requiresCheckOutLocation,
        customLocation: customLocationData,
        secondaryCustomLocation: secondaryLocationData,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
        points: 0,
        luckyDrawCount: 0,
        dateOfBirth: formData.dateOfBirth
      };
      setStaffList(prev => [...prev, newStaff]);
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setShowPassword(false);
    setFormData({ 
      name: '', staffId: '', designation: '', mobile: '', basicSalary: 0, password: '', photo: '', role: UserRole.STAFF, 
      workLocation: 'HEAD_OFFICE', requiresCheckOutLocation: true, dateOfBirth: '',
      customLat: 0, customLng: 0, customRadius: 200, customLocName: '',
      hasSecondLoc: false, customLat2: 0, customLng2: 0, customRadius2: 200, customLocName2: ''
    });
  };

  const toggleExpand = (staffId: string) => {
    setExpandedStaffId(prev => prev === staffId ? null : staffId);
  };

  const openEdit = (staff: Staff) => {
    if (isStaff && staff.name !== currentUser) return;
    setEditingStaff(staff);
    setFormData({ 
      name: staff.name, 
      staffId: staff.staffId, 
      designation: staff.designation,
      mobile: staff.mobile || '',
      basicSalary: staff.basicSalary || 0,
      password: staff.password || '',
      photo: staff.photo || '',
      role: staff.role || UserRole.STAFF,
      workLocation: staff.workLocation || 'HEAD_OFFICE',
      requiresCheckOutLocation: staff.requiresCheckOutLocation !== undefined ? staff.requiresCheckOutLocation : true,
      dateOfBirth: staff.dateOfBirth || '',
      // Loc 1
      customLat: staff.customLocation?.lat || 0,
      customLng: staff.customLocation?.lng || 0,
      customRadius: staff.customLocation?.radius || 200,
      customLocName: staff.customLocation?.name || '',
      // Loc 2
      hasSecondLoc: !!staff.secondaryCustomLocation,
      customLat2: staff.secondaryCustomLocation?.lat || 0,
      customLng2: staff.secondaryCustomLocation?.lng || 0,
      customRadius2: staff.secondaryCustomLocation?.radius || 200,
      customLocName2: staff.secondaryCustomLocation?.name || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    if (isStaff) return;
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setStaffList(prev => prev.map(s => s && s.id === deleteConfirmId ? { ...s, deletedAt: new Date().toISOString() } : s));
      setDeleteConfirmId(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_SIZE = 300;
          let width = img.width;
          let height = img.height;
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setFormData(prev => ({ ...prev, photo: dataUrl }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrentLocation = (slot: 1 | 2) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (slot === 1) {
          setFormData(prev => ({
            ...prev,
            customLat: position.coords.latitude,
            customLng: position.coords.longitude
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            customLat2: position.coords.latitude,
            customLng2: position.coords.longitude
          }));
        }
        alert(`Location ${slot} Set: ${position.coords.latitude}, ${position.coords.longitude}`);
      },
      (error) => {
        alert("Unable to retrieve location. Please allow location access.");
      }
    );
  };

  // Logic Functions
  const handleGivePoints = (e: React.FormEvent) => { e.preventDefault(); if (!canManageMoney || !onUpdatePoints) return; const points = Number(giftPointData.points); if (points < 1) return alert("পয়েন্ট ১ এর বেশি হতে হবে।"); if (pointMode === 'PENALTY') { setIsGiftPointModalOpen(false); setTimeout(() => setShowPenaltyConfirm(true), 200); return; } onUpdatePoints(giftPointData.staffId, points, 'ADMIN_REWARD'); setIsGiftPointModalOpen(false); alert('পয়েন্ট প্রদান সফল হয়েছে! 🎉'); };
  const executePenalty = () => { if (!onUpdatePoints) return; const points = Number(giftPointData.points); onUpdatePoints(giftPointData.staffId, -points, 'ADMIN_PENALTY'); setShowPenaltyConfirm(false); setTimeout(() => alert('পয়েন্ট পেনাল্টি কার্যকর হয়েছে (পয়েন্ট কাটা হয়েছে)।'), 100); };
  const openGiftModal = (staffId: string) => { setPointMode('GIFT'); setGiftPointData({ staffId, points: 5 }); setIsGiftPointModalOpen(true); };
  const openAdvanceModal = (staffId: string) => { setAdvanceFormData({ staffId, amount: 0, note: '', date: new Date().toISOString().split('T')[0], type: 'REGULAR' }); setIsAdvanceModalOpen(true); };
  const openRepayModal = (staffId: string) => { setRepayFormData({ staffId, amount: 0, note: 'Salary Adjustment', date: new Date().toISOString().split('T')[0], type: 'SALARY' }); setIsRepayModalOpen(true); };
  const handleGiveAdvance = (e: React.FormEvent) => { e.preventDefault(); if (!canManageMoney) return; if (Number(advanceFormData.amount) <= 0) return alert("দয়া করে সঠিক টাকার পরিমাণ লিখুন (০ এর বেশি)।"); const staff = (staffList || []).find(s => s.id === advanceFormData.staffId); if (!staff) return; const submitDate = new Date(advanceFormData.date); const now = new Date(); submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds()); const newAdvance: AdvanceLog = { id: Math.random().toString(36).substr(2, 9), staffId: staff.id, staffName: staff.name, amount: Number(advanceFormData.amount), note: advanceFormData.note || '', date: submitDate.toISOString(), givenBy: currentUser || 'Admin', isDeleted: false, type: advanceFormData.type }; setAdvances(prev => [...prev, newAdvance]); setIsAdvanceModalOpen(false); alert(`${staff.name}-কে ৳${newAdvance.amount} অগ্রীম দেওয়া হয়েছে।`); };
  const handleRepay = (e: React.FormEvent) => { e.preventDefault(); if (!canManageMoney) return; if (Number(repayFormData.amount) <= 0) return alert("টাকার পরিমাণ ০ এর বেশি হতে হবে।"); const staff = (staffList || []).find(s => s.id === repayFormData.staffId); if (!staff) return; const submitDate = new Date(repayFormData.date); const now = new Date(); submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds()); const adjustmentType = repayFormData.type === 'SALARY' ? 'SALARY' : 'REGULAR'; const notePrefix = adjustmentType === 'SALARY' ? '[SALARY ADJ]' : '[REGULAR ADJ]'; const newEntry: AdvanceLog = { id: Math.random().toString(36).substr(2, 9), staffId: staff.id, staffName: staff.name, amount: -Number(repayFormData.amount), note: `${notePrefix} ${repayFormData.note}`, date: submitDate.toISOString(), givenBy: currentUser || 'Admin', isDeleted: false, type: adjustmentType }; setAdvances(prev => [...prev, newEntry]); setIsRepayModalOpen(false); alert(`${staff.name}-এর ${adjustmentType === 'SALARY' ? 'বেতন' : 'রেগুলার হিসাব'} থেকে ৳${repayFormData.amount} সমন্বয় করা হয়েছে।`); };
  
  // Filter Logic
  const clearFilters = () => { setSearchTerm(''); setStartDate(''); setEndDate(''); setSortBy('newest'); };
  const filteredStaff = useMemo(() => { let result = (staffList || []).filter(s => { if (!s || s.deletedAt) return false; if (isStaff && s.name !== currentUser) return false; const searchLower = searchTerm.toLowerCase(); const matchesSearch = (s.name || '').toLowerCase().includes(searchLower) || (s.staffId || '').toLowerCase().includes(searchLower) || (s.mobile && s.mobile.includes(searchLower)) || (s.designation || '').toLowerCase().includes(searchLower); const createdAt = new Date(s.createdAt).setHours(0, 0, 0, 0); const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null; const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null; const matchesDate = (!start || createdAt >= start) && (!end || createdAt <= end); return matchesSearch && matchesDate; }); if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); else if (sortBy === 'name') result.sort((a, b) => (a.name || '').localeCompare(b.name || '')); else if (sortBy === 'salary') result.sort((a, b) => (b.basicSalary || 0) - (a.basicSalary || 0)); return result; }, [staffList, searchTerm, startDate, endDate, sortBy, isStaff, currentUser]);
  const stats = { total: (staffList || []).filter(s => s && !s.deletedAt).length, active: (staffList || []).filter(s => s && !s.deletedAt && s.status === 'ACTIVE').length, inactive: (staffList || []).filter(s => s && !s.deletedAt && s.status === 'DEACTIVATED').length };
  const getStaffFinancials = (staffId: string) => { const safeExpenses = expenses || []; const safeAdvances = advances || []; const staffExpenses = safeExpenses.filter(e => e && e.staffId === staffId && !e.isDeleted); const approved = staffExpenses.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount || 0), 0); const staffAdvances = safeAdvances.filter(a => a && a.staffId === staffId && !a.isDeleted); const totalRegularAdv = staffAdvances.filter(a => a.type !== 'SALARY').reduce((sum, a) => sum + Number(a.amount || 0), 0); const totalSalaryAdv = staffAdvances.filter(a => a.type === 'SALARY').reduce((sum, a) => sum + Number(a.amount || 0), 0); const balance = totalRegularAdv - approved; return { balance, totalRegularAdv, totalSalaryAdv, approved }; };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            স্টাফ কন্ট্রোল সেন্টার
          </h2>
          <p className="text-xs text-gray-500 font-medium ml-8">ম্যানেজ করুন এবং মনিটর করুন</p>
        </div>
        {role === UserRole.ADMIN && (
          <button onClick={() => setIsModalOpen(true)} className="group relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 flex items-center gap-2">
            <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
            <UserPlus className="w-4 h-4 relative z-10" /> 
            <span className="relative z-10 text-sm">নতুন স্টাফ</span>
          </button>
        )}
      </div>

      {!isStaff && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800/60 dark:backdrop-blur-md p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><Users className="w-6 h-6" /></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">মোট স্টাফ</p><p className="text-2xl font-black text-gray-800 dark:text-white">{stats.total}</p></div>
          </div>
          <div className="bg-white dark:bg-gray-800/60 dark:backdrop-blur-md p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl text-green-600"><UserCheck className="w-6 h-6" /></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">সক্রিয় (Active)</p><p className="text-2xl font-black text-gray-800 dark:text-white">{stats.active}</p></div>
          </div>
          <div className="bg-white dark:bg-gray-800/60 dark:backdrop-blur-md p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex items-center gap-4">
            <div className="bg-gray-100 p-3 rounded-xl text-gray-500"><UserX className="w-6 h-6" /></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">নিষ্ক্রিয় (Inactive)</p><p className="text-2xl font-black text-gray-800 dark:text-white">{stats.inactive}</p></div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col md:flex-row items-center gap-2 mb-6">
        <div className="relative flex-1 w-full group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="নাম, আইডি বা পদবী দিয়ে খুঁজুন..." 
            className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-400 outline-none" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {!isStaff && (
            <div className="relative w-full md:w-48 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ArrowUpDown className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <select 
                className="block w-full pl-9 pr-8 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all appearance-none cursor-pointer outline-none"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">নতুন সর্ট (Newest)</option>
                <option value="oldest">পুরানো সর্ট (Oldest)</option>
                <option value="name">নাম (A-Z)</option>
                <option value="salary">বেতন (High-Low)</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><ChevronDown className="h-3 w-3 text-gray-400" /></div>
            </div>
          )}
          <button onClick={clearFilters} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 border border-transparent hover:border-red-100" title="রিসেট"><FilterX className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredStaff.map((staff) => {
          if (!staff) return null;
          const { balance, totalSalaryAdv, totalRegularAdv, approved } = getStaffFinancials(staff.id);
          const safeName = staff.name || 'Unknown';
          const safeId = staff.staffId || 'N/A';
          const isActive = staff.status === 'ACTIVE';
          const joinDate = new Date(staff.createdAt).toLocaleDateString('bn-BD', { month: 'short', year: 'numeric' });
          const isExpanded = expandedStaffId === staff.id;

          return (
            <div id={`staff-card-${staff.id}`} key={staff.id} className={`group relative transition-all duration-500 ease-in-out z-0 ${isExpanded ? 'col-span-2 md:col-span-3 lg:col-span-3 row-span-2 z-10' : 'col-span-1 z-0'}`}>
                {isExpanded ? (
                   <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden h-full animate-in fade-in zoom-in duration-300 flex flex-col">
                      <div className={`h-28 w-full relative shrink-0 ${isActive ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-gray-700'}`}>
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                          <button onClick={(e) => { e.stopPropagation(); toggleExpand(staff.id); }} className="absolute top-3 right-3 bg-black/30 hover:bg-white/20 text-white p-1.5 rounded-full transition-all backdrop-blur-md z-20 border border-white/20"><Minimize2 className="w-5 h-5" /></button>
                          <div className="absolute top-4 left-5 flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-md border border-white/30 shadow-sm flex items-center gap-1`}>
                                  {staff.role === UserRole.MD ? <Crown className="w-3 h-3 text-yellow-300" /> : <Users className="w-3 h-3" />} {staff.role === UserRole.KIOSK ? 'KIOSK' : staff.role}
                              </span>
                              {staff.workLocation === 'FIELD' && <span className="text-[10px] font-bold text-white bg-orange-500/80 px-2 py-0.5 rounded border border-white/20">FIELD</span>}
                          </div>
                      </div>
                      <div className="px-6 flex flex-col md:flex-row gap-5 -mt-10 relative z-10">
                          <div className="relative shrink-0 group/avatar">
                              <div className={`w-28 h-28 rounded-2xl border-[4px] border-white dark:border-gray-800 shadow-2xl overflow-hidden bg-white relative ${isActive ? '' : 'grayscale'}`}>
                                  {staff.photo ? <img src={staff.photo} alt={safeName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-4xl font-black">{safeName.charAt(0)}</div>}
                              </div>
                              <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                          </div>
                          <div className="pt-12 md:pt-11 flex-1">
                              <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">{safeName}</h2>
                              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">{staff.designation}</p>
                              <div className="flex flex-wrap gap-2">
                                 <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-gray-200 dark:border-gray-600">{safeId}</span>
                                 <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-500 text-yellow-600" /> {formatPoints(staff.points || 0)} pts</span>
                              </div>
                          </div>
                      </div>
                      <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                          <div onClick={(e) => { e.stopPropagation(); setHistoryStaff(staff); }} className="w-full bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group/card border border-white/5 cursor-pointer hover:scale-[1.01] transition-transform duration-300 hover:shadow-2xl" title="Click to view full history">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover/card:bg-white/10 transition-all duration-500"></div>
                              <div className="flex justify-between items-start mb-8 relative z-10">
                                  <div className="flex items-center gap-2 opacity-80"><div className="p-2 bg-white/10 rounded-lg backdrop-blur-md"><CreditCard className="w-5 h-5 text-indigo-300" /></div><div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 block">Current Balance</span><span className="text-[8px] font-bold text-gray-400">Real-time Data • Click for History</span></div></div>
                                  <div className="text-right"><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Status</p><span className={`px-2 py-0.5 rounded text-[10px] font-black border ${balance < 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{balance < 0 ? 'PAYABLE' : 'CASH IN HAND'}</span></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 relative z-10">
                                  <div className="flex flex-col"><p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Total Balance</p>{formatCurrency(balance)}</div>
                                  <div className="flex flex-col"><p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Regular Adv</p>{formatCurrencyLight(totalRegularAdv, 'text-blue-300')}</div>
                                  <div className="flex flex-col"><p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Total Expense</p>{formatCurrencyLight(approved, 'text-red-300')}</div>
                                  <div className="flex flex-col"><p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Salary Adv</p>{formatCurrencyLight(totalSalaryAdv, 'text-purple-300')}</div>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3"><div className="bg-white dark:bg-gray-600 p-2 rounded-lg text-indigo-500 shadow-sm"><Phone className="w-4 h-4"/></div><div><p className="text-[9px] text-gray-400 font-bold uppercase">Contact</p><p className="text-xs font-bold text-gray-800 dark:text-gray-200">{staff.mobile || 'N/A'}</p></div></div>
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3"><div className="bg-white dark:bg-gray-600 p-2 rounded-lg text-pink-500 shadow-sm"><Cake className="w-4 h-4"/></div><div><p className="text-[9px] text-gray-400 font-bold uppercase">Birthday</p><p className="text-xs font-bold text-gray-800 dark:text-gray-200">{staff.dateOfBirth ? new Date(staff.dateOfBirth).toLocaleDateString('bn-BD', {day:'numeric', month:'short'}) : 'N/A'}</p></div></div>
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3"><div className="bg-white dark:bg-gray-600 p-2 rounded-lg text-blue-500 shadow-sm"><Calendar className="w-4 h-4"/></div><div><p className="text-[9px] text-gray-400 font-bold uppercase">Joined</p><p className="text-xs font-bold text-gray-800 dark:text-gray-200">{joinDate}</p></div></div>
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3"><div className="bg-white dark:bg-gray-600 p-2 rounded-lg text-orange-500 shadow-sm"><Laptop className="w-4 h-4"/></div><div><p className="text-[9px] text-gray-400 font-bold uppercase">Device</p><p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[100px]" title={staff.lastDevice}>{staff.lastDevice || 'Unknown'}</p></div></div>
                          </div>
                          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                             <div className="flex gap-2 justify-between">
                                <button onClick={(e) => { e.stopPropagation(); openEdit(staff); }} className="flex-1 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-600 hover:text-white text-gray-600 dark:text-gray-300 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"><Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform" /><span className="text-[9px] font-bold">EDIT</span></button>
                                <button onClick={(e) => { e.stopPropagation(); setHistoryStaff(staff); }} className="flex-1 bg-gray-50 dark:bg-gray-700 hover:bg-gray-800 hover:text-white text-gray-600 dark:text-gray-300 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"><History className="w-4 h-4 group-hover:scale-110 transition-transform" /><span className="text-[9px] font-bold">HISTORY</span></button>
                                {canManageMoney && (
                                   <>
                                      <button onClick={(e) => { e.stopPropagation(); openAdvanceModal(staff.id); }} className="flex-1 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"><Banknote className="w-4 h-4 group-hover:scale-110 transition-transform" /><span className="text-[9px] font-bold">ADVANCE</span></button>
                                      <button onClick={(e) => { e.stopPropagation(); openRepayModal(staff.id); }} className="flex-1 bg-green-50 dark:bg-green-900/20 hover:bg-green-600 hover:text-white text-green-600 dark:text-green-400 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"><WalletCards className="w-4 h-4 group-hover:scale-110 transition-transform" /><span className="text-[9px] font-bold">ADJUST</span></button>
                                      <button onClick={(e) => { e.stopPropagation(); openGiftModal(staff.id); }} className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-500 hover:text-white text-yellow-600 dark:text-yellow-400 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"><Gift className="w-4 h-4 group-hover:scale-110 transition-transform" /><span className="text-[9px] font-bold">POINTS</span></button>
                                   </>
                                )}
                                {!isStaff && role === UserRole.ADMIN && (
                                   <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(staff.id); }} className="flex-1 bg-red-50 dark:bg-red-900/20 hover:bg-red-600 hover:text-white text-red-500 dark:text-red-400 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group"><Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /><span className="text-[9px] font-bold">DELETE</span></button>
                                )}
                             </div>
                          </div>
                      </div>
                   </div>
                ) : (
                   <div onClick={() => toggleExpand(staff.id)} className={`h-full bg-white dark:bg-gray-800 rounded-2xl p-4 cursor-pointer relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border ${isActive ? 'border-gray-100 dark:border-gray-700' : 'border-gray-100 dark:border-gray-700 opacity-80'}`}>
                      {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>}
                      <div className="flex flex-col items-center text-center h-full justify-center gap-3 relative z-10">
                         <div className="relative">
                            {staff.photo ? <img src={staff.photo} alt={safeName} className={`w-16 h-16 rounded-full object-cover border-2 shadow-md ${isActive ? 'border-white ring-2 ring-green-100 dark:ring-green-900' : 'border-gray-200 grayscale'}`} /> : <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md ${isActive ? 'bg-gradient-to-br from-indigo-400 to-violet-500' : 'bg-gray-400'}`}>{safeName.charAt(0)}</div>}
                            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                         </div>
                         <div>
                            <h4 className="text-sm font-black text-gray-800 dark:text-white truncate max-w-[140px] leading-tight">{safeName}</h4>
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 truncate max-w-[140px]">{staff.designation}</p>
                            <span className="text-[9px] text-gray-400 font-mono mt-1 block">{safeId}</span>
                         </div>
                         {staff.role !== UserRole.STAFF && <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${staff.role === UserRole.MD ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{staff.role}</span>}
                      </div>
                   </div>
                )}
            </div>
          );
        })}
      </div>
      
      {/* Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white shrink-0">
              <h3 className="font-bold text-xl">{editingStaff ? 'প্রোফাইল আপডেট' : 'নতুন ইউজার যুক্ত করুন'}</h3>
              <button onClick={closeModal} className="p-1 text-indigo-200 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center">
                 <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-full border-4 border-indigo-50 flex items-center justify-center cursor-pointer hover:border-indigo-200 overflow-hidden relative group shadow-lg">
                   <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
                   {formData.photo ? (
                     <>
                       <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-6 h-6 text-white" /></div>
                     </>
                   ) : (
                     <div className="text-center p-2"><Camera className="w-6 h-6 text-gray-300 mx-auto mb-1" /><span className="text-[10px] text-gray-400 font-bold">ছবি দিন</span></div>
                   )}
                 </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                
                {/* Section: Personal Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">ব্যক্তিগত তথ্য (Personal Info)</h4>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">পুরো নাম <span className="text-red-500">*</span></label>
                    <input required type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold placeholder:text-gray-400" disabled={isStaff || editingStaff?.name === currentUser} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="স্টাফের নাম লিখুন" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">মোবাইল নাম্বার</label>
                      <input type="tel" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} placeholder="017..." />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">জন্ম তারিখ</label>
                      <div className="relative">
                         <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <input 
                           type="date" 
                           className={`w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`}
                           disabled={isStaff}
                           value={formData.dateOfBirth} 
                           onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} 
                         />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Job Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">চাকরি ও বেতন (Job Details)</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">স্টাফ আইডি <span className="text-red-500">*</span></label>
                      <input required type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold" disabled={isStaff} value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} placeholder="ID-00X" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">পদবী (Designation) <span className="text-red-500">*</span></label>
                      <input required type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold" disabled={isStaff} value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} placeholder="পদবী লিখুন" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">বেসিক স্যালারি</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                        <input type="number" className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold" disabled={isStaff} value={formData.basicSalary || ''} onChange={(e) => setFormData({...formData, basicSalary: Number(e.target.value)})} placeholder="0" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">অ্যাক্সেস লেভেল (Role)</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <select 
                          className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold appearance-none"
                          disabled={isStaff}
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                        >
                          <option value={UserRole.STAFF}>Normal Staff</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                          <option value={UserRole.MD}>MD (Super Admin)</option>
                          <option value={UserRole.KIOSK}>Kiosk / Factory Device</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Work Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">লোকেশন ও উপস্থিতি (Work Config)</h4>
                  </div>

                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">কাজের ধরণ / লোকেশন</label>
                        <div className="relative">
                           <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <select 
                             className="w-full pl-9 pr-4 py-2.5 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold appearance-none"
                             disabled={isStaff}
                             value={formData.workLocation}
                             onChange={(e) => setFormData({...formData, workLocation: e.target.value as any})}
                           >
                              <option value="HEAD_OFFICE">হেড অফিস (ফিক্সড)</option>
                              <option value="FACTORY">ফ্যাক্টরি (ফিক্সড)</option>
                              <option value="FIELD">ফিল্ড ওয়ার্ক (কোনো লোকেশন নেই)</option>
                              <option value="CUSTOM">কাস্টম লোকেশন (ম্যাপ সেটআপ)</option>
                           </select>
                           <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>
                     </div>

                     {/* Custom Location Inputs */}
                     {formData.workLocation === 'CUSTOM' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 pt-2">
                           {/* Location 1 */}
                           <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                              <div className="flex justify-between items-center mb-2 border-b border-gray-50 pb-2">
                                 <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3" /> Primary Location</p>
                                 <button type="button" onClick={() => getCurrentLocation(1)} className="text-[10px] font-bold text-white bg-indigo-500 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-indigo-600 transition-colors shadow-sm shadow-indigo-200"><LocateFixed className="w-3 h-3"/> Get Current</button>
                              </div>
                              <div className="space-y-2">
                                 <input type="text" placeholder="Location Name (e.g. Uttara Office)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:border-indigo-300 outline-none" value={formData.customLocName} onChange={e => setFormData({...formData, customLocName: e.target.value})} />
                                 <div className="grid grid-cols-2 gap-2">
                                    <input type="number" placeholder="Lat" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono" value={formData.customLat} onChange={e => setFormData({...formData, customLat: Number(e.target.value)})} />
                                    <input type="number" placeholder="Lng" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono" value={formData.customLng} onChange={e => setFormData({...formData, customLng: Number(e.target.value)})} />
                                 </div>
                                 <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Radius (Meter)</span>
                                    <input type="number" className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-bold text-center" value={formData.customRadius} onChange={e => setFormData({...formData, customRadius: Number(e.target.value)})} />
                                 </div>
                              </div>
                           </div>

                           {/* Add Second Location Toggle */}
                           <div className="flex items-center gap-2 pl-1">
                              <div className="relative flex items-center">
                                <input type="checkbox" id="hasSecondLoc" className="peer w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" checked={formData.hasSecondLoc} onChange={e => setFormData({...formData, hasSecondLoc: e.target.checked})} />
                                <label htmlFor="hasSecondLoc" className="ml-2 text-xs font-bold text-gray-700 cursor-pointer select-none">২য় লোকেশন যুক্ত করুন (Optional)</label>
                              </div>
                           </div>

                           {/* Location 2 */}
                           {formData.hasSecondLoc && (
                              <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm animate-in fade-in">
                                 <div className="flex justify-between items-center mb-2 border-b border-gray-50 pb-2">
                                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3" /> Secondary Location</p>
                                    <button type="button" onClick={() => getCurrentLocation(2)} className="text-[10px] font-bold text-white bg-purple-500 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-purple-600 transition-colors shadow-sm shadow-purple-200"><LocateFixed className="w-3 h-3"/> Get Current</button>
                                 </div>
                                 <div className="space-y-2">
                                    <input type="text" placeholder="Location Name (e.g. Mirpur Branch)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium focus:border-purple-300 outline-none" value={formData.customLocName2} onChange={e => setFormData({...formData, customLocName2: e.target.value})} />
                                    <div className="grid grid-cols-2 gap-2">
                                       <input type="number" placeholder="Lat" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono" value={formData.customLat2} onChange={e => setFormData({...formData, customLat2: Number(e.target.value)})} />
                                       <input type="number" placeholder="Lng" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-mono" value={formData.customLng2} onChange={e => setFormData({...formData, customLng2: Number(e.target.value)})} />
                                    </div>
                                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                       <span className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Radius (Meter)</span>
                                       <input type="number" className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-bold text-center" value={formData.customRadius2} onChange={e => setFormData({...formData, customRadius2: Number(e.target.value)})} />
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                     )}

                     <div className="flex items-center gap-3 pt-2 border-t border-indigo-100/50">
                        <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 cursor-pointer ${formData.requiresCheckOutLocation ? 'bg-indigo-500' : 'bg-gray-300'}`} onClick={() => !isStaff && setFormData({...formData, requiresCheckOutLocation: !formData.requiresCheckOutLocation})}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${formData.requiresCheckOutLocation ? 'left-4.5' : 'left-0.5'}`}></div>
                        </div>
                        <label className="text-xs font-bold text-gray-700 cursor-pointer select-none" onClick={() => !isStaff && setFormData({...formData, requiresCheckOutLocation: !formData.requiresCheckOutLocation})}>চেক-আউট এর সময় লোকেশন চেক বাধ্যতামূলক?</label>
                     </div>
                  </div>
                </div>

                {/* Section: Security */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">সিকিউরিটি (Security)</h4>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-700 mb-1">লগইন পাসওয়ার্ড</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder={editingStaff ? "পরিবর্তন করতে চাইলে লিখুন" : "Default: নাম@ (উদা: রহিম@)"} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5 ml-1">* ডিফল্ট পাসওয়ার্ড সাধারণত নামের সাথে @ যুক্ত করে হয়।</p>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-gray-100 mt-6">
                  <button type="button" onClick={closeModal} className="flex-1 py-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all">বাতিল</button>
                  <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                    {editingStaff ? <><Edit3 className="w-4 h-4" /> আপডেট করুন</> : <><UserPlus className="w-4 h-4" /> সেভ করুন</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                আপনি এই স্টাফ মেম্বারকে ডিলিট করতে চাচ্ছেন। এটি রিসাইকেল বিনে জমা হবে।
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
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
        </div>
      )}

      {/* ADVANCE MODAL */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6">
             <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">অ্যাডভান্স দিন</h3>
             <form onSubmit={handleGiveAdvance} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">টাকার পরিমাণ</label>
                   <input required type="number" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={advanceFormData.amount || ''} onChange={e => setAdvanceFormData({...advanceFormData, amount: Number(e.target.value)})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">নোট/কারণ</label>
                   <input className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={advanceFormData.note} onChange={e => setAdvanceFormData({...advanceFormData, note: e.target.value})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">ধরণ</label>
                   <select className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={advanceFormData.type} onChange={e => setAdvanceFormData({...advanceFormData, type: e.target.value as any})}>
                      <option value="REGULAR">সাধারণ অগ্রিম</option>
                      <option value="SALARY">বেতন অগ্রিম</option>
                   </select>
                </div>
                <div className="flex gap-2 pt-2">
                   <button type="button" onClick={() => setIsAdvanceModalOpen(false)} className="flex-1 py-2 border rounded-lg text-gray-600 dark:text-gray-300">বাতিল</button>
                   <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">কনফার্ম</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* REPAY MODAL */}
      {isRepayModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6">
             <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">টাকা সমন্বয় (Adjustment)</h3>
             <form onSubmit={handleRepay} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">টাকার পরিমাণ</label>
                   <input required type="number" className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={repayFormData.amount || ''} onChange={e => setRepayFormData({...repayFormData, amount: Number(e.target.value)})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">বিবরণ</label>
                   <input className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={repayFormData.note} onChange={e => setRepayFormData({...repayFormData, note: e.target.value})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">কোন খাত থেকে?</label>
                   <select className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={repayFormData.type} onChange={e => setRepayFormData({...repayFormData, type: e.target.value as any})}>
                      <option value="SALARY">বেতন থেকে</option>
                      <option value="REGULAR">রেগুলার ব্যালেন্স থেকে</option>
                   </select>
                </div>
                <div className="flex gap-2 pt-2">
                   <button type="button" onClick={() => setIsRepayModalOpen(false)} className="flex-1 py-2 border rounded-lg text-gray-600 dark:text-gray-300">বাতিল</button>
                   <button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">সমন্বয় করুন</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* GIFT POINTS MODAL */}
      {isGiftPointModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
             <div className="mb-4">
                <Gift className="w-12 h-12 text-yellow-500 mx-auto" />
             </div>
             <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">বোনাস পয়েন্ট দিন</h3>
             <form onSubmit={handleGivePoints} className="space-y-4">
                <input required type="number" className="w-full p-3 border rounded-xl text-center text-2xl font-bold dark:bg-gray-900 dark:border-gray-700 dark:text-white" value={giftPointData.points} onChange={e => setGiftPointData({...giftPointData, points: Number(e.target.value)})} />
                <div className="flex gap-2">
                   <button type="button" onClick={() => setIsGiftPointModalOpen(false)} className="flex-1 py-2 border rounded-lg text-gray-500 dark:text-gray-400">বাতিল</button>
                   <button type="submit" onClick={() => setPointMode('GIFT')} className="flex-1 py-2 bg-yellow-500 text-white rounded-lg font-bold">পয়েন্ট দিন</button>
                </div>
                <button type="button" onClick={() => { setPointMode('PENALTY'); handleGivePoints({ preventDefault: () => {} } as any); }} className="text-xs text-red-500 hover:underline">পয়েন্ট কাটুন (Penalty)</button>
             </form>
          </div>
        </div>
      )}

      {/* PENALTY CONFIRMATION MODAL */}
      {showPenaltyConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
             <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">পেনাল্টি কনফার্মেশন</h3>
             <p className="text-sm text-gray-500 mb-4">আপনি কি নিশ্চিত যে {giftPointData.points} পয়েন্ট কেটে নিতে চান?</p>
             <div className="flex gap-3">
                <button onClick={() => setShowPenaltyConfirm(false)} className="flex-1 py-2 border rounded-lg">না</button>
                <button onClick={executePenalty} className="flex-1 py-2 bg-red-600 text-white rounded-lg">হ্যাঁ, কেটে নিন</button>
             </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL (Showing full transaction list) */}
      {historyStaff && createPortal(
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setHistoryStaff(null)}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()} style={{ fontFamily: "'Noto Sans Bengali', sans-serif" }}>
               <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl flex justify-between items-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50"></div>
                  <div className="relative z-10 flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white dark:border-gray-800">
                        {historyStaff.name.charAt(0)}
                     </div>
                     <div>
                        <h3 className="font-black text-gray-900 dark:text-white text-xl leading-tight">{historyStaff.name}</h3>
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{historyStaff.designation}</p>
                     </div>
                  </div>
                  <button onClick={() => setHistoryStaff(null)} className="relative z-10 p-2 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all shadow-sm border border-gray-200 dark:border-gray-600 active:scale-95"><X className="w-5 h-5 text-gray-600 dark:text-gray-300"/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/50 dark:bg-gray-800/50">
                  {/* Financial Summary Card */}
                  {(() => {
                      const { balance, totalSalaryAdv, totalRegularAdv, approved } = getStaffFinancials(historyStaff.id);
                      return (
                          <div className="w-full bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group/card border border-white/5 mb-6">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover/card:bg-white/10 transition-all duration-500"></div>
                              <div className="flex justify-between items-start mb-8 relative z-10">
                                  <div className="flex items-center gap-2 opacity-80"><div className="p-2 bg-white/10 rounded-lg backdrop-blur-md"><CreditCard className="w-5 h-5 text-indigo-300" /></div><div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 block">Current Balance</span><span className="text-[8px] font-bold text-gray-400">Real-time Data</span></div></div>
                                  <div className="text-right"><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Status</p><span className={`px-2 py-0.5 rounded text-[10px] font-black border ${balance < 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>{balance < 0 ? 'PAYABLE' : 'CASH IN HAND'}</span></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 relative z-10">
                                  <div className="flex flex-col"><p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Total Balance</p>{formatCurrency(balance)}</div>
                                  <div className="flex flex-col"><p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Regular Adv</p>{formatCurrencyLight(totalRegularAdv, 'text-blue-300')}</div>
                                  <div className="flex flex-col"><p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Total Expense</p>{formatCurrencyLight(approved, 'text-red-300')}</div>
                                  <div className="flex flex-col"><p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Salary Adv</p>{formatCurrencyLight(totalSalaryAdv, 'text-purple-300')}</div>
                              </div>
                          </div>
                      );
                  })()}

                  <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <History className="w-4 h-4" /> Transaction History
                  </h4>

                  {/* Calculate Transactions */}
                  {(() => {
                     const staffExpenses = expenses.filter(e => e.staffId === historyStaff.id && !e.isDeleted).map(e => ({ ...e, type: 'EXPENSE', date: e.createdAt }));
                     const staffAdvances = advances.filter(a => a.staffId === historyStaff.id && !a.isDeleted).map(a => ({ ...a, type: 'ADVANCE', date: a.date }));
                     
                     const historyItems = [...staffExpenses, ...staffAdvances].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                     if (historyItems.length === 0) {
                        return (
                           <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                              <History className="w-10 h-10 mb-2 opacity-30" />
                              <p className="font-bold">কোনো লেনদেন রেকর্ড নেই</p>
                           </div>
                        );
                     }

                     return (
                        <div className="space-y-3">
                           {historyItems.map((item: any) => (
                              <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center hover:shadow-md transition-all duration-300 group">
                                 <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                       <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${item.type === 'EXPENSE' ? 'bg-orange-50 text-orange-600 border-orange-200' : (item.type === 'SALARY' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200')}`}>
                                          {item.type === 'EXPENSE' ? 'BILL' : (item.type === 'SALARY' ? 'SALARY ADV' : 'ADVANCE')}
                                       </span>
                                       <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(item.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.reason || item.note || 'No description'}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className={`text-base font-black tracking-tight ${item.type === 'EXPENSE' ? 'text-red-500' : 'text-emerald-600'}`}>
                                       ৳ {item.amount.toLocaleString('en-US')}
                                    </p>
                                    {item.type === 'EXPENSE' && (
                                       <span className={`text-[9px] font-black uppercase tracking-wider ${item.status === 'APPROVED' ? 'text-emerald-500' : item.status === 'REJECTED' ? 'text-red-500' : 'text-orange-500'}`}>
                                          {item.status}
                                       </span>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     );
                  })()}
               </div>
            </div>
         </div>,
         document.body
      )}

    </div>
  );
};

export default StaffManagementView;