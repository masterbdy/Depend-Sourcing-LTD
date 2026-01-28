
import React, { useState, useMemo } from 'react';
import { PlusCircle, History, Landmark, Wallet, ArrowUpCircle, Trash2, Search, Calendar, FilterX, Info } from 'lucide-react';
import { FundEntry, UserRole } from '../types';

interface FundProps {
  funds: FundEntry[];
  setFunds: React.Dispatch<React.SetStateAction<FundEntry[]>>;
  totalFund: number;
  cashOnHand: number;
  role: UserRole;
}

const FundLedgerView: React.FC<FundProps> = ({ funds, setFunds, totalFund, cashOnHand, role }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ amount: 0, note: '' });

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtered Data Calculation
  const filteredFunds = useMemo(() => {
    return funds
      .filter(f => !f.isDeleted)
      .filter(f => {
        const matchesSearch = f.note.toLowerCase().includes(searchTerm.toLowerCase());
        
        const fundDate = new Date(f.date).setHours(0, 0, 0, 0);
        const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

        const matchesDate = (!start || fundDate >= start) && (!end || fundDate <= end);

        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [funds, searchTerm, startDate, endDate]);

  // Calculate total for the visible/filtered period
  const periodTotal = useMemo(() => {
    return filteredFunds.reduce((sum, f) => sum + f.amount, 0);
  }, [filteredFunds]);

  const isFilterActive = searchTerm !== '' || startDate !== '' || endDate !== '';

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
    if (confirm('এই ফান্ড রেকর্ডটি ডিলিট করতে চান?')) {
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
          </div>
          <div className="bg-indigo-500/50 p-4 rounded-2xl"><Wallet className="w-8 h-8 text-white" /></div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg"><History className="w-5 h-5 text-indigo-600" /></div>
            <h3 className="font-bold text-gray-800">ফান্ড লেনদেন ইতিহাস</h3>
          </div>
          {(role === UserRole.ADMIN || role === UserRole.MD) && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-50 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              ফান্ড যোগ করুন
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

        {/* Filter Summary Badge */}
        {isFilterActive && (
          <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-700">
              <Info className="w-4 h-4" />
              <span className="text-xs font-bold">ফিল্টার করা সময়ের মোট প্রাপ্তি:</span>
            </div>
            <span className="text-sm font-black text-indigo-700">৳ {periodTotal.toLocaleString()}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">পরিমাণ</th>
                {role === UserRole.ADMIN && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredFunds.map((fund) => (
                <tr key={fund.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                    {new Date(fund.date).toLocaleDateString('bn-BD', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                     <p className="text-sm font-bold text-gray-800">{fund.note}</p>
                     <p className="text-[10px] text-green-500 font-black uppercase tracking-tighter">Received from MD</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">৳ {fund.amount.toLocaleString()}</span>
                  </td>
                  {role === UserRole.ADMIN && (
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteEntry(fund.id)} 
                        className="p-2 text-gray-300 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredFunds.length === 0 && (
                <tr>
                  <td colSpan={role === UserRole.ADMIN ? 4 : 3} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Search className="w-12 h-12" />
                      <p className="text-lg font-bold">কোনো ফান্ড লেনদেন পাওয়া যায়নি</p>
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
