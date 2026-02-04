
import React, { useState, useMemo } from 'react';
import { PlusCircle, History, Landmark, Wallet, ArrowUpCircle, Trash2, Search, Calendar, FilterX, Info, ArrowDownLeft, ArrowUpRight, Banknote } from 'lucide-react';
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
    if (window.confirm('সতর্কতা: আপনি কি নিশ্চিত যে এই ফান্ড রেকর্ডটি ডিলিট করতে চান?')) {
      setFunds(prev => prev.map(f => f.id === id ? { ...f, isDeleted: true } : f));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-8">
      {/* Live Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition-colors">
          <div>
            <p className="text-sm text-gray-400 font-medium mb-1 uppercase tracking-wider">মোট প্রাপ্ত ফান্ড (MD)</p>
            <h3 className="text-3xl font-black text-gray-800">৳ {totalFund.toLocaleString()}</h3>
          </div>
          <div className="bg-blue-100 p-4 rounded-2xl group-hover:scale-110 transition-transform"><Landmark className="w-8 h-8 text-blue-600" /></div>
        </div>
        <div className="bg-indigo-600 p-8 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-between text-white transition-all hover:bg-indigo-700">
          <div>
            <p className="text-sm text-indigo-100 font-medium mb-1 uppercase tracking-wider">বর্তমান ক্যাশ ব্যালেন্স</p>
            <h3 className="text-3xl font-black">৳ {cashOnHand.toLocaleString()}</h3>
            <p className="text-[10px] text-indigo-200 mt-1 opacity-80">(ফান্ড - খরচ - অ্যাডভান্স)</p>
          </div>
          <div className="bg-indigo-500/50 p-4 rounded-2xl"><Wallet className="w-8 h-8 text-white" /></div>
        </div>
      </div>

      {/* Filter Toolbar (Global for both tables) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">সার্চ করুন</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="নোট বা বিবরণ..." 
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শুরু তারিখ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শেষ তারিখ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {isFilterActive && (
            <button 
              onClick={clearFilters}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
              title="ফিল্টার মুছুন"
            >
              <FilterX className="w-5 h-5" />
            </button>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT: FUND HISTORY (CREDIT) */}
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden h-fit">
             <div className="p-5 border-b border-green-50 flex justify-between items-center bg-green-50/30">
                <div className="flex items-center gap-2">
                   <div className="bg-green-100 p-2 rounded-lg text-green-600"><ArrowDownLeft className="w-5 h-5" /></div>
                   <h3 className="font-bold text-gray-800">ফান্ড জমার হিস্ট্রি (Credit)</h3>
                </div>
                {(role === UserRole.ADMIN || role === UserRole.MD) && (
                    <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                    >
                    <PlusCircle className="w-3.5 h-3.5" />
                    নতুন ফান্ড
                    </button>
                )}
             </div>
             <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left">
                   <thead className="bg-green-50/50 sticky top-0 z-10">
                      <tr>
                         <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                         <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ</th>
                         <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">টাকা (In)</th>
                         {role === UserRole.ADMIN && <th className="px-4 py-3 text-right"></th>}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {creditTransactions.map((t) => (
                         <tr key={t.id} className="hover:bg-green-50/10 transition-colors group">
                            <td className="px-4 py-3 text-xs font-bold text-gray-600 whitespace-nowrap">
                               {new Date(t.date).toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                               {t.description}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-black text-green-600 whitespace-nowrap">
                               ৳ {t.amount.toLocaleString()}
                            </td>
                            {role === UserRole.ADMIN && (
                                <td className="px-4 py-3 text-right">
                                    <button 
                                    onClick={() => deleteEntry(t.id)} 
                                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete"
                                    >
                                    <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden h-fit">
             <div className="p-5 border-b border-red-50 flex items-center gap-2 bg-red-50/30">
                <div className="bg-red-100 p-2 rounded-lg text-red-600"><ArrowUpRight className="w-5 h-5" /></div>
                <h3 className="font-bold text-gray-800">খরচ ও অ্যাডভান্স (Debit)</h3>
             </div>
             <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left">
                   <thead className="bg-red-50/50 sticky top-0 z-10">
                      <tr>
                         <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                         <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ</th>
                         <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">ধরন</th>
                         <th className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">টাকা (Out)</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {debitTransactions.map((t) => (
                         <tr key={t.id} className="hover:bg-red-50/10 transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-gray-600 whitespace-nowrap">
                               {new Date(t.date).toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                               <p className="line-clamp-1">{t.description}</p>
                            </td>
                            <td className="px-4 py-3">
                               <span className={`text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded flex items-center gap-1 w-fit whitespace-nowrap ${
                                  t.originalType === 'ADVANCE' ? (t.subType === 'SALARY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700') : 
                                  'bg-red-100 text-red-700'
                               }`}>
                                  {t.originalType === 'EXPENSE' ? 'খরচ' : (t.subType === 'SALARY' ? 'বেতন অগ্রিম' : 'অগ্রিম')}
                               </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-black text-red-600 whitespace-nowrap">
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
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <h3 className="font-bold text-xl">নতুন ফান্ড যুক্ত করুন</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors text-2xl">×</button>
            </div>
            <form onSubmit={handleAddFund} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">তারিখ (Date)</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="date"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-800"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">টাকার পরিমাণ (MD থেকে প্রাপ্ত)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">৳</span>
                  <input required type="number" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg" placeholder="0.00" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">নোট/বিবরণ</label>
                <input required type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="উদা: জানুয়ারী মাসের বাজেট" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all">বাতিল</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95">
                  <ArrowUpCircle className="w-5 h-5" />
                  ফান্ড জমা করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundLedgerView;
