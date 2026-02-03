
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Users, Car, Receipt, BarChart3, Settings, Trash2, 
  LogOut, Wallet, User, Cloud, WifiOff, AlertTriangle, Menu, X, RefreshCw, Lock, ArrowRightLeft, XCircle, Landmark, Bell, Phone, Briefcase, Crown, UserCog, ShieldCheck, Camera, Save, KeyRound, CreditCard, MessageSquareWarning, MessagesSquare, MapPin, MonitorSmartphone, Satellite, Trophy, Gift, Gamepad2, Shield, CheckCircle, LogIn, Sparkles, ClipboardList, Check, Eye, EyeOff, Moon, Sun, Loader2, MoreHorizontal, Grid
} from 'lucide-react';
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { UserRole, Staff, MovementLog, Expense, BillingRule, FundEntry, Notice, AdvanceLog, Complaint, ChatMessage, Attendance, StaffLocation, AppNotification } from './types';
import { INITIAL_STAFF, INITIAL_BILLING_RULES, ROLE_LABELS, DEFAULT_FIREBASE_CONFIG } from './constants';
import GlowingCursor from './GlowingCursor';

// --- Views ---
import DashboardView from './views/Dashboard';
import StaffManagementView from './views/StaffManagement';
import MovementLogView from './views/MovementLog';
import ExpenseManagementView from './views/ExpenseManagementView';
import FundLedgerView from './views/FundLedger';
import SettingsView from './views/Settings';
import ReportsView from './views/Reports';
import TrashView from './views/Trash';
import NoticeBoardView from './views/NoticeBoardView'; 
import ComplaintBoxView from './views/ComplaintBox';
import GroupChatView from './views/GroupChat';
import AttendanceView from './views/Attendance';
import LiveLocationView from './views/LiveLocation';
import LuckyDrawView from './views/LuckyDraw';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false); // New state for Bottom Nav More Menu
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('app_theme') === 'dark';
  });

  // Notification System State
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  
  // Permission State
  const [permissionsGranted, setPermissionsGranted] = useState(() => {
     return localStorage.getItem('app_permissions_granted') === 'true';
  });

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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false); 
  const [rememberMe, setRememberMe] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);

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
    
    // Load Saved Accounts
    try {
      const savedAcc = localStorage.getItem('saved_accounts');
      if (savedAcc) setSavedAccounts(JSON.parse(savedAcc));
    } catch (e) {
      console.error(e);
    }
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
             localStorage.setItem('app_permissions_granted', 'true');
          }
        }
      } catch (e) {
        console.log("Permissions query not supported", e);
      }
    };
    checkPermissions();
  }, []);

  // Theme Toggle Handler
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('app_theme', newTheme ? 'dark' : 'light');
  };

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

  // Sync Saved Accounts when Staff List Updates (Fix for Profile Update Issue)
  useEffect(() => {
    if (currentUser && staffList.length > 0) {
      const myData = staffList.find(s => s.name === currentUser);
      if (myData) {
        // Update saved accounts if this user exists there
        const saved = localStorage.getItem('saved_accounts');
        if (saved) {
          const accounts = JSON.parse(saved);
          const updatedAccounts = accounts.map((acc: any) => {
            if (acc.username === currentUser) {
              return { ...acc, photo: myData.photo }; // Sync photo
            }
            return acc;
          });
          // Only update local storage if there's a change to avoid loops, but photo comparison is heavy.
          // Simple approach: just update.
          localStorage.setItem('saved_accounts', JSON.stringify(updatedAccounts));
          setSavedAccounts(updatedAccounts);
        }
      }
    }
  }, [staffList, currentUser]);

  // ... (Gamification logic remains same)
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
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
           console.error(`Wake Lock failed: ${err.name}, ${err.message}`);
        }
      }
    }
  };

  // Optimization: Memoize the staff ID so we don't depend on the whole staffList in useEffect
  const myStaffId = useMemo(() => {
    if (!currentUser || !staffList) return null;
    const profile = staffList.find(s => s.name === currentUser);
    return profile ? profile.id : null;
  }, [currentUser, staffList]);

  useEffect(() => {
    if (!currentUser || !role || !firebaseConfig || !isCloudEnabled) return;
    if (role === UserRole.ADMIN || role === UserRole.MD) return;
    if (!myStaffId) return;

    let watchId: number;

    const startTracking = () => {
      if (role === UserRole.STAFF || role === UserRole.KIOSK) {
        requestWakeLock();
      }

      if ('geolocation' in navigator) {
        // Only ask if we haven't already granted permissions (to avoid popup spam)
        // Though watchPosition will trigger the icon regardless
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            // Once we get a position, we know we have permission
            if (!permissionsGranted) {
               setPermissionsGranted(true);
               localStorage.setItem('app_permissions_granted', 'true');
            }
            
            try {
              const app = getApp();
              const db = getDatabase(app, firebaseConfig.databaseURL);
              const locationData: StaffLocation = {
                staffId: myStaffId,
                staffName: currentUser,
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: new Date().toISOString(),
                speed: position.coords.speed || 0,
                // @ts-ignore
                batteryLevel: (await navigator.getBattery?.())?.level || undefined
              };
              await set(ref(db, `staff_locations/${myStaffId}`), locationData);
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
  }, [currentUser, role, isCloudEnabled, myStaffId]);

  // --- ATTENDANCE REMINDER LOGIC ---
  useEffect(() => {
    // 1. Exclude MD and ensure user is logged in
    if (!currentUser || !role || role === UserRole.MD) return;

    const checkAttendance = () => {
      const today = new Date().toISOString().split('T')[0];
      const amICheckedIn = attendanceList.some(a => a.date === today && a.staffName === currentUser);

      if (!amICheckedIn) {
         // Create notification
         handleAddNotification(
           '⚠️ হাজিরা রিমাইন্ডার',
           'আপনি আজ এখনো হাজিরা (Check-In) দেননি। দ্রুত হাজিরা নিশ্চিত করুন।',
           'WARNING',
           'attendance'
         );
      }
    };

    // Initial check after 15 seconds of load/login to let data sync
    const initialTimeout = setTimeout(checkAttendance, 15000);

    // Repeat check every 30 minutes (30 * 60 * 1000 ms)
    const interval = setInterval(checkAttendance, 30 * 60 * 1000); 

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [currentUser, role, attendanceList]);

  // --- NOTIFICATION LOGIC ---
  const requestNotificationPermission = () => {
    // Only ask if default, never ask again if denied or granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handleAddNotification = (title: string, message: string, type: AppNotification['type'] = 'INFO', link?: string) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      isRead: false,
      link
    };
    
    setAppNotifications(prev => [newNotif, ...prev]);

    // Send Browser Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}

      new Notification(title, {
        body: message,
        icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png',
        tag: 'depend-sourcing-msg'
      });
    }
  };

  const markAllAsRead = () => {
    setAppNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => {
    setAppNotifications([]);
  };

  const unreadCount = appNotifications.filter(n => !n.isRead).length;

  // 1. WATCHER FOR MESSAGES (Chat/Movement) -> Notify Everyone
  const prevMessagesLength = useRef(0);
  useEffect(() => {
    if (messages.length > 0 && prevMessagesLength.current > 0 && messages.length > prevMessagesLength.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender !== currentUser) {
        const msgTime = new Date(lastMsg.timestamp).getTime();
        if (Date.now() - msgTime < 30000) {
           if (lastMsg.type === 'SYSTEM_MOVEMENT') {
             handleAddNotification('স্টাফ মুভমেন্ট আপডেট', lastMsg.text, 'INFO', 'movements');
           } else {
             handleAddNotification(`মেসেজ: ${lastMsg.sender}`, lastMsg.text, 'INFO', 'chat');
           }
        }
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, currentUser]);

  // 2. WATCHER FOR EXPENSES -> Notify Targeted Users (Owner / Admin / MD)
  const prevExpensesRef = useRef<Expense[]>([]);
  useEffect(() => {
    const prev = prevExpensesRef.current;
    if (prev.length === 0 && expenses.length > 0) {
        // Initial load, don't spam
        prevExpensesRef.current = expenses;
        return;
    }

    // A. Detect NEW Expenses (Submission)
    const newExpenses = expenses.filter(e => !prev.find(p => p.id === e.id));
    newExpenses.forEach(e => {
        // Condition: If I am Admin/MD, notify me about ANY new bill
        if (role === UserRole.ADMIN || role === UserRole.MD) {
            handleAddNotification('নতুন বিল সাবমিট', `${e.staffName} ৳${e.amount} টাকার বিল সাবমিট করেছেন।`, 'INFO', 'expenses');
        }
    });

    // B. Detect STATUS CHANGE (Approval/Rejection)
    const updatedExpenses = expenses.filter(e => {
        const old = prev.find(p => p.id === e.id);
        return old && old.status !== e.status;
    });

    updatedExpenses.forEach(e => {
        // Condition 1: If I am the OWNER of the bill, notify me
        if (currentUser && e.staffName === currentUser) {
            let msg = '';
            let type: AppNotification['type'] = 'INFO';
            if (e.status === 'APPROVED') { msg = `আপনার ৳${e.amount} টাকার বিলটি অনুমোদিত হয়েছে!`; type = 'SUCCESS'; }
            else if (e.status === 'REJECTED') { msg = `আপনার ৳${e.amount} টাকার বিলটি বাতিল করা হয়েছে।`; type = 'ERROR'; }
            else if (e.status === 'VERIFIED') { msg = `আপনার ৳${e.amount} টাকার বিলটি ভেরিফাইড হয়েছে।`; type = 'INFO'; }
            
            handleAddNotification('বিল আপডেট', msg, type, 'expenses');
        }
    });

    prevExpensesRef.current = expenses;
  }, [expenses, role, currentUser]);


  useEffect(() => {
    if (role) {
      requestNotificationPermission();
    }
  }, [role]);

  const handleLogin = (e: React.FormEvent | null, quickAuthData?: any) => {
    if (e) e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const username = quickAuthData ? quickAuthData.username : loginUsername.trim();
    const password = quickAuthData ? quickAuthData.password : loginPassword;
    
    let authenticatedUser: { role: UserRole, name: string } | null = null;

    // 1. Check Staff List
    const staffMember = staffList.find(s => s && !s.deletedAt && s.name.toLowerCase() === username.toLowerCase());
    if (staffMember) {
      const validPassword = staffMember.password || `${staffMember.name}@`;
      if (password === validPassword) {
        authenticatedUser = { role: staffMember.role || UserRole.STAFF, name: staffMember.name };
      }
    }
    // 2. Check MD
    else if (username.toLowerCase() === 'ispa' && password === 'ayaan') {
      authenticatedUser = { role: UserRole.MD, name: 'ISPA' };
    }
    // 3. Check Admin
    else if (username.toLowerCase() === 'mehedi@' && password === 'mehedi@60') {
      authenticatedUser = { role: UserRole.ADMIN, name: 'Mehedi' };
    }

    if (authenticatedUser) {
      const proceedLogin = () => {
          setRole(authenticatedUser!.role);
          setCurrentUser(authenticatedUser!.name);
          setIsLoggingIn(false); // Stop loading
          
          if (authenticatedUser!.role === UserRole.KIOSK) {
            setActiveTab('attendance'); 
          }

          // Check for pending bills if admin
          if (authenticatedUser!.role === UserRole.ADMIN) {
             const pending = expenses.filter(e => !e.isDeleted && e.status === 'PENDING').length;
             if (pending > 0) {
                handleAddNotification('পেন্ডিং বিল', `${pending} টি বিল অনুমোদনের অপেক্ষায় আছে।`, 'WARNING', 'expenses');
             }
          }

          // Save Account Logic
          if (rememberMe && !quickAuthData) {
             const photo = staffList.find(s => s.name === authenticatedUser!.name)?.photo || '';
             const newAccount = { 
               username: authenticatedUser!.name, 
               password: password, 
               role: authenticatedUser!.role,
               photo 
             };
             
             const updatedAccounts = [newAccount, ...savedAccounts.filter(a => a.username !== authenticatedUser!.name)];
             setSavedAccounts(updatedAccounts);
             localStorage.setItem('saved_accounts', JSON.stringify(updatedAccounts));
          }
      };

      // Strict Location Check for Staff/Kiosk
      if (authenticatedUser.role === UserRole.STAFF || authenticatedUser.role === UserRole.KIOSK) {
          if (!navigator.geolocation) {
             setLoginError("ডিভাইসে লোকেশন সাপোর্ট নেই।");
             setIsLoggingIn(false);
             return;
          }
          
          navigator.geolocation.getCurrentPosition(
            (pos) => {
               // Location found, proceed
               proceedLogin();
            },
            (err) => {
               // Location failed
               console.error("Login Location Check Failed:", err);
               setIsLoggingIn(false);
               
               let errorMsg = "লগইন ব্যর্থ! ❌";
               if (err.code === 1) errorMsg += " লোকেশন পারমিশন দেওয়া হয়নি।";
               else if (err.code === 2) errorMsg += " জিপিএস (GPS) বন্ধ আছে বা সিগনাল পাওয়া যাচ্ছে না।";
               else errorMsg += " লোকেশন পাওয়া যাচ্ছে না।";
               
               setLoginError(`${errorMsg} দয়া করে মোবাইলের লোকেশন অন করুন এবং ব্রাউজারে অনুমতি দিন।`);
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
      } else {
          // Admin/MD login without location check
          proceedLogin();
      }
      return;
    }

    setLoginError('ভুল ইউজারনেম অথবা পাসওয়ার্ড!');
    setIsLoggingIn(false);
  };

  const removeSavedAccount = (username: string) => {
    const updated = savedAccounts.filter(a => a.username !== username);
    setSavedAccounts(updated);
    localStorage.setItem('saved_accounts', JSON.stringify(updated));
  };

  const handleLogout = () => {
    setRole(null);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
    setActiveTab('dashboard');
    setAppNotifications([]); // Clear notifications on logout
  };

  // ... (Rest of the handlers: export, import, profile photo, save profile remain same) ...
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
          
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
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
      const updatedProfile = {
        ...updatedList[existingProfileIndex],
        ...profileForm,
        updatedAt: new Date().toISOString()
      };
      updatedList[existingProfileIndex] = updatedProfile;
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

  // Define Navigation Items based on Role
  const allNavItems = useMemo(() => [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK] },
    { id: 'attendance', label: 'হাজিরা', icon: MapPin, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK] },
    { id: 'expenses', label: 'বিল', icon: Receipt, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
    { id: 'notices', label: 'নোটিশ', icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK] },
    { id: 'chat', label: 'টিম চ্যাট', icon: MessagesSquare, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
    { id: 'luckydraw', label: 'লাকি ড্র', icon: Gamepad2, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
    { id: 'live-location', label: 'ট্র্যাকিং', icon: Satellite, roles: [UserRole.ADMIN, UserRole.MD] },
    { id: 'complaints', label: 'অভিযোগ', icon: MessageSquareWarning, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
    { id: 'funds', label: 'ফান্ড লেজার', icon: Landmark, roles: [UserRole.ADMIN, UserRole.MD] },
    { id: 'staff', label: 'স্টাফ', icon: Users, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF] },
    { id: 'movements', label: 'মুভমেন্ট', icon: Car, roles: [UserRole.ADMIN, UserRole.STAFF] },
    { id: 'reports', label: 'রিপোর্ট', icon: BarChart3, roles: [UserRole.ADMIN, UserRole.MD] },
    { id: 'settings', label: 'সেটিংস', icon: Settings, roles: [UserRole.ADMIN] },
    { id: 'trash', label: 'রিসাইকেল', icon: Trash2, roles: [UserRole.ADMIN] },
  ], []);

  const allowedNavItems = useMemo(() => allNavItems.filter(item => role && item.roles.includes(role)), [allNavItems, role]);

  // Split Navigation for Bottom Bar (Mobile)
  const bottomNavItems = allowedNavItems.slice(0, 4); // First 4 items
  const moreMenuItems = allowedNavItems.slice(4); // Rest of the items

  // --- LOGIN SCREEN ---
  if (!role) {
    // ... (Login Screen Render - No Changes needed here) ...
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
        
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-black to-blue-900 opacity-80 z-0"></div>
        <div className="absolute inset-0 z-0"><GlowingCursor /></div>
        
        {/* Updated Login Card: Dark Glassmorphism for better visuals with GlowingCursor */}
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/10 relative z-10 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl shadow-indigo-500/30 ring-4 ring-indigo-500/20">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">অ্যাকাউন্ট লগইন</h1>
            <p className="text-indigo-200 text-xs mt-1">Depend Sourcing Ltd.</p>
          </div>

          {/* SAVED ACCOUNTS */}
          {savedAccounts.length > 0 && (
            <div className="mb-6">
               <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-3 ml-1">Saved Accounts</p>
               <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {savedAccounts.map((account, idx) => (
                     <div key={idx} className="relative group shrink-0">
                        <div 
                          onClick={() => !isLoggingIn && handleLogin(null, account)}
                          className={`flex flex-col items-center bg-white/5 border border-white/10 p-3 rounded-2xl shadow-sm hover:shadow-lg cursor-pointer transition-all hover:bg-white/10 hover:border-indigo-500/50 w-24 hover:scale-105 active:scale-95 ${isLoggingIn ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                           <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center overflow-hidden mb-2 border border-white/20">
                              {account.photo ? <img src={account.photo} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-indigo-300" />}
                           </div>
                           <p className="text-[10px] font-bold text-gray-200 truncate w-full text-center">{account.username}</p>
                           <p className="text-[9px] text-indigo-400 font-medium">Click to Login</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeSavedAccount(account.username); }}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                        >
                           <X className="w-3 h-3" />
                        </button>
                     </div>
                  ))}
               </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">ইউজারনেম / নাম</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors duration-300" />
                <input 
                  required 
                  type="text" 
                  disabled={isLoggingIn}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-gray-100 text-sm placeholder:text-gray-500 hover:bg-white/20 focus:bg-white/20 backdrop-blur-md disabled:opacity-50"
                  placeholder="Username..."
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">পাসওয়ার্ড</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-400 transition-colors duration-300" />
                <input 
                  required 
                  type={showLoginPassword ? "text" : "password"} 
                  disabled={isLoggingIn}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-gray-100 text-sm placeholder:text-gray-500 hover:bg-white/20 focus:bg-white/20 backdrop-blur-md disabled:opacity-50"
                  placeholder="Password..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button 
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
               <input 
                 type="checkbox" 
                 id="rememberMe" 
                 disabled={isLoggingIn}
                 className="w-4 h-4 rounded border-gray-600 bg-white/10 text-indigo-500 focus:ring-indigo-500"
                 checked={rememberMe}
                 onChange={(e) => setRememberMe(e.target.checked)}
               />
               <label htmlFor="rememberMe" className="text-xs font-bold text-gray-400 cursor-pointer select-none hover:text-gray-200 transition-colors">
                 একাউন্ট সেভ করুন (Remember Me)
               </label>
            </div>

            {loginError && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-500/20 animate-pulse">
                <XCircle className="w-4 h-4 shrink-0" /> <span className="flex-1">{loginError}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className={`w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black shadow-lg shadow-indigo-500/40 hover:bg-indigo-500 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm relative overflow-hidden group border border-indigo-400/20 hover:border-indigo-400/50 ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    যাচাই করা হচ্ছে...
                  </>
                ) : (
                  <>
                    প্রবেশ করুন <ArrowRightLeft className="w-4 h-4 rotate-90 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
              {!isLoggingIn && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>}
            </button>
          </form>

          {/* Connection Status Indicator */}
          <div className="mt-6 flex flex-col items-center gap-3">
            {isCloudEnabled ? (
               <span className="flex items-center gap-1.5 text-[10px] text-green-400 bg-green-900/30 px-3 py-1 rounded-full font-bold border border-green-500/30 shadow-lg shadow-green-900/20">
                 <Cloud className="w-3 h-3" /> Online Connected
               </span>
            ) : (
               <div className="flex flex-col items-center gap-2">
                 <span className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-900/30 px-3 py-1 rounded-full font-bold cursor-pointer hover:bg-red-900/50 transition-colors border border-red-500/30" onClick={() => setShowDbHelp(!showDbHelp)}>
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
    <div className={`flex h-screen overflow-hidden font-['Hind_Siliguri'] relative ${isDarkMode ? 'dark' : ''} ${isDarkMode ? 'text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {isDarkMode && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800 -z-20"></div>
          <div className="absolute inset-0 z-0"><GlowingCursor /></div>
        </>
      )}

      {/* DESKTOP SIDEBAR - Hidden on Mobile */}
      <aside className={`hidden md:flex flex-col w-64 h-full border-r ${isDarkMode ? 'bg-gray-900/80 backdrop-blur-md border-white/10 text-white' : 'bg-indigo-900 text-white'}`}>
        <div className={`p-6 text-center shrink-0 ${isDarkMode ? 'border-b border-white/10' : 'border-b border-indigo-800'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isDarkMode ? 'bg-white/10 ring-1 ring-white/20' : 'bg-indigo-400/20'}`}>
            <Wallet className={`w-7 h-7 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-400'}`} />
          </div>
          <h2 className="text-xl font-bold tracking-tight">বিলিং সেন্টার</h2>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {allowedNavItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-indigo-200 hover:bg-indigo-800'}`}>
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>
        <div className={`p-4 border-t shrink-0 ${isDarkMode ? 'border-white/10' : 'border-indigo-800'}`}>
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-300 hover:bg-red-900/30 transition-colors">
            <LogOut className="w-5 h-5" /> লগআউট
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 pb-[70px] md:pb-0">
        <header className={`h-16 flex items-center justify-between px-6 shrink-0 relative z-20 ${isDarkMode ? 'bg-gray-900/80 backdrop-blur-md border-b border-white/10' : 'bg-white border-b border-gray-200'}`}>
          <div className="flex items-center gap-4">
            {/* Removed Mobile Sidebar Toggle */}
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
                    {(myProfile.pointsMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`) 
                      ? (myProfile.points || 0) 
                      : 0} pts
                  </span>
               </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
             {/* THEME TOGGLE */}
             <button 
               onClick={toggleTheme}
               className={`p-2 rounded-full transition-all active:scale-95 ${isDarkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
               title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
             >
               {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             {/* NOTIFICATION BELL */}
             <div className="relative">
                <button 
                  onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                  className={`p-2 rounded-full transition-colors relative ${isNotifDropdownOpen ? 'bg-indigo-50 text-indigo-600' : isDarkMode ? 'text-gray-300 hover:bg-white/10' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                   <Bell className="w-5 h-5" />
                   {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                   )}
                </button>

                {/* Dropdown Panel */}
                {isNotifDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-gray-900 dark:text-gray-100">
                     <div className="p-3 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Notifications</h4>
                        <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-600 hover:underline">Mark all read</button>
                     </div>
                     <div className="max-h-64 overflow-y-auto">
                        {appNotifications.length > 0 ? (
                           appNotifications.map((notif) => (
                              <div 
                                key={notif.id} 
                                className={`p-3 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${notif.isRead ? 'opacity-60' : 'bg-indigo-50/30 dark:bg-indigo-900/20'}`}
                                onClick={() => {
                                   if (notif.link) {
                                      setActiveTab(notif.link);
                                      setIsNotifDropdownOpen(false);
                                   }
                                }}
                              >
                                 <div className="flex justify-between items-start mb-1">
                                    <p className={`text-xs font-bold ${notif.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{notif.title}</p>
                                    <span className="text-[9px] text-gray-400 whitespace-nowrap">{new Date(notif.timestamp).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})}</span>
                                 </div>
                                 <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{notif.message}</p>
                              </div>
                           ))
                        ) : (
                           <div className="py-8 text-center text-gray-400">
                              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                              <p className="text-xs">No new notifications</p>
                           </div>
                        )}
                     </div>
                     {appNotifications.length > 0 && (
                        <div className="p-2 border-t border-gray-100 dark:border-gray-700 text-center bg-white dark:bg-gray-800">
                           <button onClick={clearNotifications} className="text-[10px] text-red-400 hover:text-red-600 font-bold">Clear All</button>
                        </div>
                     )}
                  </div>
                )}
             </div>

             {/* Profile Info */}
             <div className="text-right hidden md:block">
               <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{currentUser || 'Guest'}</p>
               <p className="text-xs text-gray-500">{role ? ROLE_LABELS[role] : ''}</p>
             </div>
             <div 
               onClick={openProfile}
               className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border-2 border-indigo-50 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all overflow-hidden"
             >
               {myProfile && myProfile.photo ? (
                 <img key={myProfile.updatedAt} src={myProfile.photo} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 currentUser ? currentUser[0].toUpperCase() : <User className="w-5 h-5" />
               )}
             </div>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-6 md:p-8 ${isDarkMode ? 'bg-transparent' : 'bg-gray-50'}`}>
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center px-2 py-2 z-50 shadow-lg">
         {bottomNavItems.map((item) => (
            <button 
               key={item.id}
               onClick={() => { setActiveTab(item.id); setIsMoreMenuOpen(false); }}
               className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors ${activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
            >
               <item.icon className="w-6 h-6 mb-1" />
               <span className="text-[10px] font-bold">{item.label}</span>
            </button>
         ))}
         {/* MORE BUTTON */}
         <button 
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors ${isMoreMenuOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
         >
            <MoreHorizontal className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">আরও</span>
         </button>
      </div>

      {/* MOBILE MORE MENU OVERLAY */}
      {isMoreMenuOpen && (
         <div className="fixed inset-0 z-[60] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm md:hidden animate-in fade-in slide-in-from-bottom-10 duration-200 flex flex-col">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shadow-sm">
               <div className="flex items-center gap-2">
                  <Grid className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-black text-gray-800 dark:text-white">সব মেনু</h3>
               </div>
               <button onClick={() => setIsMoreMenuOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
               <div className="grid grid-cols-3 gap-4">
                  {moreMenuItems.map((item) => (
                     <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMoreMenuOpen(false); }}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${activeTab === item.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:shadow-md'}`}
                     >
                        <item.icon className="w-8 h-8 mb-2 opacity-80" />
                        <span className="text-xs font-bold text-center">{item.label}</span>
                     </button>
                  ))}
               </div>

               {/* Profile & Logout Section in More Menu */}
               <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <button onClick={() => { openProfile(); setIsMoreMenuOpen(false); }} className="w-full flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                     <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden">
                        {myProfile && myProfile.photo ? (
                           <img src={myProfile.photo} className="w-full h-full object-cover" />
                        ) : (
                           currentUser ? currentUser[0].toUpperCase() : <User className="w-5 h-5" />
                        )}
                     </div>
                     <div className="text-left">
                        <p className="font-bold text-gray-800 dark:text-white">{currentUser}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">প্রোফাইল দেখুন</p>
                     </div>
                  </button>
                  
                  <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold border border-red-100 dark:border-red-900/30">
                     <LogOut className="w-5 h-5" /> লগআউট করুন
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200 text-gray-900">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/40 backdrop-blur-md relative dark:bg-gray-800 dark:border-gray-700">
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

               <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 text-center">{currentUser || 'Guest User'}</h2>
               <div className="flex items-center gap-2 mt-1 mb-6">
                 {role === UserRole.MD && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-700 uppercase flex items-center gap-1"><Crown className="w-3 h-3"/> Managing Director</span>}
                 {role === UserRole.ADMIN && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-700 uppercase flex items-center gap-1"><UserCog className="w-3 h-3"/> Manager</span>}
                 {role === UserRole.STAFF && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase flex items-center gap-1"><User className="w-3 h-3"/> Staff Member</span>}
                 {role === UserRole.KIOSK && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-100 text-orange-700 uppercase flex items-center gap-1"><MonitorSmartphone className="w-3 h-3"/> Kiosk Mode</span>}
               </div>

               <div className="w-full space-y-3">
                 <div className="bg-white/80 dark:bg-gray-700/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="bg-indigo-50 dark:bg-gray-600 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><Briefcase className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">পদবী (Designation)</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-300"
                        placeholder="Set Designation"
                        value={profileForm.designation}
                        onChange={(e) => setProfileForm({...profileForm, designation: e.target.value})}
                      />
                    </div>
                 </div>
                 
                 <div className="bg-white/80 dark:bg-gray-700/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="bg-indigo-50 dark:bg-gray-600 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><Phone className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">মোবাইল নাম্বার</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-300"
                        placeholder="Set Mobile No"
                        value={profileForm.mobile}
                        onChange={(e) => setProfileForm({...profileForm, mobile: e.target.value})}
                      />
                    </div>
                 </div>
                 
                 <div className="bg-white/80 dark:bg-gray-700/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="bg-indigo-50 dark:bg-gray-600 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><CreditCard className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">অফিস আইডি</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-300"
                        placeholder="Set ID (e.g. ST-01)"
                        value={profileForm.staffId}
                        onChange={(e) => setProfileForm({...profileForm, staffId: e.target.value})}
                      />
                    </div>
                 </div>

                 <div className="bg-white/80 dark:bg-gray-700/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
                    <div className="bg-indigo-50 dark:bg-gray-600 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><KeyRound className="w-4 h-4" /></div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">পাসওয়ার্ড</p>
                      <input 
                        type="text" 
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-300"
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
