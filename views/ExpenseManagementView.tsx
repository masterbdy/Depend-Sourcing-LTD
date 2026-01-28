import React, { useState, useMemo } from 'react';
import { Receipt, Camera, CheckCircle, XCircle, Clock, Eye, Trash2, Search, Calendar, FilterX, RotateCcw } from 'lucide-react';
import { Expense, Staff, UserRole } from '../types';

interface ExpenseProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  staffList: Staff[];
  role: UserRole;
}

const ExpenseManagementView: React.FC<ExpenseProps> = ({ expenses, setExpenses, staffList, role }) => {
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [formData, setFormData] = useState({ staffId: '', amount: 0, reason: '' });
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = activeStaff.find(s => s.id === formData.staffId);
    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: formData.staffId,
      staffName: staff?.name || 'Unknown',
      amount: Number(formData.amount),
      reason: formData.reason,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    setExpenses(prev => [newExpense, ...prev]);
    setIsSubmitModalOpen(false);
    setFormData({ staffId: '', amount: 0, reason: '' });
  };

  const updateStatus = (id: string, status: Expense['status']) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  };

  const softDelete = (id: string) => {
    if (confirm('এই বিলটি ডিলিট করতে চান?')) {
      setExpenses(prev => prev.map(e => e.id === id ? { ...e, isDeleted: true } : e));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">খরচ ও ভাউচার ম্যানেজমেন্ট</h2>
        {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
          <button 
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100"
          >
            <Receipt className="w-5 h-5" />
            নতুন বিল সাবমিট
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
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
                <p className="text-xs text-gray-400">{new Date(expense.createdAt).toLocaleDateString('bn-BD')}</p>
              </div>
              
              <h4 className="text-lg font-bold text-gray-800 mb-1">৳ {expense.amount.toLocaleString()}</h4>
              <p className="text-sm text-gray-600 mb-4 font-medium h-10 line-clamp-2">{expense.reason}</p>
              
              <div className="flex items-center gap-3 py-3 border-t border-gray-50">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                  {expense.staffName[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-700">{expense.staffName}</p>
                  <p className="text-[10px] text-gray-400">Staff Member</p>
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
                <select required className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})}>
                  <option value="">নির্বাচন করুন</option>
                  {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">টাকার পরিমাণ</label>
                <input required type="number" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="0.00" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">খরচের কারণ</label>
                <textarea required rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="বিস্তারিত লিখুন..." value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
              </div>
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                 <Camera className="w-8 h-8 text-gray-400 mb-2" />
                 <p className="text-xs text-gray-500 font-medium">ভাউচারের ছবি তুলুন বা আপলোড করুন</p>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">বিল সাবমিট করুন</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagementView;