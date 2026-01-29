
import React from 'react';
import { TrendingDown, AlertCircle, Clock, CheckCircle2, ShieldAlert, Landmark, Wallet, Trophy, Crown, Medal } from 'lucide-react';
import { Expense, UserRole, Staff } from '../types';

interface DashboardProps {
  totalExpense: number;
  pendingApprovals: number;
  expenses: Expense[];
  cloudError: string | null;
  totalFund: number;
  cashOnHand: number;
  role: UserRole | null;
  staffList: Staff[]; // Added staffList for leaderboard
}

const DashboardView: React.FC<DashboardProps> = ({ totalExpense, pendingApprovals, expenses, cloudError, totalFund, cashOnHand, role, staffList }) => {
  const recentActivities = [...expenses].filter(e => !e.isDeleted).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const stats = [
    { label: 'মোট খরচ (অনুমোদিত)', value: `৳ ${totalExpense.toLocaleString()}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'পেন্ডিং বিল', value: pendingApprovals.toString(), icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  if (role === UserRole.ADMIN || role === UserRole.MD) {
    stats.unshift(
      { label: 'মোট ফান্ড (জমা)', value: `৳ ${totalFund.toLocaleString()}`, icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-100' },
      { label: 'বর্তমান ক্যাশ', value: `৳ ${cashOnHand.toLocaleString()}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-100' }
    );
  }

  const isStaff = role === UserRole.STAFF;

  // --- CHAMPIONS LOGIC (LAST MONTH) ---
  const getPreviousMonthChampions = () => {
    const now = new Date();
    // Logic: Month 0 is Jan, -1 is Dec previous year.
    // However, string construction needs care.
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthName = prevDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });

    // Filter staff who have scores for that month
    const champions = staffList
      .filter(s => s.status === 'ACTIVE' && !s.deletedAt && s.role === UserRole.STAFF && !s.name.toLowerCase().includes('office'))
      .map(s => {
          // If migrated, use prevMonthPoints
          if (s.prevMonthName === prevMonthStr) {
             return { ...s, score: s.prevMonthPoints || 0 };
          }
          // If not migrated (user hasn't logged in this month), their 'points' are still from last month
          if (s.pointsMonth === prevMonthStr) {
             return { ...s, score: s.points || 0 };
          }
          return { ...s, score: 0 };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return { champions, monthName: prevMonthName };
  };

  const { champions, monthName } = getPreviousMonthChampions();


  return (
    <div className="space-y-8">
      {/* Cloud Connection Error Guide */}
      {cloudError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 animate-pulse-fast">
           <div className="flex items-start gap-4">
             <div className="bg-red-100 p-3 rounded-full shrink-0"><ShieldAlert className="w-6 h-6 text-red-600" /></div>
             <div className="space-y-3 w-full">
               <div>
                 <h3 className="text-lg font-bold text-red-800">ডাটাবেস কানেকশন সমস্যা ({cloudError})</h3>
                 <p className="text-sm text-red-600">আপনার অ্যাপ ডাটা সেভ করতে পারছে না। অনুগ্রহ করে নিচের ধাপগুলো অনুসরণ করুন:</p>
               </div>
               {/* Help content omitted for brevity, same as before */}
             </div>
           </div>
        </div>
      )}

      {/* --- PREVIOUS MONTH CHAMPIONS --- */}
      {champions.length > 0 && (
         <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-indigo-200">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Trophy className="w-40 h-40 text-white" /></div>
            
            <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2 relative z-10">
               <Crown className="w-6 h-6 text-yellow-300" />
               গত মাসের সেরা ৩ পারফর্মার ({monthName})
            </h3>

            <div className="grid grid-cols-3 gap-2 sm:gap-6 relative z-10">
               {champions.map((champ, idx) => {
                  let iconColor = 'text-yellow-300'; // Gold
                  let badge = '১ম';
                  let scale = 'scale-110 -translate-y-2'; // Center bigger
                  
                  if (idx === 1) { iconColor = 'text-gray-300'; badge = '২য়'; scale = 'scale-95 translate-y-2'; } // Silver
                  if (idx === 2) { iconColor = 'text-orange-300'; badge = '৩য়'; scale = 'scale-95 translate-y-2'; } // Bronze

                  // Re-order for visual pyramid: 2nd, 1st, 3rd (Silver, Gold, Bronze)
                  // But map index is 0,1,2.
                  // Just render them in order is fine, or simple flex adjustment.
                  return (
                     <div key={champ.id} className={`bg-white/10 backdrop-blur-sm rounded-2xl p-3 flex flex-col items-center text-center border border-white/20`}>
                        <div className="relative mb-2">
                           {champ.photo ? (
                              <img src={champ.photo} className="w-12 h-12 rounded-full object-cover border-2 border-white/50" />
                           ) : (
                              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-white">{champ.name[0]}</div>
                           )}
                           <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-gray-800 shadow-sm border-2 ${idx===0 ? 'border-yellow-400' : idx===1 ? 'border-gray-400' : 'border-orange-400'}`}>
                              {badge}
                           </div>
                        </div>
                        <p className="font-bold text-xs sm:text-sm truncate w-full">{champ.name}</p>
                        <p className={`text-sm font-black mt-1 ${idx===0 ? 'text-yellow-300' : 'text-white'}`}>{champ.score} pts</p>
                     </div>
                  );
               })}
            </div>
         </div>
      )}

      {/* Quick Stats Grid - HIDDEN FOR STAFF */}
      {!isStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`${stat.bg} p-4 rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className={`text-xl font-black text-gray-800`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 ${!isStaff ? 'lg:grid-cols-2' : ''} gap-8`}>
        {/* Recent Transactions - HIDDEN FOR STAFF */}
        {!isStaff && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">সাম্প্রতিক কার্যক্রম</h3>
              <button className="text-sm text-indigo-600 font-medium hover:underline">সব দেখুন</button>
            </div>
            <div className="divide-y divide-gray-50">
              {recentActivities.length > 0 ? recentActivities.map((expense) => (
                <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${expense.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {expense.status === 'APPROVED' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{expense.reason}</p>
                      <p className="text-xs text-gray-400">{expense.staffName} • {new Date(expense.createdAt).toLocaleDateString('bn-BD')}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-gray-800">৳ {expense.amount}</p>
                </div>
              )) : (
                <div className="p-12 text-center text-gray-400">কোনো সাম্প্রতিক কার্যক্রম নেই</div>
              )}
            </div>
          </div>
        )}

        {/* Quick Summary / Welcome - Visible for everyone */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-8 text-white flex flex-col justify-between min-h-[200px]">
          <div>
            <h2 className="text-2xl font-bold mb-2">স্বাগতম ফিরে আসায়!</h2>
            {!isStaff ? (
              <p className="text-indigo-100 text-sm leading-relaxed">
                সিস্টেমে বর্তমানে {pendingApprovals} টি বিল অনুমোদনের অপেক্ষায় আছে। দ্রুত চেক করে নিন।
              </p>
            ) : (
              <p className="text-indigo-100 text-sm leading-relaxed">
                আপনার দৈনন্দিন কার্যক্রম শুরু করতে মেনু থেকে অপশন নির্বাচন করুন।
              </p>
            )}
          </div>
          <div className="mt-8">
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
              <div>
                <p className="text-xs text-indigo-200 uppercase tracking-wider font-semibold">আজকের তারিখ</p>
                <p className="text-lg font-bold">{new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <Clock className="w-8 h-8 text-indigo-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
