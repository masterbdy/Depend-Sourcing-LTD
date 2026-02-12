import React, { useMemo } from 'react';
import { TrendingDown, AlertCircle, Clock, ShieldAlert, Landmark, Wallet, Trophy, Crown, ArrowUpRight, Coins, Banknote, WalletCards, Calendar, Sparkles, PieChart } from 'lucide-react';
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
  onOpenProfile?: (staffId: string) => void;
  searchCount?: number;
}

const DashboardView: React.FC<DashboardProps> = ({ totalExpense, pendingApprovals, expenses = [], cloudError, totalFund, cashOnHand, role, staffList = [], advances = [], currentUser, onOpenProfile, searchCount }) => {
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

  // Find My ID
  const myStaffId = useMemo(() => {
    return (staffList || []).find(s => s.name === currentUser)?.id;
  }, [staffList, currentUser]);

  // Helper to format large numbers
  const formatPoints = (num: number) => {
    if (num >= 100000) return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num;
  };

  // --- STAFF SPECIFIC STATS ---
  const { myApprovedTotal, myPendingCount, myRegularAdvance, mySalaryAdvance, myNetBalance } = useMemo(() => {
    if (!myStaffId) return { myApprovedTotal: 0, myPendingCount: 0, myRegularAdvance: 0, mySalaryAdvance: 0, myNetBalance: 0 };

    const safeExpenses = expenses || [];
    const safeAdvances = advances || [];
    
    // Expenses (Filter by ID)
    const myExps = safeExpenses.filter(e => e.staffId === myStaffId && !e.isDeleted);
    const myApproved = myExps.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount), 0);
    const myPending = myExps.filter(e => e.status === 'PENDING' || e.status === 'VERIFIED').length;

    // Advances (Filter by ID)
    const myAdvs = safeAdvances.filter(a => a.staffId === myStaffId && !a.isDeleted);
    const regular = myAdvs.filter(a => a.type !== 'SALARY').reduce((sum, a) => sum + Number(a.amount), 0);
    const salary = myAdvs.filter(a => a.type === 'SALARY').reduce((sum, a) => sum + Number(a.amount), 0);

    // Balance Logic: Regular Advance - Expenses
    // Positive = Cash in Hand (Staff has cash)
    // Negative = Payable (Office owes Staff)
    const balance = regular - myApproved;

    return {
      myApprovedTotal: myApproved,
      myPendingCount: myPending,
      myRegularAdvance: regular,
      mySalaryAdvance: salary,
      myNetBalance: balance
    };
  }, [expenses, advances, myStaffId]);

  const myRecentAdvances = useMemo(() => {
    if (!isStaff || !myStaffId) return [];
    return (advances || [])
      .filter(a => a.staffId === myStaffId && !a.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [advances, myStaffId, isStaff]);

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

  // COMPACT 3D CARD COMPONENT
  const StatCard3D = ({ icon: Icon, label, value, colorClass, borderClass, iconBgClass, iconColorClass, subText }: any) => (
    <div className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-3 border-2 border-b-[5px] border-r-[5px] ${borderClass} shadow-sm transition-all active:border-b-2 active:border-r-2 active:translate-y-1 active:translate-x-1 group`}>
       {/* Background Decoration */}
       <Icon className={`absolute -right-3 -bottom-3 w-16 h-16 opacity-5 rotate-12 group-hover:scale-125 transition-transform duration-500 ${iconColorClass}`} />
       
       <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
             <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner ${iconBgClass}`}>
                <Icon className={`w-4 h-4 ${iconColorClass}`} />
             </div>
             {subText && (
               <span className="text-[8px] font-black bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">{subText}</span>
             )}
          </div>
          
          <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">{label}</p>
          <h3 className={`text-lg md:text-xl font-black truncate tracking-tight mt-0.5 ${colorClass}`}>{value}</h3>
       </div>
    </div>
  );

  return (
    <div className="space-y-5">
      
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
      <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-800 bg-[#0B1120] group">
         {/* Background Gradients & Glows */}
         <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-[#0f172a] to-indigo-950 z-0"></div>
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full -mt-20 -mr-20 z-0"></div>
         <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-600/10 blur-[80px] rounded-full -mb-10 -ml-10 z-0"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 z-0 mix-blend-overlay"></div>

         <div className="relative z-10 px-5 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="text-center md:text-left">
                 <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <span className="h-[1px] w-6 bg-indigo-500/50"></span>
                    <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-[0.3em]">Est. 2015</p>
                    <span className="h-[1px] w-6 bg-indigo-500/50"></span>
                 </div>
                 <h2 className="text-xl md:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-lg">
                   <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">DEPEND</span> SOURCING
                 </h2>
                 <p className="text-[9px] text-gray-400 font-medium tracking-[0.2em] mt-1 uppercase flex items-center justify-center md:justify-start gap-1">
                   <Sparkles className="w-3 h-3 text-yellow-500" /> Promise Beyond Business
                 </p>
             </div>
             
             {/* Glassmorphism Date Card - Compact */}
             <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 shadow-lg hover:bg-white/10 transition-colors">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                   <Calendar className="w-4 h-4" />
                </div>
                <div className="text-left">
                   <p className="text-[8px] uppercase font-bold text-indigo-200 tracking-widest leading-none mb-0.5 opacity-80">Today</p>
                   <p className="text-sm font-bold text-white leading-none">
                     {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                   </p>
                </div>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column: Stats & Activity */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Quick Stats Grid (MANAGEMENT VIEW - COMPACT 2 COLUMNS) */}
          {isManagement && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* 1. Total Fund (Blue) */}
                <StatCard3D 
                   icon={Landmark}
                   label="Total Fund"
                   value={`৳ ${totalFund.toLocaleString()}`}
                   colorClass="text-gray-800 dark:text-gray-100"
                   borderClass="border-blue-100 dark:border-blue-900"
                   iconBgClass="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/30"
                   iconColorClass="text-blue-600 dark:text-blue-400"
                />

                {/* 2. Cash In Hand (Emerald) */}
                <StatCard3D 
                   icon={Wallet}
                   label="Net Cash"
                   value={`৳ ${actualCashOnHand.toLocaleString()}`}
                   colorClass="text-gray-800 dark:text-gray-100"
                   borderClass="border-emerald-100 dark:border-emerald-900"
                   iconBgClass="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/30"
                   iconColorClass="text-emerald-600 dark:text-emerald-400"
                />

                {/* 3. Regular Advance (Orange) */}
                <StatCard3D 
                   icon={Banknote}
                   label="Regular Adv"
                   value={`৳ ${regularAdvance.toLocaleString()}`}
                   colorClass="text-gray-800 dark:text-gray-100"
                   borderClass="border-orange-100 dark:border-orange-900"
                   iconBgClass="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/30"
                   iconColorClass="text-orange-600 dark:text-orange-400"
                />

                 {/* 4. Salary Advance (Purple) */}
                 <StatCard3D 
                   icon={WalletCards}
                   label="Salary Adv"
                   value={`৳ ${salaryAdvance.toLocaleString()}`}
                   colorClass="text-gray-800 dark:text-gray-100"
                   borderClass="border-purple-100 dark:border-purple-900"
                   iconBgClass="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/30"
                   iconColorClass="text-purple-600 dark:text-purple-400"
                />

                {/* 5. Total Expense (Indigo) */}
                <StatCard3D 
                   icon={TrendingDown}
                   label="Approved Exp"
                   value={`৳ ${totalExpense.toLocaleString()}`}
                   colorClass="text-gray-800 dark:text-gray-100"
                   borderClass="border-indigo-100 dark:border-indigo-900"
                   iconBgClass="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/40 dark:to-indigo-800/30"
                   iconColorClass="text-indigo-600 dark:text-indigo-400"
                />
                
                {/* 6. Ledger Payable (Red) */}
                <StatCard3D 
                   icon={PieChart}
                   label="Ledger Payable"
                   value={`৳ ${totalLedgerPayable.toLocaleString()}`}
                   colorClass="text-red-600 dark:text-red-400"
                   borderClass="border-red-100 dark:border-red-900"
                   iconBgClass="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/30"
                   iconColorClass="text-red-600 dark:text-red-400"
                   subText={pendingApprovals > 0 ? `${pendingApprovals} Pending` : undefined}
                />
            </div>
          )}

          {/* Quick Stats Grid (STAFF VIEW - COMPACT 2 COLUMNS) */}
          {isStaff && (
             <div className="grid grid-cols-2 gap-3">
                
                {/* 1. Total Regular Advance */}
                <StatCard3D 
                   icon={Banknote}
                   label="Regular Adv"
                   value={`৳ ${myRegularAdvance.toLocaleString()}`}
                   colorClass="text-gray-800 dark:text-gray-100"
                   borderClass="border-blue-100 dark:border-blue-900"
                   iconBgClass="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/30"
                   iconColorClass="text-blue-600 dark:text-blue-400"
                />

                {/* 2. My Total Expense */}
                <StatCard3D 
                   icon={TrendingDown}
                   label="Approved Exp"
                   value={`৳ ${myApprovedTotal.toLocaleString()}`}
                   colorClass="text-gray-800 dark:text-gray-100"
                   borderClass="border-indigo-100 dark:border-indigo-900"
                   iconBgClass="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/40 dark:to-indigo-800/30"
                   iconColorClass="text-indigo-600 dark:text-indigo-400"
                />

                {/* 3. Net Balance */}
                <StatCard3D 
                   icon={Wallet}
                   label={myNetBalance < 0 ? 'Payable (পাবে)' : 'Cash (আছে)'}
                   value={`${myNetBalance < 0 ? '-' : ''} ৳ ${Math.abs(myNetBalance).toLocaleString()}`}
                   colorClass={myNetBalance < 0 ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}
                   borderClass={myNetBalance < 0 ? 'border-red-100 dark:border-red-900' : 'border-emerald-100 dark:border-emerald-900'}
                   iconBgClass={myNetBalance < 0 ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/30' : 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/30'}
                   iconColorClass={myNetBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
                />

                {/* 4. My Pending Bills */}
                <StatCard3D 
                   icon={AlertCircle}
                   label="Pending Bills"
                   value={`${myPendingCount} টি`}
                   colorClass="text-gray-800 dark:text-gray-100"
                   borderClass="border-orange-100 dark:border-orange-900"
                   iconBgClass="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/30"
                   iconColorClass="text-orange-600 dark:text-orange-400"
                />
                
                {/* 5. Recent Advances List */}
                <div className="col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-b-[4px] border-r-[4px] border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                   <div className="p-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                      <WalletCards className="w-3.5 h-3.5 text-indigo-500" />
                      <h4 className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">আমার লেনদেন (Last 5)</h4>
                   </div>
                   <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                      {myRecentAdvances.length > 0 ? myRecentAdvances.map(adv => (
                         <div key={adv.id} className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${adv.type === 'SALARY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {adv.type === 'SALARY' ? 'Salary' : 'Regular'}
                                  </span>
                                  <p className="text-[10px] text-gray-400 font-bold">{new Date(adv.date).toLocaleDateString('bn-BD')}</p>
                               </div>
                               <p className="font-bold text-gray-700 dark:text-gray-200 text-xs">{adv.note || 'No description'}</p>
                            </div>
                            <span className={`font-black text-xs ${adv.amount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'}`}>
                               {adv.amount > 0 ? `+ ৳${adv.amount}` : `- ৳${Math.abs(adv.amount)}`}
                            </span>
                         </div>
                      )) : (
                         <p className="text-center text-gray-400 text-[10px] py-3">কোনো লেনদেন পাওয়া যায়নি।</p>
                      )}
                   </div>
                </div>
             </div>
          )}

          {/* Recent Transactions List (MANAGEMENT/ADMIN VIEW - Unchanged) */}
          {!isStaff && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-b-[4px] border-r-[4px] border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" /> সাম্প্রতিক কার্যক্রম
                </h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {recentActivities.length > 0 ? recentActivities.map((expense) => {
                  const staffMember = staffList.find(s => s.id === expense.staffId);
                  return (
                    <div key={expense.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => onOpenProfile && onOpenProfile(expense.staffId)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 cursor-pointer hover:scale-105 transition-transform overflow-hidden ${
                          expense.status === 'APPROVED' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-600 dark:text-green-400' : 
                          expense.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600 dark:text-red-400' :
                          'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 text-orange-600 dark:text-orange-400'
                        }`}>
                          {staffMember && staffMember.photo ? (
                            <img src={staffMember.photo} alt={expense.staffName} className="w-full h-full object-cover" />
                          ) : (
                            expense.staffName.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{expense.reason}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{expense.staffName} • {new Date(expense.createdAt).toLocaleDateString('bn-BD')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-800 dark:text-gray-100">৳ {expense.amount}</p>
                        <span className={`text-[8px] font-bold uppercase ${
                          expense.status === 'APPROVED' ? 'text-green-500' : 
                          expense.status === 'REJECTED' ? 'text-red-500' : 'text-orange-500'
                        }`}>
                          {expense.status}
                        </span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-8 text-center text-gray-400 text-xs">কোনো সাম্প্রতিক কার্যক্রম নেই</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Champions & Extras */}
        <div className="space-y-5">
          
          {/* Champions Podium */}
          {champions.length > 0 && (
             <div className="bg-white dark:bg-gray-800 rounded-2xl border border-b-[4px] border-r-[4px] border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-3 bg-gray-900 dark:bg-gray-950 text-white text-center">
                   <h3 className="font-bold flex items-center justify-center gap-2 text-sm">
                      <Crown className="w-4 h-4 text-yellow-400" /> সেরা পারফর্মার
                   </h3>
                   <p className="text-[9px] uppercase tracking-widest text-gray-400">{monthName}</p>
                </div>
                <div className="p-3 space-y-2">
                   {champions.map((champ, idx) => (
                      <div key={champ.id} className={`flex items-center gap-3 p-2 rounded-lg ${idx === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/40' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                         <div className="font-bold text-gray-400 w-4 text-center text-xs">{idx + 1}</div>
                         <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => onOpenProfile && onOpenProfile(champ.id)}>
                            {champ.photo ? (
                               <img src={champ.photo} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                               <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-gray-300">{champ.name[0]}</div>
                            )}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{champ.name}</p>
                            <div className="flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                               <Trophy className="w-3 h-3" /> {formatPoints(champ.score)} Points
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* Simple Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-b-[4px] border-r-[4px] border-gray-100 dark:border-gray-700 shadow-sm text-center">
             <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-600 dark:text-indigo-400">
                <Clock className="w-5 h-5" />
             </div>
             <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm">অফিস টাইম</h3>
             <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
               সকাল ৯:০০ টা থেকে রাত ৮:০০ টা পর্যন্ত।
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardView;