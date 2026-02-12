import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Clock, Calendar, CheckCircle, XCircle, AlertTriangle, Fingerprint, UserCheck, ShieldCheck, Navigation, MonitorSmartphone, Search, FileText, X, RefreshCw, History, Map, Crosshair } from 'lucide-react';
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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number, accuracy: number } | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<{ distance: number, targetName: string, isAllowed: boolean, allowedRadius: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [kioskSearchTerm, setKioskSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Late Reason State
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [lateReason, setLateReason] = useState('');
  const [pendingCheckInData, setPendingCheckInData] = useState<{staffId: string, isManual: boolean} | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const activeStaff = (staffList || []).filter(s => !s.deletedAt && s.status === 'ACTIVE');
  
  const currentUserStaff = useMemo(() => {
    return activeStaff.find(s => s.name === currentUser);
  }, [activeStaff, currentUser]);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Improved Geolocation Logic: "Smart Precision"
  // Instead of taking the first result, we watch for 5 seconds to let the GPS settle and pick the best accuracy.
  const getLocation = (silent: boolean = false) => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      if (!silent) setLocationError("আপনার ব্রাউজারে জিওলোকেশন সাপোর্ট নেই।");
      setIsLoadingLocation(false);
      return;
    }

    let bestAccuracy = Infinity;
    let bestPosition: GeolocationPosition | null = null;
    let watchId: number;

    const processPosition = (position: GeolocationPosition) => {
       const accuracy = position.coords.accuracy;
       
       // If this position is better (lower accuracy number), keep it
       if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy;
          bestPosition = position;
          
          // Update State Immediately with best found so far
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCurrentLocation({ lat, lng, accuracy });

          let bestMatch = { distance: Infinity, targetName: 'Unknown', isAllowed: false, allowedRadius: 0 };

          for (const target of targetLocations) {
             const dist = calculateDistance(lat, lng, target.lat, target.lng);
             // Logic: Distance must be within Allowed Radius
             const allowed = dist <= target.allowedRadiusMeters;
             
             if (allowed || target.allowedRadiusMeters > 5000000) { 
                bestMatch = { distance: dist, targetName: target.name, isAllowed: true, allowedRadius: target.allowedRadiusMeters };
                break; 
             }
             
             if (dist < bestMatch.distance) {
                bestMatch = { distance: dist, targetName: target.name, isAllowed: false, allowedRadius: target.allowedRadiusMeters };
             }
          }
          setDistanceInfo(bestMatch);
       }
    };

    // Start Watching
    watchId = navigator.geolocation.watchPosition(
      processPosition,
      (error) => {
        console.error("GPS Error:", error);
        if (!bestPosition) { // Only show error if we haven't found ANY location yet
            let errorMsg = "লোকেশন পাওয়া যাচ্ছে না।";
            if (error.code === 1) errorMsg = "লোকেশন পারমিশন দেওয়া হয়নি।";
            else if (error.code === 2) errorMsg = "জিপিএস সিগনাল পাওয়া যাচ্ছে না (GPS Weak)।";
            else if (error.code === 3) errorMsg = "লোকেশন রিকোয়েস্ট টাইমআউট হয়েছে।";
            
            if (!silent) setLocationError(`${errorMsg} আবার চেষ্টা করুন।`);
            setIsLoadingLocation(false);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Do not use cached positions
      }
    );

    // Stop watching after 5 seconds (Warming up GPS)
    setTimeout(() => {
       navigator.geolocation.clearWatch(watchId);
       setIsLoadingLocation(false);
       if (!bestPosition && !silent) {
          setLocationError("সঠিক লোকেশন পাওয়া যায়নি। দয়া করে খোলা আকাশের নিচে যান এবং আবার চেষ্টা করুন।");
       }
    }, 5000);
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

  const stats = useMemo(() => {
     const todayList = attendanceList.filter(a => a.date === today);
     const totalPresent = todayList.length;
     const late = todayList.filter(a => a.status === 'LATE').length;
     const totalStaff = activeStaff.filter(s => s.role === UserRole.STAFF).length;
     return { totalPresent, late, totalStaff };
  }, [attendanceList, today, activeStaff]);

  return (
    <div className="space-y-8">
      
      {/* --- ULTRA PREMIUM DARK CLOCK HEADER (MOBILE OPTIMIZED) --- */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-[#0B1120] border border-gray-800 shadow-2xl group">
         {/* Background Effects */}
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-0"></div>
         <div className="absolute top-[-50%] left-[-20%] w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full z-0 animate-pulse"></div>
         <div className="absolute bottom-[-50%] right-[-20%] w-[400px] h-[400px] bg-cyan-600/10 blur-[100px] rounded-full z-0"></div>
         
         <div className="relative z-10 p-4 md:p-8 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8">
            
            {/* Clock Section */}
            <div className="text-center md:text-left space-y-1 md:space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                   <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5 text-cyan-400" />
                   <p className="text-[10px] md:text-xs font-bold text-gray-300 uppercase tracking-widest">
                      {currentTime.toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                   </p>
                </div>
                
                <div className="relative">
                   <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 tracking-tight drop-shadow-2xl font-mono">
                      {currentTime.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                   </h1>
                   {/* Glow behind text */}
                   <div className="absolute -inset-4 bg-white/5 blur-xl -z-10 rounded-full opacity-20"></div>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-2">
                   <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-green-500"></span>
                   </span>
                   <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Live Attendance System</p>
                </div>
            </div>

            {/* Stats Cards (Glassmorphism) - Compact on Mobile */}
            <div className="flex w-full md:w-auto gap-3">
               {/* Present Card */}
               <div className="relative group/card flex-1 md:flex-none">
                  <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 min-w-[100px] md:min-w-[110px] text-center relative z-10 transition-transform hover:-translate-y-1">
                     <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1.5 md:mb-2 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 border border-green-500/30">
                        <UserCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     </div>
                     <p className="text-xl md:text-2xl font-black text-white">{stats.totalPresent} <span className="text-[10px] md:text-xs text-gray-500 font-bold">/ {stats.totalStaff}</span></p>
                     <p className="text-[9px] md:text-[10px] uppercase font-bold text-green-400 tracking-wider">উপস্থিত</p>
                  </div>
               </div>

               {/* Late Card */}
               <div className="relative group/card flex-1 md:flex-none">
                  <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 min-w-[100px] md:min-w-[110px] text-center relative z-10 transition-transform hover:-translate-y-1">
                     <div className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1.5 md:mb-2 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 border border-orange-500/30">
                        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     </div>
                     <p className="text-xl md:text-2xl font-black text-white">{stats.late}</p>
                     <p className="text-[9px] md:text-[10px] uppercase font-bold text-orange-400 tracking-wider">লেট (Late)</p>
                  </div>
               </div>
            </div>

         </div>
      </div>

      {/* --- GPS STATUS BAR (VISIBLE FOR STAFF & KIOSK) --- */}
      {(role === UserRole.STAFF || role === UserRole.KIOSK) && (
        <div className={`p-1 rounded-2xl bg-gradient-to-r shadow-lg transition-all duration-500 ${distanceInfo?.isAllowed ? 'from-green-400 to-emerald-500' : 'from-orange-400 to-red-500'}`}>
           <div className="bg-white dark:bg-gray-900 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className={`p-3 rounded-full shrink-0 ${distanceInfo?.isAllowed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {isLoadingLocation ? <RefreshCw className="w-6 h-6 animate-spin" /> : (distanceInfo?.isAllowed ? <CheckCircle className="w-6 h-6" /> : <MapPin className="w-6 h-6" />)}
                 </div>
                 <div className="text-center md:text-left">
                    <h3 className={`font-bold text-lg ${distanceInfo?.isAllowed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                       {isLoadingLocation ? 'লোকেশন যাচাই হচ্ছে... (5s)' : distanceInfo?.isAllowed ? 'লোকেশন ঠিক আছে ✅' : 'লোকেশন এরিয়ার বাইরে ⚠️'}
                    </h3>
                    {!isLoadingLocation && distanceInfo && (
                       <div className="space-y-1">
                          <p className="text-xs font-semibold text-gray-500 flex items-center justify-center md:justify-start gap-1">
                             <Navigation className="w-3 h-3" />
                             টার্গেট: {distanceInfo.targetName} | দূরত্ব: {Math.round(distanceInfo.distance)} মি.
                          </p>
                          {currentLocation?.accuracy && (
                             <p className="text-[10px] font-bold text-indigo-500 flex items-center justify-center md:justify-start gap-1">
                                <Crosshair className="w-3 h-3" /> Accuracy: {Math.round(currentLocation.accuracy)} meters
                             </p>
                          )}
                       </div>
                    )}
                    {locationError && <p className="text-xs text-red-500 font-bold mt-1">{locationError}</p>}
                 </div>
              </div>
              <button 
                onClick={() => getLocation(false)} 
                disabled={isLoadingLocation}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap ${isLoadingLocation ? 'opacity-70 cursor-wait' : ''}`}
              >
                 <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLocation ? 'animate-spin' : ''}`} /> 
                 {isLoadingLocation ? 'জিপিএস কানেক্টিং...' : 'রিফ্রেশ লোকেশন'}
              </button>
           </div>
        </div>
      )}

      {/* --- STAFF ACTION AREA (FINGERPRINT BUTTON) --- */}
      {role !== UserRole.KIOSK && currentUserStaff && (
         <div className="flex justify-center py-6">
            {!myAttendance ? (
               <button 
                  onClick={() => handleCheckIn(currentUserStaff.id)}
                  disabled={isLoadingLocation}
                  className={`group relative w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
                     isLoadingLocation 
                        ? 'bg-gray-200 cursor-not-allowed' 
                        : distanceInfo?.isAllowed || currentUserStaff.role === UserRole.ADMIN // Allow Admin to check in anywhere theoretically or ignore loc
                           ? 'bg-gradient-to-b from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 shadow-indigo-200' 
                           : 'bg-gray-300 cursor-not-allowed grayscale'
                  }`}
               >
                  {/* Ripple Effect Rings */}
                  <span className="absolute inset-0 rounded-full border-4 border-indigo-500/30 scale-110 animate-ping"></span>
                  <span className="absolute inset-0 rounded-full border-2 border-white/20"></span>
                  
                  <Fingerprint className="w-20 h-20 text-white mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-white font-black text-lg uppercase tracking-wider">Check In</span>
                  <span className="text-[10px] text-indigo-200 font-medium mt-1">Tap to Record</span>
               </button>
            ) : !myAttendance.checkOutTime ? (
               <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                  <div className="w-40 h-40 rounded-full bg-green-50 border-4 border-green-500 flex flex-col items-center justify-center shadow-xl">
                     <CheckCircle className="w-16 h-16 text-green-600 mb-1" />
                     <span className="text-green-800 font-bold text-sm">Checked In</span>
                     <span className="text-xs text-green-600 font-mono">{new Date(myAttendance.checkInTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <button 
                     onClick={() => handleCheckOut(myAttendance.id)}
                     className="bg-orange-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-orange-600 transition-all flex items-center gap-2 active:scale-95"
                  >
                     <Clock className="w-5 h-5" /> চেক-আউট (Duty End)
                  </button>
               </div>
            ) : (
               <div className="w-full bg-green-50 border border-green-200 rounded-2xl p-8 text-center shadow-inner">
                  <div className="inline-block p-4 bg-green-100 rounded-full mb-3">
                     <UserCheck className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-green-800">আজকের ডিউটি সম্পন্ন হয়েছে!</h3>
                  <p className="text-sm text-green-600 mt-1">আগামীকাল দেখা হবে। ভালো থাকুন!</p>
                  <div className="flex justify-center gap-8 mt-4 text-xs font-bold text-gray-500">
                     <div>
                        <p className="uppercase text-[9px] text-gray-400">ইন টাইম</p>
                        <p>{new Date(myAttendance.checkInTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})}</p>
                     </div>
                     <div>
                        <p className="uppercase text-[9px] text-gray-400">আউট টাইম</p>
                        <p>{myAttendance.checkOutTime ? new Date(myAttendance.checkOutTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'}) : '--'}</p>
                     </div>
                  </div>
               </div>
            )}
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
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg text-lg font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-gray-800 dark:text-white"
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
                      className={`relative p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all active:scale-95 shadow-sm hover:shadow-xl group ${
                         isCheckedIn 
                           ? record.checkOutTime 
                              ? 'bg-gray-50 border-gray-200 opacity-60' 
                              : 'bg-green-50 border-green-200 ring-2 ring-green-100'
                           : 'bg-white border-gray-100 hover:border-indigo-200'
                      }`}
                    >
                       <div className="relative">
                          {staff.photo ? (
                             <img src={staff.photo} alt={staff.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform" />
                          ) : (
                             <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-600 font-bold text-2xl shadow-inner">
                                {staff.name.charAt(0)}
                             </div>
                          )}
                          {isCheckedIn && (
                             <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${record?.checkOutTime ? 'bg-gray-400' : 'bg-green-500 text-white'}`}>
                                {record?.checkOutTime ? <X className="w-4 h-4 text-white" /> : <CheckCircle className="w-5 h-5" />}
                             </div>
                          )}
                       </div>
                       <div className="text-center w-full">
                          <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate px-2">{staff.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5 inline-block mt-1">{staff.staffId}</p>
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
           <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500"></div>
              <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-600 dark:text-orange-400 shadow-sm animate-pulse">
                    <Clock className="w-8 h-8" />
                 </div>
                 <h3 className="font-black text-xl text-gray-800 dark:text-white">দেরি হয়েছে!</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">অফিস টাইম সকাল ৯:০০ টা। দেরি হওয়ার কারণ লিখুন।</p>
              </div>
              <form onSubmit={handleSubmitLateReason}>
                 <textarea 
                   required
                   className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-orange-500 outline-none mb-4 text-gray-800 dark:text-gray-200 resize-none font-medium"
                   placeholder="দেরির কারণ বিস্তারিত লিখুন..."
                   rows={3}
                   value={lateReason}
                   onChange={(e) => setLateReason(e.target.value)}
                 />
                 <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsLateModalOpen(false)}
                      className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                       বাতিল
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 dark:shadow-none transition-colors"
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
        <div className="bg-white dark:bg-gray-800/60 rounded-3xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
           <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                 <History className="w-5 h-5 text-indigo-500" /> আজকের উপস্থিতি তালিকা
              </h3>
              <span className="text-xs font-bold text-gray-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-600">
                 Live Feed
              </span>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                       <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">স্টাফ মেম্বার</th>
                       <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">চেক-ইন</th>
                       <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">চেক-আউট</th>
                       <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">স্ট্যাটাস</th>
                       <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">লোকেশন</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {(attendanceList || []).filter(a => a.date === today).map((record) => (
                       <tr key={record.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                   {record.staffName.charAt(0)}
                                </div>
                                <div>
                                   <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{record.staffName}</p>
                                   {record.note && <p className="text-[10px] text-red-500 italic mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {record.note}</p>}
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className="inline-block bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-mono font-bold border border-green-100">
                                {new Date(record.checkInTime).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                             {record.checkOutTime ? (
                                <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono font-bold border border-gray-200">
                                   {new Date(record.checkOutTime).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             ) : (
                                <span className="text-gray-300 text-xl">--</span>
                             )}
                          </td>
                          <td className="px-6 py-4 text-center">
                             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${getStatusColor(record.status)}`}>
                                {record.status}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-1 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg w-fit ml-auto">
                                <MapPin className="w-3 h-3 text-indigo-400" />
                                <span className="truncate max-w-[100px]" title={record.location?.address}>{record.location?.address || 'GPS Location'}</span>
                             </div>
                          </td>
                       </tr>
                    ))}
                    {(attendanceList || []).filter(a => a.date === today).length === 0 && (
                       <tr>
                          <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                             <div className="flex flex-col items-center gap-2 opacity-50">
                                <History className="w-12 h-12" />
                                <p className="text-sm font-medium">আজকের কোনো হাজিরা ডাটা পাওয়া যায়নি</p>
                             </div>
                          </td>
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