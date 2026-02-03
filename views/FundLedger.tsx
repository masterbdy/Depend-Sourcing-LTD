
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

const FundLedgerView: React.FC<FundProps> = ({ funds, setFunds, expenses, advances, totalFund, cashOnHand, role }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ amount: 0, note: '' });

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CREDIT' | 'DEBIT'>('ALL');

  // --- MERGE & PREPARE DATA ---
  const allTransactions = useMemo(() => {
    const list: Transaction[] = [];

    // 1. Funds (Money In / Credit)
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

    // 2. Approved Expenses (Money Out / Debit)
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

    // 3. Advances Given (Money Out / Debit) - Assuming positive amount is Money Out
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

      // Type Filter
      let matchesType = true;
      if (filterType === 'CREDIT') matchesType = t.type === 'FUND_IN';
      if (filterType === 'DEBIT') matchesType = t.type === 'EXPENSE_OUT' || t.type === 'ADVANCE_OUT';

      return matchesSearch && matchesDate && matchesType;
    });
  }, [allTransactions, searchTerm, startDate, endDate, filterType]);

  const isFilterActive = searchTerm !== '' || startDate !== '' || endDate !== '' || filterType !== 'ALL';

  const handleAddFund = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: FundEntry = {
      id: Math.random().toString(36).substr(2, 9),
      amount: Number(formData.amount),
      note: formData.note,
      date: new Date().toISOString()
    };
    setFunds(prev => [...prev, newEntry]);
    setIsModalOpen(false);
    setFormData({ amount: 0, note: '' });
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
    setFilterType('ALL');
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

      {/* Transaction History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg"><History className="w-5 h-5 text-indigo-600" /></div>
            <div>
               <h3 className="font-bold text-gray-800">লেনদেনের খাতা (Cashbook)</h3>
               <p className="text-xs text-gray-400">ফান্ড জমা, খরচ এবং অ্যাডভান্সের সম্মিলিত তালিকা</p>
            </div>
          </div>
          {(role === UserRole.ADMIN || role === UserRole.MD) && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-50 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              ফান্ড জমা করুন
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-5 bg-gray-50 border-b border-gray-100 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">সার্চ করুন</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="নোট বা বিবরণ..." 
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full sm:w-auto">
             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">ধরণ (Type)</label>
             <select 
               className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
               value={filterType}
               onChange={(e) => setFilterType(e.target.value as any)}
             >
                <option value="ALL">সব লেনদেন (All)</option>
                <option value="CREDIT">শুধুমাত্র জমা (Credit)</option>
                <option value="DEBIT">খরচ ও অ্যাডভান্স (Debit)</option>
             </select>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শুরু তারিখ</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="date" 
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ধরন</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Debit (Out)</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Credit (In)</th>
                {role === UserRole.ADMIN && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className={`hover:bg-gray-50 transition-colors group ${t.type === 'FUND_IN' ? 'bg-green-50/20' : ''}`}>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('bn-BD', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                     <p className="text-sm font-bold text-gray-800 line-clamp-1">{t.description}</p>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-1 rounded-full flex items-center gap-1 w-fit ${
                        t.type === 'FUND_IN' ? 'bg-green-100 text-green-700' :
                        t.originalType === 'ADVANCE' ? (t.subType === 'SALARY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700') : 
                        'bg-red-100 text-red-700'
                     }`}>
                        {t.type === 'FUND_IN' ? <ArrowDownLeft className="w-3 h-3"/> : <ArrowUpRight className="w-3 h-3"/>}
                        {t.displayType}
                     </span>
                  </td>
                  
                  {/* DEBIT COLUMN (Money Out) */}
                  <td className="px-6 py-4 text-right">
                    {t.type !== 'FUND_IN' ? (
                       <span className="text-sm font-black text-red-600">৳ {t.amount.toLocaleString()}</span>
                    ) : <span className="text-gray-300">-</span>}
                  </td>

                  {/* CREDIT COLUMN (Money In) */}
                  <td className="px-6 py-4 text-right">
                    {t.type === 'FUND_IN' ? (
                       <span className="text-sm font-black text-green-600">৳ {t.amount.toLocaleString()}</span>
                    ) : <span className="text-gray-300">-</span>}
                  </td>

                  {role === UserRole.ADMIN && (
                    <td className="px-6 py-4 text-right">
                      {t.originalType === 'FUND' && (
                        <button 
                          onClick={() => deleteEntry(t.id)} 
                          className="p-2 text-gray-300 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          title="ফান্ড ডিলিট করুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={role === UserRole.ADMIN ? 6 : 5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Search className="w-12 h-12" />
                      <p className="text-lg font-bold">কোনো লেনদেন পাওয়া যায়নি</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
