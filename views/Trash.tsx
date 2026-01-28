
import React from 'react';
import { Trash2, RotateCcw, AlertTriangle, RefreshCw, Bell, XCircle } from 'lucide-react';
import { Staff, MovementLog, Expense, UserRole, FundEntry, Notice } from '../types';

interface TrashProps {
  staffList: Staff[];
  setStaffList: React.Dispatch<React.SetStateAction<Staff[]>>;
  movements: MovementLog[];
  setMovements: React.Dispatch<React.SetStateAction<MovementLog[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  funds: FundEntry[];
  setFunds: React.Dispatch<React.SetStateAction<FundEntry[]>>;
  notices: Notice[];
  setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
  role: UserRole;
}

const TrashView: React.FC<TrashProps> = ({ staffList, setStaffList, movements, setMovements, expenses, setExpenses, funds, setFunds, notices, setNotices, role }) => {
  const trashedStaff = staffList.filter(s => s && !!s.deletedAt);
  const trashedExpenses = expenses.filter(e => e && !!e.isDeleted);
  const trashedFunds = funds.filter(f => f && !!f.isDeleted);
  const trashedNotices = notices.filter(n => n && !!n.isDeleted);

  const restoreStaff = (id: string) => {
    setStaffList(prev => prev.map(s => s && s.id === id ? { ...s, deletedAt: undefined } : s));
  };

  const restoreExpense = (id: string) => {
    setExpenses(prev => prev.map(e => e && e.id === id ? { ...e, isDeleted: false } : e));
  };

  const restoreAllExpenses = () => {
    if (confirm('আপনি কি রিসাইকেল বিনের সকল খরচ রিস্টোর করতে চান?')) {
      setExpenses(prev => prev.map(e => e && e.isDeleted ? { ...e, isDeleted: false } : e));
    }
  };

  const restoreFund = (id: string) => {
    setFunds(prev => prev.map(f => f && f.id === id ? { ...f, isDeleted: false } : f));
  };

  const restoreNotice = (id: string) => {
    setNotices(prev => prev.map(n => n.id === id ? { ...n, isDeleted: false } : n));
  };

  // PERMANENT DELETE (EMPTY TRASH)
  const handleEmptyTrash = () => {
    if (confirm('সতর্কতা: আপনি কি নিশ্চিত যে রিসাইকেল বিনের সকল তথ্য স্থায়ীভাবে মুছে ফেলতে চান? \n\nএটি করলে ডাটা আর কখনোই ফিরিয়ে আনা যাবে না।')) {
      setStaffList(prev => prev.filter(s => !s.deletedAt));
      setExpenses(prev => prev.filter(e => !e.isDeleted));
      setMovements(prev => prev.filter(m => !m.isDeleted));
      setFunds(prev => prev.filter(f => !f.isDeleted));
      setNotices(prev => prev.filter(n => !n.isDeleted));
      alert("রিসাইকেল বিন সফলভাবে খালি করা হয়েছে।");
    }
  };

  const hasTrash = trashedStaff.length > 0 || trashedExpenses.length > 0 || trashedFunds.length > 0 || trashedNotices.length > 0;

  return (
    <div className="space-y-8">
      <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
          <div>
            <h3 className="font-bold text-red-800 text-lg">রিসাইকেল বিন (Recycle Bin)</h3>
            <p className="text-sm text-red-600 leading-relaxed">
              এখানে ডিলিট করা ফাইলগুলো জমা থাকে। আপনি চাইলে রিস্টোর করতে পারেন অথবা স্থায়ীভাবে মুছে ফেলতে পারেন।
            </p>
          </div>
        </div>
        
        {(role === UserRole.ADMIN || role === UserRole.MD) && hasTrash && (
           <button 
             onClick={handleEmptyTrash}
             className="bg-red-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2 active:scale-95 whitespace-nowrap"
           >
             <XCircle className="w-5 h-5" />
             বিন খালি করুন
           </button>
        )}
      </div>

      <div className="space-y-12">
        {/* Trashed Notices */}
        <section>
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-400" />
            ডিলিট হওয়া নোটিশ ({trashedNotices.length})
          </h4>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
             {trashedNotices.length > 0 ? trashedNotices.map(n => (
               <div key={n.id} className="p-4 flex items-center justify-between border-b last:border-0 hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-400">{n.postedBy} • {new Date(n.date).toLocaleDateString('bn-BD')}</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded ${n.type === 'URGENT' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{n.type}</span>
                  </div>
                  <button onClick={() => restoreNotice(n.id)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                    <RotateCcw className="w-3.5 h-3.5" /> রিস্টোর
                  </button>
               </div>
             )) : (
               <div className="p-8 text-center text-gray-400 text-sm">কোনো তথ্য নেই</div>
             )}
          </div>
        </section>

        {/* Trashed Funds */}
        <section>
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-gray-400" />
            ডিলিট হওয়া ফান্ড রেকর্ড ({trashedFunds.length})
          </h4>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
             {trashedFunds.length > 0 ? trashedFunds.map(f => (
               <div key={f.id} className="p-4 flex items-center justify-between border-b last:border-0 hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-800">৳ {f.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{f.note} • {new Date(f.date).toLocaleDateString('bn-BD')}</p>
                  </div>
                  <button onClick={() => restoreFund(f.id)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                    <RotateCcw className="w-3.5 h-3.5" /> রিস্টোর
                  </button>
               </div>
             )) : (
               <div className="p-8 text-center text-gray-400 text-sm">কোনো তথ্য নেই</div>
             )}
          </div>
        </section>

        {/* Trashed Expenses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-gray-400" />
              ডিলিট হওয়া বিল ({trashedExpenses.length})
            </h4>
            {trashedExpenses.length > 0 && (
              <button 
                onClick={restoreAllExpenses}
                className="flex items-center gap-2 text-xs font-bold text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
              >
                <RefreshCw className="w-3.5 h-3.5" /> সব রিস্টোর করুন
              </button>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
             {trashedExpenses.length > 0 ? trashedExpenses.map(e => (
               <div key={e.id} className="p-4 flex items-center justify-between border-b last:border-0 hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-800">৳ {e.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{e.reason} • {e.staffName}</p>
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">{new Date(e.createdAt).toLocaleDateString('bn-BD')}</span>
                  </div>
                  <button onClick={() => restoreExpense(e.id)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                    <RotateCcw className="w-3.5 h-3.5" /> রিস্টোর
                  </button>
               </div>
             )) : (
               <div className="p-8 text-center text-gray-400 text-sm">কোনো তথ্য নেই</div>
             )}
          </div>
        </section>

        {/* Trashed Staff */}
        <section>
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-gray-400" />
            ডিলিট হওয়া স্টাফ ({trashedStaff.length})
          </h4>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
             {trashedStaff.length > 0 ? trashedStaff.map(s => (
               <div key={s.id} className="p-4 flex items-center justify-between border-b last:border-0 hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">ID: {s.staffId} • {s.designation}</p>
                  </div>
                  <button onClick={() => restoreStaff(s.id)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                    <RotateCcw className="w-3.5 h-3.5" /> রিস্টোর
                  </button>
               </div>
             )) : (
               <div className="p-8 text-center text-gray-400 text-sm">কোনো তথ্য নেই</div>
             )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TrashView;
