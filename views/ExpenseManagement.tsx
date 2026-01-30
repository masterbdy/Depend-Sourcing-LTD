
import React, { useState, useMemo, useRef } from 'react';
import { Receipt, Camera, CheckCircle, XCircle, Clock, Eye, Trash2, Search, Calendar, FilterX, RotateCcw, CheckCheck, Sparkles, Image as ImageIcon, X, Edit3, Eraser } from 'lucide-react';
import { Expense, Staff, UserRole, AppNotification } from '../types';

interface ExpenseProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  staffList: Staff[];
  role: UserRole;
  currentUser: string | null;
  onNotify?: (title: string, message: string, type: AppNotification['type']) => void;
}

const ExpenseManagementView: React.FC<ExpenseProps> = ({ expenses, setExpenses, staffList, role, currentUser, onNotify }) => {
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
  const [correctionData, setCorrectionData] = useState<{id: string, amount: number, reason: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeStaff = staffList.filter(s => !s.deletedAt && s.status === 'ACTIVE');

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (e.isDeleted) return false;
      
      const matchesSearch = 
        e.reason.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.staffName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const expenseDate = new Date(e.createdAt).setHours(0, 0, 0, 0);
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

      const matchesDate = (!start || expenseDate >= start) && (!end || expenseDate <= end);

      return matchesSearch && matchesDate;
    });
  }, [expenses, searchTerm, startDate, endDate]);

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    
    // 1. Convert Bengali digits to English for calculation
    const banglaToEng = (str: string) => str.replace(/[০-৯]/g, d => "0123456789"["০১২৩৪৫৬৭৮৯".indexOf(d)]);
    let processedText = banglaToEng(text);

    // 2. EXCLUSION LOGIC: Mask numbers that are part of addresses/locations
    // Keywords to ignore numbers after: Mirpur, Uttara, Sector, Road, House, No, etc.
    const exclusionPattern = /(মিরপুর|উত্তরা|সেক্টর|রোড|বাসা|ফ্ল্যাট|লেভেল|তলা|ব্লক|লেন|ওয়ার্ড|নম্বর|নং|প্লাটফর্ম|গাড়ি|বাস নং|Mirpur|Uttara|Sector|Road|House|Flat|Level|Floor|Block|Lane|Ward|No|Num)[\s\-\.]*[0-9]+/gi;

    // Temporarily replace the numbers in these patterns with 'X' so regex won't pick them up as money
    // Example: "Mirpur 10 rent 50" -> "Mirpur XX rent 50"
    processedText = processedText.replace(exclusionPattern, (match) => match.replace(/[0-9]/g, 'X'));

    // 3. Extract remaining numbers and sum them up
    const matches = processedText.match(/(\d+(\.\d+)?)/g);
    let total = 0;
    if (matches) {
      total = matches.reduce((sum, num) => sum + parseFloat(num), 0);
    }

    setFormData(prev => ({
      ...prev,
      reason: text,
      amount: total // Auto update amount
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
          // Resize logic: Max width 800px to keep base64 string small
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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compress quality 0.7
          setFormData(prev => ({ ...prev, voucherImage: dataUrl }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, voucherImage: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // STRICT SECURITY CHECK: Ensure Staff can only submit for themselves
    if (role === UserRole.STAFF && currentUser) {
       const myself = activeStaff.find(s => s.name === currentUser);
       if (!myself || formData.staffId !== myself.id) {
         alert("Security Alert: আপনি শুধুমাত্র নিজের জন্য বিল সাবমিট করতে পারবেন।");
         return;
       }
    }

    const staff = activeStaff.find(s => s.id === formData.staffId);
    if (!staff) {
      alert("স্টাফ মেম্বার খুঁজে পাওয়া যায়নি।");
      return;
    }

    // Date Handling
    const submitDate = new Date(formData.date);
    const now = new Date();
    // Preserve current time component for ordering
    submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: formData.staffId,
      staffName: staff.name,
      amount: Number(formData.amount),
      reason: formData.reason,
      voucherImage: formData.voucherImage,
      status: 'PENDING',
      createdAt: submitDate.toISOString()
    };
    setExpenses(prev => [newExpense, ...prev]);
    setIsSubmitModalOpen(false);
    
    // NOTIFY
    if (onNotify) {
       onNotify('বিল সাবমিট হয়েছে', `${staff.name} ৳${newExpense.amount} টাকার বিল সাবমিট করেছেন।`, 'INFO');
    }

    // Reset form
    setFormData({ 
      staffId: '', 
      amount: 0, 
      reason: '', 
      voucherImage: '', 
      date: new Date().toISOString().split('T')[0] 
    });
  };

  const updateStatus = (id: string, status: Expense['status']) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    
    const expense = expenses.find(e => e.id === id);
    if (onNotify && expense) {
       let msg = '';
       let type: AppNotification['type'] = 'INFO';
       if (status === 'VERIFIED') { msg = `বিল ভেরিফাইড (৳${expense.amount}) - MD এর অনুমোদনের অপেক্ষায়।`; type = 'INFO'; }
       else if (status === 'APPROVED') { msg = `বিল অনুমোদিত হয়েছে (৳${expense.amount}) - ${expense.staffName}`; type = 'SUCCESS'; }
       else if (status === 'REJECTED') { msg = `বিল বাতিল করা হয়েছে (৳${expense.amount}) - ${expense.staffName}`; type = 'ERROR'; }
       
       onNotify('বিল স্ট্যাটাস আপডেট', msg, type);
    }
  };

  const softDelete = (id: string) => {
    if (confirm('এই বিলটি ডিলিট করতে চান? এটি রিসাইকেল বিনে জমা হবে।')) {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, isDeleted: true } : e));
    }
  };

  const handleClearHistory = () => {
    const candidates = expenses.filter(e => !e.isDeleted && (e.status === 'APPROVED' || e.status === 'REJECTED'));
    const count = candidates.length;

    if (count === 0) {
      alert('হিস্ট্রি ক্লিন করার মতো কোনো অনুমোদিত বা বাতিল বিল নেই।');
      return;
    }

    if (confirm(`সতর্কতা: আপনি কি নিশ্চিত যে ${count} টি পুরনো বিল (Approved/Rejected) ডিলিট করতে চান? \n\nএই ডাটাগুলো রিসাইকেল বিনে জমা হবে। সেখান থেকে আপনি চাইলে পারমানেন্টলি ডিলিট করতে পারবেন।`)) {
      const idsToDelete = new Set(candidates.map(c => c.id));
      setExpenses(prev => prev.map(e => 
        idsToDelete.has(e.id) ? { ...e, isDeleted: true } : e
      ));
      alert('সফলভাবে হিস্ট্রি ক্লিন করা হয়েছে।');
    }
  };

  const handleApproveAll = () => {
    const pendingCount = expenses.filter(e => !e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED')).length;
    if (pendingCount === 0) {
      alert('কোনো পেন্ডিং বা ভেরিফাইড বিল নেই।');
      return;
    }

    if (confirm(`আপনি কি নিশ্চিত যে ${pendingCount} টি পেন্ডিং/ভেরিফাইড বিল একসাথে অ্যাপ্রুভ করতে চান?`)) {
      setExpenses(prev => prev.map(e => 
        (!e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED')) 
          ? { ...e, status: 'APPROVED' } 
          : e
      ));
      if (onNotify) onNotify('বাল্ক অ্যাপ্রুভাল', `${pendingCount} টি বিল একসাথে অনুমোদিত হয়েছে।`, 'SUCCESS');
    }
  };

  const handleOpenSubmitModal = () => {
    let initialStaffId = '';
    if (role === UserRole.STAFF && currentUser) {
      const myself = activeStaff.find(s => s.name === currentUser);
      if (myself) {
        initialStaffId = myself.id;
      }
    }
    
    setFormData({ 
      staffId: initialStaffId, 
      amount: 0, 
      reason: '', 
      voucherImage: '', 
      date: new Date().toISOString().split('T')[0] // Reset to today
    });
    setIsSubmitModalOpen(true);
  };

  // --- Correction Handlers ---
  const openCorrectionModal = (e: Expense) => {
    setCorrectionData({ id: e.id, amount: e.amount, reason: e.reason });
    setIsCorrectionModalOpen(true);
  };

  const saveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionData) return;
    
    setExpenses(prev => prev.map(ex => ex.id === correctionData.id ? { 
      ...ex, 
      amount: Number(correctionData.amount), 
      reason: correctionData.reason 
    } : ex));
    
    setIsCorrectionModalOpen(false);
    setCorrectionData(null);
    if(onNotify) onNotify('বিল সংশোধন', 'একটি বিলের তথ্য সংশোধন করা হয়েছে।', 'WARNING');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  // Helper to get staff ID for display
  const getStaffDisplayId = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
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
               title="অনুমোদিত ও বাতিল বিলগুলো ডিলিট করুন"
             >
               <Eraser className="w-5 h-5" />
               হিস্ট্রি ক্লিন করুন
             </button>
          )}
          {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
            <button 
              onClick={handleOpenSubmitModal}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100"
            >
              <Receipt className="w-5 h-5" />
              নতুন বিল সাবমিট
            </button>
          )}
          {role === UserRole.MD && (
            <button 
              onClick={handleApproveAll}
              className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-100"
            >
              <CheckCheck className="w-5 h-5" />
              সব অ্যাপ্রুভ করুন
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        {/* ... (Existing Filter UI) ... */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">খুঁজুন (কারন বা নাম)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শুরু</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শেষ</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <button 
          onClick={clearFilters}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          title="Clear Filters"
        >
          <FilterX className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExpenses.map((expense) => (
          <div key={expense.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  expense.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                  expense.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                  expense.status === 'VERIFIED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {expense.status === 'PENDING' ? 'পেন্ডিং' : expense.status === 'VERIFIED' ? 'ভেরিফাইড (MD)' : expense.status === 'APPROVED' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'}
                </span>
                
                <div className="flex items-center gap-2">
                  {/* Edit/Correction Button for Admin/MD if pending or verified */}
                  {((role === UserRole.ADMIN || role === UserRole.MD) && (expense.status === 'PENDING' || expense.status === 'VERIFIED')) && (
                    <button 
                      onClick={() => openCorrectionModal(expense)}
                      className="text-orange-500 hover:text-orange-700 transition-colors p-1 hover:bg-orange-50 rounded-full"
                      title="বিল সংশোধন করুন"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {expense.voucherImage && (
                    <button 
                      onClick={() => setViewingVoucher(expense.voucherImage!)}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors p-1 hover:bg-indigo-50 rounded-full"
                      title="ভাউচার দেখুন"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <p className="text-xs text-gray-400">{new Date(expense.createdAt).toLocaleDateString('bn-BD')}</p>
                </div>
              </div>
              
              <h4 className="text-lg font-bold text-gray-800 mb-1">৳ {expense.amount.toLocaleString()}</h4>
              <p className="text-sm text-gray-600 mb-4 font-medium h-10 line-clamp-2">{expense.reason}</p>
              
              <div className="flex items-center gap-3 py-3 border-t border-gray-50">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                  {expense.staffName[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">{expense.staffName}</p>
                  <p className="text-[10px] text-gray-400">ID: {getStaffDisplayId(expense.staffId)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 flex gap-2 border-t border-gray-100">
               {/* ADMIN CONTROLS */}
               {role === UserRole.ADMIN && (
                 <>
                   {/* PENDING: Verify (Send to MD) | Reject | Delete */}
                   {expense.status === 'PENDING' && (
                     <>
                        <button onClick={() => updateStatus(expense.id, 'VERIFIED')} className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors">
                          MD-র কাছে পাঠান
                        </button>
                        <button onClick={() => updateStatus(expense.id, 'REJECTED')} className="flex-1 bg-white text-red-600 border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors">
                          বাতিল
                        </button>
                        <button onClick={() => softDelete(expense.id)} className="px-3 bg-white text-gray-400 border border-gray-200 py-2 rounded-lg hover:text-red-500 hover:border-red-200 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </>
                   )}
                   
                   {/* VERIFIED: Undo (Back to Pending) | Delete */}
                   {expense.status === 'VERIFIED' && (
                     <>
                        <button onClick={() => updateStatus(expense.id, 'PENDING')} className="flex-1 bg-orange-50 text-orange-700 border border-orange-200 py-2 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors flex items-center justify-center gap-2">
                          <RotateCcw className="w-3.5 h-3.5" /> ফেরত আনুন
                        </button>
                        <button onClick={() => softDelete(expense.id)} className="flex-1 bg-red-50 text-red-700 border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                           <Trash2 className="w-3.5 h-3.5" /> ডিলিট করুন
                        </button>
                     </>
                   )}

                   {/* APPROVED/REJECTED: Delete Record */}
                   {(expense.status === 'APPROVED' || expense.status === 'REJECTED') && (
                      <button onClick={() => softDelete(expense.id)} className="w-full bg-white text-gray-400 border border-gray-200 hover:border-red-200 hover:text-red-500 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" /> রেকর্ড মুছে ফেলুন
                      </button>
                   )}
                 </>
               )}

               {/* MD CONTROLS */}
               {role === UserRole.MD && expense.status === 'VERIFIED' && (
                 <>
                   <button onClick={() => updateStatus(expense.id, 'APPROVED')} className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors">
                     <CheckCircle className="w-4 h-4 inline mr-1"/> অ্যাপ্রুভ করুন
                   </button>
                   <button onClick={() => updateStatus(expense.id, 'REJECTED')} className="flex-1 bg-white text-red-600 border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors">
                     বাতিল
                   </button>
                 </>
               )}

               {/* SHARED DELETE ACTION (Approved/Rejected) for ADMIN & MD */}
               {((role === UserRole.ADMIN || role === UserRole.MD) && (expense.status === 'APPROVED' || expense.status === 'REJECTED')) && (
                  <button onClick={() => softDelete(expense.id)} className="w-full bg-white text-gray-400 border border-gray-200 hover:border-red-200 hover:text-red-500 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> রেকর্ড মুছে ফেলুন
                  </button>
               )}
            </div>
          </div>
        ))}
        {filteredExpenses.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400">
             কোনো বিল পাওয়া যায়নি
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <h3 className="font-bold text-xl">নতুন বিল জমা দিন</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">স্টাফ নির্বাচন করুন</label>
                {role === UserRole.STAFF ? (
                  <div className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg font-bold text-gray-600 flex items-center justify-between cursor-not-allowed">
                     <span>{currentUser}</span>
                     <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">Self</span>
                  </div>
                ) : (
                  <select required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})}>
                    <option value="">নির্বাচন করুন</option>
                    {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>

              {/* Date Selection for Admin/MD */}
              {(role === UserRole.ADMIN || role === UserRole.MD) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">তারিখ (Date)</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                  <span>খরচের কারণ ও বিবরণ</span>
                  <span className="text-xs text-indigo-600 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3"/> Auto Calculator</span>
                </label>
                <textarea 
                  required 
                  rows={3} 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  placeholder="যেমন: নাস্তা ৫০, রিক্সা ভাড়া ১০০, টিপস ২০..." 
                  value={formData.reason} 
                  onChange={handleReasonChange} 
                />
                <p className="text-[10px] text-gray-400 mt-1 ml-1">বিবরণে টাকার অংক (বাংলা/ইংরেজি) লিখলে নিচের বক্সে অটোমেটিক যোগ হয়ে যাবে।</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">টাকার পরিমাণ</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                  <input 
                    required 
                    type="number" 
                    className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg text-gray-800" 
                    placeholder="0.00" 
                    value={formData.amount || ''} 
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden"
              >
                 <input 
                   ref={fileInputRef} 
                   type="file" 
                   accept="image/*" 
                   hidden 
                   onChange={handleImageUpload} 
                 />
                 
                 {formData.voucherImage ? (
                   <>
                     <img src={formData.voucherImage} alt="Voucher Preview" className="h-32 w-full object-contain" />
                     <button 
                       type="button"
                       onClick={removeImage}
                       className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                     >
                       <X className="w-4 h-4" />
                     </button>
                   </>
                 ) : (
                   <>
                     <Camera className="w-8 h-8 text-gray-400 mb-2" />
                     <p className="text-xs text-gray-500 font-medium">ভাউচারের ছবি তুলুন বা আপলোড করুন</p>
                   </>
                 )}
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">বিল সাবমিট করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Correction/Edit Modal */}
      {isCorrectionModalOpen && correctionData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-5 border-b border-gray-100 bg-orange-500 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">বিল সংশোধন (Correction)</h3>
                <button onClick={() => setIsCorrectionModalOpen(false)} className="text-orange-100 hover:text-white"><X className="w-5 h-5"/></button>
             </div>
             <form onSubmit={saveCorrection} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">সঠিক টাকার পরিমাণ</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-xl text-gray-800"
                    value={correctionData.amount}
                    onChange={(e) => setCorrectionData({...correctionData, amount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">সংশোধিত কারণ/নোট</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium"
                    value={correctionData.reason}
                    onChange={(e) => setCorrectionData({...correctionData, reason: e.target.value})}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">বিলটি কেন সংশোধন করা হচ্ছে তা উল্লেখ করুন।</p>
                </div>
                <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-100 flex items-center justify-center gap-2">
                   <Edit3 className="w-4 h-4" /> সেইভ করুন
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in duration-200" onClick={() => setViewingVoucher(null)}>
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
        </div>
      )}
    </div>
  );
};

export default ExpenseManagementView;
