import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutGrid, UsersRound, Footprints, Banknote, PieChart, Settings2, Recycle, 
  LogOut, Wallet, User, Cloud, WifiOff, Menu, X, Lock, ArrowRightLeft, XCircle, Landmark, Bell, Phone, Briefcase, Crown, UserCog, Camera, Save, KeyRound, CreditCard, MonitorSmartphone, Trophy, Gift, Sun, Moon, Loader2, BellRing, ChevronRight, Fingerprint, Megaphone, Radar, ShieldAlert, MessageCircleMore, Download, Sparkles, Eye, EyeOff, ShoppingBag, Package
} from 'lucide-react';
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, ref, onValue, set } from "firebase/database";
import { UserRole, Staff, MovementLog, Expense, BillingRule, FundEntry, Notice, AdvanceLog, Complaint, ChatMessage, Attendance, StaffLocation, AppNotification, Product } from './types';
import { INITIAL_STAFF, INITIAL_BILLING_RULES, ROLE_LABELS, DEFAULT_FIREBASE_CONFIG, INITIAL_PRODUCTS } from './constants';
import GlowingCursor from './GlowingCursor';

import DashboardView from './views/Dashboard';
import StaffManagementView from './views/StaffManagement';
import MovementLogView from './views/MovementLog';
import ExpenseManagementView from './views/ExpenseManagementView';
import FundLedgerView from './views/FundLedger';
import SettingsView from './views/Settings';
import ReportsView from './views/Reports';
import TrashView from './views/Trash';
import NoticeBoardView from './views/NoticeBoardView'; 
import ComplaintBoxView from './views/ComplaintBoxView';
import GroupChatView from './views/GroupChat';
import AttendanceView from './views/Attendance';
import LiveLocationView from './views/LiveLocation';
import LuckyDrawView from './views/LuckyDraw';
import ProductCatalogView from './views/ProductCatalogView'; // New Import

// Safe LocalStorage Helper
const safeGetItem = (key: string, defaultValue: string | null = null) => {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (e) {
    console.warn(`LocalStorage access denied for key: ${key}`);
    return defaultValue;
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`LocalStorage write failed for key: ${key}`);
  }
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false); 
  const [highlightStaffId, setHighlightStaffId] = useState<string | null>(null);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // --- PERSISTENT LOGIN LOGIC (Auto-Login on Load) ---
  useEffect(() => {
    const savedSession = safeGetItem('active_session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData && sessionData.role && sessionData.username) {
          setRole(sessionData.role);
          setCurrentUser(sessionData.username);
          // Optional: Restore active tab if saved
          const lastTab = safeGetItem('last_active_tab');
          if (lastTab) setActiveTab(lastTab);
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
  }, []);

  // Save active tab on change
  useEffect(() => {
    if (activeTab) {
      safeSetItem('last_active_tab', activeTab);
    }
  }, [activeTab]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    }
  };
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return safeGetItem('app_theme') === 'dark';
  });

  const [appNotifications, setAppNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = safeGetItem('app_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [toasts, setToasts] = useState<AppNotification[]>([]); 
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  
  useEffect(() => {
    safeSetItem('app_notifications', JSON.stringify(appNotifications));
  }, [appNotifications]);
  
  const [permissionsGranted, setPermissionsGranted] = useState(() => {
     return safeGetItem('app_permissions_granted') === 'true';
  });

  // Profile Edit State
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    designation: '',
    mobile: '',
    staffId: '',
    photo: '',
    password: ''
  });
  const profileFileRef = useRef<HTMLInputElement>(null);
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [showDbHelp, setShowDbHelp] = useState(false);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false); 
  const [rememberMe, setRememberMe] = useState(true); // Default to true for better UX
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);

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
  const [products, setProducts] = useState<Product[]>([]);

  const cleanArray = <T,>(data: any): T[] => {
    if (!data) return [];
    const array = typeof data === 'object' && !Array.isArray(data) ? Object.values(data) : data;
    return Array.isArray(array) ? array.filter(Boolean) as T[] : [];
  };

  const [firebaseConfig] = useState<any>(() => {
    const saved = safeGetItem('fb_config');
    let config;
    try {
      config = saved && saved !== 'null' ? JSON.parse(saved) : DEFAULT_FIREBASE_CONFIG;
    } catch {
      config = DEFAULT_FIREBASE_CONFIG;
    }
    if (config && config.projectId && (!config.databaseURL || config.databaseURL.includes('undefined'))) {
      config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
    }
    return config;
  });

  const loadLocalData = () => {
    const getLocal = (key: string, def: string) => {
      try {
        const val = JSON.parse(safeGetItem(key) || def);
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
    setProducts(getLocal('products', JSON.stringify(INITIAL_PRODUCTS)) as Product[]);
    
    try {
      const savedAcc = safeGetItem('saved_accounts');
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
              const arrayData = node === 'staff_locations' ? data : cleanArray(data); 
              setter(arrayData);
              if (node !== 'staff_locations') {
                safeSetItem(node, JSON.stringify(arrayData));
              }
              setIsCloudEnabled(true);
            } else {
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
        handleSnapshot('products', setProducts);
      }
    } catch (error: any) {
      console.error("Cloud Connection Error:", error);
      setCloudError(error.message);
      setIsCloudEnabled(false);
      setIsSyncing(false);
    }
  }, [firebaseConfig]);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const geoResult = await navigator.permissions.query({ name: 'geolocation' });
          if (geoResult.state === 'granted') {
             setPermissionsGranted(true);
             safeSetItem('app_permissions_granted', 'true');
          }
        }
      } catch (e) {
        console.log("Permissions query not supported", e);
      }
    };
    checkPermissions();
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    safeSetItem('app_theme', newTheme ? 'dark' : 'light');
  };

  const syncData = async (node: string, data: any) => {
    const cleaned = cleanArray(data);
    const jsonString = JSON.stringify(cleaned);
    safeSetItem(node, jsonString);

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

  // Robust State Updaters using Functional Updates
  // This ensures we always work with the latest state when updating, preventing stale data overrides.
  const createUpdater = (key: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => (val: any) => {
    setter(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncData(key, next);
      return next;
    });
  };

  const updateStaffList = createUpdater('staffList', setStaffList);
  const updateExpenses = createUpdater('expenses', setExpenses);
  const updateMovements = createUpdater('movements', setMovements);
  const updateBillingRules = createUpdater('billingRules', setBillingRules);
  const updateFunds = createUpdater('funds', setFunds);
  const updateNotices = createUpdater('notices', setNotices);
  const updateAdvances = createUpdater('advances', setAdvances);
  const updateComplaints = createUpdater('complaints', setComplaints);
  const updateMessages = createUpdater('messages', setMessages);
  const updateAttendance = createUpdater('attendanceList', setAttendanceList);
  const updateProducts = createUpdater('products', setProducts);

  useEffect(() => {
    if (currentUser && staffList.length > 0) {
      const myData = staffList.find(s => s.name === currentUser);
      if (myData) {
        const saved = safeGetItem('saved_accounts');
        if (saved) {
          const accounts = JSON.parse(saved);
          const updatedAccounts = accounts.map((acc: any) => {
            if (acc.username === currentUser) {
              return { ...acc, photo: myData.photo };
            }
            return acc;
          });
          safeSetItem('saved_accounts', JSON.stringify(updatedAccounts));
          setSavedAccounts(updatedAccounts);
        }
      }
    }
  }, [staffList, currentUser]);

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

  const handleDrawTimeUpdate = (staffId: string) => {
    const now = new Date().toISOString();
    setStaffList(prevList => {
       const newList = prevList.map(s => {
         if (s.id === staffId) {
           return {
             ...s,
             lastLuckyDrawTime: now,
             luckyDrawCount: (s.luckyDrawCount || 0) + 1,
             updatedAt: now
           };
         }
         return s;
       });
       syncData('staffList', newList);
       return newList;
    });
  };

  // --- OPEN PROFILE LOGIC (GLOBAL) ---
  const openProfile = (targetStaffId?: string) => {
    let targetStaff: Staff | undefined;

    if (targetStaffId) {
      targetStaff = staffList.find(s => s.id === targetStaffId);
    } else {
      // Default to current user (My Profile)
      targetStaff = staffList.find(s => s.name === currentUser);
    }

    if (!targetStaff) {
       alert("প্রোফাইল ডাটা পাওয়া যাচ্ছে না।");
       return;
    }

    // PERMISSION CHECK
    // If I am STAFF, I can ONLY view my own profile.
    if (role === UserRole.STAFF) {
       const myself = staffList.find(s => s.name === currentUser);
       if (myself && myself.id !== targetStaff.id) {
          alert("দুঃখিত! স্টাফরা অন্য কারো প্রোফাইল দেখতে পারবে না।");
          return;
       }
    }

    // Populate Modal
    setEditingProfileId(targetStaff.id);
    setProfileForm({
      designation: targetStaff.designation || '',
      mobile: targetStaff.mobile || '',
      staffId: targetStaff.staffId || '',
      photo: targetStaff.photo || '',
      password: targetStaff.password || ''
    });
    setShowProfilePassword(false);
    setIsProfileModalOpen(true);
  };

  useEffect(() => {
    if (!currentUser || !role || role === UserRole.KIOSK || role === UserRole.MD) return;
    if (currentUser.toLowerCase().includes('office')) return;

    const checkAndAwardVisitPoint = () => {
       if (document.visibilityState !== 'visible') return;

       const staff = (staffList || []).find(s => s.name === currentUser && s.status === 'ACTIVE' && !s.deletedAt);
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

  const myStaffId = useMemo(() => {
    if (!currentUser || !staffList) return null;
    const profile = staffList.find(s => s.name === currentUser);
    return profile ? profile.id : null;
  }, [currentUser, staffList]);

  useEffect(() => {
    if (!currentUser || !role || !firebaseConfig || !isCloudEnabled) return;
    if (role === UserRole.ADMIN || role === UserRole.MD || role === UserRole.GUEST) return; // Skip for GUEST too
    if (!myStaffId) return;

    let watchId: number;

    const startTracking = () => {
      if (role === UserRole.STAFF || role === UserRole.KIOSK) {
        requestWakeLock();
      }

      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            if (!permissionsGranted) {
               setPermissionsGranted(true);
               safeSetItem('app_permissions_granted', 'true');
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

  useEffect(() => {
    if (!currentUser || !role || role === UserRole.MD || role === UserRole.GUEST) return; // Skip for GUEST

    const checkAttendance = () => {
      const today = new Date().toISOString().split('T')[0];
      const amICheckedIn = attendanceList.some(a => a.date === today && a.staffName === currentUser);

      if (!amICheckedIn) {
         handleAddNotification(
           '⚠️ হাজিরা রিমাইন্ডার',
           'আপনি আজ এখনো হাজিরা (Check-In) দেননি। দ্রুত হাজিরা নিশ্চিত করুন।',
           'WARNING',
           'attendance'
         );
      }
    };

    const initialTimeout = setTimeout(checkAttendance, 15000);
    const interval = setInterval(checkAttendance, 30 * 60 * 1000); 

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [currentUser, role, attendanceList]);

  const requestNotificationPermission = () => {
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
    setToasts(prev => [...prev, newNotif]); 

    setTimeout(() => {
       setToasts(prev => prev.filter(t => t.id !== newNotif.id));
    }, 5000);

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

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAppNotifications(prev => prev.filter(n => n.id !== id));
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const unreadCount = appNotifications.filter(n => !n.isRead).length;

  const prevMessagesLength = useRef(0);
  useEffect(() => {
    if (role === UserRole.GUEST) return; // Skip chat notifications for Guest

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
  }, [messages, currentUser, role]);

  const prevExpensesRef = useRef<Expense[]>([]);
  useEffect(() => {
    if (role === UserRole.GUEST) return; // Skip expense notifications for Guest

    const prev = prevExpensesRef.current;
    if (prev.length === 0 && expenses.length > 0) {
        prevExpensesRef.current = expenses;
        return;
    }

    const newExpenses = expenses.filter(e => !prev.find(p => p.id === e.id));
    newExpenses.forEach(e => {
        if (role === UserRole.ADMIN || role === UserRole.MD) {
            handleAddNotification('নতুন বিল সাবমিট', `${e.staffName} ৳${e.amount} টাকার বিল সাবমিট করেছেন।`, 'INFO', 'expenses');
        }
    });

    const updatedExpenses = expenses.filter(e => {
        const old = prev.find(p => p.id === e.id);
        return old && old.status !== e.status;
    });

    updatedExpenses.forEach(e => {
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

  const handleGuestLogin = () => {
    setRole(UserRole.GUEST);
    setCurrentUser('Guest User');
    setLoginError('');
    setIsLoggingIn(false);
  };

  const handleLogin = (e: React.FormEvent | null, quickAuthData?: any) => {
    if (e) e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    const username = quickAuthData ? quickAuthData.username : loginUsername.trim();
    const password = quickAuthData ? quickAuthData.password : loginPassword;
    
    let authenticatedUser: { role: UserRole, name: string } | null = null;

    const staffMember = (staffList || []).find(s => s && !s.deletedAt && s.name.toLowerCase() === username.toLowerCase());
    if (staffMember) {
      const validPassword = staffMember.password || `${staffMember.name}@`;
      if (password === validPassword) {
        authenticatedUser = { role: staffMember.role || UserRole.STAFF, name: staffMember.name };
      }
    }
    else if (username.toLowerCase() === 'ispa' && password === 'ayaan') {
      authenticatedUser = { role: UserRole.MD, name: 'ISPA' };
    }
    else if (username.toLowerCase() === 'mehedi@' && password === 'mehedi@60') {
      authenticatedUser = { role: UserRole.ADMIN, name: 'Mehedi' };
    }

    if (authenticatedUser) {
      const proceedLogin = () => {
          setRole(authenticatedUser!.role);
          setCurrentUser(authenticatedUser!.name);
          setIsLoggingIn(false); 
          
          // Save session to localStorage for persistent login
          const sessionData = { role: authenticatedUser!.role, username: authenticatedUser!.name };
          safeSetItem('active_session', JSON.stringify(sessionData));
          
          if (authenticatedUser!.role === UserRole.KIOSK) {
            setActiveTab('attendance'); 
          }

          if (authenticatedUser!.role === UserRole.ADMIN) {
             const pending = (expenses || []).filter(e => !e.isDeleted && e.status === 'PENDING').length;
             if (pending > 0) {
                handleAddNotification('পেন্ডিং বিল', `${pending} টি বিল অনুমোদনের অপেক্ষায় আছে।`, 'WARNING', 'expenses');
             }
          }

          if (rememberMe && !quickAuthData) {
             const photo = (staffList || []).find(s => s.name === authenticatedUser!.name)?.photo || '';
             const newAccount = { 
               username: authenticatedUser!.name, 
               password: password, 
               role: authenticatedUser!.role,
               photo 
             };
             
             const updatedAccounts = [newAccount, ...savedAccounts.filter(a => a.username !== authenticatedUser!.name)];
             setSavedAccounts(updatedAccounts);
             safeSetItem('saved_accounts', JSON.stringify(updatedAccounts));
          }
      };

      if (authenticatedUser.role === UserRole.STAFF || authenticatedUser.role === UserRole.KIOSK) {
          if (!navigator.geolocation) {
             setLoginError("ডিভাইসে লোকেশন সাপোর্ট নেই।");
             setIsLoggingIn(false);
             return;
          }
          
          navigator.geolocation.getCurrentPosition(
            (pos) => {
               proceedLogin();
            },
            (err) => {
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
    safeSetItem('saved_accounts', JSON.stringify(updated));
  };

  const handleLogout = () => {
    setRole(null);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
    setActiveTab('dashboard');
    localStorage.removeItem('active_session'); // Clear persistent session
  };

  const handleExport = () => {
    const data = {
      staffList, expenses, movements, billingRules, funds, notices, advances, complaints, messages, attendanceList, products,
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
      if (data.products) updateProducts(data.products);
      alert('ডাটা ইমপোর্ট সফল হয়েছে!');
    } catch (e) {
      console.error(e);
      alert('ভুল ফাইল ফরম্যাট! ইমপোর্ট ব্যর্থ হয়েছে।');
    }
  };

  const totalExpense = useMemo(() => (expenses || []).filter(e => e && !e.isDeleted && e.status === 'APPROVED').reduce((sum, e) => sum + Number(e.amount || 0), 0), [expenses]);
  const totalFund = useMemo(() => (funds || []).filter(f => f && !f.isDeleted).reduce((sum, f) => sum + Number(f.amount || 0), 0), [funds]);
  const totalAdvances = useMemo(() => (advances || []).filter(a => !a.isDeleted).reduce((sum, a) => sum + Number(a.amount || 0), 0), [advances]);
  const cashOnHand = totalFund - totalAdvances; 
  const pendingApprovals = (expenses || []).filter(e => e && !e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED')).length;

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

    // Use editingProfileId to find which staff to update
    // If null, we shouldn't be here, but default to current user just in case
    const targetId = editingProfileId || staffList.find(s => s.name === currentUser)?.id;
    if (!targetId) return;

    const existingProfileIndex = (staffList || []).findIndex(s => s.id === targetId);
    
    if (existingProfileIndex >= 0) {
      const updatedList = [...staffList];
      const updatedProfile = {
        ...updatedList[existingProfileIndex],
        ...profileForm,
        updatedAt: new Date().toISOString()
      };
      updatedList[existingProfileIndex] = updatedProfile;
      updateStaffList(updatedList);
    }
    
    setIsProfileModalOpen(false);
    setEditingProfileId(null);
  };

  const myProfile = useMemo(() => {
    return (staffList || []).find(s => s && !s.deletedAt && s.name === currentUser);
  }, [staffList, currentUser]);

  // Profile Modal Data (for display)
  const modalProfileData = useMemo(() => {
     if (editingProfileId) {
        return staffList.find(s => s.id === editingProfileId);
     }
     return myProfile;
  }, [editingProfileId, staffList, myProfile]);

  const allNavItems = useMemo(() => [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutGrid, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK], color: 'text-sky-600', bgColor: 'bg-sky-50' },
    { id: 'attendance', label: 'হাজিরা', icon: Fingerprint, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK], color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'products', label: 'পণ্য তালিকা', icon: Package, roles: [UserRole.ADMIN, UserRole.MD], color: 'text-pink-600', bgColor: 'bg-pink-50' }, // Added Product Catalog for Admin/MD
    { id: 'expenses', label: 'বিল ও খরচ', icon: Banknote, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-rose-600', bgColor: 'bg-rose-50' },
    { id: 'notices', label: 'নোটিশ বোর্ড', icon: Megaphone, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK], color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 'chat', label: 'টিম চ্যাট', icon: MessageCircleMore, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-violet-600', bgColor: 'bg-violet-50' },
    { id: 'live-location', label: 'লাইভ ট্র্যাকিং', icon: Radar, roles: [UserRole.ADMIN, UserRole.MD], color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
    { id: 'lucky-draw', label: 'লাকি ড্র & গেম', icon: Gift, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { id: 'complaints', label: 'অভিযোগ বক্স', icon: ShieldAlert, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-red-600', bgColor: 'bg-red-50' },
    { id: 'funds', label: 'ফান্ড লেজার', icon: Landmark, roles: [UserRole.ADMIN, UserRole.MD], color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { id: 'staff', label: 'স্টাফ ম্যানেজমেন্ট', icon: UsersRound, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { id: 'movements', label: 'মুভমেন্ট লগ', icon: Footprints, roles: [UserRole.ADMIN, UserRole.STAFF], color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { id: 'reports', label: 'রিপোর্ট ও ফাইল', icon: PieChart, roles: [UserRole.ADMIN, UserRole.MD], color: 'text-slate-600', bgColor: 'bg-slate-50' },
    { id: 'settings', label: 'সেটিংস', icon: Settings2, roles: [UserRole.ADMIN], color: 'text-gray-600', bgColor: 'bg-gray-50' },
    { id: 'trash', label: 'রিসাইকেল বিন', icon: Recycle, roles: [UserRole.ADMIN], color: 'text-red-500', bgColor: 'bg-red-50' },
  ], []);

  const allowedNavItems = useMemo(() => allNavItems.filter(item => role && item.roles.includes(role)), [allNavItems, role]);

  const bottomNavItems = allowedNavItems.slice(0, 4); 
  const mobileSidebarItems = allowedNavItems; 

  // Helper to format large numbers
  const formatPoints = (num: number) => {
    if (num >= 100000) return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView totalExpense={totalExpense} pendingApprovals={pendingApprovals} expenses={expenses} cloudError={cloudError} totalFund={totalFund} cashOnHand={cashOnHand} role={role!} staffList={staffList} advances={advances} currentUser={currentUser} onOpenProfile={openProfile} />;
      case 'chat': return <GroupChatView messages={messages} setMessages={updateMessages} currentUser={currentUser} role={role} onNavigate={(view) => setActiveTab(view)} onUpdatePoints={handlePointUpdate} staffList={staffList} onOpenProfile={openProfile} />;
      case 'attendance': return <AttendanceView staffList={staffList} attendanceList={attendanceList} setAttendanceList={updateAttendance} currentUser={currentUser} role={role!} />;
      case 'live-location': return <LiveLocationView staffList={staffList} liveLocations={liveLocations} />;
      case 'lucky-draw': return <LuckyDrawView staffList={staffList} currentUser={currentUser} onUpdatePoints={handlePointUpdate} onUpdateDrawTime={handleDrawTimeUpdate} role={role} />;
      case 'notices': return <NoticeBoardView notices={notices} setNotices={updateNotices} role={role!} currentUser={currentUser || ''} staffList={staffList} onOpenProfile={openProfile} />;
      case 'complaints': return <ComplaintBoxView complaints={complaints} setComplaints={updateComplaints} staffList={staffList} role={role!} currentUser={currentUser} onOpenProfile={openProfile} />;
      case 'funds': return <FundLedgerView funds={funds} setFunds={updateFunds} expenses={expenses} advances={advances} totalFund={totalFund} cashOnHand={cashOnHand} role={role!} />;
      case 'staff': return <StaffManagementView staffList={staffList} setStaffList={updateStaffList} role={role!} expenses={expenses} advances={advances} setAdvances={updateAdvances} currentUser={currentUser} onUpdatePoints={handlePointUpdate} highlightStaffId={highlightStaffId} setHighlightStaffId={setHighlightStaffId} />;
      case 'movements': return <MovementLogView movements={movements} setMovements={updateMovements} staffList={staffList} billingRules={billingRules} role={role!} setMessages={updateMessages} currentUser={currentUser} onUpdatePoints={handlePointUpdate} />;
      case 'expenses': return <ExpenseManagementView expenses={expenses} setExpenses={updateExpenses} staffList={staffList} role={role!} currentUser={currentUser} advances={advances} onOpenProfile={openProfile} />;
      case 'reports': return <ReportsView expenses={expenses} staffList={staffList} advances={advances} attendanceList={attendanceList} funds={funds} movements={movements} role={role!} />;
      case 'settings': return <SettingsView billingRules={billingRules} setBillingRules={updateBillingRules} role={role!} exportData={handleExport} importData={handleImport} cloudConfig={firebaseConfig} saveCloudConfig={(config) => { safeSetItem('fb_config', JSON.stringify(config)); alert('Settings saved! Reloading...'); window.location.reload(); }} />;
      case 'trash': return <TrashView staffList={staffList} setStaffList={updateStaffList} movements={movements} setMovements={updateMovements} expenses={expenses} setExpenses={updateExpenses} funds={funds} setFunds={updateFunds} notices={notices} setNotices={updateNotices} role={role!} />;
      case 'products': return <ProductCatalogView onLogout={() => {}} products={products} setProducts={updateProducts} role={role!} />; // New Case
      default: return <DashboardView totalExpense={totalExpense} pendingApprovals={pendingApprovals} expenses={expenses} cloudError={cloudError} totalFund={totalFund} cashOnHand={cashOnHand} role={role!} staffList={staffList} advances={advances} currentUser={currentUser} onOpenProfile={openProfile} />;
    }
  };

  const isStaffUser = role === UserRole.STAFF; // Helper for conditional rendering

  // --- GUEST VIEW RENDER ---
  if (role === UserRole.GUEST) {
    return <ProductCatalogView onLogout={handleLogout} products={products} setProducts={updateProducts} role={role} />;
  }

  // --- LOGIN SCREEN ---
  if (!role) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* ... (Login Screen Content remains same as before) ... */}
        
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-black to-blue-900 opacity-80 z-0"></div>
        {/* Disable heavy animation on mobile for smoothness */}
        <div className="absolute inset-0 z-0 hidden md:block"><GlowingCursor /></div>
        
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/10 relative z-10 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-500">
          
          <div className="text-center mb-8 relative">
            {/* Decorative Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full"></div>
            
            <div className="relative z-10">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <span className="h-[1px] w-6 bg-indigo-500/50"></span>
                    <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-[0.3em]">Est. 2015</p>
                    <span className="h-[1px] w-6 bg-indigo-500/50"></span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white leading-tight drop-shadow-lg mb-1">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">DEPEND</span> <span className="text-gray-200">SOURCING</span>
                </h2>
                <p className="text-[10px] text-gray-400 font-medium tracking-[0.3em] uppercase flex items-center justify-center gap-2 mb-4">
                    <Sparkles className="w-3 h-3 text-yellow-500" /> Promise Beyond Business
                </p>
                <div className="inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-indigo-200 backdrop-blur-sm">
                    অ্যাকাউন্ট লগইন
                </div>
            </div>
          </div>

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
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">পাসওয়ার্ড</label>
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
              className={`w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black shadow-lg shadow-indigo-500/40 hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm relative overflow-hidden group border border-indigo-400/20 hover:border-indigo-400/50 ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
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

          {/* GUEST MODE BUTTON */}
          <div className="mt-4 border-t border-white/10 pt-4">
             <button 
               onClick={handleGuestLogin}
               className="w-full bg-white/5 border border-white/10 text-indigo-300 hover:text-white hover:bg-white/10 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider group"
             >
                <ShoppingBag className="w-4 h-4 group-hover:text-yellow-400 transition-colors" />
                View Product Catalog (Guest Mode)
             </button>
          </div>

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

  return (
    <div className={`flex h-screen overflow-hidden font-['Hind_Siliguri'] relative ${isDarkMode ? 'dark' : ''} ${isDarkMode ? 'text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* ... (Sidebar & Mobile Menu remain unchanged) ... */}
      {/* --- NEW GLASSMORPHISM SIDEBAR --- */}
      <aside className={`hidden md:flex flex-col w-72 h-full relative overflow-hidden bg-[#0f172a] text-white border-r border-white/5`}>
        {/* Background Blobs for Glass Effect */}
        <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-[-50px] right-[-50px] w-48 h-48 bg-purple-600/10 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="p-6 text-center shrink-0 relative z-10 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
                <h2 className="text-xl font-black tracking-tight leading-none text-white">বিলিং<span className="text-cyan-400">সেন্টার</span></h2>
                <p className="text-[9px] text-indigo-300 font-bold tracking-[0.2em] uppercase mt-1">Control Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar relative z-10">
          {allowedNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-all duration-300 group overflow-hidden ${
                  isActive
                    ? 'bg-white/10 text-white shadow-lg font-bold ring-1 ring-white/10 backdrop-blur-sm'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white font-medium'
                }`}
              >
                {/* Active Glow Effect */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-transparent opacity-100" />
                )}

                {/* Left Active Indicator Line */}
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full transition-all duration-300 ${isActive ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]' : 'bg-transparent w-0'}`} />

                {/* Icon with scaling effect */}
                <item.icon
                  className={`w-5 h-5 relative z-10 transition-all duration-300 ${
                    isActive ? 'text-cyan-300 scale-110 drop-shadow-md' : 'group-hover:text-white group-hover:scale-110'
                  }`}
                />

                {/* Label */}
                <span className="relative z-10 flex-1 text-left tracking-wide">{item.label}</span>

                {/* Right Arrow for Active Item */}
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-cyan-400/70 relative z-10 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 shrink-0 relative z-10">
           {deferredPrompt && (
              <div className="px-4 mb-2 relative z-10">
                 <button onClick={handleInstallClick} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 ring-1 ring-emerald-500/20 transition-all group">
                  <Download className="w-5 h-5 transition-transform group-hover:scale-110" /> 
                  <span>অ্যাপ ইন্সটল করুন</span>
                </button>
              </div>
           )}
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-red-400 hover:text-white hover:bg-red-500/10 hover:ring-1 hover:ring-red-500/20 transition-all group">
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" /> 
            <span>লগআউট</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 pb-[70px] md:pb-0">
        <header className={`h-16 flex items-center justify-between px-6 shrink-0 relative z-20 ${isDarkMode ? 'bg-gray-900/80 backdrop-blur-md border-b border-white/10' : 'bg-white border-b border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer ${isCloudEnabled ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`} title={cloudError || "System Normal"} onClick={() => !isCloudEnabled && setShowDbHelp(true)}>
              {isCloudEnabled ? <Cloud className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isCloudEnabled ? (isSyncing ? 'Syncing...' : 'Online') : 'Offline'}</span>
            </div>
            {/* ... other header items ... */}
          </div>
          
          <div className="flex items-center gap-4">
             <button 
               onClick={toggleTheme}
               className={`p-2 rounded-full transition-all active:scale-95 ${isDarkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
               title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
             >
               {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             <div className="relative">
                <button 
                  onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
                  className={`p-2 rounded-full transition-colors relative ${isNotifDropdownOpen ? 'bg-indigo-50 text-indigo-600' : isDarkMode ? 'text-gray-300 hover:bg-white/10' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                   {unreadCount > 0 ? <BellRing className="w-5 h-5 animate-pulse" /> : <Bell className="w-5 h-5" />}
                   {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                   )}
                </button>

                {isNotifDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-gray-900 dark:text-gray-100">
                     <div className="p-3 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Notifications ({unreadCount})</h4>
                        <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-600 hover:underline">Mark all read</button>
                     </div>
                     <div className="max-h-64 overflow-y-auto">
                        {appNotifications.length > 0 ? (
                           appNotifications.map((notif) => (
                              <div 
                                key={notif.id} 
                                className={`relative p-3 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group ${notif.isRead ? 'opacity-60' : 'bg-indigo-50/30 dark:bg-indigo-900/20'}`}
                                onClick={() => {
                                   if (notif.link) {
                                      setActiveTab(notif.link);
                                      setIsNotifDropdownOpen(false);
                                   }
                                }}
                              >
                                 <div className="flex justify-between items-start mb-1 pr-4">
                                    <p className={`text-xs font-bold ${notif.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{notif.title}</p>
                                    <span className="text-[9px] text-gray-400 whitespace-nowrap">{new Date(notif.timestamp).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})}</span>
                                 </div>
                                 <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug pr-4">{notif.message}</p>
                                 <button 
                                    onClick={(e) => removeNotification(notif.id, e)} 
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    title="Delete"
                                 >
                                    <X className="w-3 h-3" />
                                 </button>
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

             <div className="text-right hidden md:block">
               <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{currentUser || 'Guest'}</p>
               <p className="text-xs text-gray-500">{role ? ROLE_LABELS[role] : ''}</p>
             </div>
             <div 
               onClick={() => openProfile()}
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

      {/* ... (Mobile Menu & Profile Modal unchanged) ... */}
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
         <button 
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center w-full py-1.5 rounded-lg transition-colors ${isMoreMenuOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
         >
            <Menu className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">মেনু</span>
         </button>
      </div>

      {isMoreMenuOpen && (
         <div className="fixed inset-0 z-[60] md:hidden">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setIsMoreMenuOpen(false)}
            ></div>
            
            <div className="absolute top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-gray-100 dark:border-gray-800">
               
               <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-indigo-600 dark:bg-gray-900 text-white flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <Wallet className="w-24 h-24 text-white" />
                  </div>
                  
                  <div className="flex justify-between items-start relative z-10">
                     <div className="w-12 h-12 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                        {myProfile && myProfile.photo ? (
                           <img src={myProfile.photo} className="w-full h-full object-cover" />
                        ) : (
                           <span className="text-xl font-bold">{currentUser ? currentUser[0].toUpperCase() : 'U'}</span>
                        )}
                     </div>
                     <button onClick={() => setIsMoreMenuOpen(false)} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                        <X className="w-5 h-5" />
                     </button>
                  </div>
                  
                  <div className="relative z-10">
                     <h3 className="font-bold text-lg leading-tight">{currentUser || 'Guest'}</h3>
                     <p className="text-xs text-indigo-200">{role ? ROLE_LABELS[role] : 'No Role'}</p>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                  <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Navigation</p>
                  {mobileSidebarItems.map((item) => (
                     <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMoreMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all mb-1 ${
                           activeTab === item.id 
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                     >
                        <div className={`p-2 rounded-lg transition-colors ${
                           activeTab === item.id 
                              ? 'bg-white text-indigo-600 shadow-sm dark:bg-indigo-950 dark:text-indigo-300' 
                              : `${item.bgColor} dark:bg-gray-800`
                        }`}>
                           <item.icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <span className="flex-1 text-left">{item.label}</span>
                        {activeTab === item.id && <ChevronRight className="w-4 h-4 opacity-50" />}
                     </button>
                  ))}
               </div>

               <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  <button 
                     onClick={() => { openProfile(); setIsMoreMenuOpen(false); }} 
                     className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mb-2"
                  >
                     <UserCog className="w-4 h-4" /> প্রোফাইল সেটিংস
                  </button>
                  {deferredPrompt && (
                    <button 
                       onClick={handleInstallClick} 
                       className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-100 transition-colors mb-2"
                    >
                       <Download className="w-4 h-4" /> অ্যাপ ইন্সটল করুন
                    </button>
                  )}
                  <button 
                     onClick={handleLogout} 
                     className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 transition-colors"
                  >
                     <LogOut className="w-4 h-4" /> লগআউট
                  </button>
               </div>
            </div>
         </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200 text-gray-900">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-white/40 backdrop-blur-md relative dark:bg-gray-800 dark:border-gray-700">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600 to-purple-700 z-0"></div>
            
            <button 
                onClick={() => {
                    if (modalProfileData?.id) {
                        setHighlightStaffId(modalProfileData.id);
                        setActiveTab('staff');
                        setIsProfileModalOpen(false);
                        setEditingProfileId(null);
                    }
                }} 
                className="absolute top-4 left-4 text-white/80 hover:text-white z-10 p-1.5 bg-black/20 rounded-full transition-colors flex items-center justify-center shadow-lg active:scale-95"
                title="Go to Staff Card"
            >
                <User className="w-5 h-5" />
            </button>

            <button onClick={() => { setIsProfileModalOpen(false); setEditingProfileId(null); }} className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-1 bg-black/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>

            <form onSubmit={saveProfile} className="relative z-10 flex flex-col items-center mt-12 px-6 pb-8">
               <div className="relative group cursor-pointer" onClick={() => profileFileRef.current?.click()}>
                 <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white mb-4 relative z-10">
                   {profileForm.photo ? (
                      <img src={profileForm.photo} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 text-4xl font-black">
                        {modalProfileData?.name ? modalProfileData.name[0].toUpperCase() : 'U'}
                      </div>
                   )}
                 </div>
                 <div className="absolute bottom-4 right-0 z-20 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-indigo-700 transition-colors">
                   <Camera className="w-4 h-4" />
                 </div>
                 <input type="file" ref={profileFileRef} hidden accept="image/*" onChange={handleProfilePhotoUpload} />
               </div>

               <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 text-center">{modalProfileData?.name || 'User'}</h2>
               <div className="flex items-center gap-2 mt-1 mb-6">
                 {modalProfileData?.role === UserRole.MD && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-700 uppercase flex items-center gap-1"><Crown className="w-3 h-3"/> Managing Director</span>}
                 {modalProfileData?.role === UserRole.ADMIN && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-700 uppercase flex items-center gap-1"><UserCog className="w-3 h-3"/> Manager</span>}
                 {modalProfileData?.role === UserRole.STAFF && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase flex items-center gap-1"><User className="w-3 h-3"/> Staff Member</span>}
                 {modalProfileData?.role === UserRole.KIOSK && <span className="px-2 py-0.5 rounded text-[10px] font-black bg-orange-100 text-orange-700 uppercase flex items-center gap-1"><MonitorSmartphone className="w-3 h-3"/> Kiosk Mode</span>}
               </div>

               <div className="w-full space-y-3">
                 <div className={`bg-white/80 dark:bg-gray-700/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-600 transition-all ${isStaffUser ? 'opacity-70 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-indigo-500'}`}>
                    <div className="bg-indigo-50 dark:bg-gray-600 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><Briefcase className="w-4 h-4" /></div>
                    <div className="flex-1 relative">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">পদবী (Designation)</p>
                      <input 
                        type="text" 
                        disabled={isStaffUser}
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-300 disabled:cursor-not-allowed"
                        placeholder="Set Designation"
                        value={profileForm.designation}
                        onChange={(e) => setProfileForm({...profileForm, designation: e.target.value})}
                      />
                      {isStaffUser && <Lock className="w-3 h-3 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2" />}
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
                 
                 <div className={`bg-white/80 dark:bg-gray-700/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-600 transition-all ${isStaffUser ? 'opacity-70 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-indigo-500'}`}>
                    <div className="bg-indigo-50 dark:bg-gray-600 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><CreditCard className="w-4 h-4" /></div>
                    <div className="flex-1 relative">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">অফিস আইডি</p>
                      <input 
                        type="text" 
                        disabled={isStaffUser}
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-300 disabled:cursor-not-allowed"
                        placeholder="Set ID (e.g. ST-01)"
                        value={profileForm.staffId}
                        onChange={(e) => setProfileForm({...profileForm, staffId: e.target.value})}
                      />
                      {isStaffUser && <Lock className="w-3 h-3 text-gray-400 absolute right-0 top-1/2 -translate-y-1/2" />}
                    </div>
                 </div>

                 <div className="bg-white/80 dark:bg-gray-700/80 p-3 rounded-xl flex items-center gap-3 border border-gray-100 dark:border-gray-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all relative">
                    <div className="bg-indigo-50 dark:bg-gray-600 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><KeyRound className="w-4 h-4" /></div>
                    <div className="flex-1 pr-8">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">পাসওয়ার্ড</p>
                      <input 
                        type={showProfilePassword ? "text" : "password"} 
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-800 dark:text-gray-200 outline-none placeholder:text-gray-300"
                        placeholder="Set Password (Optional)"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm({...profileForm, password: e.target.value})}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowProfilePassword(!showProfilePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {showProfilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                 </div>
               </div>

               <button type="submit" className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95">
                 <Save className="w-4 h-4" />
                 প্রোফাইল সেভ করুন
               </button>

               <div className="mt-4 text-center">
                 <p className="text-[10px] text-gray-400">Joined: {modalProfileData?.createdAt ? new Date(modalProfileData.createdAt).toLocaleDateString() : 'Just Now'}</p>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;