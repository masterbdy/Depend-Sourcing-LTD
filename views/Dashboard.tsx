import React from 'react';
import { TrendingDown, AlertCircle, Clock, CheckCircle2, ShieldAlert, Landmark, Wallet } from 'lucide-react';
import { Expense, UserRole } from '../types';

interface DashboardProps {
  totalExpense: number;
  pendingApprovals: number;
  expenses: Expense[];
  cloudError: string | null;
  totalFund: number;
  cashOnHand: number;
  role: UserRole | null;
}

const DashboardView: React.FC<DashboardProps> = ({ totalExpense, pendingApprovals, expenses, cloudError, totalFund, cashOnHand, role }) => {
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
               
               <div className="bg-white p-5 rounded-xl border border-red-100 text-sm space-y-3 shadow-sm">
                 <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2">সমস্যা সমাধানের উপায় (একবার করলেই হবে):</h4>
                 <ol className="list-decimal list-inside space-y-2 text-gray-600 ml-1">
                   <li><a href="https://console.firebase.google.com/" target="_blank" className="text-indigo-600 underline font-bold">Firebase Console</a> এ যান এবং আপনার প্রজেক্ট সিলেক্ট করুন।</li>
                   <li>বাম মেনু থেকে <strong>Build</strong> {'>'} <strong>Realtime Database</strong> এ ক্লিক করুন।</li>
                   <li>উপরের <strong>Rules</strong> ট্যাবে যান।</li>
                   <li>নিচের কোডটি বক্সে পেস্ট করুন এবং <strong>Publish</strong> বাটনে ক্লিক করুন:</li>
                 </ol>
                 <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs relative group select-all mt-2 border border-gray-700">
<pre>{`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`}</pre>
                 </div>
                 <p className="text-xs text-gray-400 italic mt-2">* এটি করার পর পেজটি রিলোড দিন।</p>
               </div>
             </div>
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