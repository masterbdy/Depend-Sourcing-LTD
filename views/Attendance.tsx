
import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, Calendar, CheckCircle, XCircle, AlertTriangle, Fingerprint, UserCheck, ShieldCheck, Navigation, MonitorSmartphone, Search, FileText, X, RefreshCw } from 'lucide-react';
import { Staff, Attendance, UserRole } from '../types';
import { OFFICE_START_TIME, WORK_LOCATIONS } from '../constants';

interface AttendanceProps {
  staffList: Staff[];
  attendanceList: Attendance[];
  setAttendanceList: React.Dispatch<React.SetStateAction<Attendance[]>>;
  currentUser: string | null;
  role: UserRole;
}

const AttendanceView: React.FC<AttendanceProps> = ({ staffList = [], attendanceList = [], setAttendanceList, currentUser, role }) => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<{ distance: number, targetName: string, isAllowed: boolean, allowedRadius: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [kioskSearchTerm, setKioskSearchTerm] = useState('');
  
  // Late Reason State
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [pendingCheckInData, setPendingCheckInData] = useState<{staffId: string, isManual: boolean} | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const activeStaff = (staffList || []).filter(s => !s.deletedAt && s.status === 'ACTIVE');
  
  const currentUserStaff = useMemo(() => {
    return activeStaff.find(s => s.name === currentUser);
  }, [activeStaff, currentUser]);

  const targetLocations = useMemo(() => {
    const targets = [];
    
    // 1. KIOSK LOGIC
    if (role === UserRole.KIOSK && currentUserStaff) {
       if (currentUserStaff.workLocation === 'CUSTOM' && currentUserStaff.customLocation) {
          targets.push({
             name: currentUserStaff.customLocation.name || 'Kiosk Location',
             lat: Number(currentUserStaff.customLocation.lat),
             lng: Number(currentUserStaff.customLocation.lng),
             allowedRadiusMeters: Number(currentUserStaff.customLocation.radius) || 300
          });
       } else {
          // Default Kiosk to Factory
          targets.push(WORK_LOCATIONS['FACTORY']);
       }
       return targets;
    }

    // 2. STAFF LOGIC - Fallback if no user found
    if (!currentUserStaff) {
       targets.push(WORK_LOCATIONS['HEAD_OFFICE']);
       return targets;
    }

    // 3. STAFF CUSTOM LOCATION LOGIC
    if (currentUserStaff.workLocation === 'CUSTOM') {
       let hasValidCustomLoc = false;

       // Primary Custom Location
       if (currentUserStaff.customLocation && currentUserStaff.customLocation.lat && currentUserStaff.customLocation.lng) {
          targets.push({
             name: currentUserStaff.customLocation.name || 'Custom Location 1',
             lat: Number(currentUserStaff.customLocation.lat),
             lng: Number(currentUserStaff.customLocation.lng),
             allowedRadiusMeters: Number(currentUserStaff.customLocation.radius) || 200
          });
          hasValidCustomLoc = true;
       }

       // Secondary Custom Location
       if (currentUserStaff.secondaryCustomLocation && currentUserStaff.secondaryCustomLocation.lat && currentUserStaff.secondaryCustomLocation.lng) {
          targets.push({
             name: currentUserStaff.secondaryCustomLocation.name || 'Custom Location 2',
             lat: Number(currentUserStaff.secondaryCustomLocation.lat),
             lng: Number(currentUserStaff.secondaryCustomLocation.lng),
             allowedRadiusMeters: Number(currentUserStaff.secondaryCustomLocation.radius) || 200
          });
          hasValidCustomLoc = true;
       }
       
       // Fallback: If "CUSTOM" is selected but no coordinates are set, use HEAD_OFFICE to prevent lockout
       if (!hasValidCustomLoc) {
          targets.push(WORK_LOCATIONS['HEAD_OFFICE']);
       }
    } else {
       // 4. PREDEFINED LOCATION (HEAD_OFFICE, FACTORY, FIELD)
       const locationKey = currentUserStaff.workLocation || 'HEAD_OFFICE';
       const loc = WORK_LOCATIONS[locationKey];
       
       if (loc) {
         targets.push(loc);
       } else {
         targets.push(WORK_LOCATIONS['HEAD_OFFICE']);
       }
    }
    
    return targets;
  }, [currentUserStaff, role]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Ensure inputs are numbers
    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);

    const R = 6371e3; // metres
    const φ1 = nLat1 * Math.PI / 180;
    const φ2 = nLat2 * Math.PI / 180;
    const Δφ = (nLat2 - nLat1) * Math.PI / 180;
    const Δλ = (nLon2 - nLon1) * Math.PI / 180;

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

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });
        
        let bestMatch = { distance: Infinity, targetName: 'Unknown', isAllowed: false, allowedRadius: 0 };

        for (const target of targetLocations) {
           const dist = calculateDistance(lat, lng, target.lat, target.lng);
           const allowed = dist <= target.allowedRadiusMeters;
           
           // If we find an allowed location, verify immediately (Field users are always allowed)
           if (allowed || target.allowedRadiusMeters > 5000000) { 
              bestMatch = { distance: dist, targetName: target.name, isAllowed: true, allowedRadius: target.allowedRadiusMeters };
              break; 
           }
           
           // Keep track of the closest location found so far
           if (dist < bestMatch.distance) {
              bestMatch = { distance: dist, targetName: target.name, isAllowed: false, allowedRadius: target.allowedRadiusMeters };
           }
        }

        setDistanceInfo(bestMatch);
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error("GPS Error:", error);
        let errorMsg = "লোকেশন পাওয়া যাচ্ছে না।";
        if (error.code === 1) errorMsg = "লোকেশন পারমিশন দেওয়া হয়নি।";
        else if (error.code === 2) errorMsg = "জিপিএস সিগনাল পাওয়া যাচ্ছে না।";
        else if (error.code === 3) errorMsg = "লোকেশন রিকোয়েস্ট টাইমআউট হয়েছে।";

        if (!silent) setLocationError(`${errorMsg} আবার চেষ্টা করুন।`);
        setIsLoadingLocation(false);
      },
      options
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
        alert("লোকেশন ডাটা পাওয়া যাচ্ছে না। অনুগ্রহ করে 'Refresh Location' বাটনে ক্লিক করুন।");
        getLocation(false); 
        return;
      }
      
      if (!distanceInfo.isAllowed) {
        alert(`চেক-ইন ব্যর্থ! ❌\n\nকারণ: আপনি নির্ধারিত স্থান থেকে দূরে আছেন।\n\nটার্গেট: ${distanceInfo.targetName}\nবর্তমান দূরত্ব: ${Math.round(distanceInfo.distance)} মিটার\nঅনুমোদিত দূরত্ব: ${distanceInfo.allowedRadius} মিটার\n\nদয়া করে লোকেশনের কাছাকাছি যান এবং পুনরায় চেষ্টা করুন।`);
        getLocation(false); // Try refreshing just in case
        return;
      }
    }

    const now = new Date();
    // Improved Time Check Logic
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeVal = hours * 60 + minutes;
    
    const [startH, startM] = OFFICE_START_TIME.split(':').map(Number);
    const startTimeVal = startH * 60 + startM;
    
    const isLate = currentTimeVal > startTimeVal;

    if (isLate) {
       setPendingCheckInData({ staffId, isManual });
       setIsLateModalOpen(true);
    } else {
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

  const myAttendance = (attendanceList || []).find(a => a.date === today && a.staffName === currentUser);
  
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
               {(attendanceList || []).filter(a => a.date === today).length} <span className="text-sm text-gray-400 font-medium">/ {activeStaff.filter(s => s.role === UserRole.STAFF).length}</span>
            </p>
         </div>
         <div className="bg-white dark:bg-gray-800/60 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10">
            <p className="text-[10px] uppercase font-bold text-gray-400">লেট উপস্থিতি</p>
            <p className="text-2xl font-black text-orange-500 dark:text-orange-400">
               {(attendanceList || []).filter(a => a.date === today && a.status === 'LATE').length}
            </p>
         </div>
      </div>

      {/* --- GPS STATUS BAR (VISIBLE FOR STAFF & KIOSK) --- */}
      {(role === UserRole.STAFF || role === UserRole.KIOSK) && (
        <div className={`p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm border animate-in fade-in duration-300 ${distanceInfo?.isAllowed ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
           <div className="flex items-center gap-3 mb-3 md:mb-0">
              <div className={`p-2 rounded-full ${distanceInfo?.isAllowed ? 'bg-green-200 dark:bg-green-800' : 'bg-orange-200 dark:bg-orange-800'} animate-pulse`}>
                 <MapPin className={`w-6 h-6 ${distanceInfo?.isAllowed ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'}`} />
              </div>
              <div>
                 <h3 className={`font-bold ${distanceInfo?.isAllowed ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
                    {isLoadingLocation ? 'লোকেশন যাচাই করা হচ্ছে...' : distanceInfo?.isAllowed ? 'লোকেশন ঠিক আছে - হাজিরা দিন ✅' : 'চেক-ইন লোকেশনের বাইরে ⚠️'}
                 </h3>
                 <p className="text-xs font-medium opacity-80 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    {locationError ? (
                       <span className="text-red-500">{locationError}</span>
                    ) : distanceInfo ? (
                       <>টার্গেট: {distanceInfo.targetName} | বর্তমান দূরত্ব: {Math.round(distanceInfo.distance)} মি.</>
                    ) : (
                       'জিপিএস সিগনালের জন্য অপেক্ষা করা হচ্ছে...'
                    )}
                 </p>
              </div>
           </div>
           <button 
             onClick={() => getLocation(false)} 
             className="w-full md:w-auto bg-white dark:bg-gray-700 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2 transition-all active:scale-95"
           >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLocation ? 'animate-spin' : ''}`} /> 
              রিফ্রেশ লোকেশন
           </button>
        </div>
      )}

      {/* --- KIOSK MODE UI --- */}
      {role === UserRole.KIOSK && (
        <div className="space-y-6">
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
                 const record = (attendanceList || []).find(a => a.date === today && a.staffId === staff.id);
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
                             <img src={staff.photo} alt={staff.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                          ) : (
                             <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                                {staff.name.charAt(0)}
                             </div>
                          )}
                          {isCheckedIn && (
                             <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${record?.checkOutTime ? 'bg-gray-400' : 'bg-green-500 text-white'}`}>
                                {record?.checkOutTime ? <X className="w-3 h-3 text-white" /> : <CheckCircle className="w-4 h-4" />}
                             </div>
                          )}
                       </div>
                       <div className="text-center">
                          <p className="font-bold text-sm text-gray-800 dark:text-gray-200 line-clamp-1">{staff.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{staff.staffId}</p>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
      )}

      {/* LATE REASON MODAL */}
      {isLateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6">
              <div className="text-center mb-4">
                 <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="w-6 h-6" />
                 </div>
                 <h3 className="font-bold text-lg text-gray-800 dark:text-white">দেরি হয়েছে!</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">অফিস টাইম সকাল ৯:০০ টা। দেরি হওয়ার কারণ লিখুন।</p>
              </div>
              <form onSubmit={handleSubmitLateReason}>
                 <textarea 
                   required
                   className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 outline-none mb-4 text-gray-800 dark:text-gray-200"
                   placeholder="দেরির কারণ..."
                   rows={3}
                   value={lateReason}
                   onChange={(e) => setLateReason(e.target.value)}
                 />
                 <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsLateModalOpen(false)}
                      className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                       বাতিল
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 dark:shadow-none"
                    >
                       জমা দিন
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* --- NORMAL STAFF VIEW (LIST) --- */}
      {role !== UserRole.KIOSK && (
        <div className="bg-white dark:bg-gray-800/60 rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
           <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                 <Fingerprint className="w-5 h-5 text-indigo-500" /> আজকের উপস্থিতি তালিকা
              </h3>
              {currentUserStaff && (
                 <div className="flex items-center gap-3">
                    {/* Manual Check-in Button if enabled/needed or just status */}
                    {!myAttendance ? (
                       <>
                         <button 
                           onClick={() => handleCheckIn(currentUserStaff.id)}
                           className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-700 active:scale-95 shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-all"
                         >
                            <UserCheck className="w-4 h-4" /> চেক-ইন দিন
                         </button>
                         {/* Manual Refresh Button for mobile convenience */}
                         <button onClick={() => getLocation(false)} className="md:hidden bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-2 rounded-xl active:scale-95">
                            <RefreshCw className={`w-4 h-4 ${isLoadingLocation ? 'animate-spin' : ''}`} />
                         </button>
                       </>
                    ) : !myAttendance.checkOutTime ? (
                       <button 
                         onClick={() => handleCheckOut(myAttendance.id)}
                         className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-orange-200 dark:shadow-none hover:bg-orange-600 active:scale-95 transition-all flex items-center gap-2"
                       >
                          <Clock className="w-4 h-4" /> চেক-আউট
                       </button>
                    ) : (
                       <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                          আজকের ডিউটি শেষ ✅
                       </span>
                    )}
                 </div>
              )}
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                       <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">স্টাফ মেম্বার</th>
                       <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">চেক-ইন</th>
                       <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">চেক-আউট</th>
                       <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">স্ট্যাটাস</th>
                       <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">লোকেশন</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {(attendanceList || []).filter(a => a.date === today).map((record) => (
                       <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-5 py-3">
                             <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{record.staffName}</p>
                             {record.note && <p className="text-[10px] text-red-400 italic mt-0.5">Note: {record.note}</p>}
                          </td>
                          <td className="px-5 py-3 text-center">
                             <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{new Date(record.checkInTime).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
                          </td>
                          <td className="px-5 py-3 text-center">
                             {record.checkOutTime ? (
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{new Date(record.checkOutTime).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</p>
                             ) : (
                                <span className="text-[10px] text-gray-400">---</span>
                             )}
                          </td>
                          <td className="px-5 py-3 text-center">
                             <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${getStatusColor(record.status)}`}>
                                {record.status}
                             </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                             <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                                <MapPin className="w-3 h-3" />
                                {record.location?.address || 'Unknown'}
                             </div>
                          </td>
                       </tr>
                    ))}
                    {(attendanceList || []).filter(a => a.date === today).length === 0 && (
                       <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-xs">আজকের কোনো হাজিরা পাওয়া যায়নি</td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
