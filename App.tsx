
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Users, Car, Receipt, BarChart3, Settings, Trash2, 
  LogOut, Wallet, User, Cloud, WifiOff, AlertTriangle, Menu, X, RefreshCw, Lock, ArrowRightLeft, XCircle, Landmark, Bell, Phone, Briefcase, Crown, UserCog, ShieldCheck, Camera, Save, KeyRound, IdCard, MessageSquareWarning, MessagesSquare, MapPin, MonitorSmartphone, Satellite, Trophy, Gift, Gamepad2, Shield, CheckCircle
} from 'lucide-react';
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { UserRole, Staff, MovementLog, Expense, BillingRule, FundEntry, Notice, AdvanceLog, Complaint, ChatMessage, Attendance, StaffLocation } from './types';
import { INITIAL_STAFF, INITIAL_BILLING_RULES, ROLE_LABELS, DEFAULT_FIREBASE_CONFIG } from './constants';

// --- Views ---
import DashboardView from './views/Dashboard';
import StaffManagementView from './views/StaffManagement';
import MovementLogView from './views/MovementLog';
import ExpenseManagementView from './views/ExpenseManagement';
import FundLedgerView from './views/FundLedger';
import SettingsView from './views/Settings';
import ReportsView from './views/Reports';
import TrashView from './views/Trash';
import NoticeBoardView from './views/NoticeBoard';
import ComplaintBoxView from './views/ComplaintBox';
import GroupChatView from './views/GroupChat';
import AttendanceView from './views/Attendance';
import LiveLocationView from './views/LiveLocation';
import LuckyDrawView from './views/LuckyDraw';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Permission State
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'IDLE' | 'REQUESTING' | 'DENIED'>('IDLE');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    designation: '',
    mobile: '',
    staffId: '',
    photo: '',
    password: ''
  });
  const profileFileRef = useRef<HTMLInputElement>(null);
  
  // Cloud States
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [showDbHelp, setShowDbHelp] = useState(false);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Global States
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [billingRules, setBillingRules] = useState<BillingRule[]>([]);
  const [funds, setFunds] = useState<FundEntry[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [advances, setAdvances] = useState<AdvanceLog[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [liveLocations, setLiveLocations] = useState<Record<string, StaffLocation>>({});

  // Helper for cleaning arrays
  const cleanArray = <T,>(data: any): T[] => {
    if (!data) return [];
    const array = typeof data === 'object' && !Array.isArray(data) ? Object.values(data) : data;
    return Array.isArray(array) ? array.filter(Boolean) as T[] : [];
  };

  // Firebase Configuration
  const [firebaseConfig] = useState<any>(() => {
    const saved = localStorage.getItem('fb_config');
    let config;
    try {
      config = saved && saved !== 'null' ? JSON.parse(saved) : DEFAULT_FIREBASE_CONFIG;
    } catch {
      config = DEFAULT_FIREBASE_CONFIG;
    }
    // Safety check for DB URL
    if (config && config.projectId && (!config.databaseURL || config.databaseURL.includes('undefined'))) {
      config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
    }
    return config;
  });

  // Load Initial Data from Local Storage (Backup)
  const loadLocalData = () => {
    const getLocal = (key: string, def: string) => {
      try {
        const val = JSON.parse(localStorage.getItem(key) || def);
        return cleanArray(val);
      } catch {
        return cleanArray(JSON.parse(def));
      }
    };

    setStaffList(getLocal('staffList', JSON.stringify(INITIAL_STAFF)) as Staff[]);
    setExpenses(getLocal('expenses', '[]') as Expense[]);
    setMovements(getLocal('movements', '[]') as MovementLog[]);
    setBillingRules(getLocal('billingRules', JSON.stringify(INITIAL_BILLING_RULES)) as BillingRule[]);
    setFunds(getLocal('funds', '[]') as FundEntry[]);
    setNotices(getLocal('notices', '[]') as Notice[]);
    setAdvances(getLocal('advances', '[]') as AdvanceLog[]);
    setComplaints(getLocal('complaints', '[]') as Complaint[]);
    setMessages(getLocal('messages', '[]') as ChatMessage[]);
    setAttendanceList(getLocal('attendanceList', '[]') as Attendance[]);
  };

  useEffect(() => {
    loadLocalData();

    if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
      setCloudError("Firebase Config Missing");
      return;
    }

    let app: FirebaseApp;
    try {
      const apps = getApps();
      app = apps.length === 0 ? initializeApp(firebaseConfig) : getApp();
      
      const dbUrl = firebaseConfig.databaseURL || `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
      const dbInstance = getDatabase(app, dbUrl);
      
      if (dbInstance) {
        setIsSyncing(true);
        setCloudError(null);

        const handleSnapshot = (node: string, setter: any) => {
          const dataRef = ref(dbInstance, node);
          onValue(dataRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              const arrayData = node === 'staff_locations' ? data : cleanArray(data); // staff_locations is an object map
              setter(arrayData);
              // Update local storage as backup (except locations, too volatile)
              if (node !== 'staff_locations') {
                localStorage.setItem(node, JSON.stringify(arrayData));
              }
              setIsCloudEnabled(true);
            } else {
              // Node is empty in cloud, stick to local or init default
              setIsCloudEnabled(true);
            }
            setIsSyncing(false);
          }, (error) => {
            console.error(`Sync error for ${node}:`, error);
            if (error.message.includes("permission_denied")) {
              setCloudError("Permission Denied");
              setShowDbHelp(true);
            } else {
              setCloudError(error.message);
            }
            setIsCloudEnabled(false);
            setIsSyncing(false);
          });
        };
        
        handleSnapshot('staffList', setStaffList);
        handleSnapshot('expenses', setExpenses);
        handleSnapshot('movements', setMovements);
        handleSnapshot('billingRules', setBillingRules);
        handleSnapshot('funds', setFunds);
        handleSnapshot('notices', setNotices);
        handleSnapshot('advances', setAdvances);
        handleSnapshot('complaints', setComplaints);
        handleSnapshot('messages', setMessages);
        handleSnapshot('attendanceList', setAttendanceList);
        handleSnapshot('staff_locations', setLiveLocations);
      }
    } catch (error: any) {
      console.error("Cloud Connection Error:", error);
      setCloudError(error.message);
      setIsCloudEnabled(false);
      setIsSyncing(false);
    }
  }, [firebaseConfig]);

  // Check if permissions are already granted to skip the gate
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const geoResult = await navigator.permissions.query({ name: 'geolocation' });
          if (geoResult.state === 'granted') {
             setPermissionsGranted(true);
          }
        }
      } catch (e) {
        console.log("Permissions query not supported", e);
      }
    };
    checkPermissions();
  }, []);

  // Sync Data function
  const syncData = async (node: string, data: any) => {
    const cleaned = cleanArray(data);
    const jsonString = JSON.stringify(cleaned);
    localStorage.setItem(node, jsonString);

    if (firebaseConfig && firebaseConfig.databaseURL) {
      try {
        const app = getApp();
        const db = getDatabase(app, firebaseConfig.databaseURL);
        const safeData = JSON.parse(jsonString); 
        
        const dataToSave = safeData.reduce((acc: any, curr: any) => ({ 
          ...acc, 
          [curr.id || Math.random().toString(36).substr(2, 9)]: curr 
        }), {});
          
        await set(ref(db, node), dataToSave);
        setIsCloudEnabled(true);
        setCloudError(null);
      } catch (err: any) { 
        console.error(`Sync failed for ${node}:`, err);
        setCloudError("Sync Failed");
      }
    }
  };

  const updateStaffList = (val: any) => { const next = typeof val === 'function' ? val(staffList) : val; setStaffList(next); syncData('staffList', next); };
  const updateExpenses = (val: any) => { const next = typeof val === 'function' ? val(expenses) : val; setExpenses(next); syncData('expenses', next); };
  const updateMovements = (val: any) => { const next = typeof val === 'function' ? val(movements) : val; setMovements(next); syncData('movements', next); };
  const updateBillingRules = (val: any) => { const next = typeof val === 'function' ? val(billingRules) : val; setBillingRules(next); syncData('billingRules', next); };
  const updateFunds = (val: any) => { const next = typeof val === 'function' ? val(funds) : val; setFunds(next); syncData('funds', next); };
  const updateNotices = (val: any) => { const next = typeof val === 'function' ? val(notices) : val; setNotices(next); syncData('notices', next); };
  const updateAdvances = (val: any) => { const next = typeof val === 'function' ? val(advances) : val; setAdvances(next); syncData('advances', next); };
  const updateComplaints = (val: any) => { const next = typeof val === 'function' ? val(complaints) : val; setComplaints(next); syncData('complaints', next); };
  const updateMessages = (val: any) => { const next = typeof val === 'function' ? val(messages) : val; setMessages(next); syncData('messages', next); };
  const updateAttendance = (val: any) => { const next = typeof val === 'function' ? val(attendanceList) : val; setAttendanceList(next); syncData('attendanceList', next); };

  // --- GAMIFICATION LOGIC ---
  const handlePointUpdate = (staffId: string, pointsToAdd: number, reason: string) => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    setStaffList(prevList => {
       const newList = prevList.map(s => {
         if (s.id === staffId) {
           if (s.role === UserRole.MD || s.name.toLowerCase().includes('office')) return s;

           const staffMonth = s.pointsMonth || '';
           let newPoints = (s.points || 0);

           if (staffMonth !== currentMonthStr) {
              return {
                 ...s,
                 prevMonthPoints: s.points || 0,
                 prevMonthName: staffMonth,
                 points: pointsToAdd,
                 pointsMonth: currentMonthStr,
                 updatedAt: new Date().toISOString()
              };
           } else {
              newPoints += pointsToAdd;
              return {
                ...s,
                points: newPoints,
                pointsMonth: currentMonthStr,
                updatedAt: new Date().toISOString()
              };
           }
         }
         return s;
       });
       syncData('staffList', newList);
       return newList;
    });
  };

  const updateLuckyDrawTime = (staffId: string) => {
    setStaffList(prevList => {
      const newList = prevList.map(s => {
        if (s.id === staffId) {
          return {
             ...s,
             lastLuckyDrawTime: new Date().toISOString(),
             luckyDrawCount: (s.luckyDrawCount || 0) + 1,
             updatedAt: new Date().toISOString()
           };
         }
        return s;
      });
      syncData('staffList', newList);
      return newList;
    });
  };

  // CHECK POINTS ON ACTIVE VISIT
  useEffect(() => {
    if (!currentUser || !role || role === UserRole.KIOSK || role === UserRole.MD) return;
    if (currentUser.toLowerCase().includes('office')) return;

    const checkAndAwardVisitPoint = () => {
       if (document.visibilityState !== 'visible') return;

       const staff = staffList.find(s => s.name === currentUser && s.status === 'ACTIVE' && !s.deletedAt);
       if (!staff) return;
       if (staff.role === UserRole.MD || staff.name.toLowerCase().includes('office')) return;

       const now = new Date();
       const nowTs = now.getTime();
       const lastVisit = staff.lastVisitTime ? new Date(staff.lastVisitTime).getTime() : 0;
       
       if (nowTs - lastVisit > 600000) {
          const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          
          setStaffList(prevList => {
             const newList = prevList.map(s => {
                if (s.id === staff.id) {
                   const staffMonth = s.pointsMonth || '';
                   
                   if (staffMonth !== currentMonthStr) {
                      return {
                        ...s,
                        prevMonthPoints: s.points || 0,
                        prevMonthName: staffMonth,
                        points: 1,
                        pointsMonth: currentMonthStr,
                        lastVisitTime: now.toISOString(),
                        updatedAt: now.toISOString()
                      };
                   } else {
                      return {
                        ...s,
                        points: (s.points || 0) + 1,
                        lastVisitTime: now.toISOString(),
                        updatedAt: now.toISOString()
                      };
                   }
                }
                return s;
             });
             syncData('staffList', newList);
             return newList;
          });
       }
    };

    checkAndAwardVisitPoint();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndAwardVisitPoint();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkAndAwardVisitPoint);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkAndAwardVisitPoint);
    };

  }, [currentUser, role, staffList.length]); 

  // --- LIVE TRACKING LOGIC ---
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err: any) {
        console.error(`Wake Lock failed: ${err.name}, ${err.message}`);
      }
    }
  };

  useEffect(() => {
    if (!currentUser || !role || !firebaseConfig || !isCloudEnabled) return;
    if (role === UserRole.ADMIN || role === UserRole.MD) return;

    const myStaffProfile = staffList.find(s => s.name === currentUser);
    if (!myStaffProfile) return;

    let watchId: number;

    const startTracking = () => {
      if (role === UserRole.STAFF || role === UserRole.KIOSK) {
        requestWakeLock();
      }

      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            try {
              const app = getApp();
              const db = getDatabase(app, firebaseConfig.databaseURL);
              const locationData: StaffLocation = {
                staffId: myStaffProfile.id,
                staffName: myStaffProfile.name,
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: new Date().toISOString(),
                speed: position.coords.speed || 0,
                // @ts-ignore
                batteryLevel: (await navigator.getBattery?.())?.level || undefined
              };
              await set(ref(db, `staff_locations/${myStaffProfile.id}`), locationData);
            } catch (err) {
              console.error("Location update failed", err);
            }
          },
          (err) => console.error("GPS Error", err),
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (role === UserRole.STAFF || role === UserRole.KIOSK)) {
        requestWakeLock();
      }
    };

    startTracking();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [currentUser, role, isCloudEnabled, staffList]);

  // --- NOTIFICATION LOGIC ---
  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  };

  const sendNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}

      new Notification(title, {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
        tag: 'depend-sourcing-msg'
      });
    }
  };

  const prevMessagesLength = useRef(0);
  useEffect(() => {
    if (messages.length > 0 && prevMessagesLength.current > 0 && messages.length > prevMessagesLength.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender !== currentUser) {
        const msgTime = new Date(lastMsg.timestamp).getTime();
        if (Date.now() - msgTime < 30000) {
           if (lastMsg.type === 'SYSTEM_MOVEMENT') {
             sendNotification('স্টাফ মুভমেন্ট আপডেট', lastMsg.text);
           } else {
             sendNotification(`মেসেজ: ${lastMsg.sender}`, lastMsg.text);
           }
        }
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, currentUser]);

  useEffect(() => {
    if (role) {
      requestNotificationPermission();
    }
  }, [role]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const username = loginUsername.trim();
    
    const staffMember = staffList.find(s => s && !s.deletedAt && s.name.toLowerCase() === username.toLowerCase());
    if (staffMember) {
      const validPassword = staffMember.password || `${staffMember.name}@`;
      if (loginPassword === validPassword) {
        setRole(staffMember.role || UserRole.STAFF);
        setCurrentUser(staffMember.name);
        if (staffMember.role === UserRole.KIOSK) {
          setActiveTab('attendance'); 
        }
        return;
      }
    }

    if (username.toLowerCase() === 'ispa' && loginPassword === 'ayaan') {
      setRole(UserRole.MD);
      setCurrentUser('ISPA');
      return;
    }

    if (username.toLowerCase() === 'mehedi@' && loginPassword === 'mehedi@60') {
      setRole(UserRole.ADMIN);
      setCurrentUser('Mehedi');
      return;
    }

    setLoginError('ভুল ইউজারনেম অথবা পাসওয়ার্ড!');
  };

  const handleLogout = () => {
    setRole(null);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
    setActiveTab('dashboard');
  };

  // --- DATA EXPORT & IMPORT HANDLERS ---
  const handleExport = () => {
    const data = {
      staffList, expenses, movements, billingRules, funds, notices, advances, complaints, messages, attendanceList,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_depend_sourcing_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.staffList) updateStaffList(data.staffList);
      if (data.expenses) updateExpenses(data.expenses);
      if (data.movements) updateMovements(data.movements);
      if (data.billingRules) updateBillingRules(data.billingRules);
      if (data.funds) updateFunds(data.funds);
      if (data.notices) updateNotices(data.notices);
      if (data.advances) updateAdvances(data.advances);
      if (data.complaints) updateComplaints(data.complaints);
      if (data.messages) updateMessages(data.messages);
      if (data.attendanceList) updateAttendance(data.attendanceList);
      alert('ডাটা ইমপোর্ট সফল হয়েছে!');
    } catch (e) {
      console.error(e);
      alert('ভুল ফাইল ফরম্যাট! ইমপোর্ট ব্যর্থ হয়েছে।');
    }
  };

  const totalExpense = useMemo(() => expenses.filter(e => e && !e.isDeleted && e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount || 0), 0), [expenses]);
  const totalFund = useMemo(() => funds.filter(f => f && !f.isDeleted).reduce((sum, f) => sum + Number(f.amount || 0), 0), [funds]);
  const totalAdvances = useMemo(() => advances.filter(a => !a.isDeleted).reduce((sum, a) => sum + Number(a.amount || 0), 0), [advances]);
  const cashOnHand = totalFund - totalAdvances; 
  const pendingApprovals = expenses.filter(e => e && !e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED')).length;

  const openProfile = () => {
    const profile = staffList.find(s => s && !s.deletedAt && s.name === currentUser);
    setProfileForm({
      designation: profile?.designation || '',
      mobile: profile?.mobile || '',
      staffId: profile?.staffId || '',
      photo: profile?.photo || '',
      password: profile?.password || ''
    });
    setIsProfileModalOpen(true);
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_SIZE = 300;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          setProfileForm(prev => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.8) }));
        };
        if (reader.result) {
          img.src = reader.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const existingProfileIndex = staffList.findIndex(s => s && !s.deletedAt && s.name === currentUser);
    
    if (existingProfileIndex >= 0) {
      const updatedList = [...staffList];
      updatedList[existingProfileIndex] = {
        ...updatedList[existingProfileIndex],
        ...profileForm,
        updatedAt: new Date().toISOString()
      };
      updateStaffList(updatedList);
    } else {
      const newProfile: Staff = {
        id: Math.random().toString(36).substr(2, 9),
        name: currentUser,
        role: role || UserRole.STAFF,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        points: 0,
        ...profileForm
      };
      updateStaffList([...staffList, newProfile]);
    }
    setIsProfileModalOpen(false);
  };

  const myProfile = useMemo(() => {
    return staffList.find(s => s && !s.deletedAt && s.name === currentUser);
  }, [staffList, currentUser]);

  // --- LOGIN SCREEN ---
  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
        
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20 relative z-10">
          <div className="text-center mb-10">
            <div className="bg-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-200">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">অ্যাকাউন্ট লগইন</h1>
            <p className="text-gray-500 text-sm mt-1">Depend Sourcing Ltd. Billing Center</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ইউজারনেম / নাম</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  required 
                  type="text" 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-gray-700"
                  placeholder="Username..."
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  required 
                  type="password" 
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-gray-700"
                  placeholder="Password..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 animate-pulse">
                <XCircle className="w-4 h-4" /> {loginError}
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              প্রবেশ করুন <ArrowRightLeft className="w-5 h-5 rotate-90" />
            </button>
          </form>

          {/* Connection Status Indicator */}
          <div className="mt-6 flex flex-col items-center gap-3">
            {isCloudEnabled ? (
               <span className="flex items-center gap-1.5 text-[10px] text-green-600 bg-green-50 px-3 py-1 rounded-full font-bold">
                 <Cloud className="w-3 h-3" /> Online Connected
               </span>
            ) : (
               <div className="flex flex-col items-center gap-2">
                 <span className="flex items-center gap-1.5 text-[10px] text-red-500 bg-red-50 px-3 py-1 rounded-full font-bold cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setShowDbHelp(!showDbHelp)}>
                   <WifiOff className="w-3 h-3" /> {cloudError || 'Offline'} (Click for Help)
                 </span>
               </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView totalExpense={totalExpense} pendingApprovals={pendingApprovals} expenses={expenses} cloudError={cloudError} totalFund={totalFund} cashOnHand={cashOnHand} role={role} staffList={staffList} />;
      case 'chat': return <GroupChatView messages={messages} setMessages={updateMessages} currentUser={currentUser} role={role} onNavigate={(view) => setActiveTab(view)} onUpdatePoints={handlePointUpdate} staffList={staffList} />;
      case 'attendance': return <AttendanceView staffList={staffList} attendanceList={attendanceList} setAttendanceList={updateAttendance} currentUser={currentUser} role={role} />;
      case 'live-location': return <LiveLocationView staffList={staffList} liveLocations={liveLocations} />;
      case 'luckydraw': return <LuckyDrawView staffList={staffList} currentUser={currentUser} onUpdatePoints={handlePointUpdate} onUpdateDrawTime={updateLuckyDrawTime} role={role} />;
      case 'notices': return <NoticeBoardView notices={notices} setNotices={updateNotices} role={role} currentUser={currentUser || ''} />;
      case 'complaints': return <ComplaintBoxView complaints={complaints} setComplaints={updateComplaints} staffList={staffList} role={role} currentUser={currentUser} />;
      case 'funds': return <FundLedgerView funds={funds} setFunds={updateFunds} totalFund={totalFund} cashOnHand={cashOnHand} role={role} />;
      case 'staff': return <StaffManagementView staffList={staffList} setStaffList={updateStaffList} role={role} expenses={expenses} advances={advances} setAdvances={updateAdvances} currentUser={currentUser} />;
      case 'movements': return <MovementLogView movements={movements} setMovements={updateMovements} staffList={staffList} billingRules={billingRules} role={role} setMessages={updateMessages} currentUser={currentUser} onUpdatePoints={handlePointUpdate} />;
      case 'expenses': return <ExpenseManagementView expenses={expenses} setExpenses={updateExpenses} staffList={staffList} role={role} currentUser={currentUser} />;
      case 'reports': return <ReportsView expenses={expenses} staffList={staffList} advances={advances} attendanceList={attendanceList} />;
      case 'settings': return <SettingsView billingRules={billingRules} setBillingRules={updateBillingRules} role={role} exportData={handleExport} importData={handleImport} cloudConfig={firebaseConfig} saveCloudConfig={(config) => { localStorage.setItem('fb_config', JSON.stringify(config)); alert('Settings saved! Reloading...'); window.location.reload(); }} />;
      case 'trash': return <TrashView staffList={staffList} setStaffList={updateStaffList} movements={movements} setMovements={updateMovements} expenses={expenses} setExpenses={updateExpenses} funds={funds} setFunds={updateFunds} notices={notices} setNotices={updateNotices} role={role} />;
      default: return <DashboardView totalExpense={totalExpense} pendingApprovals={pendingApprovals} expenses={expenses} cloudError={cloudError} totalFund={totalFund} cashOnHand={cashOnHand} role={role} staffList={staffList} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-['Hind_Siliguri']">
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-900 text-white transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 text-center border-b border-indigo-800">
            <div className="bg-indigo-400/20 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-7 h-7 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">বিলিং সেন্টার</h2>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {[
              { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK] },
              { id: 'chat', label: 'টিম চ্যাট', icon: MessagesSquare, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
              { id: 'luckydraw', label: 'লাকি ড্র & লিডারবোর্ড', icon: Gamepad2, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
              { id: 'attendance', label: 'স্মার্ট হাজিরা', icon: MapPin, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK] },
              { id: 'live-location', label: 'লাইভ ট্র্যাকিং', icon: Satellite, roles: [UserRole.ADMIN, UserRole.MD] },
              { id: 'notices', label: 'নোটিশ বোর্ড', icon: Bell, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK] },
              { id: 'complaints', label: 'অভিযোগ বাক্স', icon: MessageSquareWarning, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
              { id: 'funds', label: 'ফান্ড লেজার', icon: Landmark, roles: [UserRole.ADMIN, UserRole.MD] },
              { id: 'staff', label: 'স্টাফ প্রোফাইল', icon: Users, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
              { id: 'movements', label: 'মুভমেন্ট লগ', icon: Car, roles: [UserRole.ADMIN, UserRole.STAFF] },
              { id: 'expenses', label: 'বিল রিকোয়েস্ট', icon: Receipt, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
              { id: 'reports', label: 'রিপোর্ট', icon: BarChart3, roles: [UserRole.ADMIN, UserRole.MD] },
              { id: 'settings', label: 'সেটিংস', icon: Settings, roles: [UserRole.ADMIN] },
              { id: 'trash', label: 'রিসাইকেল বিন', icon: Trash2, roles: [UserRole.ADMIN] },
            ].filter(item => item.roles.includes(role)).map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-indigo-800'}`}>
                <item.icon className="w-5 h-5" /> {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-indigo-800">
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-300 hover:bg-red-900/30 transition-colors">
              <LogOut className="w-5 h-5" /> লগআউট
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg"><Menu className="w-6 h-6 text-gray-600" /></button>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer ${isCloudEnabled ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`} title={cloudError || "System Normal"} onClick={() => !isCloudEnabled && setShowDbHelp(true)}>
              {isCloudEnabled ? <Cloud className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isCloudEnabled ? (isSyncing ? 'Syncing...' : 'Online') : 'Offline'}</span>
            </div>
            {cloudError && (
              <div className="hidden md:flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded cursor-pointer hover:bg-red-100" onClick={() => setShowDbHelp(true)}>
                <AlertTriangle className="w-3 h-3" /> {cloudError} (Help)
              </div>
            )}
            
            {/* Points Badge in Header - Exclude MD and Office */}
            {role !== UserRole.KIOSK && role !== UserRole.MD && myProfile && !myProfile.name.toLowerCase().includes('office') && (
               <div className="hidden sm:flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-black text-yellow-700">
                    {/* Display logic: If point month doesn't match current month, effectively 0 */}
                    {(myProfile.pointsMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`) 
                      ? (myProfile.points || 0) 
                      : 0} pts
                  </span>
               </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
             <div className="text-right hidden md:block">
               <p className="text-sm font-bold text-gray-800">{currentUser || 'Guest'}</p>
               <p className="text-xs text-gray-500">{role ? ROLE_LABELS[role] : ''}</p>
             </div>
             <div 
               onClick={openProfile}
               className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-indigo-50 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all overflow-hidden"
             >
               {myProfile && myProfile.photo ? (
                 <img src={myProfile.photo} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 currentUser ? currentUser[0].toUpperCase() : <User className="w-5 h-5" />
               )}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white/90 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/40 backdrop-blur-md relative">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600 to-purple-700 z-0"></div>
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-1 bg-black/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>

            <form onSubmit={saveProfile} className="relative z-10 flex flex-col items-center mt-12 px-6 pb-8">
               <div className="relative group cursor-pointer" onClick={() => profileFileRef.current?.click()}>
                 <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white mb-4 relative z-10">
                   {profileForm.photo ? (
                      <img src={profileForm.photo} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 text-4xl font-black">
                        {currentUser ? currentUser[0].toUpperCase() : 'U'}
                      </div>
                   )}
                 </div>
                 <div className="absolute bottom-4 right-0 z-20 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-indigo-700 transition-colors">
                   <Camera className="w-4 h-4" />
                 </div>
                 <input type="file" ref={profileFileRef} hidden accept="image/*" onChange={handleProfilePhotoUpload} />
               </div>

               <h2 className="text-2xl font-black text-gray-800 text-center">{currentUser || 'Guest User'}</h2>
               <div className="flex items-center gap-2 mt-1 mb-6">
                 {role === UserRole.MD && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-700 uppercase flex items-center gap-1"><Crown className="w-3 h-3"/> Managing Director</span>}
                 {role === UserRole.ADMIN && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-700 uppercase flex items-center gap-1"><UserCog className="w-3 h-3"/> Manager</span>}
                 {role === UserRole.STAFF && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase flex items-center gap-1"><User className="w-3 h-3"/> Staff Member</span>}
                 {role === UserRole.KIOSK && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-100 text-orange-700 uppercase flex items-center gap-1"><MonitorSmartphone className="w-3 h-3"/> Kiosk Mode</span>}
               </div>

               <div className="w-full space-y-3">
                 <div className="bg-white/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Briefcase className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">পদবী (Designation)</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                        placeholder="Set Designation"
                        value={profileForm.designation}
                        onChange={(e) => setProfileForm({...profileForm, designation: e.target.value})}
                      />
                    </div>
                 </div>
                 
                 <div className="bg-white/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Phone className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">মোবাইল নাম্বার</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                        placeholder="Set Mobile No"
                        value={profileForm.mobile}
                        onChange={(e) => setProfileForm({...profileForm, mobile: e.target.value})}
                      />
                    </div>
                 </div>
                 
                 <div className="bg-white/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><IdCard className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">অফিস আইডি</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                        placeholder="Set ID (e.g. ST-01)"
                        value={profileForm.staffId}
                        onChange={(e) => setProfileForm({...profileForm, staffId: e.target.value})}
                      />
                    </div>
                 </div>

                 <div className="bg-white/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><KeyRound className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">পাসওয়ার্ড</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                        placeholder="Set Password (Optional)"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm({...profileForm, password: e.target.value})}
                      />
                    </div>
                 </div>
               </div>

               <button type="submit" className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95">
                 <Save className="w-4 h-4" />
                 প্রোফাইল সেভ করুন
               </button>

               <div className="mt-4 text-center">
                 <p className="text-[10px] text-gray-400">Joined: {myProfile?.createdAt ? new Date(myProfile.createdAt).toLocaleDateString() : 'Just Now'}</p>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
