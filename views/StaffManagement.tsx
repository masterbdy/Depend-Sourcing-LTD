import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, UserPlus, X, Calendar, FilterX, Phone, Banknote, Users, UserCheck, UserX, ArrowUpDown, ShieldCheck, ShieldAlert, Eye, EyeOff, Lock, Camera, Image as ImageIcon, Briefcase, Wallet, ArrowRight, Coins, Crown, UserCog, History, CalendarClock, MapPin, LocateFixed, Globe, ToggleLeft, ToggleRight, Map, MonitorSmartphone, Gift, Star, MoreVertical, WalletCards, AlertTriangle, CheckCircle, RotateCcw, TrendingDown, Maximize2, Minimize2, ChevronDown, Sparkles, CreditCard, ExternalLink } from 'lucide-react';
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
        // Timeout to allow expansion animation to start/render before scrolling
        setTimeout(() => {
            const element = document.getElementById(`staff-card-${highlightStaffId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
        
        if (setHighlightStaffId) {
            // Reset after a short delay to ensure effect runs
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
  const formatCurrency = (amount: number, isLarge: boolean = false) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount).toLocaleString('en-US');
    const textSize = isLarge ? 'text-2xl' : 'text-xl';
    
    return (
      <span className={`font-mono font-black tracking-tight ${textSize} ${isNegative ? 'text-red-400' : 'text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300'}`}>
        {isNegative && <span className="mr-1 text-red-400">-</span>}
        <span className={`font-sans font-bold opacity-70 mr-1 ${isLarge ? 'text-sm' : 'text-xs'} ${isNegative ? 'text-red-400' : 'text-indigo-200'}`}>৳</span>
        {absAmount}
      </span>
    );
  };

  const formatCurrencyLight = (amount: number, colorClass: string) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount).toLocaleString('en-US');
    
    return (
      <span className={`font-mono font-black text-xl tracking-tight ${colorClass}`}>
        {isNegative && <span className="mr-1">-</span>}
        <span className="font-sans font-bold opacity-60 mr-1 text-xs">৳</span>
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
      if (isStaff) return;
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
        luckyDrawCount: 0
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
      workLocation: 'HEAD_OFFICE', requiresCheckOutLocation: true,
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

  const requestStatusChange = (id: string, currentStatus: 'ACTIVE' | 'DEACTIVATED') => {
    if (isStaff) return;
    setStatusConfirmData({
        id,
        newStatus: currentStatus === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE'
    });
  };

  const confirmStatusChange = () => {
    if (statusConfirmData) {
       setStaffList(prev => prev.map(s => s && s.id === statusConfirmData.id ? { ...s, status: statusConfirmData.newStatus, updatedAt: new Date().toISOString() } : s));
       setStatusConfirmData(null);
    }
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

  const removePhoto = () => {
    if (window.confirm("আপনি কি নিশ্চিত যে এই ছবিটি মুছে ফেলতে চান?")) {
      setFormData(prev => ({ ...prev, photo: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGivePoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMoney) return;
    if (!onUpdatePoints) {
       alert("System Error: Points function missing.");
       return;
    }

    const points = Number(giftPointData.points);
    if (points < 1) {
      alert("পয়েন্ট ১ এর বেশি হতে হবে।");
      return;
    }
    
    // Logic: Gift sends positive value, Penalty sends negative value
    
    if (pointMode === 'PENALTY') {
        setIsGiftPointModalOpen(false); // Close the input modal
        setTimeout(() => setShowPenaltyConfirm(true), 200); // Open confirmation modal with delay
        return; // Important: Return to stop immediate execution
    }

    const pointsToApply = points;
    const reason = 'ADMIN_REWARD';

    onUpdatePoints(giftPointData.staffId, pointsToApply, reason);
    
    setIsGiftPointModalOpen(false);
    alert('পয়েন্ট প্রদান সফল হয়েছে! 🎉');
  };

  const executePenalty = () => {
      if (!onUpdatePoints) return;
      const points = Number(giftPointData.points);
      // Send negative points for penalty
      onUpdatePoints(giftPointData.staffId, -points, 'ADMIN_PENALTY');
      
      setShowPenaltyConfirm(false);
      // Small delay to ensure modal closes before alert
      setTimeout(() => alert('পয়েন্ট পেনাল্টি কার্যকর হয়েছে (পয়েন্ট কাটা হয়েছে)।'), 100);
  };

  const openGiftModal = (staffId: string) => {
    setPointMode('GIFT'); // Default to Gift
    setGiftPointData({ staffId, points: 5 });
    setIsGiftPointModalOpen(true);
  };

  const openAdvanceModal = (staffId: string) => {
    setAdvanceFormData({ 
      staffId, 
      amount: 0, 
      note: '',
      date: new Date().toISOString().split('T')[0],
      type: 'REGULAR'
    });
    setIsAdvanceModalOpen(true);
  };

  const openRepayModal = (staffId: string) => {
    setRepayFormData({
      staffId,
      amount: 0,
      note: 'Salary Adjustment',
      date: new Date().toISOString().split('T')[0],
      type: 'SALARY' // Default to salary
    });
    setIsRepayModalOpen(true);
  };

  const handleGiveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMoney) { alert("আপনার এই অ্যাকশন করার অনুমতি নেই।"); return; }
    if (Number(advanceFormData.amount) <= 0) { alert("দয়া করে সঠিক টাকার পরিমাণ লিখুন (০ এর বেশি)।"); return; }
    const staff = (staffList || []).find(s => s.id === advanceFormData.staffId);
    if (!staff) { alert("স্টাফ মেম্বার পাওয়া যাচ্ছে না। পেজটি রিফ্রেশ দিয়ে আবার চেষ্টা করুন।"); return; }
    const submitDate = new Date(advanceFormData.date);
    if (isNaN(submitDate.getTime())) { alert("তারিখ সঠিক নয়।"); return; }
    const now = new Date();
    submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    const newAdvance: AdvanceLog = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: staff.id,
      staffName: staff.name,
      amount: Number(advanceFormData.amount),
      note: advanceFormData.note || '',
      date: submitDate.toISOString(),
      givenBy: currentUser || 'Admin',
      isDeleted: false,
      type: advanceFormData.type
    };
    setAdvances(prev => [...prev, newAdvance]);
    setIsAdvanceModalOpen(false);
    alert(`${staff.name}-কে ৳${newAdvance.amount} অগ্রীম দেওয়া হয়েছে।`);
    setAdvanceFormData({ staffId: '', amount: 0, note: '', date: new Date().toISOString().split('T')[0], type: 'REGULAR' });
  };

  const handleRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMoney) return;
    if (Number(repayFormData.amount) <= 0) { alert("টাকার পরিমাণ ০ এর বেশি হতে হবে।"); return; }
    const staff = (staffList || []).find(s => s.id === repayFormData.staffId);
    if (!staff) return;
    const submitDate = new Date(repayFormData.date);
    const now = new Date();
    submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    
    // Tag the adjustment properly
    const adjustmentType = repayFormData.type === 'SALARY' ? 'SALARY' : 'REGULAR';
    const notePrefix = adjustmentType === 'SALARY' ? '[SALARY ADJ]' : '[REGULAR ADJ]';

    const newEntry: AdvanceLog = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: staff.id,
      staffName: staff.name,
      amount: -Number(repayFormData.amount),
      note: `${notePrefix} ${repayFormData.note}`,
      date: submitDate.toISOString(),
      givenBy: currentUser || 'Admin',
      isDeleted: false,
      type: adjustmentType
    };
    setAdvances(prev => [...prev, newEntry]);
    setIsRepayModalOpen(false);
    alert(`${staff.name}-এর ${adjustmentType === 'SALARY' ? 'বেতন' : 'রেগুলার হিসাব'} থেকে ৳${repayFormData.amount} সমন্বয় করা হয়েছে।`);
  };

  // ... (Filter and Stats Logic)
  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
  };

  const filteredStaff = useMemo(() => {
    let result = (staffList || []).filter(s => {
      if (!s) return false;
      if (s.deletedAt) return false;
      if (isStaff && s.name !== currentUser) return false;

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (s.name || '').toLowerCase().includes(searchLower) || 
        (s.staffId || '').toLowerCase().includes(searchLower) || 
        (s.mobile && s.mobile.includes(searchLower)) ||
        (s.designation || '').toLowerCase().includes(searchLower);

      const createdAt = new Date(s.createdAt).setHours(0, 0, 0, 0);
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
      const matchesDate = (!start || createdAt >= start) && (!end || createdAt <= end);

      return matchesSearch && matchesDate;
    });

    if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sortBy === 'name') result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sortBy === 'salary') result.sort((a, b) => (b.basicSalary || 0) - (a.basicSalary || 0));

    return result;
  }, [staffList, searchTerm, startDate, endDate, sortBy, isStaff, currentUser]);

  const stats = {
    total: (staffList || []).filter(s => s && !s.deletedAt).length,
    active: (staffList || []).filter(s => s && !s.deletedAt && s.status === 'ACTIVE').length,
    inactive: (staffList || []).filter(s => s && !s.deletedAt && s.status === 'DEACTIVATED').length
  };

  const getStaffFinancials = (staffId: string) => {
    const safeExpenses = expenses || [];
    const safeAdvances = advances || [];
    const staffExpenses = safeExpenses.filter(e => e && e.staffId === staffId && !e.isDeleted);
    const approved = staffExpenses.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const staffAdvances = safeAdvances.filter(a => a && a.staffId === staffId && !a.isDeleted);
    
    // Separate breakdown
    const totalRegularAdv = staffAdvances.filter(a => a.type !== 'SALARY').reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const totalSalaryAdv = staffAdvances.filter(a => a.type === 'SALARY').reduce((sum, a) => sum + Number(a.amount || 0), 0);

    // CHANGED: Hand Balance = Regular Advance - Approved Expenses
    // Salary Advance is tracked separately
    const balance = totalRegularAdv - approved;
    return { balance, totalRegularAdv, totalSalaryAdv, approved };
  };

  return (
    <div className="space-y-6">
      {/* ... (Header, Stats, Filters remain same) ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">স্টাফ কন্ট্রোল সেন্টার (Staff Control Center)</h2>
        {!isStaff && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95">
            <UserPlus className="w-5 h-5" /> নতুন স্টাফ যোগ করুন
          </button>
        )}
      </div>

      {!isStaff && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <div className="bg-white dark:bg-gray-800/60 dark:backdrop-blur-md p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">খুঁজুন (নাম/আইডি/পদবী)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-gray-800 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {!isStaff && (
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">সর্টিং (Sort By)</label>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select 
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold appearance-none cursor-pointer text-gray-700 dark:text-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">নতুন যোগ (Newest)</option>
                <option value="oldest">পুরানো (Oldest)</option>
                <option value="name">নাম (Name A-Z)</option>
                <option value="salary">বেতন (High-Low)</option>
              </select>
            </div>
          </div>
        )}
        <button 
          onClick={clearFilters}
          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-800"
          title="Reset Filters"
        >
          <FilterX className="w-5 h-5" />
        </button>
      </div>

      {/* ULTRA PREMIUM GRID VIEW */}
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
            <div 
               id={`staff-card-${staff.id}`}
               key={staff.id} 
               className={`group relative transition-all duration-500 ease-in-out z-0 ${isExpanded ? 'col-span-2 md:col-span-3 lg:col-span-3 row-span-2 z-10' : 'col-span-1 z-0'}`}
            >
                {/* --- EXPANDED VIEW (Dashboard Style) --- */}
                {isExpanded ? (
                   <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden h-full animate-in fade-in zoom-in duration-300 flex flex-col">
                      
                      {/* Premium Header */}
                      <div className={`h-28 w-full relative shrink-0 ${isActive ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : 'bg-gray-700'}`}>
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          
                          <button 
                             onClick={(e) => { e.stopPropagation(); toggleExpand(staff.id); }} 
                             className="absolute top-3 right-3 bg-black/30 hover:bg-white/20 text-white p-1.5 rounded-full transition-all backdrop-blur-md z-20 border border-white/20"
                             title="Minimize"
                          >
                             <Minimize2 className="w-5 h-5" />
                          </button>

                          <div className="absolute top-4 left-5 flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-md border border-white/30 shadow-sm flex items-center gap-1`}>
                                  {staff.role === UserRole.MD ? <Crown className="w-3 h-3 text-yellow-300" /> : <Users className="w-3 h-3" />}
                                  {staff.role === UserRole.KIOSK ? 'KIOSK' : staff.role}
                              </span>
                              {staff.workLocation === 'FIELD' && <span className="text-[10px] font-bold text-white bg-orange-500/80 px-2 py-0.5 rounded border border-white/20">FIELD</span>}
                          </div>
                      </div>

                      {/* Overlapping Content */}
                      <div className="px-6 flex flex-col md:flex-row gap-5 -mt-10 relative z-10">
                          {/* Avatar */}
                          <div className="relative shrink-0 group/avatar">
                              <div className={`w-28 h-28 rounded-2xl border-[4px] border-white dark:border-gray-800 shadow-2xl overflow-hidden bg-white relative ${isActive ? '' : 'grayscale'}`}>
                                  {staff.photo ? (
                                      <img src={staff.photo} alt={safeName} className="w-full h-full object-cover" />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-4xl font-black">
                                          {safeName.charAt(0)}
                                      </div>
                                  )}
                              </div>
                              <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                          </div>

                          {/* Name & Quick Info */}
                          <div className="pt-12 md:pt-11 flex-1">
                              <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">{safeName}</h2>
                              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-3">{staff.designation}</p>
                              
                              <div className="flex flex-wrap gap-2">
                                 <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-gray-200 dark:border-gray-600">
                                     {safeId}
                                 </span>
                                 <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-600" /> {formatPoints(staff.points || 0)} pts
                                 </span>
                              </div>
                          </div>
                      </div>

                      {/* Main Body */}
                      <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                          
                          {/* Financial "Credit Card" Widget - NOW CLICKABLE */}
                          <div 
                            onClick={(e) => { e.stopPropagation(); setHistoryStaff(staff); }}
                            className="w-full bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group/card border border-white/5 cursor-pointer hover:scale-[1.01] transition-transform duration-300 hover:shadow-2xl"
                            title="Click to view full history"
                          >
                              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover/card:bg-white/10 transition-all duration-500"></div>
                              <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                              
                              {/* Hover Hint */}
                              <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                                 <ExternalLink className="w-4 h-4 text-white" />
                              </div>

                              <div className="flex justify-between items-start mb-8 relative z-10">
                                  <div className="flex items-center gap-2 opacity-80">
                                      <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                                          <CreditCard className="w-5 h-5 text-indigo-300" />
                                      </div>
                                      <div>
                                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 block">Current Balance</span>
                                          <span className="text-[8px] font-bold text-gray-400">Real-time Data • Click for History</span>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Status</p>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${balance < 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                                          {balance < 0 ? 'PAYABLE' : 'CASH IN HAND'}
                                      </span>
                                  </div>
                              </div>

                              <div className="grid grid-cols-2 gap-6 relative z-10">
                                  <div className="flex flex-col">
                                      <p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Total Balance</p>
                                      {formatCurrency(balance, true)}
                                  </div>
                                  <div className="flex flex-col">
                                      <p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Salary Adv</p>
                                      {formatCurrencyLight(totalSalaryAdv, 'text-purple-300')}
                                  </div>
                                  <div className="flex flex-col">
                                      <p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Total Expense</p>
                                      {formatCurrencyLight(approved, 'text-indigo-300')}
                                  </div>
                                  <div className="flex flex-col">
                                      <p className="text-[9px] font-extrabold text-gray-500 uppercase tracking-[0.1em] mb-1">Regular Adv</p>
                                      {formatCurrencyLight(totalRegularAdv, 'text-blue-300')}
                                  </div>
                              </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3">
                                  <div className="bg-white dark:bg-gray-600 p-2 rounded-lg text-indigo-500 shadow-sm"><Phone className="w-4 h-4"/></div>
                                  <div>
                                      <p className="text-[9px] text-gray-400 font-bold uppercase">Contact</p>
                                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{staff.mobile || 'N/A'}</p>
                                  </div>
                              </div>
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3">
                                  <div className="bg-white dark:bg-gray-600 p-2 rounded-lg text-pink-500 shadow-sm"><MapPin className="w-4 h-4"/></div>
                                  <div>
                                      <p className="text-[9px] text-gray-400 font-bold uppercase">Location</p>
                                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{staff.workLocation === 'CUSTOM' ? 'Custom' : staff.workLocation}</p>
                                  </div>
                              </div>
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3">
                                  <div className="bg-white dark:bg-gray-600 p-2 rounded-lg text-blue-500 shadow-sm"><Calendar className="w-4 h-4"/></div>
                                  <div>
                                      <p className="text-[9px] text-gray-400 font-bold uppercase">Joined</p>
                                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{joinDate}</p>
                                  </div>
                              </div>
                              {(role === UserRole.ADMIN || role === UserRole.MD) && (
                                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 flex items-center gap-3">
                                      <div className="bg-white dark:bg-gray-600 p-2 rounded-lg text-green-500 shadow-sm"><Wallet className="w-4 h-4"/></div>
                                      <div>
                                          <p className="text-[9px] text-gray-400 font-bold uppercase">Salary</p>
                                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200">৳ {staff.basicSalary?.toLocaleString() || 0}</p>
                                      </div>
                                  </div>
                              )}
                          </div>

                          {/* Control Dock */}
                          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                             <div className="flex gap-2 justify-between">
                                <button onClick={(e) => { e.stopPropagation(); openEdit(staff); }} className="flex-1 bg-gray-50 dark:bg-gray-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-gray-600 dark:text-gray-300 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group">
                                   <Edit3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                   <span className="text-[9px] font-bold">EDIT</span>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setHistoryStaff(staff); }} className="flex-1 bg-gray-50 dark:bg-gray-700 hover:bg-gray-800 hover:text-white text-gray-600 dark:text-gray-300 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group">
                                   <History className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                   <span className="text-[9px] font-bold">HISTORY</span>
                                </button>
                                {canManageMoney && (
                                   <>
                                      <button onClick={(e) => { e.stopPropagation(); openAdvanceModal(staff.id); }} className="flex-1 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group">
                                         <Banknote className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                         <span className="text-[9px] font-bold">ADVANCE</span>
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); openRepayModal(staff.id); }} className="flex-1 bg-green-50 dark:bg-green-900/20 hover:bg-green-600 hover:text-white text-green-600 dark:text-green-400 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group">
                                         <WalletCards className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                         <span className="text-[9px] font-bold">ADJUST</span>
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); openGiftModal(staff.id); }} className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-500 hover:text-white text-yellow-600 dark:text-yellow-400 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group">
                                         <Gift className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                         <span className="text-[9px] font-bold">POINTS</span>
                                      </button>
                                   </>
                                )}
                                {!isStaff && role === UserRole.ADMIN && (
                                   <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(staff.id); }} className="flex-1 bg-red-50 dark:bg-red-900/20 hover:bg-red-600 hover:text-white text-red-500 dark:text-red-400 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all group">
                                      <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                      <span className="text-[9px] font-bold">DELETE</span>
                                   </button>
                                )}
                             </div>
                          </div>
                      </div>
                   </div>
                ) : (
                   /* --- COMPACT VIEW (Premium ID Card) --- */
                   <div 
                     onClick={() => toggleExpand(staff.id)} 
                     className={`h-full bg-white dark:bg-gray-800 rounded-2xl p-4 cursor-pointer relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border ${isActive ? 'border-gray-100 dark:border-gray-700' : 'border-gray-100 dark:border-gray-700 opacity-80'}`}
                   >
                      {/* Active Glow for Active Staff */}
                      {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>}
                      
                      <div className="flex flex-col items-center text-center h-full justify-center gap-3 relative z-10">
                         <div className="relative">
                            {staff.photo ? (
                               <img src={staff.photo} alt={safeName} className={`w-16 h-16 rounded-full object-cover border-2 shadow-md ${isActive ? 'border-white ring-2 ring-green-100 dark:ring-green-900' : 'border-gray-200 grayscale'}`} />
                            ) : (
                               <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md ${isActive ? 'bg-gradient-to-br from-indigo-400 to-violet-500' : 'bg-gray-400'}`}>
                                  {safeName.charAt(0)}
                               </div>
                            )}
                            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                         </div>
                         
                         <div>
                            <h4 className="text-sm font-black text-gray-800 dark:text-white truncate max-w-[140px] leading-tight">{safeName}</h4>
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 truncate max-w-[140px]">{staff.designation}</p>
                            <span className="text-[9px] text-gray-400 font-mono mt-1 block">{safeId}</span>
                         </div>

                         {/* Mini Badge for Role */}
                         {staff.role !== UserRole.STAFF && (
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${staff.role === UserRole.MD ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                               {staff.role}
                            </span>
                         )}
                      </div>
                   </div>
                )}
            </div>
          );
        })}
      </div>
      
      {/* ... (Rest of the modals remain unchanged) ... */}
      {filteredStaff.length === 0 && (
         <div className="py-20 text-center text-gray-400 bg-white dark:bg-gray-800/60 dark:backdrop-blur-md rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center gap-2 opacity-50">
               <Search className="w-12 h-12" />
               <p className="text-lg font-bold">কোনো স্টাফ পাওয়া যায়নি</p>
            </div>
         </div>
      )}

      {/* GIFT POINTS MODAL */}
      {isGiftPointModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className={`p-6 text-white flex justify-between items-center transition-colors ${pointMode === 'GIFT' ? 'bg-yellow-400 text-yellow-900' : 'bg-red-600 text-white'}`}>
              <h3 className={`font-black text-xl flex items-center gap-2 ${pointMode === 'GIFT' ? 'text-yellow-900' : 'text-white'}`}>
                 {pointMode === 'GIFT' ? <><Gift className="w-6 h-6"/> গিফট পয়েন্ট</> : <><TrendingDown className="w-6 h-6"/> পেনাল্টি</>}
              </h3>
              <button onClick={() => setIsGiftPointModalOpen(false)} className={`p-1 rounded-full ${pointMode === 'GIFT' ? 'hover:bg-yellow-500/20 text-yellow-900' : 'hover:bg-red-700 text-white'}`}><X className="w-6 h-6"/></button>
            </div>
            
            <form onSubmit={handleGivePoints} className="p-6 space-y-5">
               {/* Mode Toggle */}
               <div className="flex bg-gray-100 rounded-xl p-1">
                  <button 
                    type="button" 
                    onClick={() => setPointMode('GIFT')} 
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${pointMode === 'GIFT' ? 'bg-white shadow-sm text-yellow-700' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                     <Gift className="w-4 h-4"/> Reward (Gift)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPointMode('PENALTY')} 
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${pointMode === 'PENALTY' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                     <TrendingDown className="w-4 h-4"/> Penalty (Cut)
                  </button>
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">পয়েন্ট পরিমাণ</label>
                 <input 
                   type="number" 
                   min="1" 
                   required
                   className={`w-full px-4 py-3 border rounded-xl outline-none text-center text-3xl font-black ${pointMode === 'GIFT' ? 'border-yellow-200 focus:ring-2 focus:ring-yellow-400 text-gray-800' : 'border-red-200 focus:ring-2 focus:ring-red-500 text-red-600'}`}
                   value={giftPointData.points}
                   onChange={(e) => setGiftPointData({...giftPointData, points: Number(e.target.value)})}
                 />
                 <p className={`text-xs text-center mt-2 ${pointMode === 'GIFT' ? 'text-gray-400' : 'text-red-400'}`}>
                    {pointMode === 'GIFT' ? 'এই স্টাফের পয়েন্ট যোগ হবে (+)' : 'এই স্টাফের পয়েন্ট কেটে নেওয়া হবে (-)'}
                 </p>
               </div>
               
               <button 
                 type="submit" 
                 className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${pointMode === 'GIFT' ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500 shadow-yellow-100' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'}`}
               >
                 {pointMode === 'GIFT' ? 'পয়েন্ট প্রদান করুন' : 'পেনাল্টি প্রসেস করুন'}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* PENALTY CONFIRMATION MODAL */}
      {showPenaltyConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center transform scale-100 transition-transform">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
                    <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">পেনাল্টি নিশ্চিত করুন</h3>
                <p className="text-sm text-gray-500 mb-8 px-4">
                    সতর্কতা: আপনি কি নিশ্চিত যে এই স্টাফের <strong className="text-red-600 text-lg">{giftPointData.points} পয়েন্ট</strong> পেনাল্টি হিসেবে কেটে নিতে চান?
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                           setShowPenaltyConfirm(false);
                           setTimeout(() => setIsGiftPointModalOpen(true), 200); 
                        }}
                        className="flex-1 py-3.5 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        না, বাতিল
                    </button>
                    <button 
                        onClick={executePenalty}
                        className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-xl shadow-red-200 transition-all active:scale-95"
                    >
                        হ্যাঁ, নিশ্চিত
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* ADVANCE MODAL */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-xl flex items-center gap-2"><Banknote className="w-6 h-6"/> অগ্রীম টাকা (Advance)</h3>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="p-1 hover:bg-blue-700 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleGiveAdvance} className="p-6 space-y-4">
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">টাকার পরিমাণ</label>
                 <input 
                   type="number" 
                   required
                   className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-bold"
                   placeholder="0.00"
                   value={advanceFormData.amount || ''}
                   onChange={(e) => setAdvanceFormData({...advanceFormData, amount: Number(e.target.value)})}
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">তারিখ</label>
                 <input 
                   type="date" 
                   required
                   className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                   value={advanceFormData.date}
                   onChange={(e) => setAdvanceFormData({...advanceFormData, date: e.target.value})}
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">নোট / কারণ</label>
                 <input 
                   type="text" 
                   className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                   placeholder="কি কারণে দেওয়া হচ্ছে?"
                   value={advanceFormData.note}
                   onChange={(e) => setAdvanceFormData({...advanceFormData, note: e.target.value})}
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">ধরন</label>
                 <div className="flex gap-2">
                    <button type="button" onClick={() => setAdvanceFormData({...advanceFormData, type: 'REGULAR'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${advanceFormData.type === 'REGULAR' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-500'}`}>Regular Adv</button>
                    <button type="button" onClick={() => setAdvanceFormData({...advanceFormData, type: 'SALARY'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${advanceFormData.type === 'SALARY' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-500'}`}>Salary Adv</button>
                 </div>
               </div>
               <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">
                 টাকা প্রদান করুন
               </button>
            </form>
          </div>
        </div>
      )}

      {/* REPAYMENT MODAL */}
      {isRepayModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-green-600 text-white flex justify-between items-center">
              <h3 className="font-bold text-xl flex items-center gap-2"><WalletCards className="w-6 h-6"/> টাকা সমন্বয় (Adjustment)</h3>
              <button onClick={() => setIsRepayModalOpen(false)} className="p-1 hover:bg-green-700 rounded-full"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleRepay} className="p-6 space-y-4">
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">সমন্বয়ের ধরণ</label>
                 <div className="flex gap-2">
                    <button type="button" onClick={() => setRepayFormData({...repayFormData, type: 'SALARY'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${repayFormData.type === 'SALARY' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-gray-500'}`}>বেতন সমন্বয়</button>
                    <button type="button" onClick={() => setRepayFormData({...repayFormData, type: 'REGULAR'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${repayFormData.type === 'REGULAR' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-500'}`}>রেগুলার সমন্বয়</button>
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">কাটার পরিমাণ (Deduct)</label>
                 <input 
                   type="number" 
                   required
                   className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-lg font-bold"
                   placeholder="0.00"
                   value={repayFormData.amount || ''}
                   onChange={(e) => setRepayFormData({...repayFormData, amount: Number(e.target.value)})}
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">তারিখ</label>
                 <input 
                   type="date" 
                   required
                   className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                   value={repayFormData.date}
                   onChange={(e) => setRepayFormData({...repayFormData, date: e.target.value})}
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-2">নোট</label>
                 <input 
                   type="text" 
                   className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                   value={repayFormData.note}
                   onChange={(e) => setRepayFormData({...repayFormData, note: e.target.value})}
                 />
               </div>
               <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100">
                 সমন্বয় করুন
               </button>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                 <h3 className="font-bold text-xl text-gray-800">{historyStaff.name}</h3>
                 <p className="text-xs text-gray-500 font-bold">{historyStaff.designation} • ID: {historyStaff.staffId}</p>
              </div>
              <button onClick={() => setHistoryStaff(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {/* Financial Summary */}
               {(() => {
                  const { balance, totalRegularAdv, totalSalaryAdv, approved } = getStaffFinancials(historyStaff.id);
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Expense */}
                      <div className="bg-indigo-50 p-3 rounded-xl text-center border border-indigo-100">
                         <p className="text-[10px] text-indigo-500 font-bold uppercase">মোট বিল (Exp)</p>
                         <p className="text-lg font-black text-indigo-700">৳ {approved.toLocaleString()}</p>
                      </div>
                      {/* Regular Adv */}
                      <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
                         <p className="text-[10px] text-blue-500 font-bold uppercase">সাধারণ অগ্রিম</p>
                         <p className="text-lg font-black text-blue-700">৳ {totalRegularAdv.toLocaleString()}</p>
                      </div>
                      {/* Salary Adv */}
                      <div className="bg-purple-50 p-3 rounded-xl text-center border border-purple-100">
                         <p className="text-[10px] text-purple-500 font-bold uppercase">বেতন অগ্রিম</p>
                         <p className="text-lg font-black text-purple-700">৳ {totalSalaryAdv.toLocaleString()}</p>
                      </div>
                      {/* Net Balance */}
                      <div className={`p-3 rounded-xl text-center border ${balance < 0 ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'}`}>
                         <p className={`text-[10px] font-bold uppercase ${balance < 0 ? 'text-red-600' : 'text-indigo-600'}`}>
                           {balance < 0 ? 'পাবে (Payable)' : 'হাতে আছে (Cash)'}
                         </p>
                         <p className={`text-lg font-black ${balance < 0 ? 'text-red-700' : 'text-indigo-700'}`}>
                           {balance < 0 ? '- ' : ''}৳ {Math.abs(balance).toLocaleString()}
                         </p>
                      </div>
                    </div>
                  );
               })()}

               {/* Advance History */}
               <div>
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider"><Banknote className="w-4 h-4"/> লেনদেন হিস্ট্রি (Advance & Repay)</h4>
                  <div className="space-y-2">
                     {(advances || []).filter(a => a.staffId === historyStaff.id && !a.isDeleted).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(adv => (
                        <div key={adv.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${adv.type === 'SALARY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {adv.type === 'SALARY' ? 'Salary' : 'Regular'}
                                </span>
                                <p className="text-xs text-gray-400 font-bold">{new Date(adv.date).toLocaleDateString('bn-BD')}</p>
                              </div>
                              <p className="font-bold text-gray-700 text-sm">{adv.note || 'No description'}</p>
                           </div>
                           <span className={`font-black ${adv.amount > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                              {adv.amount > 0 ? `+ ৳${adv.amount}` : `- ৳${Math.abs(adv.amount)}`}
                           </span>
                        </div>
                     ))}
                     {(advances || []).filter(a => a.staffId === historyStaff.id && !a.isDeleted).length === 0 && (
                        <p className="text-center text-gray-400 text-xs py-4">কোনো লেনদেন পাওয়া যায়নি।</p>
                     )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <h3 className="font-bold text-xl">{editingStaff ? 'প্রোফাইল আপডেট' : 'নতুন ইউজার যুক্ত করুন'}</h3>
              <button onClick={closeModal} className="p-1 text-indigo-200 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Photo Upload */}
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
                 {formData.photo && <button type="button" onClick={removePhoto} className="text-xs text-red-500 mt-2 font-bold hover:underline">ছবি মুছুন</button>}
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* ROLE SELECTION */}
                {!isStaff && (
                  <>
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-2">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 ml-1">অ্যাকাউন্ট রোল (Role)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`cursor-pointer border-2 rounded-lg p-2 flex flex-col items-center justify-center gap-1 transition-all ${formData.role === UserRole.STAFF ? 'border-indigo-600 bg-white shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
                        <input type="radio" className="hidden" checked={formData.role === UserRole.STAFF} onChange={() => setFormData({...formData, role: UserRole.STAFF})} />
                        <Users className={`w-5 h-5 ${formData.role === UserRole.STAFF ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <span className={`text-[10px] font-bold ${formData.role === UserRole.STAFF ? 'text-indigo-700' : 'text-gray-500'}`}>Staff (Worker)</span>
                      </label>
                      
                      <label className={`cursor-pointer border-2 rounded-lg p-2 flex flex-col items-center justify-center gap-1 transition-all ${formData.role === UserRole.ADMIN ? 'border-blue-600 bg-white shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
                        <input type="radio" className="hidden" checked={formData.role === UserRole.ADMIN} onChange={() => setFormData({...formData, role: UserRole.ADMIN})} />
                        <UserCog className={`w-5 h-5 ${formData.role === UserRole.ADMIN ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-[10px] font-bold ${formData.role === UserRole.ADMIN ? 'text-blue-700' : 'text-gray-500'}`}>Admin</span>
                      </label>

                      <label className={`cursor-pointer border-2 rounded-lg p-2 flex flex-col items-center justify-center gap-1 transition-all col-span-2 ${formData.role === UserRole.KIOSK ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
                        <input type="radio" className="hidden" checked={formData.role === UserRole.KIOSK} onChange={() => setFormData({...formData, role: UserRole.KIOSK, workLocation: 'FACTORY', name: 'Factory Common Device'})} />
                        <MonitorSmartphone className={`w-5 h-5 ${formData.role === UserRole.KIOSK ? 'text-orange-600' : 'text-gray-400'}`} />
                        <span className={`text-[10px] font-bold ${formData.role === UserRole.KIOSK ? 'text-orange-700' : 'text-gray-500'}`}>Factory Kiosk (Common Device)</span>
                      </label>
                    </div>
                  </div>

                  {formData.role !== UserRole.KIOSK && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-2 space-y-3">
                       <div>
                         <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 ml-1">কাজের জায়গা (Work Location)</label>
                         <select 
                           className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-gray-700"
                           value={formData.workLocation || 'HEAD_OFFICE'}
                           onChange={(e) => setFormData({...formData, workLocation: e.target.value as any})}
                         >
                           <option value="HEAD_OFFICE">হেড অফিস (ঢাকা)</option>
                           <option value="FACTORY">ফ্যাক্টরি (টঙ্গী/গাজীপুর)</option>
                           <option value="FIELD">ফিল্ড / ড্রাইভার (Anywhere)</option>
                           <option value="CUSTOM">📍 কাস্টম লোকেশন (Select from Map)</option>
                         </select>
                       </div>
                       {formData.workLocation === 'CUSTOM' && (
                          <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-3">
                             <p className="text-xs font-bold text-orange-600 flex items-center gap-1 border-b border-gray-100 pb-2">
                                <MapPin className="w-3.5 h-3.5" /> কাস্টম লোকেশন সেটআপ ১ (Primary)
                             </p>
                             <div><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">জায়গার নাম</label><input type="text" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold" value={formData.customLocName} onChange={(e) => setFormData({...formData, customLocName: e.target.value})} /></div>
                             <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Lat</label><input type="number" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono" value={formData.customLat} onChange={(e) => setFormData({...formData, customLat: Number(e.target.value)})} /></div>
                                <div><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Lng</label><input type="number" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono" value={formData.customLng} onChange={(e) => setFormData({...formData, customLng: Number(e.target.value)})} /></div>
                             </div>
                             <div className="flex gap-2">
                                <div className="flex-1"><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Radius</label><input type="number" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono" value={formData.customRadius} onChange={(e) => setFormData({...formData, customRadius: Number(e.target.value)})} /></div>
                                <div className="flex-1 flex items-end"><button type="button" onClick={() => getCurrentLocation(1)} className="w-full bg-indigo-50 text-indigo-600 px-2 py-1.5 rounded-lg text-[10px] font-bold hover:bg-indigo-100 flex items-center justify-center gap-1 h-[34px]"><LocateFixed className="w-3 h-3" /> Get Current</button></div>
                             </div>
                             <div className="pt-2 border-t border-gray-100 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                   <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={formData.hasSecondLoc} onChange={(e) => setFormData({...formData, hasSecondLoc: e.target.checked})} />
                                   <span className="text-xs font-bold text-gray-700">Secondary Location</span>
                                </label>
                             </div>
                             {formData.hasSecondLoc && (
                               <div className="pt-2 space-y-3">
                                  <div><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Location 2 Name</label><input type="text" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold" value={formData.customLocName2} onChange={(e) => setFormData({...formData, customLocName2: e.target.value})} /></div>
                                  <div className="grid grid-cols-2 gap-3">
                                     <div><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Lat 2</label><input type="number" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono" value={formData.customLat2} onChange={(e) => setFormData({...formData, customLat2: Number(e.target.value)})} /></div>
                                     <div><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Lng 2</label><input type="number" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono" value={formData.customLng2} onChange={(e) => setFormData({...formData, customLng2: Number(e.target.value)})} /></div>
                                  </div>
                                  <div className="flex gap-2">
                                     <div className="flex-1"><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Radius 2</label><input type="number" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-mono" value={formData.customRadius2} onChange={(e) => setFormData({...formData, customRadius2: Number(e.target.value)})} /></div>
                                     <div className="flex-1 flex items-end"><button type="button" onClick={() => getCurrentLocation(2)} className="w-full bg-blue-50 text-blue-600 px-2 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-100 flex items-center justify-center gap-1 h-[34px]"><LocateFixed className="w-3 h-3" /> Get Current</button></div>
                                  </div>
                               </div>
                             )}
                          </div>
                       )}
                    </div>
                  )}
                  </>
                )}

                {/* Name, ID, Password inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 uppercase text-[10px] tracking-widest">নাম</label>
                    <input 
                      required 
                      type="text" 
                      className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold ${(isStaff || editingStaff?.name === currentUser) ? 'opacity-60 cursor-not-allowed' : ''}`} 
                      disabled={isStaff || editingStaff?.name === currentUser} 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      placeholder="নাম লিখুন" 
                    />
                    {editingStaff?.name === currentUser && <p className="text-[9px] text-red-500 mt-1">* বর্তমান সেশন ধরে রাখতে নিজের নাম পরিবর্তন করা যাবে না।</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 uppercase text-[10px] tracking-widest">আইডি (ID)</label>
                    <input required type="text" className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={isStaff} value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} placeholder="ID-00X" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 uppercase text-[10px] tracking-widest">পদবী</label>
                    <div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input required type="text" className={`w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={isStaff} value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} placeholder="পদবী" /></div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 uppercase text-[10px] tracking-widest">বেসিক স্যালারি</label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">৳</span><input type="number" className={`w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={isStaff} value={formData.basicSalary || ''} onChange={(e) => setFormData({...formData, basicSalary: Number(e.target.value)})} placeholder="0" /></div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 uppercase text-[10px] tracking-widest">মোবাইল নাম্বার</label>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="tel" className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} placeholder="017..." /></div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase text-[10px] tracking-widest">লগইন পাসওয়ার্ড</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPassword ? "text" : "password"} className="w-full pl-9 pr-12 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder={editingStaff ? "পরিবর্তন করতে চাইলে লিখুন" : "Default: নাম@ (উদা: রহিম@)"} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">খালি রাখলে ডিফল্ট পাসওয়ার্ড (নাম@) সেট হবে।</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={closeModal} className="flex-1 py-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all">বাতিল</button>
                  <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">{editingStaff ? 'আপডেট করুন' : 'সেভ করুন'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* STATUS CHANGE CONFIRMATION MODAL */}
      {statusConfirmData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${statusConfirmData.newStatus === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {statusConfirmData.newStatus === 'ACTIVE' ? <CheckCircle className="w-8 h-8" /> : <UserX className="w-8 h-8" />}
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">
                {statusConfirmData.newStatus === 'ACTIVE' ? 'অ্যাকাউন্ট চালু করবেন?' : 'অ্যাকাউন্ট বন্ধ করবেন?'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                আপনি এই স্টাফের স্ট্যাটাস পরিবর্তন করে <strong>{statusConfirmData.newStatus === 'ACTIVE' ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Deactivated)'}</strong> করতে যাচ্ছেন। আপনি কি নিশ্চিত?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setStatusConfirmData(null)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  না
                </button>
                <button 
                  onClick={confirmStatusChange}
                  className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors ${statusConfirmData.newStatus === 'ACTIVE' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
                >
                  হ্যাঁ, নিশ্চিত
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-sm text-gray-500 mb-6">
                আপনি এই স্টাফ মেম্বারকে ডিলিট করতে যাচ্ছেন। এটি রিসাইকেল বিনে জমা হবে এবং তিনি আর লগইন করতে পারবেন না।
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
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
    </div>
  );
};

export default StaffManagementView;