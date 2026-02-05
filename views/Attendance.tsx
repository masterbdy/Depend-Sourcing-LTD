
import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, Calendar, CheckCircle, XCircle, AlertTriangle, Fingerprint, UserCheck, ShieldCheck, Navigation, MonitorSmartphone, Search, FileText, X } from 'lucide-react';
import { Staff, Attendance, UserRole } from '../types';
import { OFFICE_START_TIME, WORK_LOCATIONS } from '../constants';

interface AttendanceProps {
  staffList: Staff[];
  attendanceList: Attendance[];
  setAttendanceList: React.Dispatch<React.SetStateAction<Attendance[]>>;
  currentUser: string | null;
  role: UserRole;
}

const AttendanceView: React.FC<AttendanceProps> = ({ staffList, attendanceList, setAttendanceList, currentUser, role }) => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<{ distance: number, targetName: string, isAllowed: boolean } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [kioskSearchTerm, setKioskSearchTerm] = useState('');
  
  // Late Reason State
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [pendingCheckInData, setPendingCheckInData] = useState<{staffId: string, isManual: boolean} | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const activeStaff = staffList.filter(s => !s.deletedAt && s.status === 'ACTIVE');
  
  const currentUserStaff = useMemo(() => {
    return activeStaff.find(s => s.name === currentUser);
  }, [activeStaff, currentUser]);

  const targetLocations = useMemo(() => {
    const targets = [];
    
    if (role === UserRole.KIOSK && currentUserStaff) {
       if (currentUserStaff.workLocation === 'CUSTOM' && currentUserStaff.customLocation) {
          targets.push({
             name: currentUserStaff.customLocation.name || 'Kiosk Location',
             lat: currentUserStaff.customLocation.lat,
             lng: currentUserStaff.customLocation.lng,
             allowedRadiusMeters: currentUserStaff.customLocation.radius || 300
          });
       } else {
          targets.push(WORK_LOCATIONS['FACTORY']);
       }
       return targets;
    }

    if (!currentUserStaff) {
       targets.push(WORK_LOCATIONS['HEAD_OFFICE']);
       return targets;
    }

    if (currentUserStaff.workLocation === 'CUSTOM') {
       if (currentUserStaff.customLocation) {
          targets.push({
             name: currentUserStaff.customLocation.name || 'Custom Location 1',
             lat: currentUserStaff.customLocation.lat,
             lng: currentUserStaff.customLocation.lng,
             allowedRadiusMeters: currentUserStaff.customLocation.radius || 200
          });
       }
       if (currentUserStaff.secondaryCustomLocation) {
          targets.push({
             name: currentUserStaff.secondaryCustomLocation.name || 'Custom Location 2',
             lat: currentUserStaff.secondaryCustomLocation.lat,
             lng: currentUserStaff.secondaryCustomLocation.lng,
             allowedRadiusMeters: currentUserStaff.secondaryCustomLocation.radius || 200
          });
       }
    } else {
       targets.push(WORK_LOCATIONS[currentUserStaff.workLocation || 'HEAD_OFFICE']);
    }
    
    return targets;
  }, [currentUserStaff, role]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  const getLocation = (silent: boolean = false) => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      if (!silent) setLocationError("আপনার ব্রাউজারে জিওলোকেশন সাপোর্ট নেই।");
      setIsLoadingLocation(false);
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
       navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'denied') {
             if (!silent) setLocationError("লোকেশন এক্সেস দেওয়া হয়নি। সেটিংস থেকে অনুমতি দিন।");
             setIsLoadingLocation(false);
             return;
          }
       });
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });
        
        let bestMatch = { distance: Infinity, targetName: 'Unknown', isAllowed: false };

        for (const target of targetLocations) {
           const dist = calculateDistance(lat, lng, target.lat, target.lng);
           const allowed = dist <= target.allowedRadiusMeters;
           
           if (allowed) {
              bestMatch = { distance: dist, targetName: target.name, isAllowed: true };
              break; 
           }
           
           if (dist < bestMatch.distance) {
              bestMatch = { distance: dist, targetName: target.name, isAllowed: false };
           }
        }

        setDistanceInfo(bestMatch);
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error(error);
        if (!silent) setLocationError("লোকেশন পাওয়া যাচ্ছে না। দয়া করে জিপিএস অন করুন এবং পারমিশন দিন।");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (role === UserRole.STAFF || role === UserRole.KIOSK) {
      getLocation(true); 
    }
  }, [role, targetLocations]);

  // Final check-in execution logic
  const performCheckIn = (staffId: string, isManual: boolean, status: 'PRESENT' | 'LATE', note?: string) => {
    const staff = activeStaff.find(s => s.id === staffId);
    if (!staff) return;

    const now = new Date();
    
    const newRecord: Attendance = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: staff.id,
      staffName: staff.name,
      date: today,
      checkInTime: now.toISOString(),
      status: status,
      isManualByAdmin: isManual,
      note: note,
      location: isManual ? undefined : { 
        lat: currentLocation ? currentLocation.lat : 0, 
        lng: currentLocation ? currentLocation.lng : 0, 
        address: isManual ? staff.workLocation : distanceInfo?.targetName
      }
    };

    setAttendanceList(prev => [...prev, newRecord]);
    
    if (role === UserRole.KIOSK) {
      alert(`${staff.name} - এর হাজিরা সফল হয়েছে! ✅`);
    } else if (!isManual) {
      alert("সফলভাবে চেক-ইন সম্পন্ন হয়েছে! ✅");
    }

    // Reset Modal State
    setPendingCheckInData(null);
    setLateReason('');
    setIsLateModalOpen(false);
  };

  const handleCheckIn = (staffId: string, isManual = false) => {
    const staff = activeStaff.find(s => s.id === staffId);
    if (!staff) return;

    if (!isManual) {
      if (!currentLocation || !distanceInfo) {
        alert("আগে ডিভাইসের লোকেশন যাচাই করুন।");
        getLocation(false); 
        return;
      }
      
      if (!distanceInfo.isAllowed) {
        alert(`ডিভাইসটি ${distanceInfo.targetName} থেকে ${Math.round(distanceInfo.distance)} মিটার দূরে আছে। চেক-ইন করতে নির্ধারিত স্থানের কাছাকাছি থাকতে হবে।`);
        return;
      }
    }

    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false });
    const isLate = currentTimeStr > OFFICE_START_TIME;

    if (isLate) {
       // Open Modal for Reason
       setPendingCheckInData({ staffId, isManual });
       setIsLateModalOpen(true);
    } else {
       // Proceed normally
       performCheckIn(staffId, isManual, 'PRESENT');
    }
  };

  const handleSubmitLateReason = (e: React.FormEvent) => {
     e.preventDefault();
     if (!pendingCheckInData) return;
     if (!lateReason.trim()) {
        alert("দয়া করে দেরির কারণ লিখুন।");
        return;
     }
     performCheckIn(pendingCheckInData.staffId, pendingCheckInData.isManual, 'LATE', lateReason);
  };

  const handleCheckOut = (recordId: string, isForceByAdmin = false) => {
    if (isForceByAdmin) {
      setAttendanceList(prev => prev.map(a => a.id === recordId ? { ...a, checkOutTime: new Date().toISOString() } : a));
      return;
    }

    if (currentUserStaff && currentUserStaff.requiresCheckOutLocation) {
      if (!currentLocation || !distanceInfo) {
        alert("লোকেশন যাচাই করা যাচ্ছে না। দয়া করে লোকেশন বাটন রিফ্রেশ করুন।");
        getLocation(false);
        return;
      }

      if (!distanceInfo.isAllowed) {
        alert(`চেক-আউট ব্যর্থ! ❌\n\nআপনি অফিস/নির্ধারিত স্থান থেকে ${Math.round(distanceInfo.distance)} মিটার দূরে আছেন।`);
        return;
      }
    }

    setAttendanceList(prev => prev.map(a => a.id === recordId ? { ...a, checkOutTime: new Date().toISOString() } : a));
    if (role === UserRole.KIOSK) {
       alert('চেক-আউট সম্পন্ন হয়েছে!');
    }
  };

  const myAttendance = attendanceList.find(a => a.date === today && a.staffName === currentUser);
  
  const getStatusColor = (status: Attendance['status']) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'LATE': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'ABSENT': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'LEAVE': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const kioskStaffList = useMemo(() => {
    return activeStaff
      .filter(s => s.role === UserRole.STAFF) 
      .filter(s => s.name.toLowerCase().includes(kioskSearchTerm.toLowerCase()) || s.staffId.toLowerCase().includes(kioskSearchTerm.toLowerCase()));
  }, [activeStaff, kioskSearchTerm]);

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white dark:bg-gray-800/60 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
            <p className="text-[10px] uppercase font-bold text-gray-400">আজকের তারিখ</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              {new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
         </div>
         <div className="bg-white dark:bg-gray-800/60 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
            <p className="text-[10px] uppercase font-bold text-gray-400">অফিস সময়</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              সকাল ৯:০০ টা
            </p>
         </div>
         <div className="bg-white dark:bg-gray-800/60 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
            <p className="text-[10px] uppercase font-bold text-gray-400">মোট উপস্থিত</p>
            <p className="text-2xl font-black text-green-600 dark:text-green-400">
               {attendanceList.filter(a => a.date === today).length} <span className="text-sm text-gray-400 font-medium">/ {activeStaff.filter(s => s.role === UserRole.STAFF).length}</span>
            </p>
         </div>
         <div className="bg-white dark:bg-gray-800/60 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
            <p className="text-[10px] uppercase font-bold text-gray-400">লেট উপস্থিতি</p>
            <p className="text-2xl font-black text-orange-500 dark:text-orange-400">
               {attendanceList.filter(a => a.date === today && a.status === 'LATE').length}
            </p>
         </div>
      </div>

      {/* --- KIOSK MODE UI --- */}
      {role === UserRole.KIOSK && (
        <div className="space-y-6">
           <div className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${distanceInfo?.isAllowed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-full ${distanceInfo?.isAllowed ? 'bg-green-200 dark:bg-green-800' : 'bg-red-200 dark:bg-red-800'}`}>
                    <MonitorSmartphone className={`w-6 h-6 ${distanceInfo?.isAllowed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`} />
                 </div>
                 <div>
                    <h3 className={`font-bold ${distanceInfo?.isAllowed ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                       {distanceInfo?.isAllowed ? 'ডিভাইস এক্টিভ - হাজিরা নেওয়া হচ্ছে' : 'ডিভাইস লোকেশনের বাইরে আছে'}
                    </h3>
                    <p className="text-xs font-medium opacity-80 text-gray-600 dark:text-gray-300">
                       {distanceInfo ? `${distanceInfo.targetName} থেকে ${Math.round(distanceInfo.distance)} মি. দূরে` : 'লোকেশন যাচাই করা হচ্ছে...'}
                    </p>
                 </div>
              </div>
              <button onClick={() => getLocation(false)} className="bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 flex items-center gap-1 transition-colors">
                 <Navigation className={`w-3 h-3 ${isLoadingLocation ? 'animate-spin' : ''}`} /> রিফ্রেশ
              </button>
           </div>

           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="নাম অথবা আইডি দিয়ে খুঁজুন..." 
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-800 dark:text-white"
                value={kioskSearchTerm}
                onChange={(e) => setKioskSearchTerm(e.target.value)}
              />
           </div>

           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {kioskStaffList.map(staff => {
                 const record = attendanceList.find(a => a.date === today && a.staffId === staff.id);
                 const isCheckedIn = !!record;
                 
                 return (
                    <div 
                      key={staff.id}
                      onClick={() => {
                         if (!distanceInfo?.isAllowed) {
                            alert("ডিভাইস লোকেশনের বাইরে আছে। হাজিরা দেওয়া যাবে না।");
                            return;
                         }
                         if (isCheckedIn) {
                            if(confirm(`${staff.name} আপনি কি চেক-আউট করতে চান?`)) {
                               handleCheckOut(record.id);
                            }
                         } else {
                            handleCheckIn(staff.id);
                         }
                      }}
                      className={`relative p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all active:scale-95 shadow-sm hover:shadow-md ${
                         isCheckedIn 
                           ? record.checkOutTime 
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60' 
                              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 ring-2 ring-green-100 dark:ring-green-900'
                           : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                      }`}
                    >
                       <div className="relative">
                          {staff.photo ? (
                             <img src={staff.photo} alt={staff.name} className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-sm" />
                          ) : (
                             <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-sm ${isCheckedIn ? 'bg-green-400' : 'bg-indigo-400'}`}>
                                {staff.name.charAt(0)}
                             </div>
                          )}
                          {isCheckedIn && !record.checkOutTime && (
                             <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-full border-2 border-white dark:border-gray-800">
                                <CheckCircle className="w-4 h-4" />
                             </div>
                          )}
                       </div>
                       
                       <div className="text-center w-full">
                          <p className="font-bold text-gray-800 dark:text-gray-200 truncate text-sm">{staff.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded-full inline-block mt-1">{staff.staffId}</p>
                       </div>

                       {isCheckedIn ? (
                          <div className="w-full text-center">
                             <div className={`text-[10px] font-bold px-2 py-1 rounded w-full mb-1 ${record.checkOutTime ? 'text-gray-500 bg-gray-200 dark:bg-gray-700 dark:text-gray-400' : 'text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300'}`}>
                                {record.checkOutTime ? 'Duty Done' : `IN: ${new Date(record.checkInTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})}`}
                             </div>
                             {!record.checkOutTime && (
                                <span className="text-[10px] font-bold text-white bg-red-500 px-3 py-1 rounded-full animate-pulse shadow-sm">
                                  Check Out
                                </span>
                             )}
                          </div>
                       ) : (
                          <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded w-full text-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50">
                             Tap to Present
                          </div>
                       )}
                    </div>
                 );
              })}
           </div>
        </div>
      )}

      {/* STAFF VIEW: Self Check-In */}
      {role === UserRole.STAFF && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-indigo-100 dark:border-indigo-900/50 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          <div className="p-8 text-center">
            
            {myAttendance ? (
              <div className="py-6">
                 <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                 </div>
                 <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">হাজিরা সম্পন্ন হয়েছে!</h2>
                 <p className="text-gray-500 dark:text-gray-400 mt-2">চেক-ইন সময়: <span className="font-bold text-indigo-600 dark:text-indigo-400">{new Date(myAttendance.checkInTime).toLocaleTimeString('bn-BD')}</span></p>
                 <div className={`inline-block px-4 py-1 rounded-full text-xs font-black uppercase mt-3 ${getStatusColor(myAttendance.status)}`}>
                    STATUS: {myAttendance.status}
                 </div>
                 
                 {!myAttendance.checkOutTime ? (
                   <div className="mt-8">
                     <button 
                       onClick={() => handleCheckOut(myAttendance.id)}
                       className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-6 py-2 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors flex items-center justify-center gap-2 mx-auto"
                     >
                        অফিস থেকে বের হন (Check Out)
                     </button>
                     {currentUserStaff?.requiresCheckOutLocation && (
                       <p className="text-[10px] text-red-400 mt-2 font-medium bg-red-50 dark:bg-red-900/20 inline-block px-2 py-1 rounded border border-red-100 dark:border-red-900/30">
                         সতর্কতা: চেক-আউট করার সময় অফিসে উপস্থিত থাকা বাধ্যতামূলক।
                       </p>
                     )}
                   </div>
                 ) : (
                   <p className="mt-4 text-sm text-gray-400 font-bold">Check Out: {new Date(myAttendance.checkOutTime).toLocaleTimeString('bn-BD')}</p>
                 )}
              </div>
            ) : (
              <div className="py-4">
                 <div className="mb-6 relative inline-block">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-xl transition-all ${distanceInfo?.isAllowed ? 'bg-indigo-600 border-indigo-200 cursor-pointer hover:scale-105 active:scale-95' : 'bg-gray-300 dark:bg-gray-700 border-gray-100 dark:border-gray-600 cursor-not-allowed'}`}
                         onClick={() => {
                           if (currentUser) {
                             const me = activeStaff.find(s => s.name === currentUser);
                             if (me) handleCheckIn(me.id);
                           }
                         }}
                    >
                      <Fingerprint className="w-16 h-16 text-white" />
                    </div>
                    {distanceInfo?.isAllowed && (
                       <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">Ready</span>
                    )}
                 </div>

                 <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">আজকের হাজিরা দিন</h2>
                 <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {targetLocations.map((loc, idx) => (
                       <span key={idx} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                          {loc.name}
                       </span>
                    ))}
                 </div>
                 
                 <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 max-w-sm mx-auto mb-4 border border-gray-200 dark:border-gray-600">
                    {isLoadingLocation ? (
                       <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center gap-2">
                         <Navigation className="w-4 h-4 animate-spin" /> লোকেশন যাচাই করা হচ্ছে...
                       </p>
                    ) : locationError ? (
                       <div className="text-red-500 dark:text-red-400 text-sm font-bold flex flex-col items-center">
                          <XCircle className="w-6 h-6 mb-1" />
                          {locationError}
                          <button onClick={() => getLocation(false)} className="mt-2 text-indigo-600 dark:text-indigo-400 underline">পুনরায় চেষ্টা করুন</button>
                       </div>
                    ) : (
                       <div>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">আপনার লোকেশন স্ট্যাটাস</p>
                          <div className="flex flex-col items-center justify-center gap-1">
                             <div className="flex items-center gap-2">
                                <MapPin className={`w-5 h-5 ${distanceInfo?.isAllowed ? 'text-green-500' : 'text-red-500'}`} />
                                <span className={`font-bold ${distanceInfo?.isAllowed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                   {distanceInfo?.targetName === 'FIELD' 
                                      ? 'ট্র্যাকিং অ্যাক্টিভ (Driver Mode)' 
                                      : distanceInfo ? `${distanceInfo.targetName} থেকে ${Math.round(distanceInfo.distance)} মি. দূরে` : 'অজানা'}
                                </span>
                             </div>
                             {distanceInfo && !distanceInfo.isAllowed && (
                                <p className="text-[10px] text-red-400 font-medium">কাছাকাছি কোনো অফিস পাওয়া যায়নি।</p>
                             )}
                          </div>
                       </div>
                    )}
                 </div>
                 
                 <p className="text-xs text-gray-400">Note: আপনার লোকেশন ডাটা সিকিউরলি চেক করা হবে।</p>
              </div>
            )}
          </div>
        </div>
      )}

      {(role === UserRole.ADMIN || role === UserRole.MD) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
           <div className="p-6 border-b border-gray-50 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                 <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                 আজকের উপস্থিতির তালিকা
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                 তারিখ: <span className="font-bold text-gray-800 dark:text-gray-200">{today}</span>
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                 <tr>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">স্টাফের নাম ও আইডি</th>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">লোকেশন (টাইপ)</th>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">স্ট্যাটাস</th>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রবেশ সময়</th>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ভেরিফিকেশন</th>
                   <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">অ্যাকশন</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                 {activeStaff.map((staff) => {
                   const record = attendanceList.find(a => a.date === today && a.staffId === staff.id);
                   
                   return (
                     <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                       <td className="px-6 py-4">
                         <p className="font-bold text-gray-800 dark:text-gray-200">{staff.name}</p>
                         <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 inline-block px-1.5 rounded mt-0.5">{staff.staffId}</p>
                         <p className="text-xs text-gray-400 mt-0.5">{staff.designation}</p>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${staff.workLocation === 'CUSTOM' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                             {staff.workLocation === 'CUSTOM' ? (staff.customLocation?.name || 'Custom') : (staff.workLocation || 'HEAD_OFFICE')}
                             {staff.secondaryCustomLocation && <span className="block mt-1 text-[9px] text-gray-500">+ {staff.secondaryCustomLocation.name}</span>}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                         {record ? (
                           <>
                             <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${getStatusColor(record.status)}`}>
                               {record.status}
                             </span>
                             {record.note && (
                               <div className="mt-1 flex items-start gap-1 text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                  <FileText className="w-3 h-3 shrink-0 mt-0.5"/>
                                  <span>{record.note}</span>
                               </div>
                             )}
                           </>
                         ) : (
                           <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-gray-100 dark:bg-gray-700 text-gray-400">
                             NOT CHECKED IN
                           </span>
                         )}
                       </td>
                       <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-300">
                         {record ? new Date(record.checkInTime).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                       </td>
                       <td className="px-6 py-4">
                         {record ? (
                           record.isManualByAdmin ? (
                             <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded w-fit">
                               <ShieldCheck className="w-3 h-3" /> Manual (Admin)
                             </span>
                           ) : (
                             <div className="flex flex-col">
                               <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded w-fit">
                                 <MapPin className="w-3 h-3" /> GPS Verified
                               </span>
                               {record.location?.address && <span className="text-[9px] text-gray-400 mt-1 pl-1">at {record.location.address}</span>}
                             </div>
                           )
                         ) : '-'}
                       </td>
                       <td className="px-6 py-4 text-right">
                         {!record && (
                           <button 
                             onClick={() => {
                               if(confirm(`${staff.name} অফিসে নেই। আপনি কি ম্যানুয়ালি হাজিরা দিতে চান?`)) {
                                 handleCheckIn(staff.id, true);
                               }
                             }}
                             className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 shadow-sm"
                             title="জরুরী প্রয়োজনে ম্যানুয়ালি হাজিরা দিন"
                           >
                             Manual Check-In
                           </button>
                         )}
                         {record && !record.checkOutTime && (
                           <button 
                              onClick={() => handleCheckOut(record.id, true)}
                              className="text-xs border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg font-bold hover:bg-red-50 dark:hover:bg-red-900/20"
                           >
                             Force Check-out
                           </button>
                         )}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {role === UserRole.STAFF && myAttendance && (
         <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
               <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">হাজিরা নিয়মাবলী:</h4>
               <ul className="text-xs text-blue-700 dark:text-blue-200 mt-1 list-disc list-inside space-y-1">
                  <li>প্রতিদিন সকাল ৯:০০ টার মধ্যে উপস্থিত হয়ে চেক-ইন করতে হবে।</li>
                  <li>অফিস/ফ্যাক্টরি থেকে বের হওয়ার সময় অবশ্যই চেক-আউট করতে হবে।</li>
                  <li>ড্রাইভার বা ফিল্ড স্টাফরা যেকোনো লোকেশন থেকে চেক-ইন করতে পারবেন (ট্র্যাকিং চালু থাকবে)।</li>
               </ul>
            </div>
         </div>
      )}

      {/* LATE REASON MODAL */}
      {isLateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
           <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6">
              <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                 </div>
                 <h3 className="text-xl font-black text-gray-800 dark:text-white">আপনি আজ লেট! ⚠️</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">অফিস সময় সকাল ৯:০০ টা। দয়া করে দেরির কারণ উল্লেখ করুন।</p>
              </div>
              
              <form onSubmit={handleSubmitLateReason} className="space-y-4">
                 <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">দেরির কারণ</label>
                    <textarea 
                      required 
                      rows={3} 
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-gray-800 dark:text-white"
                      placeholder="যেমন: ট্রাফিক জ্যাম, অসুস্থতা..."
                      value={lateReason}
                      onChange={(e) => setLateReason(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                         setIsLateModalOpen(false);
                         setPendingCheckInData(null);
                         setLateReason('');
                      }}
                      className="flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                       বাতিল
                    </button>
                    <button 
                      type="submit" 
                      className="flex-[2] bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 dark:shadow-none"
                    >
                       সাবমিট করুন
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
