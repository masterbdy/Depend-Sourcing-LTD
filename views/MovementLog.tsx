
import React, { useState, useMemo } from 'react';
import { LogIn, LogOut, Clock, Info, Search, Calendar, FilterX } from 'lucide-react';
import { MovementLog, Staff, BillingRule, UserRole, ChatMessage } from '../types';

interface MovementProps {
  movements: MovementLog[];
  setMovements: React.Dispatch<React.SetStateAction<MovementLog[]>>;
  staffList: Staff[];
  billingRules: BillingRule[];
  role: UserRole;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>; 
  currentUser: string | null; 
}

const MovementLogView: React.FC<MovementProps> = ({ movements, setMovements, staffList, billingRules, role, setMessages, currentUser }) => {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [location, setLocation] = useState('');

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeStaff = staffList.filter(s => !s.deletedAt && s.status === 'ACTIVE');

  // Filter Logic
  const filteredMovements = useMemo(() => {
    return movements
      .filter(m => !m.isDeleted)
      .filter(m => {
        const matchesSearch = 
          m.staffName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (m.location || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const moveDate = new Date(m.checkOut || m.checkIn || new Date()).setHours(0, 0, 0, 0);
        const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

        const matchesDate = (!start || moveDate >= start) && (!end || moveDate <= end);

        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(b.checkOut || 0).getTime() - new Date(a.checkOut || 0).getTime());
  }, [movements, searchTerm, startDate, endDate]);

  const handleCheckOut = () => {
    if (!selectedStaff) return alert('স্টাফ নির্বাচন করুন');
    const staff = activeStaff.find(s => s.id === selectedStaff);
    const newMovement: MovementLog = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: selectedStaff,
      staffName: staff?.name || '',
      checkOut: new Date().toISOString(),
      location: location
    };
    setMovements(prev => [newMovement, ...prev]);

    // --- AUTO CHAT MESSAGE LOGIC ---
    if (staff) {
      const systemMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        text: `🚗 ${staff.name} (${staff.staffId}) এখন "${location}" এর উদ্দেশ্যে অফিস থেকে বের হলেন।`,
        sender: 'System Bot',
        role: UserRole.ADMIN, // Or a generic system role
        timestamp: new Date().toISOString(),
        type: 'SYSTEM_MOVEMENT',
        targetView: 'movements'
      };
      setMessages(prev => [...prev, systemMsg]);
    }
    // -------------------------------

    setSelectedStaff('');
    setLocation('');
  };

  const handleCheckIn = (id: string) => {
    const checkInTime = new Date().toISOString();
    setMovements(prev => prev.map(m => {
      if (m.id === id) {
        const checkOutDate = new Date(m.checkOut!);
        const checkInDate = new Date(checkInTime);
        
        let allowanceType: MovementLog['allowanceType'] = 'NONE';
        let amount = 0;

        const lunchRule = billingRules.find(r => r.type === 'LUNCH');
        if (lunchRule) {
           const [lH, lM] = lunchRule.startTime.split(':').map(Number);
           const lunchTrigger = new Date(checkOutDate); lunchTrigger.setHours(lH, lM, 0);
           const lunchEnd = new Date(checkOutDate); lunchEnd.setHours(lH + 1, lM, 0);
           if (checkOutDate <= lunchTrigger && checkInDate >= lunchEnd) {
             allowanceType = 'LUNCH';
             amount = lunchRule.amount;
           }
        }

        const hour = checkInDate.getHours();
        const min = checkInDate.getMinutes();
        if (hour >= 22) {
          allowanceType = 'DINNER';
          amount = billingRules.find(r => r.type === 'DINNER')?.amount || 0;
        } else if (hour > 21 || (hour === 21 && min >= 15)) {
          allowanceType = 'NIGHT';
          amount = billingRules.find(r => r.type === 'NIGHT')?.amount || 0;
        }

        // --- AUTO CHAT MESSAGE (RETURN) ---
        const returnMsg: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          text: `✅ ${m.staffName} অফিসে ফিরে এসেছেন।`,
          sender: 'System Bot',
          role: UserRole.ADMIN,
          timestamp: new Date().toISOString(),
          type: 'SYSTEM_MOVEMENT',
          targetView: 'movements'
        };
        setMessages(prev => [...prev, returnMsg]);
        // ----------------------------------

        return { ...m, checkIn: checkInTime, allowanceType, amount };
      }
      return m;
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  const getStaffDisplayId = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff ? staff.staffId : '';
  };

  return (
    <div className="space-y-8">
      {/* Check-out Control */}
      {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <LogOut className="w-6 h-6 text-orange-500" />
            মুভমেন্ট চেক-আউট
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">স্টাফ মেম্বার</label>
              <select 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
              >
                <option value="">নির্বাচন করুন...</option>
                {activeStaff.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.staffId})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">গন্তব্য/কারণ</label>
              <input 
                type="text" 
                placeholder="কোথায় যাচ্ছেন?" 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleCheckOut}
                className="w-full bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100 flex items-center justify-center gap-2 active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                বাইরে যান
              </button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
             <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
             <p className="text-xs text-blue-700">অটোমেটেড বিলিং লজিক অনুযায়ী সময়মতো ফিরলে সিস্টেমে আপনার অ্যালাউন্স অটো যোগ হয়ে যাবে।</p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        {/* ... (Previous Filter UI) ... */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">লগ খুঁজুন</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="নাম বা গন্তব্য..." 
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">তারিখ হতে</label>
          <input 
            type="date" 
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">তারিখ পর্যন্ত</label>
          <input 
            type="date" 
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        {(searchTerm || startDate || endDate) && (
          <button 
            onClick={clearFilters}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <FilterX className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Live Movement Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Clock className="w-6 h-6 text-indigo-500" />
             <h3 className="font-bold text-gray-800">মুভমেন্ট রেকর্ডস</h3>
           </div>
           <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">সর্বমোট: {filteredMovements.length} টি</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">নাম ও গন্তব্য</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">চেক-আউট</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">চেক-ইন</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">অ্যালাউন্স</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMovements.map((move) => {
                const displayId = getStaffDisplayId(move.staffId);
                return (
                  <tr key={move.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-800">{move.staffName}</p>
                      {displayId && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded mr-1">{displayId}</span>}
                      <span className="text-xs text-gray-400">{move.location}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <p className="font-medium">{move.checkOut ? new Date(move.checkOut).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '--'}</p>
                      <p className="text-[10px] text-gray-400">{move.checkOut ? new Date(move.checkOut).toLocaleDateString('bn-BD') : ''}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {move.checkIn ? (
                        <>
                          <p className="font-medium">{new Date(move.checkIn).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[10px] text-gray-400">{new Date(move.checkIn).toLocaleDateString('bn-BD')}</p>
                        </>
                      ) : (
                        <span className="text-orange-500 font-bold text-xs animate-pulse">বাইরে আছেন</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {move.allowanceType && move.allowanceType !== 'NONE' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-tight">
                          {move.allowanceType}: ৳{move.amount}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-[10px] font-bold uppercase">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!move.checkIn && (
                        <button 
                          onClick={() => handleCheckIn(move.id)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 ml-auto shadow-md shadow-indigo-100 active:scale-95"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          ফিরে এসেছেন
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                     <div className="flex flex-col items-center gap-2 opacity-20">
                        <Clock className="w-12 h-12" />
                        <p className="text-lg font-bold">কোনো মুভমেন্ট লগ পাওয়া যায়নি</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MovementLogView;
