
import React, { useState, useMemo, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, UserPlus, X, Calendar, FilterX, Phone, Banknote, Users, UserCheck, UserX, ArrowUpDown, ShieldCheck, ShieldAlert, Eye, EyeOff, Lock, Camera, Image as ImageIcon, Briefcase, Wallet, ArrowRight, Coins, Crown, UserCog, History, CalendarClock, MapPin, LocateFixed, Globe, ToggleLeft, ToggleRight, Map, MonitorSmartphone, Gift, Star, MoreVertical } from 'lucide-react';
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
}

const StaffManagementView: React.FC<StaffProps> = ({ staffList, setStaffList, role, expenses, advances, setAdvances, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name, salary
  
  // Profile/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
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

  // Gift Points Modal State
  const [isGiftPointModalOpen, setIsGiftPointModalOpen] = useState(false);
  const [giftPointData, setGiftPointData] = useState<{staffId: string, points: number}>({ staffId: '', points: 5 });

  // History Modal State
  const [historyStaff, setHistoryStaff] = useState<Staff | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStaff = role === UserRole.STAFF;
  const canManageMoney = role === UserRole.ADMIN || role === UserRole.MD;

  // --- STAFF FORM HANDLERS ---
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    
    // Prepare Custom Location Object 1
    let customLocationData = undefined;
    // Prepare Custom Location Object 2
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

  const toggleStatus = (id: string, currentStatus: 'ACTIVE' | 'DEACTIVATED') => {
    if (isStaff) return;
    const newStatus = currentStatus === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    if (confirm(`আপনি কি নিশ্চিতভাবে এই স্টাফকে ${newStatus === 'ACTIVE' ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Deactivate)'} করতে চান?`)) {
       setStaffList(prev => prev.map(s => s && s.id === id ? { ...s, status: newStatus, updatedAt: new Date().toISOString() } : s));
    }
  };

  const softDelete = (id: string) => {
    if (isStaff) return;
    if (confirm('আপনি কি এই স্টাফকে সরাতে চান? এটি ট্রাশে জমা হবে।')) {
      setStaffList(prev => prev.map(s => s && s.id === id ? { ...s, deletedAt: new Date().toISOString() } : s));
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
    setFormData(prev => ({ ...prev, photo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- GIFT POINTS HANDLER ---
  const handleGivePoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMoney) return;
    if (giftPointData.points < 1 || giftPointData.points > 20) {
      alert("পয়েন্ট ১ থেকে ২০ এর মধ্যে হতে হবে।");
      return;
    }
    
    setStaffList(prev => prev.map(s => {
      if (s.id === giftPointData.staffId) {
        return {
          ...s,
          points: (s.points || 0) + Number(giftPointData.points),
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));

    setIsGiftPointModalOpen(false);
    alert('পয়েন্ট প্রদান সফল হয়েছে! 🎉');
  };

  const openGiftModal = (staffId: string) => {
    setGiftPointData({ staffId, points: 5 });
    setIsGiftPointModalOpen(true);
  };

  // --- ADVANCE MONEY HANDLERS ---
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

  const handleGiveAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMoney) {
        alert("আপনার এই অ্যাকশন করার অনুমতি নেই।");
        return;
    }

    if (Number(advanceFormData.amount) <= 0) {
        alert("দয়া করে সঠিক টাকার পরিমাণ লিখুন (০ এর বেশি)।");
        return;
    }

    const staff = staffList.find(s => s.id === advanceFormData.staffId);
    if (!staff) {
        alert("স্টাফ মেম্বার পাওয়া যাচ্ছে না। পেজটি রিফ্রেশ দিয়ে আবার চেষ্টা করুন।");
        return;
    }

    const submitDate = new Date(advanceFormData.date);
    if (isNaN(submitDate.getTime())) {
        alert("তারিখ সঠিক নয়।");
        return;
    }

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
    
    // Show success message
    alert(`${staff.name}-কে ৳${newAdvance.amount} অগ্রীম দেওয়া হয়েছে।`);

    setAdvanceFormData({ staffId: '', amount: 0, note: '', date: new Date().toISOString().split('T')[0], type: 'REGULAR' });
  };

  // --- FILTER & DATA LOGIC ---
  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
  };

  const filteredStaff = useMemo(() => {
    let result = staffList.filter(s => {
      if (!s) return false;
      if (s.deletedAt) return false;
      if (isStaff && s.name !== currentUser) return false;

      const searchLower = searchTerm.toLowerCase();
      // Safety checks for undefined properties
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
    total: staffList.filter(s => s && !s.deletedAt).length,
    active: staffList.filter(s => s && !s.deletedAt && s.status === 'ACTIVE').length,
    inactive: staffList.filter(s => s && !s.deletedAt && s.status === 'DEACTIVATED').length
  };

  // FINANCIAL CALCULATION
  const getStaffFinancials = (staffId: string) => {
    // Safety check for empty data
    const safeExpenses = expenses || [];
    const safeAdvances = advances || [];

    const staffExpenses = safeExpenses.filter(e => e && e.staffId === staffId && !e.isDeleted);
    const approved = staffExpenses.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const staffAdvances = safeAdvances.filter(a => a && a.staffId === staffId && !a.isDeleted);
    const regularAdvance = staffAdvances.filter(a => a.type !== 'SALARY').reduce((sum, a) => sum + Number(a.amount || 0), 0);
    
    const balance = regularAdvance - approved;
    
    return { balance };
  };

  return (
    <div className="space-y-6">
      {/* Header and Stats section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">স্টাফ প্রোফাইল ও কন্ট্রোল</h2>
        {!isStaff && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95">
            <UserPlus className="w-5 h-5" /> নতুন স্টাফ যোগ করুন
          </button>
        )}
      </div>

      {/* Stats Cards - Only show for Admin/MD */}
      {!isStaff && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800/60 dark:backdrop-blur-md p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><Users className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">মোট স্টাফ</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800/60 dark:backdrop-blur-md p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-xl text-green-600"><UserCheck className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">সক্রিয় (Active)</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{stats.active}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800/60 dark:backdrop-blur-md p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 flex items-center gap-4">
            <div className="bg-gray-100 p-3 rounded-xl text-gray-500"><UserX className="w-6 h-6" /></div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">নিষ্ক্রিয় (Inactive)</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{stats.inactive}</p>
            </div>
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

      {/* BOX/CARD GRID VIEW - REDESIGNED */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStaff.map((staff) => {
          if (!staff) return null;
          const { balance } = getStaffFinancials(staff.id);
          const safeName = staff.name || 'Unknown';
          const safeId = staff.staffId || 'N/A';
          const isActive = staff.status === 'ACTIVE';

          return (
            <div key={staff.id} className="group relative bg-white dark:bg-gray-800/60 dark:backdrop-blur-md rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden transition-all duration-300 hover:-translate-y-1">
              
              {/* Decorative Background for Header */}
              <div className={`h-24 w-full absolute top-0 left-0 ${isActive ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}></div>

              {/* Content Wrapper */}
              <div className="relative pt-12 px-5 pb-5 flex flex-col h-full">
                  
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center">
                      <div className="relative">
                          {staff.photo ? (
                              <img src={staff.photo} alt={safeName} className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md bg-white" />
                          ) : (
                              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 border-white dark:border-gray-800 shadow-md ${isActive ? 'bg-indigo-400' : 'bg-gray-400'}`}>
                                  {safeName.charAt(0)}
                              </div>
                          )}
                          {/* Status Dot */}
                          <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 ${isActive ? 'bg-green-500' : 'bg-red-500'}`} title={isActive ? 'Active' : 'Inactive'}></div>
                      </div>

                      <div className="mt-3 text-center">
                          <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">{safeName}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{staff.designation}</p>
                          <div className="flex items-center justify-center gap-2 mt-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{safeId}</span>
                              {staff.role !== UserRole.STAFF && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      staff.role === UserRole.MD ? 'bg-purple-100 text-purple-700' : 
                                      staff.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-700' : 
                                      'bg-orange-100 text-orange-700'
                                  }`}>
                                      {staff.role === UserRole.KIOSK ? 'KIOSK' : staff.role}
                                  </span>
                              )}
                          </div>
                      </div>
                  </div>

                  {/* Details Grid */}
                  <div className="mt-6 space-y-3 flex-1">
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{staff.mobile || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate" title={staff.workLocation}>
                              {staff.workLocation === 'CUSTOM' ? staff.customLocation?.name || 'Custom Loc' : staff.workLocation}
                          </span>
                      </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3 text-center border border-indigo-100 dark:border-indigo-800">
                          <p className="text-[9px] uppercase font-bold text-indigo-400">ব্যালেন্স</p>
                          <p className={`text-sm font-black ${balance < 0 ? 'text-red-500' : 'text-indigo-700 dark:text-indigo-400'}`}>৳ {balance.toLocaleString()}</p>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center border border-yellow-100 dark:border-yellow-800">
                          <p className="text-[9px] uppercase font-bold text-yellow-500">পয়েন্ট</p>
                          <p className="text-sm font-black text-yellow-700 dark:text-yellow-400 flex items-center justify-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> {staff.points || 0}
                          </p>
                      </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-white/10">
                       {/* Edit Button */}
                       <button onClick={() => openEdit(staff)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-indigo-600 hover:text-white transition-colors" title="এডিট করুন">
                          <Edit2 className="w-3.5 h-3.5" />
                       </button>
                       
                       {/* Admin Actions */}
                       {canManageMoney && (
                          <>
                              <button onClick={() => openGiftModal(staff.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500 hover:text-white transition-colors" title="গিফট দিন">
                                  <Gift className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openAdvanceModal(staff.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors" title="টাকা দিন">
                                  <Banknote className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setHistoryStaff(staff)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-800 hover:text-white transition-colors" title="হিস্ট্রি">
                                  <History className="w-3.5 h-3.5" />
                              </button>
                          </>
                       )}

                       {/* Delete/Status Toggle */}
                       {!isStaff && (
                          <>
                            <button onClick={() => toggleStatus(staff.id, staff.status)} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isActive ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-500 hover:bg-orange-500 hover:text-white' : 'bg-green-50 dark:bg-green-900/30 text-green-500 hover:bg-green-500 hover:text-white'}`} title={isActive ? 'Deactivate' : 'Activate'}>
                                {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => softDelete(staff.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-500 hover:text-white transition-colors" title="মুছে ফেলুন">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                       )}
                  </div>

              </div>
            </div>
          );
        })}
      </div>
      
      {filteredStaff.length === 0 && (
         <div className="py-20 text-center text-gray-400 bg-white dark:bg-gray-800/60 dark:backdrop-blur-md rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center gap-2 opacity-50">
               <Search className="w-12 h-12" />
               <p className="text-lg font-bold">কোনো স্টাফ পাওয়া যায়নি</p>
            </div>
         </div>
      )}

      {/* Gift Points Modal */}
      {isGiftPointModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
             <div className="bg-yellow-500 p-6 text-white text-center">
                <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Gift className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">স্পেশাল বোনাস পয়েন্ট</h3>
                <p className="text-yellow-100 text-xs mt-1">কাজের প্রশংসাস্বরূপ স্টাফকে পয়েন্ট দিন</p>
             </div>
             
             <form onSubmit={handleGivePoints} className="p-6 space-y-5">
               <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">পয়েন্ট পরিমাণ (১-২০)</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold"><Star className="w-4 h-4 fill-yellow-500 text-yellow-500"/></span>
                     <input 
                       autoFocus
                       required 
                       type="number" 
                       min="1"
                       max="20"
                       className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-bold text-lg text-gray-800"
                       placeholder="5"
                       value={giftPointData.points}
                       onChange={(e) => setGiftPointData({...giftPointData, points: Number(e.target.value)})}
                     />
                  </div>
               </div>

               <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsGiftPointModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">বাতিল</button>
                  <button type="submit" className="flex-[2] bg-yellow-500 text-white py-3 rounded-xl font-bold hover:bg-yellow-600 shadow-xl shadow-yellow-100 flex items-center justify-center gap-2 active:scale-95 transition-all">
                     <Gift className="w-5 h-5" />
                     পয়েন্ট দিন
                  </button>
               </div>
             </form>
           </div>
         </div>
      )}

      {/* Advance History Modal */}
      {historyStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="bg-blue-600 p-5 text-white flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="font-bold text-lg">অগ্রীম টাকার হিস্ট্রি</h3>
                    <p className="text-blue-100 text-xs">{historyStaff.name} ({historyStaff.staffId})</p>
                 </div>
                 <button onClick={() => setHistoryStaff(null)} className="text-blue-200 hover:text-white p-1 rounded-full hover:bg-blue-500/50"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="overflow-y-auto p-0 flex-1">
                 {(() => {
                    const userAdvances = advances.filter(a => a.staffId === historyStaff.id && !a.isDeleted).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    if (userAdvances.length === 0) {
                       return (
                          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                             <CalendarClock className="w-10 h-10 mb-2 opacity-30" />
                             <p className="text-sm font-bold">কোনো অগ্রীম রেকর্ড নেই</p>
                          </div>
                       );
                    }
                    return (
                       <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold sticky top-0 z-10 shadow-sm">
                             <tr>
                                <th className="px-5 py-3">তারিখ</th>
                                <th className="px-5 py-3">টাকার পরিমাণ</th>
                                <th className="px-5 py-3">নোট / কারণ</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                             {userAdvances.map(a => (
                                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                   <td className="px-5 py-3 text-gray-600 font-medium whitespace-nowrap">
                                      {new Date(a.date).toLocaleDateString('bn-BD')}
                                      <p className="text-[9px] text-gray-400">{new Date(a.date).toLocaleTimeString('bn-BD', {hour: '2-digit', minute:'2-digit'})}</p>
                                   </td>
                                   <td className="px-5 py-3 font-bold text-blue-700">
                                     ৳ {Number(a.amount).toLocaleString()}
                                     {a.type === 'SALARY' && (
                                       <span className="block text-[9px] text-purple-600 font-bold uppercase tracking-tight bg-purple-50 px-1 py-0.5 rounded w-fit mt-1">Salary Adv</span>
                                     )}
                                   </td>
                                   <td className="px-5 py-3 text-gray-600">
                                      {a.note || '-'}
                                      <p className="text-[9px] text-gray-400 mt-0.5">By: {a.givenBy}</p>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    );
                 })()}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 text-center">
                 <button onClick={() => setHistoryStaff(null)} className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 text-xs">বন্ধ করুন</button>
              </div>
           </div>
        </div>
      )}

      {/* Give Advance Modal */}
      {isAdvanceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-blue-600 p-6 text-white text-center">
               <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Banknote className="w-6 h-6" />
               </div>
               <h3 className="text-xl font-bold">স্টাফকে অগ্রীম দিন</h3>
               <p className="text-blue-100 text-xs mt-1">অগ্রীম টাকা বা বেতন প্রদানের বিবরণ লিখুন</p>
            </div>
            
            <form onSubmit={handleGiveAdvance} className="p-6 space-y-5">
               {/* Advance Type Selector */}
               <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">অগ্রীমের ধরণ</label>
                  <div className="flex gap-3">
                     <label className={`flex-1 cursor-pointer border-2 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition-all ${advanceFormData.type === 'REGULAR' ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <input type="radio" className="hidden" name="advType" checked={advanceFormData.type === 'REGULAR'} onChange={() => setAdvanceFormData({...advanceFormData, type: 'REGULAR'})} />
                        <span className={`text-xs font-bold ${advanceFormData.type === 'REGULAR' ? 'text-blue-700' : 'text-gray-500'}`}>সাধারণ (Expense)</span>
                     </label>
                     <label className={`flex-1 cursor-pointer border-2 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition-all ${advanceFormData.type === 'SALARY' ? 'border-purple-600 bg-purple-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                        <input type="radio" className="hidden" name="advType" checked={advanceFormData.type === 'SALARY'} onChange={() => setAdvanceFormData({...advanceFormData, type: 'SALARY'})} />
                        <span className={`text-xs font-bold ${advanceFormData.type === 'SALARY' ? 'text-purple-700' : 'text-gray-500'}`}>বেতন অগ্রীম</span>
                     </label>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">টাকার পরিমাণ</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                     <input 
                       autoFocus
                       required 
                       type="number" 
                       className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg text-gray-800"
                       placeholder="0.00"
                       value={advanceFormData.amount || ''}
                       onChange={(e) => setAdvanceFormData({...advanceFormData, amount: Number(e.target.value)})}
                     />
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">তারিখ</label>
                  <input 
                    type="date"
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-800"
                    value={advanceFormData.date}
                    onChange={(e) => setAdvanceFormData({...advanceFormData, date: e.target.value})}
                  />
               </div>

               <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">নোট (অপশনাল)</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                    placeholder="কিসের জন্য টাকা দিচ্ছেন?"
                    value={advanceFormData.note}
                    onChange={(e) => setAdvanceFormData({...advanceFormData, note: e.target.value})}
                  />
               </div>
               
               <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsAdvanceModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">বাতিল</button>
                  <button type="submit" className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 transition-all">
                     <Coins className="w-5 h-5" />
                     টাকা প্রদান করুন
                  </button>
               </div>
            </form>
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
            {/* ... Existing Profile Form Logic ... */}
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
                      {/* Standard Roles */}
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

                      {/* Kiosk Mode */}
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
                    <input required type="text" className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold ${isStaff ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={isStaff} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="নাম লিখুন" />
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
    </div>
  );
};

export default StaffManagementView;
