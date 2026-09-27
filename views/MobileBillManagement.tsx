import React, { useState } from "react";
import { Staff } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Smartphone, Search, CalendarCheck, Check, AlertCircle } from "lucide-react";

interface MobileBillManagementProps {
  staffList: Staff[];
  setStaffList: (val: any) => void;
}

export default function MobileBillManagement({ staffList, setStaffList }: MobileBillManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const activeStaff = staffList.filter(s => s.status === 'ACTIVE' && !s.isHardDeleted && !s.isDeleted);
  const filteredStaff = activeStaff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.staffId && s.staffId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUpdateMonth = (id: string, newMonth: string) => {
    setStaffList((prev: Staff[]) => prev.map(s => 
      s.id === id ? { ...s, mobileBillPaidUpto: newMonth } : s
    ));
  };

  const getMonthDisplay = (yyyyMM?: string) => {
    if (!yyyyMM) return null;
    try {
      const [year, month] = yyyMM.split('-');
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' });
    } catch {
      return yyyyMM;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 p-4 sm:p-6">
      {/* Header section with gradient */}
      <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-3xl p-8 sm:p-10 text-white shadow-lg shadow-indigo-200 dark:shadow-none relative overflow-hidden">
         <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
              <Smartphone className="w-8 h-8 sm:w-10 sm:h-10" />
              মোবাইল বিল ট্র্যাকার
            </h2>
            <p className="text-indigo-100 mt-3 max-w-xl text-base sm:text-lg">
              স্টাফদের মোবাইল বিলের হিসাব রাখুন খুব সহজেই। কে কোন মাস পর্যন্ত বিল পেয়েছে তা এক নজরে দেখুন এবং আপডেট করুন।
            </p>
         </div>
         {/* Decorative background shapes */}
         <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
         <div className="absolute bottom-0 right-32 -mb-10 w-40 h-40 bg-purple-400 opacity-20 rounded-full blur-2xl"></div>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl mx-auto -mt-16 z-20 px-4">
        <div className="absolute inset-y-0 left-4 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="স্টাফের নাম বা আইডি দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-shadow text-lg outline-none"
        />
      </div>

      {/* Grid Layout */}
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-6">
        <AnimatePresence>
          {filteredStaff.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm"
            >
              <Search className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-xl font-medium">কোনো স্টাফ পাওয়া যায়নি</p>
            </motion.div>
          ) : (
            filteredStaff.map((staff, index) => {
              const paidMonth = getMonthDisplay(staff.mobileBillPaidUpto);
              
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  key={staff.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/60 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all duration-300 group flex flex-col"
                >
                  <div className="flex items-start gap-4 mb-6">
                    {staff.photo ? (
                      <img src={staff.photo} alt={staff.name} className="w-14 h-14 rounded-2xl object-cover shadow-sm ring-2 ring-white dark:ring-slate-800" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl shadow-sm ring-2 ring-white dark:ring-slate-800">
                        {staff.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{staff.name}</h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{staff.designation}</p>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 mt-2">
                        ID: {staff.staffId}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto space-y-5">
                    <div className={`p-4 rounded-2xl border transition-colors ${paidMonth ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30' : 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30'}`}>
                      <div className="text-xs font-bold uppercase tracking-wider mb-1.5 text-slate-500 dark:text-slate-400">
                        বর্তমান স্ট্যাটাস
                      </div>
                      {paidMonth ? (
                        <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400">
                          <Check className="w-6 h-6 flex-shrink-0 bg-emerald-200 dark:bg-emerald-800/50 p-1 rounded-full text-emerald-800 dark:text-emerald-300" />
                          <span className="font-bold text-base leading-tight">{paidMonth} <span className="block text-xs font-semibold opacity-80 mt-0.5">পর্যন্ত পেইড</span></span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-400">
                          <AlertCircle className="w-6 h-6 flex-shrink-0 bg-amber-200 dark:bg-amber-800/50 p-1 rounded-full text-amber-800 dark:text-amber-300" />
                          <span className="font-bold text-base">এখনো দেওয়া হয়নি</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 pl-1">
                        মাস আপডেট করুন
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <CalendarCheck className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                        </div>
                        <input
                          type="month"
                          value={staff.mobileBillPaidUpto || ""}
                          onChange={(e) => handleUpdateMonth(staff.id, e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all cursor-pointer font-semibold shadow-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
