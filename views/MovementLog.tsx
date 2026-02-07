
import React, { useState, useMemo, useEffect } from 'react';
import { LogIn, LogOut, Clock, Info, Search, Calendar, FilterX, CalendarDays, MapPin, User, Bus, Banknote, X } from 'lucide-react';
import { MovementLog, Staff, BillingRule, UserRole, ChatMessage } from '../types';

interface MovementProps {
  movements: MovementLog[];
  setMovements: React.Dispatch<React.SetStateAction<MovementLog[]>>;
  staffList: Staff[];
  billingRules: BillingRule[];
  role: UserRole;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>; 
  currentUser: string | null; 
  onUpdatePoints: (staffId: string, points: number, reason: string) => void;
}

const MovementLogView: React.FC<MovementProps> = ({ movements = [], setMovements, staffList = [], billingRules = [], role, setMessages, currentUser, onUpdatePoints }) => {
  // Checkout Form State
  const [selectedStaff, setSelectedStaff] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [transportMode, setTransportMode] = useState('');

  // Check-in Modal State
  const [checkInModalId, setCheckInModalId] = useState<string | null>(null);
  const [transportCost, setTransportCost] = useState<string>('');

  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeStaff = (staffList || []).filter(s => !s.deletedAt && s.status === 'ACTIVE');

  // Auto-select Staff for Non-Admin
  useEffect(() => {
    if (role === UserRole.STAFF && currentUser) {
      const myself = activeStaff.find(s => s.name === currentUser);
      if (myself) {
        setSelectedStaff(myself.id);
      }
    }
  }, [role, currentUser, staffList]);

  // Predefined Options
  const PURPOSE_OPTIONS = ['Client Visit', 'Bank Work', 'Purchase', 'Delivery', 'Personal', 'Lunch/Dinner', 'Other'];
  
  // Updated Transport Options with Icons & New Items
  const TRANSPORT_OPTIONS = [
    'Walking 🚶', 
    'Rickshaw 🛺', 
    'Bus 🚌', 
    'CNG 🛺', 
    'Motorbike 🏍️', 
    'Company Car 🚘', 
    'Uber/Pathao 🚗', 
    'Metrorail 🚊', 
    'Pickup 🚚'
  ];

  // Filter Logic
  const filteredMovements = useMemo(() => {
    return (movements || [])
      .filter(m => !m.isDeleted)
      .filter(m => {
        const matchesSearch = 
          m.staffName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (m.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.purpose || '').toLowerCase().includes(searchTerm.toLowerCase());
        
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
    if (!authorizedBy) return alert('অনুমোদনকারী (কে পাঠিয়েছে) নির্বাচন করুন');
    if (!location) return alert('গন্তব্য লিখুন');

    const staff = activeStaff.find(s => s.id === selectedStaff);
    const newMovement: MovementLog = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: selectedStaff,
      staffName: staff?.name || '',
      checkOut: new Date().toISOString(),
      location: location,
      purpose: purpose || 'Official',
      transportMode: transportMode || 'N/A',
      authorizedBy: authorizedBy,
      transportCost: 0
    };
    setMovements(prev => [newMovement, ...prev]);
    
    // Give 1 Point
    onUpdatePoints(selectedStaff, 1, 'MOVEMENT_UPDATE');

    // --- AUTO CHAT MESSAGE LOGIC ---
    if (staff) {
      const systemMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        text: `🚗 ${staff.name} (${staff.staffId}) এখন "${location}" এর উদ্দেশ্যে বের হলেন।\nকারণ: ${purpose || 'Not specified'}\nঅনুমোদনে: ${authorizedBy}`,
        sender: 'System Bot',
        role: UserRole.ADMIN,
        timestamp: new Date().toISOString(),
        type: 'SYSTEM_MOVEMENT',
        targetView: 'movements'
      };
      setMessages(prev => [...prev, systemMsg]);
    }
    // -------------------------------

    // Reset Form
    if (role !== UserRole.STAFF) {
        setSelectedStaff('');
    }
    setLocation('');
    setPurpose('');
    setTransportMode('');
    setAuthorizedBy(''); // Reset authorizedBy or keep it if admin prefers? Resetting is safer.
  };

  const openCheckInModal = (id: string) => {
    setCheckInModalId(id);
    setTransportCost('');
  };

  const confirmCheckIn = () => {
    if (!checkInModalId) return;

    const checkInTime = new Date().toISOString();
    const cost = Number(transportCost) || 0;

    setMovements(prev => prev.map(m => {
      if (m.id === checkInModalId) {
        const checkOutDate = new Date(m.checkOut!);
        const checkInDate = new Date(checkInTime);
        
        let allowanceType: MovementLog['allowanceType'] = 'NONE';
        let amount = 0;

        // 1. HOLIDAY CHECK (Friday = 5)
        const dayOfWeek = checkInDate.getDay();
        if (dayOfWeek === 5) { // Friday
           allowanceType = 'HOLIDAY';
           amount = (billingRules || []).find(r => r.type === 'HOLIDAY')?.amount || 0;
        } else {
           // 2. Normal Rules (Lunch/Dinner/Night) only if NOT a holiday
           const lunchRule = (billingRules || []).find(r => r.type === 'LUNCH');
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
           // Priority: Dinner > Night
           if (hour >= 22) {
             allowanceType = 'DINNER';
             amount = (billingRules || []).find(r => r.type === 'DINNER')?.amount || 0;
           } else if (hour > 21 || (hour === 21 && min >= 15)) {
             allowanceType = 'NIGHT';
             amount = (billingRules || []).find(r => r.type === 'NIGHT')?.amount || 0;
           }
        }

        // --- AUTO CHAT MESSAGE (RETURN) ---
        const returnMsg: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          text: `✅ ${m.staffName} অফিসে ফিরে এসেছেন।${cost > 0 ? ` (ভাড়া: ৳${cost})` : ''}`,
          sender: 'System Bot',
          role: UserRole.ADMIN,
          timestamp: new Date().toISOString(),
          type: 'SYSTEM_MOVEMENT',
          targetView: 'movements'
        };
        setMessages(prev => [...prev, returnMsg]);
        // ----------------------------------

        return { ...m, checkIn: checkInTime, allowanceType, amount, transportCost: cost };
      }
      return m;
    }));

    setCheckInModalId(null);
    setTransportCost('');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  const getStaffDisplayId = (staffId: string) => {
    const staff = (staffList || []).find(s => s.id === staffId);
    return staff ? staff.staffId : '';
  };

  return (
    <div className="space-y-8">
      {/* Check-out Control */}
      {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <LogOut className="w-6 h-6 text-orange-500" />
            মুভমেন্ট চেক-আউট (অফিস থেকে বের হওয়া)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 1. Who is going */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">স্টাফ মেম্বার</label>
              <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <select 
                   className={`w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-700 text-sm ${role === UserRole.STAFF ? 'opacity-80 cursor-not-allowed bg-gray-100' : ''}`}
                   value={selectedStaff}
                   onChange={(e) => setSelectedStaff(e.target.value)}
                   disabled={role === UserRole.STAFF}
                 >
                   <option value="">কে যাচ্ছেন?</option>
                   {activeStaff.map(s => (
                     <option key={s.id} value={s.id}>{s.name}</option>
                   ))}
                 </select>
              </div>
            </div>

            {/* 2. Sent By (Who authorized) */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">অনুমোদনকারী (কে পাঠিয়েছে?)</label>
              <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                 <select 
                   className="w-full pl-9 pr-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-indigo-700 text-sm"
                   value={authorizedBy}
                   onChange={(e) => setAuthorizedBy(e.target.value)}
                 >
                   <option value="">কার নির্দেশে?</option>
                   {activeStaff.map(s => (
                     <option key={s.id} value={s.name}>{s.name}</option>
                   ))}
                 </select>
              </div>
            </div>

            {/* 3. Destination */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">গন্তব্য</label>
              <div className="relative">
                 <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input 
                   type="text" 
                   placeholder="কোথায় যাচ্ছেন?" 
                   className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-semibold"
                   value={location}
                   onChange={(e) => setLocation(e.target.value)}
                 />
              </div>
            </div>

            {/* 4. Purpose */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">উদ্দেশ্য/কারণ</label>
              <select 
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="">কাজের ধরণ...</option>
                {PURPOSE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {/* 5. Transport */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">বাহন</label>
              <div className="relative">
                 <Bus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <select 
                   className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                   value={transportMode}
                   onChange={(e) => setTransportMode(e.target.value)}
                 >
                   <option value="">কিসে যাচ্ছেন? (ঐচ্ছিক)</option>
                   {TRANSPORT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                 </select>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
             <button 
                onClick={handleCheckOut}
                className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-100 flex items-center justify-center gap-2 active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                চেক-আউট (Confirm)
              </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
             <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
             <div className="text-xs text-blue-700">
               <p>সঠিক অনুমোদনকারী নির্বাচন করুন। ফিরে আসার সময় যাতায়াত ভাড়া এন্ট্রি করতে ভুলবেন না।</p>
               <p className="mt-1 font-bold text-purple-600 flex items-center gap-1"><CalendarDays className="w-3 h-3"/> শুক্রবার বা ছুটির দিনে ডিউটি করলে অটোমেটিক হলিডে বিল যুক্ত হবে।</p>
             </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">লগ খুঁজুন</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="নাম, গন্তব্য বা কারণ..." 
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
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">বিবরণ (Purpose & Auth)</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">সময়কাল</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">খরচ ও অ্যালাউন্স</th>
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
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                         <MapPin className="w-3 h-3" /> {move.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-600 uppercase">{move.purpose || 'N/A'}</span>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                             <Bus className="w-3 h-3" /> {move.transportMode || 'N/A'}
                          </div>
                          {move.authorizedBy && (
                             <div className="text-[10px] text-indigo-600 font-medium">
                                By: {move.authorizedBy}
                             </div>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                            <span className="w-12 text-[10px] uppercase font-bold text-gray-400">Out:</span>
                            <span className="font-mono font-bold text-orange-600">{move.checkOut ? new Date(move.checkOut).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="w-12 text-[10px] uppercase font-bold text-gray-400">In:</span>
                            <span className={`font-mono font-bold ${move.checkIn ? 'text-green-600' : 'text-gray-300'}`}>
                               {move.checkIn ? new Date(move.checkIn).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '---'}
                            </span>
                         </div>
                         <div className="text-[10px] text-gray-400 mt-1">{new Date(move.checkOut || '').toLocaleDateString('bn-BD')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-y-1">
                      {move.checkIn ? (
                         <>
                           {move.transportCost ? (
                              <p className="text-xs font-bold text-gray-700 flex items-center justify-end gap-1">
                                 <Banknote className="w-3 h-3 text-gray-400"/> ভাড়া: ৳{move.transportCost}
                              </p>
                           ) : null}
                           {move.allowanceType && move.allowanceType !== 'NONE' ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                                 move.allowanceType === 'HOLIDAY' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                              }`}>
                                 {move.allowanceType}: ৳{move.amount}
                              </span>
                           ) : (
                              <span className="text-gray-300 text-[10px] font-bold uppercase block">No Allowance</span>
                           )}
                         </>
                      ) : (
                         <span className="text-orange-400 text-xs italic">Waiting for return...</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!move.checkIn && (
                        <button 
                          onClick={() => openCheckInModal(move.id)}
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

      {/* CHECK-IN MODAL */}
      {checkInModalId && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Banknote className="w-8 h-8 text-green-600" />
               </div>
               <h3 className="text-xl font-black text-gray-800 mb-2">ফিরে এসেছেন?</h3>
               <p className="text-sm text-gray-500 mb-6">যাতায়াত খরচ (ভাড়া) কত হয়েছে?</p>
               
               <div className="relative mb-6">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">৳</span>
                  <input 
                     type="number" 
                     className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-xl font-bold text-center"
                     placeholder="0"
                     value={transportCost}
                     onChange={(e) => setTransportCost(e.target.value)}
                     autoFocus
                  />
               </div>

               <div className="flex gap-3">
                  <button 
                     onClick={() => setCheckInModalId(null)}
                     className="flex-1 py-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                     বাতিল
                  </button>
                  <button 
                     onClick={confirmCheckIn}
                     className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-colors"
                  >
                     কনফার্ম করুন
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default MovementLogView;
