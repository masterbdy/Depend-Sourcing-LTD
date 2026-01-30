
import React from 'react';
import { TrendingDown, AlertCircle, Clock, ShieldAlert, Landmark, Wallet, Trophy, Crown, ArrowUpRight } from 'lucide-react';
import { Expense, UserRole, Staff } from '../types';

interface DashboardProps {
  totalExpense: number;
  pendingApprovals: number;
  expenses: Expense[];
  cloudError: string | null;
  totalFund: number;
  cashOnHand: number;
  role: UserRole | null;
  staffList: Staff[];
}

const DashboardView: React.FC<DashboardProps> = ({ totalExpense, pendingApprovals, expenses, cloudError, totalFund, cashOnHand, role, staffList }) => {
  const recentActivities = [...expenses].filter(e => !e.isDeleted).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  // Stats Configuration (Clean & Simple)
  const stats = [
    { 
      label: 'মোট খরচ (অনুমোদিত)', 
      value: `৳ ${totalExpense.toLocaleString()}`, 
      icon: TrendingDown, 
      color: 'bg-indigo-600',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600'
    },
    { 
      label: 'পেন্ডিং বিল রিকোয়েস্ট', 
      value: pendingApprovals.toString(), 
      icon: AlertCircle, 
      color: 'bg-orange-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
  ];

  if (role === UserRole.ADMIN || role === UserRole.MD) {
    stats.unshift(
      { 
        label: 'বর্তমান ক্যাশ ফান্ড', 
        value: `৳ ${totalFund.toLocaleString()}`, 
        icon: Landmark, 
        color: 'bg-blue-600',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
      },
      { 
        label: 'হাতে নগদ (Cash In Hand)', 
        value: `৳ ${cashOnHand.toLocaleString()}`, 
        icon: Wallet, 
        color: 'bg-green-600',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600'
      }
    );
  }

  const isStaff = role === UserRole.STAFF;

  // --- CHAMPIONS LOGIC ---
  const getPreviousMonthChampions = () => {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthName = prevDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });

    const champions = staffList
      .filter(s => s.status === 'ACTIVE' && !s.deletedAt && s.role === UserRole.STAFF && !s.name.toLowerCase().includes('office'))
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

    return { champions, monthName: prevMonthName };
  };

  const { champions, monthName } = getPreviousMonthChampions();

  return (
    <div className="space-y-6">
      
      {/* Cloud Connection Error */}
      {cloudError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
           <div className="bg-red-100 p-2 rounded-full shrink-0">
             <ShieldAlert className="w-5 h-5 text-red-600" />
           </div>
           <div>
             <h3 className="text-sm font-bold text-red-800">ডাটাবেস কানেকশন সমস্যা ({cloudError})</h3>
             <p className="text-xs text-red-600">ইন্টারনেট কানেকশন চেক করুন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
           </div>
        </div>
      )}

      {/* Welcome Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
         <h2 className="text-xl font-bold text-gray-800">স্বাগতম, ড্যাশবোর্ডে ফিরে আসার জন্য ধন্যবাদ! 👋</h2>
         <p className="text-sm text-gray-500 mt-1">
           {new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
         </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stats & Activity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Stats Grid */}
          {!isStaff && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-xl ${stat.iconBg}`}>
                      <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-black text-gray-800">{stat.value}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Transactions List */}
          {!isStaff && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-500" /> সাম্প্রতিক কার্যক্রম
                </h3>
              </div>
              <div className="divide-y divide-gray-50">
                {recentActivities.length > 0 ? recentActivities.map((expense) => (
                  <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold border-2 ${
                        expense.status === 'APPROVED' ? 'bg-green-50 border-green-100 text-green-600' : 
                        expense.status === 'REJECTED' ? 'bg-red-50 border-red-100 text-red-600' :
                        'bg-orange-50 border-orange-100 text-orange-600'
                      }`}>
                        {expense.staffName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 line-clamp-1">{expense.reason}</p>
                        <p className="text-xs text-gray-400 font-medium">{expense.staffName} • {new Date(expense.createdAt).toLocaleDateString('bn-BD')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-800">৳ {expense.amount}</p>
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
             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-900 text-white text-center">
                   <h3 className="font-bold flex items-center justify-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-400" /> সেরা পারফর্মার
                   </h3>
                   <p className="text-[10px] uppercase tracking-widest text-gray-400">{monthName}</p>
                </div>
                <div className="p-4 space-y-3">
                   {champions.map((champ, idx) => (
                      <div key={champ.id} className={`flex items-center gap-3 p-2 rounded-lg ${idx === 0 ? 'bg-yellow-50 border border-yellow-100' : 'bg-gray-50'}`}>
                         <div className="font-bold text-gray-400 w-4 text-center">{idx + 1}</div>
                         <div className="relative">
                            {champ.photo ? (
                               <img src={champ.photo} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                               <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{champ.name[0]}</div>
                            )}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{champ.name}</p>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                               <Trophy className="w-3 h-3" /> {champ.score} Points
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* Simple Info Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
             <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600">
                <Clock className="w-6 h-6" />
             </div>
             <h3 className="font-bold text-gray-800">অফিস টাইম</h3>
             <p className="text-xs text-gray-500 mt-2">
               সকাল ৯:০০ টার মধ্যে চেক-ইন করুন।
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardView;
