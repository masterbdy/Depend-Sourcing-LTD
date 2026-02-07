
import React, { useMemo } from 'react';
import { TrendingDown, AlertCircle, Clock, ShieldAlert, Landmark, Wallet, Trophy, Crown, ArrowUpRight, Coins, Banknote, WalletCards, Calendar, Sparkles } from 'lucide-react';
import { Expense, UserRole, Staff, AdvanceLog } from '../types';

interface DashboardProps {
  totalExpense: number;
  pendingApprovals: number;
  expenses: Expense[];
  cloudError: string | null;
  totalFund: number;
  cashOnHand: number;
  role: UserRole | null;
  staffList: Staff[];
  advances: AdvanceLog[];
  currentUser: string | null;
}

const DashboardView: React.FC<DashboardProps> = ({ totalExpense, pendingApprovals, expenses = [], cloudError, totalFund, cashOnHand, role, staffList = [], advances = [], currentUser }) => {
  const recentActivities = useMemo(() => {
    return [...(expenses || [])].filter(e => !e.isDeleted).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);
  }, [expenses]);

  // --- STATS CALCULATION ---
  // Advance Breakdown
  const { regularAdvance, salaryAdvance, totalAdvance } = useMemo(() => {
    const safeAdvances = advances || [];
    const regular = safeAdvances.filter(a => !a.isDeleted && a.type !== 'SALARY').reduce((sum, a) => sum + Number(a.amount), 0);
    const salary = safeAdvances.filter(a => !a.isDeleted && a.type === 'SALARY').reduce((sum, a) => sum + Number(a.amount), 0);
    return { regularAdvance: regular, salaryAdvance: salary, totalAdvance: regular + salary };
  }, [advances]);

  // Actual Cash in Hand (Fund - Total Advance)
  const actualCashOnHand = totalFund - totalAdvance;

  // --- LEDGER PAYABLE CALCULATION (NEW LOGIC - OPTIMIZED) ---
  const totalLedgerPayable = useMemo(() => {
    const safeStaffList = staffList || [];
    const safeExpenses = expenses || [];
    const safeAdvances = advances || [];

    return safeStaffList.reduce((acc, staff) => {
        if (staff.deletedAt) return acc; // Skip deleted staff
        
        const approvedExp = safeExpenses
          .filter(e => !e.isDeleted && e.status === 'APPROVED' && e.staffId === staff.id)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        
        const regularAdv = safeAdvances
          .filter(a => !a.isDeleted && a.type !== 'SALARY' && a.staffId === staff.id)
          .reduce((sum, a) => sum + Number(a.amount), 0);
        
        const balance = regularAdv - approvedExp;
        return balance < 0 ? acc + Math.abs(balance) : acc;
    }, 0);
  }, [staffList, expenses, advances]);

  const isStaff = role === UserRole.STAFF;
  const isManagement = role === UserRole.ADMIN || role === UserRole.MD;

  // Helper to format large numbers
  const formatPoints = (num: number) => {
    if (num >= 100000) return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num;
  };

  // --- STAFF SPECIFIC STATS ---
  const { myApprovedTotal, myPendingCount } = useMemo(() => {
    const safeExpenses = expenses || [];
    const myExps = safeExpenses.filter(e => e.staffName === currentUser && !e.isDeleted);
    return {
      myApprovedTotal: myExps.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount), 0),
      myPendingCount: myExps.filter(e => e.status === 'PENDING' || e.status === 'VERIFIED').length
    };
  }, [expenses, currentUser]);
  
  const myTotalReceived = useMemo(() => {
    return (advances || []).filter(a => a.staffName === currentUser && !a.isDeleted).reduce((sum, a) => sum + Number(a.amount), 0);
  }, [advances, currentUser]);

  const myRecentAdvances = useMemo(() => {
    if (!isStaff) return [];
    return (advances || [])
      .filter(a => a.staffName === currentUser && !a.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [advances, currentUser, isStaff]);

  // --- CHAMPIONS LOGIC ---
  const { champions, monthName } = useMemo(() => {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthName = prevDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });

    const sortedChampions = (staffList || [])
      .filter(s => s.status === 'ACTIVE' && !s.deletedAt && s.role === UserRole.STAFF && (s.name || '').toLowerCase().includes('office') === false)
      .map(s => {
          if (s.prevMonthName === prevMonthStr) {
             return { ...s, score: s.prevMonthPoints || 0 };
          }
          if (s.pointsMonth === prevMonthStr) {
             return { ...s, score: s.points || 0 };
          }
          return { ...s, score: 0 };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return { champions: sortedChampions, monthName: prevMonthName };
  }, [staffList]);

  return (
    <div className="space-y-6">
      
      {/* Cloud Connection Error */}
      {cloudError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-4">
           <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full shrink-0">
             <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
           </div>
           <div>
             <h3 className="text-sm font-bold text-red-800 dark:text-red-300">ডাটাবেস কানেকশন সমস্যা ({cloudError})</h3>
             <p className="text-xs text-red-600 dark:text-red-400">ইন্টারনেট কানেকশন চেক করুন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
           </div>
        </div>
      )}

      {/* ULTRA PREMIUM Header Banner - Compact Version */}
      <div className="relative overflow-hidden rounded-3xl shadow-xl border border-gray-800 bg-[#0B1120] group">
         {/* Background Gradients & Glows */}
         <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-[#0f172a] to-indigo-950 z-0"></div>
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full -mt-20 -mr-20 z-0"></div>
         <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 blur-[80px] rounded-full -mb-10 -ml-10 z-0"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 z-0 mix-blend-overlay"></div>

         <div className="relative z-10 px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="text-center md:text-left">
                 <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <span className="h-[1px] w-6 bg-indigo-500/50"></span>
                    <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-[0.3em]">Est. 2015</p>
                    <span className="h-[1px] w-6 bg-indigo-500/50"></span>
                 </div>
                 <h2 className="text-2xl md:text-4xl font-black tracking-tight text-white leading-tight drop-shadow-lg">
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">DEPEND</span> SOURCING
                   <span className="text-lg md:text-xl font-light text-gray-400 ml-2">LTD.</span>
                 </h2>
                 <p className="text-[10px] md:text-xs text-gray-400 font-medium tracking-[0.2em] mt-1.5 uppercase flex items-center justify-center md:justify-start gap-2">
                   <Sparkles className="w-3 h-3 text-yellow-500" /> Promise Beyond Business
                 </p>
             </div>
             
             {/* Glassmorphism Date Card - Compact */}
             <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl hover:bg-white/10 transition-colors">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
                   <Calendar className="w-5 h-5" />
                </div>
                <div className="text-left">
                   <p className="text-[9px] uppercase font-bold text-indigo-200 tracking-widest leading-none mb-1 opacity-80">
                     Today's Date
                   </p>
                   <p className="text-lg font-bold text-white leading-none">
                     {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long' })}
                   </p>
                   <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                     {new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric' })}
                   </p>
                </div>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stats & Activity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Stats Grid (MANAGEMENT VIEW) */}
          {isManagement && (
            <>
              {/* Row 1: Fund & Cash (Clean White Design) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Total Fund */}
                <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-6 -mt-6 opacity-50 group-hover:scale-125 transition-transform duration-500"></div>
                   <div className="relative z-10 flex items-center gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3.5 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm">
                         <Landmark className="w-7 h-7" />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">বর্তমান ক্যাশ ফান্ড</p>
                         <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">৳ {totalFund.toLocaleString()}</h3>
                      </div>
                   </div>
                </div>

                {/* Cash In Hand */}
                <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 rounded-full -mr-6 -mt-6 opacity-50 group-hover:scale-125 transition-transform duration-500"></div>
                   <div className="relative z-10 flex items-center gap-4">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3.5 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-sm">
                         <Wallet className="w-7 h-7" />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">হাতে নগদ (Net Cash)</p>
                         <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">৳ {actualCashOnHand.toLocaleString()}</h3>
                         <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Available
                         </p>
                      </div>
                   </div>
                </div>

              </div>

              {/* Row 2: Advance Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-orange-100 dark:border-orange-900/30 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 dark:bg-orange-500/10 rounded-full -mr-8 -mt-8 opacity-50"></div>
                    <div className="relative z-10">
                       <div className="flex items-center gap-3 mb-3">
                          <div className="bg-orange-100 dark:bg-orange-900/30 p-2.5 rounded-xl text-orange-600 dark:text-orange-400">
                             <Banknote className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black text-orange-400 uppercase tracking-widest">রেগুলার অ্যাডভান্স</span>
                       </div>
                       <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">৳ {regularAdvance.toLocaleString()}</h3>
                       <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">কর্মচারীদের দেওয়া সাধারণ অগ্রিম</p>
                    </div>
                 </div>

                 <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-purple-100 dark:border-purple-900/30 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 dark:bg-purple-500/10 rounded-full -mr-8 -mt-8 opacity-50"></div>
                    <div className="relative z-10">
                       <div className="flex items-center gap-3 mb-3">
                          <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-xl text-purple-600 dark:text-purple-400">
                             <WalletCards className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black text-purple-400 uppercase tracking-widest">স্যালারি অ্যাডভান্স</span>
                       </div>
                       <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">৳ {salaryAdvance.toLocaleString()}</h3>
                       <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">বেতন থেকে সমন্বয়যোগ্য অগ্রিম</p>
                    </div>
                 </div>
              </div>

              {/* Row 3: Expense & Payable Bill (UPDATED) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl text-indigo-600 dark:text-indigo-400">
                      <TrendingDown className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">মোট খরচ (অনুমোদিত)</p>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">৳ {totalExpense.toLocaleString()}</h3>
                  </div>
                </div>
                
                {/* Ledger Payable Bill Card */}
                <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-red-100 dark:border-red-900/30 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-500/10 rounded-full -mr-8 -mt-8 opacity-50"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-xl text-red-600 dark:text-red-400">
                        <WalletCards className="w-6 h-6" />
                      </div>
                      <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-black px-2 py-1 rounded-full">
                        পেন্ডিং রিকোয়েস্ট: {pendingApprovals}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">মোট পাওনা (Ledger)</p>
                      <h3 className="text-2xl font-black text-red-600 dark:text-red-400">৳ {totalLedgerPayable.toLocaleString()}</h3>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">অ্যাপ্রুভড বিল - অগ্রিম (কোম্পানির দায়)</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Quick Stats Grid (STAFF VIEW) */}
          {isStaff && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Total Received (Advance) */}
                <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-teal-100 dark:border-teal-900/30 shadow-sm relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 dark:bg-teal-500/10 rounded-full -mr-8 -mt-8 opacity-50"></div>
                   <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                         <div className="bg-teal-100 dark:bg-teal-900/30 p-2.5 rounded-xl text-teal-600 dark:text-teal-400">
                            <Wallet className="w-5 h-5" />
                         </div>
                         <span className="text-xs font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest">মোট জমা (Received)</span>
                      </div>
                      <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">৳ {myTotalReceived.toLocaleString()}</h3>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">অফিস থেকে নেওয়া মোট অগ্রিম (Regular + Salary)</p>
                   </div>
                </div>

                {/* 2. My Total Expense */}
                <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                   <div className="flex items-start justify-between mb-3">
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-xl text-indigo-600 dark:text-indigo-400"><TrendingDown className="w-6 h-6" /></div>
                   </div>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">আমার মোট খরচ</p>
                   <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">৳ {myApprovedTotal.toLocaleString()}</h3>
                   <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">অনুমোদিত বিলের যোগফল</p>
                </div>

                {/* 3. My Pending Bills */}
                <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-5 border border-orange-100 dark:border-orange-900/30 shadow-sm sm:col-span-2">
                   <div className="flex items-start justify-between mb-3">
                      <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-xl text-orange-600 dark:text-orange-400"><AlertCircle className="w-6 h-6" /></div>
                   </div>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">পেন্ডিং বিল</p>
                   <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">{myPendingCount} টি</h3>
                   <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">অনুমোদনের অপেক্ষায় আছে</p>
                </div>
                
                {/* 4. Recent Advances (NEW) */}
                <div className="sm:col-span-2 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                   <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                      <WalletCards className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">আমার লেনদেনের বিবরন (Last 5)</h4>
                   </div>
                   <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {myRecentAdvances.length > 0 ? myRecentAdvances.map(adv => (
                         <div key={adv.id} className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${adv.type === 'SALARY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {adv.type === 'SALARY' ? 'Salary Adv' : 'Regular Adv'}
                                  </span>
                                  <p className="text-xs text-gray-400 font-bold">{new Date(adv.date).toLocaleDateString('bn-BD')}</p>
                               </div>
                               <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">{adv.note || 'No description'}</p>
                            </div>
                            <span className={`font-black text-sm ${adv.amount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                               {adv.amount > 0 ? `+ ৳${adv.amount}` : `- ৳${Math.abs(adv.amount)}`}
                            </span>
                         </div>
                      )) : (
                         <p className="text-center text-gray-400 text-xs py-4">কোনো লেনদেন পাওয়া যায়নি।</p>
                      )}
                   </div>
                </div>
             </div>
          )}

          {/* Recent Transactions List (MANAGEMENT/ADMIN VIEW - Unchanged) */}
          {!isStaff && (
            <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-500" /> সাম্প্রতিক কার্যক্রম
                </h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {recentActivities.length > 0 ? recentActivities.map((expense) => (
                  <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
                        expense.status === 'APPROVED' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-600 dark:text-green-400' : 
                        expense.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400' :
                        'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 text-orange-600 dark:text-orange-400'
                      }`}>
                        {expense.staffName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{expense.reason}</p>
                        <p className="text-xs text-gray-400 font-medium">{expense.staffName} • {new Date(expense.createdAt).toLocaleDateString('bn-BD')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-800 dark:text-gray-100">৳ {expense.amount}</p>
                      <span className={`text-[9px] font-bold uppercase ${
                        expense.status === 'APPROVED' ? 'text-green-500' : 
                        expense.status === 'REJECTED' ? 'text-red-500' : 'text-orange-500'
                      }`}>
                        {expense.status}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center text-gray-400 text-sm">কোনো সাম্প্রতিক কার্যক্রম নেই</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Champions & Extras */}
        <div className="space-y-6">
          
          {/* Champions Podium - Simplified */}
          {champions.length > 0 && (
             <div className="bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-900 dark:bg-gray-950 text-white text-center">
                   <h3 className="font-bold flex items-center justify-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-400" /> সেরা পারফর্মার
                   </h3>
                   <p className="text-[10px] uppercase tracking-widest text-gray-400">{monthName}</p>
                </div>
                <div className="p-4 space-y-3">
                   {champions.map((champ, idx) => (
                      <div key={champ.id} className={`flex items-center gap-3 p-2 rounded-lg ${idx === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/40' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                         <div className="font-bold text-gray-400 w-4 text-center">{idx + 1}</div>
                         <div className="relative">
                            {champ.photo ? (
                               <img src={champ.photo} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                               <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300">{champ.name[0]}</div>
                            )}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{champ.name}</p>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                               <Trophy className="w-3 h-3" /> {formatPoints(champ.score)} Points
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* Simple Info Card */}
          <div className="bg-white dark:bg-gray-800/60 rounded-2xl p-6 border border-gray-100 dark:border-white/10 shadow-sm text-center">
             <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-400">
                <Clock className="w-6 h-6" />
             </div>
             <h3 className="font-bold text-gray-800 dark:text-gray-100">অফিস টাইম</h3>
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
               সকাল ৯:০০ টার মধ্যে চেক-ইন করুন।
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardView;
