import React, { useState, useMemo } from 'react';
import { PlusCircle, History, Landmark, Wallet, ArrowUpCircle, Trash2, Search, Calendar, FilterX, Info, ArrowDownLeft, ArrowUpRight, Banknote, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { FundEntry, UserRole, Expense, AdvanceLog } from '../types';

interface FundProps {
  funds: FundEntry[];
  setFunds: React.Dispatch<React.SetStateAction<FundEntry[]>>;
  expenses: Expense[];
  advances: AdvanceLog[];
  totalFund: number;
  cashOnHand: number;
  role: UserRole;
}

// Unified Transaction Type for Display
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'FUND_IN' | 'EXPENSE_OUT' | 'ADVANCE_OUT'; // We are simplifying to In/Out
  originalType: 'FUND' | 'EXPENSE' | 'ADVANCE';
  subType?: 'SALARY' | 'REGULAR'; // Added to distinguish advances
  displayType: string;
}

const FundLedgerView: React.FC<FundProps> = ({ funds = [], setFunds, expenses = [], advances = [], totalFund, cashOnHand, role }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    amount: 0, 
    note: '',
    date: new Date().toISOString().split('T')[0] 
  });

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- MERGE & PREPARE DATA ---
  const allTransactions = useMemo(() => {
    const list: Transaction[] = [];

    // 1. Funds (Money In / Credit)
    if (Array.isArray(funds)) {
      funds.forEach(f => {
        if (!f.isDeleted) {
          list.push({
            id: f.id,
            date: f.date,
            description: f.note,
            amount: f.amount,
            type: 'FUND_IN',
            originalType: 'FUND',
            displayType: 'ফান্ড জমা (Credit)'
          });
        }
      });
    }

    // 2. Approved Expenses (Money Out / Debit)
    if (Array.isArray(expenses)) {
      expenses.forEach(e => {
        if (!e.isDeleted && e.status === 'APPROVED') {
          list.push({
            id: e.id,
            date: e.createdAt,
            description: `${e.reason} (${e.staffName})`,
            amount: e.amount,
            type: 'EXPENSE_OUT',
            originalType: 'EXPENSE',
            displayType: 'খরচ (Debit)'
          });
        }
      });
    }

    // 3. Advances Given (Money Out / Debit) - Assuming positive amount is Money Out
    if (Array.isArray(advances)) {
      advances.forEach(a => {
        if (!a.isDeleted && a.amount > 0) {
          const isSalary = a.type === 'SALARY';
          list.push({
            id: a.id,
            date: a.date,
            description: `${isSalary ? 'বেতন অগ্রিম' : 'সাধারণ অগ্রিম'}: ${a.staffName} ${a.note ? `(${a.note})` : ''}`,
            amount: a.amount,
            type: 'ADVANCE_OUT',
            originalType: 'ADVANCE',
            subType: a.type,
            displayType: isSalary ? 'বেতন অগ্রিম (Salary Adv)' : 'সাধারণ অগ্রিম (Regular Adv)'
          });
        }
      });
    }

    // Sort by Date (Newest First)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [funds, expenses, advances]);

  // --- FILTERING LOGIC ---
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      // Text Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = t.description.toLowerCase().includes(searchLower);

      // Date Range
      const tDate = new Date(t.date).setHours(0, 0, 0, 0);
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
      const matchesDate = (!start || tDate >= start) && (!end || tDate <= end);

      return matchesSearch && matchesDate;
    });
  }, [allTransactions, searchTerm, startDate, endDate]);

  const creditTransactions = filteredTransactions.filter(t => t.type === 'FUND_IN');
  const debitTransactions = filteredTransactions.filter(t => t.type !== 'FUND_IN');

  const isFilterActive = searchTerm !== '' || startDate !== '' || endDate !== '';

  const handleAddFund = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitDate = new Date(formData.date);
    const now = new Date();
    submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newEntry: FundEntry = {
      id: Math.random().toString(36).substr(2, 9),
      amount: Number(formData.amount),
      note: formData.note,
      date: submitDate.toISOString()
    };
    setFunds(prev => [...prev, newEntry]);
    setIsModalOpen(false);
    setFormData({ amount: 0, note: '', date: new Date().toISOString().split('T')[0] });
  };

  const deleteEntry = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setFunds(prev => prev.map(f => f.id === deleteConfirmId ? { ...f, isDeleted: true } : f));
      setDeleteConfirmId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Premium Compact Balance Summary */}
      {/* Changed to grid-cols-2 on mobile */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        
        {/* Card 1 */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-5 border border-b-4 border-r-4 border-blue-100 dark:border-blue-900 shadow-sm group">
           {/* Background Decor */}
           <Landmark className="absolute -right-6 -bottom-6 w-24 h-24 md:w-32 md:h-32 text-blue-50 dark:text-blue-900/30 rotate-12 group-hover:scale-110 transition-transform duration-500" />
           <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full"></div>

           <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center gap-1.5 mb-1">
                 {/* Smaller icon container */}
                 <div className="p-1 md:p-1.5 bg-blue-50 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                    <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                 </div>
                 <p className="text-[8px] md:text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Fund</p>
              </div>
              <div>
                 {/* Smaller font for Amount on mobile */}
                 <h3 className="text-xl md:text-3xl font-black text-gray-800 dark:text-white tracking-tight truncate">৳ {totalFund.toLocaleString()}</h3>
                 <p className="text-[8px] md:text-[9px] text-gray-400 dark:text-gray-500 font-medium mt-0.5 md:mt-1 truncate">সর্বমোট প্রাপ্ত ফান্ড</p>
              </div>
           </div>
        </div>

        {/* Card 2 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl md:rounded-2xl p-4 md:p-5 border border-b-4 border-r-4 border-slate-950 shadow-xl group">
           {/* Background Decor */}
           <Wallet className="absolute -right-6 -bottom-6 w-24 h-24 md:w-32 md:h-32 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-500" />
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
           
           {/* Glow Effect */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50 blur-sm"></div>

           <div className="relative z-10 flex flex-col justify-between h-full text-white">
              <div className="flex items-center justify-between mb-1">
                 <div className="flex items-center gap-1.5">
                    <div className="p-1 md:p-1.5 bg-white/10 rounded-lg text-emerald-400 backdrop-blur-md border border-white/10">
                       <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <p className="text-[8px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest">Cash In Hand</p>
                 </div>
                 <span className="flex h-1.5 w-1.5 md:h-2 md:w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-emerald-500"></span>
                 </span>
              </div>
              <div>
                 <h3 className="text-xl md:text-3xl font-black text-white tracking-tight drop-shadow-md truncate">৳ {cashOnHand.toLocaleString()}</h3>
                 <p className="text-[8px] md:text-[9px] text-slate-400 font-medium mt-0.5 md:mt-1 flex items-center gap-1 truncate">
                    বর্তমান ক্যাশ ব্যালেন্স
                 </p>
              </div>
           </div>
        </div>

      </div>

      {/* Filter Toolbar (Global for both tables) */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">সার্চ করুন</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="নোট বা বিবরণ..." 
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">শুরু তারিখ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">শেষ তারিখ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {isFilterActive && (
            <button 
              onClick={clearFilters}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100"
              title="ফিল্টার মুছুন"
            >
              <FilterX className="w-5 h-5" />
            </button>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT: FUND HISTORY (CREDIT) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-green-100 dark:border-green-900/30 overflow-hidden h-fit">
             <div className="p-4 border-b border-green-50 dark:border-green-900/30 flex justify-between items-center bg-green-50/30 dark:bg-green-900/10">
                <div className="flex items-center gap-2">
                   <div className="bg-green-100 dark:bg-green-900/50 p-1.5 rounded-lg text-green-600 dark:text-green-400"><ArrowDownLeft className="w-4 h-4" /></div>
                   <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">ফান্ড জমার হিস্ট্রি (Credit)</h3>
                </div>
                {(role === UserRole.ADMIN || role === UserRole.MD) && (
                    <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-green-700 transition-all flex items-center gap-1 shadow-md active:scale-95"
                    >
                    <PlusCircle className="w-3 h-3" />
                    নতুন ফান্ড
                    </button>
                )}
             </div>
             <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                <table className="w-full text-left">
                   <thead className="bg-green-50/50 dark:bg-green-900/20 sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                         <th className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                         <th className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">বিবরণ</th>
                         <th className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">টাকা (In)</th>
                         {(role === UserRole.ADMIN || role === UserRole.MD) && <th className="px-4 py-2 text-right"></th>}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {creditTransactions.map((t) => (
                         <tr key={t.id} className="hover:bg-green-50/10 dark:hover:bg-green-900/10 transition-colors group">
                            <td className="px-4 py-2.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                               {new Date(t.date).toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="px-4 py-2.5 text-[11px] text-gray-700 dark:text-gray-300 font-medium">
                               {t.description}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-black text-green-600 dark:text-green-400 whitespace-nowrap">
                               ৳ {t.amount.toLocaleString()}
                            </td>
                            {(role === UserRole.ADMIN || role === UserRole.MD) && (
                                <td className="px-4 py-2.5 text-right">
                                    <button 
                                    onClick={() => deleteEntry(t.id)} 
                                    className="text-red-400 hover:text-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete Fund Entry"
                                    >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </td>
                            )}
                         </tr>
                      ))}
                      {creditTransactions.length === 0 && (
                         <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-xs">কোনো ফান্ড জমা নেই</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>

          {/* RIGHT: DEBIT HISTORY (EXPENSES & ADVANCES) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 overflow-hidden h-fit">
             <div className="p-4 border-b border-red-50 dark:border-red-900/30 flex items-center gap-2 bg-red-50/30 dark:bg-red-900/10">
                <div className="bg-red-100 dark:bg-red-900/50 p-1.5 rounded-lg text-red-600 dark:text-red-400"><ArrowUpRight className="w-4 h-4" /></div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">খরচ ও অ্যাডভান্স (Debit)</h3>
             </div>
             <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                <table className="w-full text-left">
                   <thead className="bg-red-50/50 dark:bg-red-900/20 sticky top-0 z-10 backdrop-blur-sm">
                      <tr>
                         <th className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                         <th className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">বিবরণ</th>
                         <th className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">ধরন</th>
                         <th className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">টাকা (Out)</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {debitTransactions.map((t) => (
                         <tr key={t.id} className="hover:bg-red-50/10 dark:hover:bg-red-900/10 transition-colors">
                            <td className="px-4 py-2.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                               {new Date(t.date).toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="px-4 py-2.5 text-[11px] text-gray-700 dark:text-gray-300 font-medium">
                               <p className="line-clamp-1" title={t.description}>{t.description}</p>
                            </td>
                            <td className="px-4 py-2.5">
                               <span className={`text-[8px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded flex items-center gap-1 w-fit whitespace-nowrap ${
                                  t.originalType === 'ADVANCE' ? (t.subType === 'SALARY' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300') : 
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                               }`}>
                                  {t.originalType === 'EXPENSE' ? 'খরচ' : (t.subType === 'SALARY' ? 'বেতন অগ্রিম' : 'অগ্রিম')}
                               </span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-black text-red-600 dark:text-red-400 whitespace-nowrap">
                               ৳ {t.amount.toLocaleString()}
                            </td>
                         </tr>
                      ))}
                      {debitTransactions.length === 0 && (
                         <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-xs">কোনো খরচ বা অ্যাডভান্স নেই</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>

      </div>

      {/* Add Fund Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-indigo-600 text-white">
              <h3 className="font-bold text-xl">নতুন ফান্ড যুক্ত করুন</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors text-2xl">×</button>
            </div>
            <form onSubmit={handleAddFund} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">তারিখ (Date)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="date"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-800 dark:text-white"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">টাকার পরিমাণ (MD থেকে প্রাপ্ত)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">৳</span>
                  <input required type="number" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg dark:text-white" placeholder="0.00" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">নোট/বিবরণ</label>
                <input required type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white" placeholder="উদা: জানুয়ারী মাসের বাজেট" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">বাতিল</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95">
                  <ArrowUpCircle className="w-5 h-5" />
                  ফান্ড জমা করুন
                </button>
              </div>
            </form>
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
                আপনি এই ফান্ড রেকর্ডটি মুছে ফেলতে চাচ্ছেন। এটি রিসাইকেল বিনে জমা হবে।
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
    </div>
  );
};

export default FundLedgerView;