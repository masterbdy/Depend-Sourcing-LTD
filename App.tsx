import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  LayoutGrid, UsersRound, Footprints, Banknote, PieChart, Settings2, Recycle, 
  LogOut, Wallet, User, Cloud, WifiOff, Menu, X, Lock, ArrowRightLeft, XCircle, Landmark, Bell, Phone, Briefcase, Crown, UserCog, Camera, Save, KeyRound, CreditCard, MonitorSmartphone, Trophy, Gift, Sun, Moon, Loader2, BellRing, ChevronRight, Fingerprint, Megaphone, Radar, ShieldAlert, MessageCircleMore, Download, Sparkles, Eye, EyeOff, ShoppingBag, Package, Share2, MapPinOff, RefreshCw, WalletCards
} from 'lucide-react';
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update, runTransaction, Unsubscribe } from "firebase/database";
import { UserRole, Staff, MovementLog, Expense, BillingRule, FundEntry, Notice, AdvanceLog, Complaint, ChatMessage, Attendance, StaffLocation, AppNotification, Product, PhoneBookEntry } from './types';
import { INITIAL_STAFF, INITIAL_BILLING_RULES, ROLE_LABELS, DEFAULT_FIREBASE_CONFIG, INITIAL_PRODUCTS } from './constants';

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
import ProductCatalogView from './views/ProductCatalogView';
import PhoneBook from './views/PhoneBook';
import { getUserFCMToken } from './notifications';

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

const cleanArray = <T,>(data: any): T[] => {
  if (!data) return [];
  const array = typeof data === 'object' ? Object.values(data) : data;
  return Array.isArray(array) ? array.filter(Boolean) as T[] : [];
};

// Optimized Data Loader for Instant State Initialization
const getLocalData = <T,>(key: string, fallback: any): T => {
  try {
    const saved = safeGetItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    // If fallback is an array, ensure we return a clean array
    if (Array.isArray(fallback)) {
       return cleanArray(parsed) as T;
    }
    return parsed;
  } catch {
    return fallback;
  }
};

// --- DEVICE DETECTION HELPER ---
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let device = "Unknown Device";
  let icon = "💻"; // Default PC

  if (/Android/i.test(ua)) {
     device = "Android Mobile";
     icon = "📱";
  }
  else if (/iPhone|iPad|iPod/i.test(ua)) {
     device = "iPhone/iPad (iOS)";
     icon = "📱";
  }
  else if (/Windows/i.test(ua)) {
     device = "Windows PC";
     icon = "💻";
  }
  else if (/Mac/i.test(ua)) {
     device = "Mac Computer";
     icon = "💻";
  }
  else if (/Linux/i.test(ua)) {
     device = "Linux System";
     icon = "🖥️";
  }

  // Check for common browsers to append
  if (/Chrome/i.test(ua)) device += " (Chrome)";
  else if (/Firefox/i.test(ua)) device += " (Firefox)";
  else if (/Safari/i.test(ua)) device += " (Safari)";

  return device;
};

const DEFAULT_CERT_LOGOS = {
  oeko: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/OEKO-TEX_STANDARD_100_logo.svg/320px-OEKO-TEX_STANDARD_100_logo.svg.png",
  gscs: "https://cdn.worldvectorlogo.com/logos/global-recycled-standard-1.svg"
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false); 
  const [highlightStaffId, setHighlightStaffId] = useState<string | null>(null);
  const [isLocationBlocked, setIsLocationBlocked] = useState(false); 
  
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

  // Initialize with browser connection status for instant feedback
  const [isCloudEnabled, setIsCloudEnabled] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // App Settings
  const [allowedBackdateDays, setAllowedBackdateDays] = useState(() => {
    return Number(safeGetItem('allowed_backdate_days', '1'));
  });

  const [certLogos, setCertLogos] = useState(() => {
    try {
        const saved = safeGetItem('cert_logos');
        return saved ? JSON.parse(saved) : DEFAULT_CERT_LOGOS;
    } catch {
        return DEFAULT_CERT_LOGOS;
    }
  });

  const [companyLogo, setCompanyLogo] = useState(() => {
    return safeGetItem('company_logo') || '';
  });

  // NEW: Festival Image State
  const [festivalImage, setFestivalImage] = useState(() => {
    return safeGetItem('festival_image') || '';
  });

  const updateBackdateDays = (days: number) => {
    setAllowedBackdateDays(days);
    safeSetItem('allowed_backdate_days', String(days));
    
    if (firebaseConfig && firebaseConfig.databaseURL) {
       try {
          const app = getApp();
          const db = getDatabase(app, firebaseConfig.databaseURL);
          set(ref(db, 'app_settings/allowedBackdateDays'), days);
       } catch (e) {
          console.error("Failed to sync settings", e);
       }
    }
  };

  const updateCertLogos = (key: 'oeko' | 'gscs', base64: string) => {
      const newLogos = { ...certLogos, [key]: base64 };
      setCertLogos(newLogos);
      safeSetItem('cert_logos', JSON.stringify(newLogos));
      
      if (firebaseConfig && firebaseConfig.databaseURL) {
          try {
             const app = getApp();
             const db = getDatabase(app, firebaseConfig.databaseURL);
             set(ref(db, `app_settings/cert_logos/${key}`), base64);
          } catch (e) {
             console.error("Failed to sync cert logo", e);
          }
      }
  };

  const updateCompanyLogo = (base64: string) => {
      setCompanyLogo(base64);
      safeSetItem('company_logo', base64);
      
      if (firebaseConfig && firebaseConfig.databaseURL) {
          try {
             const app = getApp();
             const db = getDatabase(app, firebaseConfig.databaseURL);
             set(ref(db, `app_settings/company_logo`), base64);
          } catch (e) {
             console.error("Failed to sync company logo", e);
          }
      }
  };

  const updateFestivalImage = (base64: string) => {
      setFestivalImage(base64);
      safeSetItem('festival_image', base64);
      
      if (firebaseConfig && firebaseConfig.databaseURL) {
          try {
             const app = getApp();
             const db = getDatabase(app, firebaseConfig.databaseURL);
             set(ref(db, `app_settings/festival_image`), base64);
          } catch (e) {
             console.error("Failed to sync festival image", e);
          }
      }
  };
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const processOfflineQueue = async () => {
      if (navigator.onLine && firebaseConfig && firebaseConfig.databaseURL) {
        const queueStr = safeGetItem('offline_sync_queue');
        const simpleQueueStr = safeGetItem('offline_sync_queue_simple');
        let processedAny = false;

        try {
          const app = getApp();
          const db = getDatabase(app, firebaseConfig.databaseURL);

          if (queueStr) {
            const queue = JSON.parse(queueStr);
            for (const node of Object.keys(queue)) {
              const dataToSave = queue[node];
              if (Object.keys(dataToSave).length > 0) {
                await update(ref(db, node), dataToSave);
                processedAny = true;
              }
            }
            if (processedAny) safeSetItem('offline_sync_queue', '{}');
          }

          if (simpleQueueStr) {
            const simpleQueue = JSON.parse(simpleQueueStr);
            for (const node of Object.keys(simpleQueue)) {
              await set(ref(db, node), simpleQueue[node]);
              processedAny = true;
            }
            if (processedAny) safeSetItem('offline_sync_queue_simple', '{}');
          }

          if (processedAny) {
            handleAddNotification(
              'সিঙ্ক সম্পন্ন', 
              'আপনার অফলাইনে সেভ করা ডাটা সফলভাবে সার্ভারে পাঠানো হয়েছে!', 
              'SUCCESS'
            );
          }
        } catch (err) {
          console.error('Failed to process offline queue', err);
        }
      }
    };

    const handleOfflineWarning = () => {
      handleAddNotification(
        'ইন্টারনেট সংযোগ নেই!', 
        'আপনার ডাটা অফলাইনে সেভ হয়েছে। পরবর্তীতে নেটওয়ার্ক পেলে এটি স্বয়ংক্রিয়ভাবে এডমিনের কাছে পাঠানো হবে।', 
        'WARNING'
      );
    };

    window.addEventListener('online', processOfflineQueue);
    window.addEventListener('offline-sync-warning', handleOfflineWarning);
    
    if (navigator.onLine) {
      setTimeout(processOfflineQueue, 2000);
    }

    return () => {
      window.removeEventListener('online', processOfflineQueue);
      window.removeEventListener('offline-sync-warning', handleOfflineWarning);
    };
  }, [firebaseConfig]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Instant Online/Offline check listener
    const handleOnlineStatus = () => setIsCloudEnabled(true);
    const handleOfflineStatus = () => setIsCloudEnabled(false);
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  useEffect(() => {
    const savedSession = safeGetItem('active_session');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        if (sessionData && sessionData.role && sessionData.username) {
          setRole(sessionData.role);
          setCurrentUser(sessionData.username);
          const lastTab = safeGetItem('last_active_tab');
          if (lastTab) setActiveTab(lastTab);
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!role || (role !== UserRole.STAFF && role !== UserRole.KIOSK)) {
       setIsLocationBlocked(false);
       return;
    }

    const checkLocationStatus = () => {
       if (!navigator.geolocation) {
          setIsLocationBlocked(true);
          return;
       }

       navigator.geolocation.getCurrentPosition(
          (position) => {
             setIsLocationBlocked(false);
          },
          (error) => {
             console.error("Location Monitor: Access Lost", error);
             if (error.code === 3) {
                 return; 
             }
             setIsLocationBlocked(true);
          },
          {
             enableHighAccuracy: false,
             timeout: 20000, 
             maximumAge: 1000 * 60 * 10 
          }
       );
    };

    checkLocationStatus();
    const intervalId = setInterval(checkLocationStatus, 30000);

    const handleVisibilityChange = () => {
       if (document.visibilityState === 'visible') {
          checkLocationStatus();
       }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkLocationStatus);

    return () => {
       clearInterval(intervalId);
       document.removeEventListener("visibilitychange", handleVisibilityChange);
       window.removeEventListener("focus", checkLocationStatus);
    };
  }, [role]);

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

  const handleShareApp = async () => {
    const shareData = {
      title: 'Depend Sourcing App',
      text: 'Staff Management & Billing Control Center',
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        handleAddNotification('লিংক কপি হয়েছে', 'অ্যাপ লিংক ক্লিপবোর্ডে কপি করা হয়েছে।', 'SUCCESS');
      } catch (err) {
        console.error('Copy failed', err);
      }
    }
  };
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return safeGetItem('app_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [appNotifications, setAppNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = safeGetItem('app_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [toasts, setToasts] = useState<AppNotification[]>([]); 
  
  const handleAddNotification = useCallback((title: string, message: string, type: AppNotification['type'] = 'INFO', link?: string) => {
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
  }, []);

  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  
  useEffect(() => {
    safeSetItem('app_notifications', JSON.stringify(appNotifications));
  }, [appNotifications]);
  
  const [permissionsGranted, setPermissionsGranted] = useState(() => {
     return safeGetItem('app_permissions_granted') === 'true';
  });

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
  
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [showDbHelp, setShowDbHelp] = useState(false);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false); 
  const [rememberMe, setRememberMe] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<any[]>(() => getLocalData('saved_accounts', []));

  // LAZY INITIALIZATION FOR INSTANT DATA LOAD
  const [staffList, setStaffList] = useState<Staff[]>(() => getLocalData('staffList', INITIAL_STAFF));
  const [movements, setMovements] = useState<MovementLog[]>(() => getLocalData('movements', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => getLocalData('expenses', []));
  const [billingRules, setBillingRules] = useState<BillingRule[]>(() => getLocalData('billingRules', INITIAL_BILLING_RULES));
  const [funds, setFunds] = useState<FundEntry[]>(() => getLocalData('funds', []));
  const [notices, setNotices] = useState<Notice[]>(() => getLocalData('notices', []));
  const [advances, setAdvances] = useState<AdvanceLog[]>(() => getLocalData('advances', []));
  const [complaints, setComplaints] = useState<Complaint[]>(() => getLocalData('complaints', []));
  const [messages, setMessages] = useState<ChatMessage[]>(() => getLocalData('messages', []));
  const [attendanceList, setAttendanceList] = useState<Attendance[]>(() => getLocalData('attendanceList', []));
  const [liveLocations, setLiveLocations] = useState<Record<string, StaffLocation>>({}); // Live data, no need to persist locally usually
  const [products, setProducts] = useState<Product[]>(() => getLocalData('products', INITIAL_PRODUCTS));
  const [productEditors, setProductEditors] = useState<string[]>(() => getLocalData('productEditors', []));
  const [phoneBook, setPhoneBook] = useState<PhoneBookEntry[]>(() => getLocalData('phoneBook', []));
  
  const [searchCount, setSearchCount] = useState<number>(() => Number(safeGetItem('searchCount', '0')));
  const [visitCount, setVisitCount] = useState<number>(() => Number(safeGetItem('visitCount', '0')));

  // SEEN STATE TRACKING
  const [seenItems, setSeenItems] = useState<{expenses: string[], complaints: string[], locations: string[]}>(() => {
    try {
        return {
            expenses: JSON.parse(safeGetItem('seen_expenses', '[]') || '[]'),
            complaints: JSON.parse(safeGetItem('seen_complaints', '[]') || '[]'),
            locations: JSON.parse(safeGetItem('seen_locations', '[]') || '[]')
        };
    } catch {
        return { expenses: [], complaints: [], locations: [] };
    }
  });

  const handleTrackSearch = () => {
    setSearchCount(prev => prev + 1);
    
    if (firebaseConfig && firebaseConfig.databaseURL && isCloudEnabled) {
      try {
        const app = getApp();
        const db = getDatabase(app, firebaseConfig.databaseURL);
        const countRef = ref(db, 'analytics/search_count');
        runTransaction(countRef, (currentCount) => {
          return (currentCount || 0) + 1;
        });
      } catch (err) {
        console.error("Failed to track search:", err);
      }
    }
  };

  // --- EFFECT 1: Public/Auth Data Loading (Runs Once) ---
  useEffect(() => {
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
        setCloudError(null);

        // Real-time Connection Status from Firebase (This confirms server connection)
        const connectedRef = ref(dbInstance, ".info/connected");
        onValue(connectedRef, (snap) => {
          if (snap.val() === true) {
            setIsCloudEnabled(true);
          } else {
            // If Firebase says disconnected, we verify with browser state to determine if it's user internet or firebase issue
            setIsCloudEnabled(navigator.onLine);
          }
        });

        // --- PUBLIC DATA ---
        
        // Products
        onValue(ref(dbInstance, 'products'), (snapshot) => {
           if (snapshot.exists()) {
              const data = cleanArray(snapshot.val());
              setProducts(data as Product[]);
              safeSetItem('products', JSON.stringify(data));
           }
        }, (err) => console.error(err));

        // Staff List (Needed for Login)
        onValue(ref(dbInstance, 'staffList'), (snapshot) => {
           if (snapshot.exists()) {
              const data = cleanArray(snapshot.val());
              setStaffList(data as Staff[]);
              safeSetItem('staffList', JSON.stringify(data));
           }
        }, (err) => console.error(err));

        // Editors & Settings
        onValue(ref(dbInstance, 'productEditors'), (snapshot) => {
           if (snapshot.exists()) setProductEditors(cleanArray(snapshot.val()));
        });

        // App Settings & Logos
        onValue(ref(dbInstance, 'app_settings'), (snapshot) => {
           if (snapshot.exists()) {
              const val = snapshot.val();
              if(val.allowedBackdateDays) setAllowedBackdateDays(Number(val.allowedBackdateDays));
              if(val.cert_logos) setCertLogos(val.cert_logos);
              if(val.company_logo) setCompanyLogo(val.company_logo);
              if(val.festival_image) setFestivalImage(val.festival_image);
           }
        });

        // Search Analytics
        onValue(ref(dbInstance, 'analytics/search_count'), (snapshot) => {
           const count = snapshot.val() || 0;
           setSearchCount(count);
        });

        // Visit Analytics
        onValue(ref(dbInstance, 'analytics/visit_count'), (snapshot) => {
           const count = snapshot.val() || 0;
           setVisitCount(count);
        });
      }
    } catch (error: any) {
      console.error("Cloud Connection Error:", error);
      setCloudError(error.message);
      setIsCloudEnabled(false);
    }
  }, [firebaseConfig]);

  // --- EFFECT 2: Protected Data Loading (Runs Only When Logged In) ---
  useEffect(() => {
    if (!firebaseConfig || !firebaseConfig.apiKey) return;
    if (!role || role === UserRole.GUEST) return; // SKIP HEAVY LOADING FOR GUESTS

    let app: FirebaseApp;
    try {
      const apps = getApps();
      app = apps.length === 0 ? initializeApp(firebaseConfig) : getApp();
      const dbUrl = firebaseConfig.databaseURL || `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
      const dbInstance = getDatabase(app, dbUrl);

      if (dbInstance) {
         const unsubscribers: Unsubscribe[] = [];

         const subscribe = (node: string, setter: any) => {
            const unsub = onValue(ref(dbInstance, node), (snapshot) => {
                if (snapshot.exists()) {
                   const data = snapshot.val();
                   const arrayData = node === 'staff_locations' ? data : cleanArray(data);
                   setter(arrayData);
                   if (node !== 'staff_locations') {
                      safeSetItem(node, JSON.stringify(arrayData));
                   }
                }
            }, (err) => console.error(`Sync error for ${node}:`, err));
            unsubscribers.push(unsub);
         };

         // Load Heavy Data
         subscribe('expenses', setExpenses);
         subscribe('movements', setMovements);
         subscribe('billingRules', setBillingRules);
         subscribe('funds', setFunds);
         subscribe('notices', setNotices);
         subscribe('advances', setAdvances);
         subscribe('complaints', setComplaints);
         subscribe('messages', setMessages);
         subscribe('attendanceList', setAttendanceList);
         if (role === UserRole.ADMIN) {
             subscribe('staff_locations', setLiveLocations);
         }
         subscribe('phoneBook', setPhoneBook);

         return () => {
            // Cleanup listeners when role changes (e.g. logout)
            unsubscribers.forEach(unsub => unsub());
         };
      }
    } catch (e) {
       console.error("Protected Data Sync Error", e);
    }
  }, [firebaseConfig, role]);

  useEffect(() => {
    let updated = false;
    const newState = { ...seenItems };

    if (activeTab === 'expenses') {
        const relevant = role === UserRole.ADMIN 
            ? expenses.filter(e => !e.isDeleted && e.status === 'PENDING')
            : role === UserRole.MD
                ? expenses.filter(e => !e.isDeleted && e.status === 'VERIFIED')
                : [];
        const ids = relevant.map(e => e.id);
        const newIds = ids.filter(id => !newState.expenses.includes(id));
        if (newIds.length > 0) {
            newState.expenses = [...newState.expenses, ...newIds];
            safeSetItem('seen_expenses', JSON.stringify(newState.expenses));
            updated = true;
        }
    }

    if (activeTab === 'complaints') {
        const relevant = (role === UserRole.ADMIN || role === UserRole.MD)
            ? complaints.filter(c => !c.isDeleted && c.status === 'PENDING')
            : [];
        const ids = relevant.map(c => c.id);
        const newIds = ids.filter(id => !newState.complaints.includes(id));
        if (newIds.length > 0) {
            newState.complaints = [...newState.complaints, ...newIds];
            safeSetItem('seen_complaints', JSON.stringify(newState.complaints));
            updated = true;
        }
    }

    if (activeTab === 'live-location' && role === UserRole.ADMIN) {
        const now = Date.now();
        const active = Object.values(liveLocations).filter((l: any) => 
            (now - new Date(l.timestamp).getTime()) < 5 * 60 * 1000
        );
        const ids = active.map((l: any) => l.staffId);
        const newIds = ids.filter(id => !newState.locations.includes(id));
        if (newIds.length > 0) {
            newState.locations = [...newState.locations, ...newIds];
            safeSetItem('seen_locations', JSON.stringify(newState.locations));
            updated = true;
        }
    }

    if (updated) {
        setSeenItems(newState);
    }
  }, [activeTab, expenses, complaints, liveLocations, role]);

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

  const syncData = async (node: string, data: any, prevData?: any) => {
    const cleaned = cleanArray(data);
    const jsonString = JSON.stringify(cleaned);
    safeSetItem(node, jsonString);

    if (firebaseConfig && firebaseConfig.databaseURL) {
      try {
        const app = getApp();
        const db = getDatabase(app, firebaseConfig.databaseURL);
        
        if (node === 'productEditors' || node === 'app_settings') {
          const safeData = JSON.parse(jsonString); 
          if (!navigator.onLine) {
             const queue = JSON.parse(safeGetItem('offline_sync_queue_simple') || '{}');
             queue[node] = safeData;
             safeSetItem('offline_sync_queue_simple', JSON.stringify(queue));
             window.dispatchEvent(new CustomEvent('offline-sync-warning'));
             return;
          }
          await set(ref(db, node), safeData);
        } else {
          const safeData = JSON.parse(jsonString); 
          const safePrevData = prevData ? JSON.parse(JSON.stringify(cleanArray(prevData))) : [];
          
          const dataToSave: any = {};
          
          // Create a map for O(1) lookups
          const prevDataMap = new Map(safePrevData.map((p: any) => [p.id, p]));
          const newDataMap = new Map(safeData.map((c: any) => [c.id, c]));
          
          // Find items that were added or modified
          safeData.forEach((curr: any) => {
             const prevItem = prevDataMap.get(curr.id);
             if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(curr)) {
                const id = curr.id || Math.random().toString(36).substr(2, 9);
                curr.id = id;
                if (curr.isHardDeleted) {
                   dataToSave[id] = null;
                } else {
                   dataToSave[id] = curr;
                }
             }
          });
          
          // Find items that were hard deleted (in prev but not in next)
          if (prevData) {
              safePrevData.forEach((prevItem: any) => {
                 if (!newDataMap.has(prevItem.id) && prevItem.id) {
                    dataToSave[prevItem.id] = null;
                 }
              });
          } else {
              // Fallback if no prevData provided (legacy behavior, send all)
              safeData.forEach((curr: any) => {
                if (curr.isHardDeleted) {
                  if (curr.id) dataToSave[curr.id] = null;
                } else {
                  const id = curr.id || Math.random().toString(36).substr(2, 9);
                  curr.id = id;
                  dataToSave[id] = curr;
                }
              });
          }
            
          if (Object.keys(dataToSave).length > 0) {
            if (!navigator.onLine) {
               const queue = JSON.parse(safeGetItem('offline_sync_queue') || '{}');
               if (!queue[node]) queue[node] = {};
               Object.assign(queue[node], dataToSave);
               safeSetItem('offline_sync_queue', JSON.stringify(queue));
               window.dispatchEvent(new CustomEvent('offline-sync-warning'));
               return;
            }
            await update(ref(db, node), dataToSave);
          }
        }
        // setIsCloudEnabled(true); // Handled by .info/connected
        setCloudError(null);
      } catch (err: any) { 
        console.error(`Sync failed for ${node}:`, err);
        setCloudError("Sync Failed");
      }
    }
  };

  const createUpdater = (key: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => (val: any) => {
    setter(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      syncData(key, next, prev);
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
  const updateProductEditors = createUpdater('productEditors', setProductEditors);
  const updatePhoneBook = createUpdater('phoneBook', setPhoneBook);

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
       syncData('staffList', newList, prevList);
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
       syncData('staffList', newList, prevList);
       return newList;
    });
  };

  const openProfile = (targetStaffId?: string) => {
    let targetStaff: Staff | undefined;

    if (targetStaffId) {
      targetStaff = staffList.find(s => s.id === targetStaffId);
    } else {
      targetStaff = staffList.find(s => s.name === currentUser);
    }

    if (!targetStaff) {
       alert("প্রোফাইল ডাটা পাওয়া যাচ্ছে না।");
       return;
    }

    if (role === UserRole.STAFF) {
       const myself = staffList.find(s => s.name === currentUser);
       if (myself && myself.id !== targetStaff.id) {
          alert("দুঃখিত! স্টাফরা অন্য কারো প্রোফাইল দেখতে পারবে না।");
          return;
       }
    }

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
             syncData('staffList', newList, prevList);
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
    if (role === UserRole.ADMIN || role === UserRole.MD || role === UserRole.GUEST) return;
    if (!myStaffId) return;

    let watchId: number;
    let lastLocationUpdate = 0;

    const startTracking = () => {
      if (role === UserRole.STAFF || role === UserRole.KIOSK) {
        requestWakeLock();
      }

      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const now = Date.now();
            if (now - lastLocationUpdate < 15000) return; // Throttle to 15 seconds
            lastLocationUpdate = now;

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
                batteryLevel: (await navigator.getBattery?.())?.level || undefined,
                deviceName: getDeviceInfo() 
              };
              await set(ref(db, `staff_locations/${myStaffId}`), locationData);
            } catch (err) {
              console.error("Location update failed", err);
            }
          },
          (err) => console.error("GPS Error", err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 } 
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
    if (!currentUser || !role || role === UserRole.MD || role === UserRole.GUEST) return;

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

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    if (role === UserRole.ADMIN) {
       counts['expenses'] = expenses.filter(e => !e.isDeleted && e.status === 'PENDING' && !seenItems.expenses.includes(e.id)).length;
    } else if (role === UserRole.MD) {
       counts['expenses'] = expenses.filter(e => !e.isDeleted && e.status === 'VERIFIED' && !seenItems.expenses.includes(e.id)).length;
    }

    if (role === UserRole.ADMIN || role === UserRole.MD) {
       counts['complaints'] = complaints.filter(c => !c.isDeleted && c.status === 'PENDING' && !seenItems.complaints.includes(c.id)).length;
    }

    if (role === UserRole.ADMIN) {
       const now = Date.now();
       counts['live-location'] = Object.values(liveLocations).filter((l: any) => 
          (now - new Date(l.timestamp).getTime()) < 5 * 60 * 1000 && 
          !seenItems.locations.includes(l.staffId)
       ).length;
    }
    
    if (currentUser) {
        counts['notices'] = notices.filter(n => 
          !n.isDeleted && 
          !(n.reactions || []).some(r => r.userId === currentUser)
        ).length;
    }

    return counts;
  }, [expenses, complaints, liveLocations, notices, role, currentUser, seenItems]);

  const prevMessagesLength = useRef(0);
  useEffect(() => {
    if (role === UserRole.GUEST) return;

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

  const [latestAdvanceNotif, setLatestAdvanceNotif] = useState<AdvanceLog | null>(null);

  useEffect(() => {
    if (role === UserRole.STAFF && currentUser && advances.length > 0) {
      const myProfile = staffList.find(s => s.name === currentUser);
      if (myProfile) {
        const myAdvances = advances.filter(a => a.staffId === myProfile.id && !a.isDeleted);
        if (myAdvances.length > 0) {
          myAdvances.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
          const latest = myAdvances[0];
          
          const lastSeenAdvanceId = safeGetItem(`last_seen_advance_${myProfile.id}`);
          if (lastSeenAdvanceId !== latest.id) {
            setLatestAdvanceNotif(latest);
            safeSetItem(`last_seen_advance_${myProfile.id}`, latest.id);
            
            const timer = setTimeout(() => {
              setLatestAdvanceNotif(null);
            }, 5000);
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [currentUser, role, advances, staffList]);

  const prevExpensesRef = useRef<Expense[]>([]);
  useEffect(() => {
    if (role === UserRole.GUEST) return;

    const prev = prevExpensesRef.current;
    if (prev.length === 0 && expenses.length > 0) {
        prevExpensesRef.current = expenses;
        return;
    }

    const prevMap = new Map(prev.map(p => [p.id, p]));

    const newExpenses = expenses.filter(e => !prevMap.has(e.id));
    newExpenses.forEach(e => {
        if (role === UserRole.ADMIN || role === UserRole.MD) {
            handleAddNotification('নতুন বিল সাবমিট', `${e.staffName} ৳${e.amount} টাকার বিল সাবমিট করেছেন।`, 'INFO', 'expenses');
        }
    });

    const updatedExpenses = expenses.filter(e => {
        const old = prevMap.get(e.id);
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
      if (staffMember.status === 'DEACTIVATED') {
        setLoginError('আপনার একাউন্টটি স্থগিত করা হয়েছে। কর্তৃপক্ষের সাথে যোগাযোগ করুন।');
        setIsLoggingIn(false);
        return;
      }
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
          
          const sessionData = { role: authenticatedUser!.role, username: authenticatedUser!.name };
          safeSetItem('active_session', JSON.stringify(sessionData));
          
          if (authenticatedUser!.role === UserRole.STAFF) {
             const deviceInfo = getDeviceInfo();
             const myUser = staffList.find(s => s.name === authenticatedUser!.name);
             if (myUser) {
                setStaffList(prev => prev.map(s => s.id === myUser.id ? { ...s, lastDevice: deviceInfo, updatedAt: new Date().toISOString() } : s));
             }
          }

          // Request FCM Token for push notifications
          if (firebaseConfig && firebaseConfig.apiKey) {
             getUserFCMToken(firebaseConfig).then(token => {
                if (token && authenticatedUser!.role === UserRole.STAFF) {
                   const myUser = staffList.find(s => s.name === authenticatedUser!.name);
                   if (myUser && myUser.fcmToken !== token) {
                      setStaffList(prev => prev.map(s => s.id === myUser.id ? { ...s, fcmToken: token, updatedAt: new Date().toISOString() } : s));
                   }
                }
             });
          }

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
             setLoginError("এই ডিভাইসে লোকেশন সাপোর্ট করছে না।");
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
               
               if (err.code === 1) {
                   setLoginError("⚠️ লগইন ব্যর্থ! আপনি লোকেশন পারমিশন ব্লক করেছেন। ব্রাউজার সেটিংসে গিয়ে লোকেশন Allow করুন এবং আবার চেষ্টা করুন।");
               } else if (err.code === 2) {
                   setLoginError("❌ মোবাইলের লোকেশন (GPS) বন্ধ আছে। দয়া করে লোকেশন অন করে আবার চেষ্টা করুন।");
               } else if (err.code === 3) {
                   setLoginError("⚠️ লোকেশন রেসপন্স টাইমআউট। দয়া করে আবার চেষ্টা করুন।");
               } else {
                   setLoginError("⚠️ লোকেশন সমস্যা। ইন্টারনেট ও জিপিএস চেক করুন।");
               }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

  // Auto-logout suspended users
  useEffect(() => {
    if (role === UserRole.STAFF && currentUser) {
      const myProfile = staffList.find(s => s.name === currentUser);
      if (myProfile && myProfile.status === 'DEACTIVATED') {
        handleLogout();
        alert('আপনার একাউন্টটি স্থগিত করা হয়েছে।');
      }
    }
  }, [staffList, currentUser, role]);

  const handleLogout = () => {
    setRole(null);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
    setActiveTab('dashboard');
    localStorage.removeItem('active_session');
  };

  const handleExport = () => {
    const data = {
      staffList, expenses, movements, billingRules, funds, notices, advances, complaints, messages, attendanceList, products, productEditors, searchCount, visitCount, phoneBook,
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
      if (data.productEditors) updateProductEditors(data.productEditors);
      if (data.searchCount) setSearchCount(data.searchCount);
      if (data.visitCount) setVisitCount(data.visitCount);
      if (data.phoneBook) updatePhoneBook(data.phoneBook);
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

    const targetId = editingProfileId || staffList.find(s => s.name === currentUser)?.id;
    if (!targetId) return;

    updateStaffList(prev => {
      const existingProfileIndex = prev.findIndex(s => s.id === targetId);
      if (existingProfileIndex >= 0) {
        const updatedList = [...prev];
        updatedList[existingProfileIndex] = {
          ...updatedList[existingProfileIndex],
          ...profileForm,
          updatedAt: new Date().toISOString()
        };
        return updatedList;
      }
      return prev;
    });
    
    setIsProfileModalOpen(false);
    setEditingProfileId(null);
  };

  const myProfile = useMemo(() => {
    return (staffList || []).find(s => s && !s.deletedAt && s.name === currentUser);
  }, [staffList, currentUser]);

  const modalProfileData = useMemo(() => {
     if (editingProfileId) {
        return staffList.find(s => s.id === editingProfileId);
     }
     return myProfile;
  }, [editingProfileId, staffList, myProfile]);

  const profileFinancials = useMemo(() => {
    if (!modalProfileData) return { totalBalance: 0, salaryAdv: 0, totalExpense: 0, regularAdv: 0, cashInHand: 0 };
    
    const userAdvances = advances.filter(a => a.staffId === modalProfileData.id && !a.isDeleted);
    const userExpenses = expenses.filter(e => e.staffId === modalProfileData.id && !e.isDeleted && e.status === 'APPROVED');
    
    // Fix: Handle undefined type as REGULAR and ensure amounts are numbers
    const regularAdv = userAdvances.filter(a => a.type !== 'SALARY').reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const salaryAdv = userAdvances.filter(a => a.type === 'SALARY').reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const totalExpense = userExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const cashInHand = regularAdv - totalExpense;
    
    return {
      totalBalance: cashInHand,
      salaryAdv,
      totalExpense,
      regularAdv,
      cashInHand
    };
  }, [modalProfileData, advances, expenses]);

  const allNavItems = useMemo(() => [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutGrid, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK], color: 'text-sky-600', bgColor: 'bg-sky-50' },
    { id: 'attendance', label: 'হাজিরা', icon: Fingerprint, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK], color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'funds', label: 'ফান্ড লেজার', icon: Landmark, roles: [UserRole.ADMIN, UserRole.MD], color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { id: 'expenses', label: 'বিল ও খরচ', icon: Banknote, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-rose-600', bgColor: 'bg-rose-50' },
    { id: 'products', label: 'পণ্য তালিকা', icon: Package, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-pink-600', bgColor: 'bg-pink-50' },
    { id: 'notices', label: 'নোটিশ বোর্ড', icon: Megaphone, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF, UserRole.KIOSK], color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 'chat', label: 'টিম চ্যাট', icon: MessageCircleMore, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-violet-600', bgColor: 'bg-violet-50' },
    { id: 'phone-book', label: 'ফোন বুক', icon: Phone, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'live-location', label: 'লাইভ ট্র্যাকিং', icon: Radar, roles: [UserRole.ADMIN], color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
    { id: 'lucky-draw', label: 'লাকি ড্র & গেম', icon: Gift, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { id: 'complaints', label: 'অভিযোগ বক্স', icon: ShieldAlert, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-red-600', bgColor: 'bg-red-50' },
    { id: 'staff', label: 'স্টাফ ম্যানেজমেন্ট', icon: UsersRound, roles: [UserRole.ADMIN, UserRole.MD, UserRole.STAFF], color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { id: 'movements', label: 'মুভমেন্ট লগ', icon: Footprints, roles: [UserRole.ADMIN, UserRole.STAFF], color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { id: 'reports', label: 'রিপোর্ট ও ফাইল', icon: PieChart, roles: [UserRole.ADMIN, UserRole.MD], color: 'text-slate-600', bgColor: 'bg-slate-50' },
    { id: 'settings', label: 'সেটিংস', icon: Settings2, roles: [UserRole.ADMIN], color: 'text-gray-600', bgColor: 'bg-gray-50' },
    { id: 'trash', label: 'রিসাইকেল বিন', icon: Recycle, roles: [UserRole.ADMIN], color: 'text-red-500', bgColor: 'bg-red-50' },
  ], []);

  const allowedNavItems = useMemo(() => allNavItems.filter(item => role && item.roles.includes(role)), [allNavItems, role]);

  const bottomNavItems = allowedNavItems.slice(0, 4); 
  const mobileSidebarItems = allowedNavItems; 

  const formatPoints = (num: number) => {
    if (num >= 100000) return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView totalExpense={totalExpense} pendingApprovals={pendingApprovals} expenses={expenses} cloudError={cloudError} totalFund={totalFund} cashOnHand={cashOnHand} role={role!} staffList={staffList} advances={advances} currentUser={currentUser} onOpenProfile={openProfile} searchCount={searchCount} festivalImage={festivalImage} />;
      case 'chat': return <GroupChatView messages={messages} setMessages={updateMessages} currentUser={currentUser} role={role} onNavigate={(view) => setActiveTab(view)} onUpdatePoints={handlePointUpdate} staffList={staffList} onOpenProfile={openProfile} />;
      case 'phone-book': return <PhoneBook phoneBook={phoneBook} setPhoneBook={updatePhoneBook} role={role!} />;
      case 'attendance': return <AttendanceView staffList={staffList} attendanceList={attendanceList} setAttendanceList={updateAttendance} currentUser={currentUser} role={role!} />;
      case 'live-location': return <LiveLocationView staffList={staffList} liveLocations={liveLocations} />;
      case 'lucky-draw': return <LuckyDrawView staffList={staffList} currentUser={currentUser} onUpdatePoints={handlePointUpdate} onUpdateDrawTime={handleDrawTimeUpdate} role={role} />;
      case 'notices': return <NoticeBoardView notices={notices} setNotices={updateNotices} role={role!} currentUser={currentUser || ''} staffList={staffList} onOpenProfile={openProfile} />;
      case 'complaints': return <ComplaintBoxView complaints={complaints} setComplaints={updateComplaints} staffList={staffList} role={role!} currentUser={currentUser} onOpenProfile={openProfile} />;
      case 'funds': return <FundLedgerView funds={funds} setFunds={updateFunds} expenses={expenses} advances={advances} totalFund={totalFund} cashOnHand={cashOnHand} role={role!} />;
      case 'staff': return <StaffManagementView staffList={staffList} setStaffList={updateStaffList} role={role!} expenses={expenses} advances={advances} setAdvances={updateAdvances} currentUser={currentUser} onUpdatePoints={handlePointUpdate} highlightStaffId={highlightStaffId} setHighlightStaffId={setHighlightStaffId} />;
      case 'movements': return <MovementLogView movements={movements} setMovements={updateMovements} staffList={staffList} billingRules={billingRules} role={role!} setMessages={updateMessages} currentUser={currentUser} onUpdatePoints={handlePointUpdate} />;
      case 'expenses': return <ExpenseManagementView expenses={expenses} setExpenses={updateExpenses} staffList={staffList} role={role!} currentUser={currentUser} advances={advances} onOpenProfile={openProfile} allowedBackdateDays={allowedBackdateDays} />;
      case 'reports': return <ReportsView expenses={expenses} staffList={staffList} advances={advances} attendanceList={attendanceList} funds={funds} movements={movements} role={role!} companyLogo={companyLogo} />;
      case 'settings': return <SettingsView billingRules={billingRules} setBillingRules={updateBillingRules} role={role!} exportData={handleExport} importData={handleImport} cloudConfig={firebaseConfig} saveCloudConfig={(config) => { safeSetItem('fb_config', JSON.stringify(config)); alert('Settings saved! Reloading...'); window.location.reload(); }} staffList={staffList} productEditors={productEditors} setProductEditors={updateProductEditors} allowedBackdateDays={allowedBackdateDays} setAllowedBackdateDays={updateBackdateDays} festivalImage={festivalImage} setFestivalImage={updateFestivalImage} />;
      case 'trash': return <TrashView staffList={staffList} setStaffList={updateStaffList} movements={movements} setMovements={updateMovements} expenses={expenses} setExpenses={updateExpenses} funds={funds} setFunds={updateFunds} notices={notices} setNotices={updateNotices} role={role!} />;
      case 'products': return <ProductCatalogView onLogout={() => {}} products={products} setProducts={updateProducts} role={role!} productEditors={productEditors} currentStaffId={myStaffId} onTrackSearch={handleTrackSearch} setComplaints={updateComplaints} certLogos={certLogos} onUpdateCertLogo={updateCertLogos} companyLogo={companyLogo} onUpdateCompanyLogo={updateCompanyLogo} />; 
      default: return <DashboardView totalExpense={totalExpense} pendingApprovals={pendingApprovals} expenses={expenses} cloudError={cloudError} totalFund={totalFund} cashOnHand={cashOnHand} role={role!} staffList={staffList} advances={advances} currentUser={currentUser} onOpenProfile={openProfile} searchCount={searchCount} festivalImage={festivalImage} />;
    }
  };

  const isStaffUser = role === UserRole.STAFF;

  if (role === UserRole.GUEST) {
    return <ProductCatalogView onLogout={handleLogout} products={products} setProducts={updateProducts} role={role} productEditors={productEditors} currentStaffId={null} onTrackSearch={handleTrackSearch} setComplaints={updateComplaints} certLogos={certLogos} onUpdateCertLogo={updateCertLogos} companyLogo={companyLogo} onUpdateCompanyLogo={updateCompanyLogo} />;
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
        
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-black to-blue-900 opacity-80 z-0"></div>
        
        <div className="bg-gray-900/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/10 relative z-10 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-500">
          
          <div className="text-center mb-8 relative">
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
            <div className="mb-2">
               <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1.5 ml-1">Saved Accounts</p>
               <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {savedAccounts.map((account, idx) => (
                     <div key={idx} className="relative group shrink-0">
                        <div 
                          onClick={() => !isLoggingIn && handleLogin(null, account)}
                          className={`flex flex-col items-center bg-white/5 border border-white/10 p-2 rounded-xl shadow-sm hover:shadow-lg cursor-pointer transition-all hover:bg-white/10 hover:border-indigo-500/50 w-20 hover:scale-105 active:scale-95 ${isLoggingIn ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                           <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center overflow-hidden mb-1.5 border border-white/20">
                              {account.photo ? <img src={account.photo} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-indigo-300" />}
                           </div>
                           <p className="text-[9px] font-bold text-gray-200 truncate w-full text-center">{account.username}</p>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-gray-100 text-sm placeholder:text-gray-500 hover:bg-white/20 focus:bg-white/20 backdrop-blur-md disabled:opacity-50"
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
                  className="w-full pl-10 pr-12 py-2.5 bg-white/10 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-gray-100 text-sm placeholder:text-gray-500 hover:bg-white/20 focus:bg-white/20 backdrop-blur-md disabled:opacity-50"
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
              className={`w-full bg-indigo-600 text-white py-3 rounded-xl font-black shadow-lg shadow-indigo-500/40 hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm relative overflow-hidden group border border-indigo-400/20 hover:border-indigo-400/50 ${isLoggingIn ? 'opacity-70 cursor-wait' : ''}`}
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

          <div className="mt-4 border-t border-white/10 pt-4">
             <button 
               onClick={handleGuestLogin}
               className="w-full bg-white/5 border border-white/10 text-indigo-300 hover:text-white hover:bg-white/10 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-wider group"
             >
                <ShoppingBag className="w-4 h-4 group-hover:text-yellow-400 transition-colors" />
                View Products
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
      
      <aside className={`hidden md:flex flex-col w-72 h-full relative overflow-hidden bg-[#0f172a] text-white border-r border-white/5`}>
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
            const badge = badgeCounts[item.id] || 0;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group border-b-[4px] active:border-b-0 active:translate-y-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-900 text-white shadow-lg shadow-indigo-900/50'
                    : 'bg-slate-800/40 border-slate-900 text-slate-400 hover:bg-slate-800 hover:text-gray-200 hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 relative z-10 transition-all duration-300 ${
                    isActive ? 'text-white drop-shadow-md' : 'group-hover:scale-110'
                  }`}
                />
                <span className="relative z-10 flex-1 text-left tracking-wide">{item.label}</span>
                
                {badge > 0 && (
                   <span className="ml-auto relative z-10 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center shadow-sm animate-pulse">
                      {badge > 99 ? '99+' : badge}
                   </span>
                )}

                {isActive && <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white] animate-pulse" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 shrink-0 relative z-10">
           <button 
             onClick={handleShareApp} 
             className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-sky-400 hover:text-white hover:bg-sky-500/10 hover:ring-1 hover:ring-sky-500/20 transition-all group mb-2"
           >
              <Share2 className="w-5 h-5 transition-transform group-hover:scale-110" /> 
              <span>অ্যাপ শেয়ার করুন</span>
           </button>
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
              <span>{isCloudEnabled ? 'Online' : 'Offline'}</span>
            </div>
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
                 <img src={myProfile.photo} alt="Profile" className="w-full h-full object-cover" />
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

      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-gray-900/90 backdrop-blur-lg border border-white/10 rounded-2xl flex justify-around items-center px-2 h-16 z-50 shadow-2xl">
         {bottomNavItems.map((item) => {
            const isActive = activeTab === item.id;
            const badge = badgeCounts[item.id] || 0;

            return (
            <button 
               key={item.id}
               onClick={() => { setActiveTab(item.id); setIsMoreMenuOpen(false); }}
               className="relative w-full flex flex-col items-center justify-center"
            >
               <div className={`transition-all duration-300 flex items-center justify-center ${
                  isActive 
                     ? 'w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full shadow-[0_8px_16px_rgba(99,102,241,0.5)] -translate-y-5 border-4 border-gray-900' 
                     : 'w-10 h-10 text-gray-400 hover:text-gray-200'
               }`}>
                  <item.icon className={`transition-all ${isActive ? 'w-5 h-5 text-white' : 'w-5 h-5'}`} />
                  
                  {badge > 0 && (
                     <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1 rounded-full min-w-[1rem] h-4 flex items-center justify-center border border-gray-900">
                        {badge > 9 ? '9+' : badge}
                     </span>
                  )}
               </div>
               <span className={`text-[10px] font-bold transition-all duration-300 absolute -bottom-1 ${isActive ? 'opacity-100 text-indigo-300 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  {item.label}
               </span>
            </button>
         )})}
         <button 
            onClick={() => setIsMoreMenuOpen(true)}
            className="relative w-full flex flex-col items-center justify-center"
         >
            <div className={`transition-all duration-300 flex items-center justify-center w-10 h-10 text-gray-400 hover:text-gray-200 ${isMoreMenuOpen ? 'text-white' : ''}`}>
               <Menu className="w-6 h-6" />
            </div>
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
                  {mobileSidebarItems.map((item) => {
                     const badge = badgeCounts[item.id] || 0;

                     return (
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
                        
                        {badge > 0 && (
                           <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">
                              {badge > 99 ? '99+' : badge}
                           </span>
                        )}

                        {activeTab === item.id && badge === 0 && <ChevronRight className="w-4 h-4 opacity-50" />}
                     </button>
                  )})}
               </div>

               <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  <button 
                     onClick={() => { openProfile(); setIsMoreMenuOpen(false); }} 
                     className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-colors mb-2"
                  >
                     <UserCog className="w-4 h-4" /> প্রোফাইল সেটিংস
                  </button>
                  <button 
                     onClick={handleShareApp} 
                     className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400 hover:bg-sky-100 transition-colors mb-2"
                  >
                     <Share2 className="w-4 h-4" /> অ্যাপ শেয়ার করুন
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

      {isLocationBlocked && (role === UserRole.STAFF || role === UserRole.KIOSK) && (
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/95 backdrop-blur-md text-white text-center animate-in fade-in duration-300">
            <div className="max-w-md w-full">
               <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <MapPinOff className="w-12 h-12 text-red-500" />
               </div>
               <h2 className="text-3xl font-black mb-4">লোকেশন অ্যাক্সেস নেই!</h2>
               <p className="text-gray-300 mb-8 leading-relaxed">
                  অ্যাপটি ব্যবহার করার জন্য <strong>লোকেশন (GPS)</strong> চালু থাকা বাধ্যতামূলক। আপনি হয়তো লোকেশন বন্ধ করেছেন বা পারমিশন দেননি।
                  <br/><br/>
                  দয়া করে মোবাইলের লোকেশন অন করুন এবং ব্রাউজারকে পারমিশন দিন।
               </p>
               <button 
                  onClick={() => window.location.reload()}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-red-900/50 transition-all active:scale-95 w-full flex items-center justify-center gap-3"
               >
                  <RefreshCw className="w-6 h-6" /> রিফ্রেশ করুন
               </button>
            </div>
         </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
          <div className="bg-[#0F172A] w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 relative max-h-[90vh] flex flex-col">
            
            {/* Header Background - Ultra Premium Gradient */}
            <div className="absolute top-0 left-0 w-full h-48 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center z-0">
               <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-[#0F172A]"></div>
            </div>
            
            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 relative z-10 custom-scrollbar">
                <div className="px-6 pt-6 pb-8 flex flex-col items-center">
                    
                    {/* Close Button */}
                    <button onClick={() => { setIsProfileModalOpen(false); setEditingProfileId(null); }} className="absolute top-4 right-4 text-white/70 hover:text-white z-50 p-2 bg-black/40 backdrop-blur-md rounded-full transition-all hover:rotate-90 border border-white/10"><X className="w-5 h-5" /></button>

                    {/* Go to Staff Card Button */}
                    <button 
                        onClick={() => {
                            if (modalProfileData?.id) {
                                setHighlightStaffId(modalProfileData.id);
                                setActiveTab('staff');
                                setIsProfileModalOpen(false);
                                setEditingProfileId(null);
                            }
                        }} 
                        className="absolute top-4 left-4 text-white/70 hover:text-white z-50 p-2 bg-black/40 backdrop-blur-md rounded-full transition-all hover:scale-110 border border-white/10 flex items-center gap-2 pr-4 group"
                        title="Go to Staff Card"
                    >
                        <User className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0">View</span>
                    </button>

                    {/* Profile Image - Premium Glow */}
                    <div className="relative group cursor-pointer mt-16 mb-4" onClick={() => profileFileRef.current?.click()}>
                        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                            <div className="w-full h-full rounded-full border-4 border-[#0F172A] overflow-hidden bg-[#0F172A] relative">
                                {profileForm.photo ? (
                                    <img src={profileForm.photo} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500 text-4xl font-black">
                                        {modalProfileData?.name ? modalProfileData.name[0].toUpperCase() : 'U'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute bottom-1 right-1 z-20 bg-white text-indigo-600 p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform">
                            <Camera className="w-4 h-4" />
                        </div>
                        <input type="file" ref={profileFileRef} hidden accept="image/*" onChange={handleProfilePhotoUpload} />
                    </div>

                    {/* Name & Role */}
                    <h2 className="text-3xl font-black text-white text-center tracking-tight mb-2 drop-shadow-lg">{modalProfileData?.name || 'User'}</h2>
                    
                    <div className="flex items-center gap-2 mb-8">
                        {modalProfileData?.role === UserRole.MD && <span className="px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-purple-500 to-pink-600 text-white uppercase tracking-widest shadow-lg shadow-purple-900/50 flex items-center gap-1.5"><Crown className="w-3 h-3"/> Managing Director</span>}
                        {modalProfileData?.role === UserRole.ADMIN && <span className="px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-blue-500 to-cyan-500 text-white uppercase tracking-widest shadow-lg shadow-blue-900/50 flex items-center gap-1.5"><UserCog className="w-3 h-3"/> Manager</span>}
                        {modalProfileData?.role === UserRole.STAFF && <span className="px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-indigo-500 to-violet-500 text-white uppercase tracking-widest shadow-lg shadow-indigo-900/50 flex items-center gap-1.5"><User className="w-3 h-3"/> Staff Member</span>}
                        {modalProfileData?.role === UserRole.KIOSK && <span className="px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-orange-500 to-red-500 text-white uppercase tracking-widest shadow-lg shadow-orange-900/50 flex items-center gap-1.5"><MonitorSmartphone className="w-3 h-3"/> Kiosk Mode</span>}
                    </div>

                    {/* Financial Card - Ultra Premium Glass */}
                    <div className="w-full mb-8 transform hover:scale-[1.02] transition-transform duration-300">
                        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 text-white shadow-2xl border border-white/10 relative overflow-hidden group">
                            {/* Animated Gradient Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px]"></div>
                            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]"></div>
                            
                            {/* Header */}
                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                        <WalletCards className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em]">Current Balance</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-1">Real-time Financial Overview</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black px-3 py-1.5 rounded-full border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)] uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        Cash In Hand
                                    </span>
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-2 gap-y-6 gap-x-6 relative z-10">
                                {/* Total Balance */}
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Balance</p>
                                    <p className={`text-xl md:text-2xl font-black flex items-baseline gap-1 font-mono tracking-tighter ${profileFinancials.totalBalance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {profileFinancials.totalBalance < 0 && <span className="mr-0.5">-</span>}
                                        <span className="text-xs font-bold opacity-60">৳</span> {Math.abs(profileFinancials.totalBalance).toLocaleString()}
                                    </p>
                                </div>

                                {/* Regular Adv */}
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Regular Advance</p>
                                    <p className="text-xl md:text-2xl font-black text-blue-300 flex items-baseline gap-1 font-mono tracking-tighter">
                                        <span className="text-xs font-bold opacity-50">৳</span> {profileFinancials.regularAdv.toLocaleString()}
                                    </p>
                                </div>

                                {/* Total Expense */}
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Expense</p>
                                    <p className="text-xl md:text-2xl font-black text-red-300 flex items-baseline gap-1 font-mono tracking-tighter">
                                        <span className="text-xs font-bold opacity-50">৳</span> {profileFinancials.totalExpense.toLocaleString()}
                                    </p>
                                </div>

                                {/* Salary Adv */}
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Salary Advance</p>
                                    <p className="text-xl md:text-2xl font-black text-purple-300 flex items-baseline gap-1 font-mono tracking-tighter">
                                        <span className="text-xs font-bold opacity-50">৳</span> {profileFinancials.salaryAdv.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Fields - Minimalist Dark */}
                    <form onSubmit={saveProfile} className="w-full space-y-4 relative z-10">
                        <div className="group bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-300">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Designation</p>
                                    <input 
                                        type="text" 
                                        disabled={isStaffUser}
                                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-200 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Set Designation"
                                        value={profileForm.designation}
                                        onChange={(e) => setProfileForm({...profileForm, designation: e.target.value})}
                                    />
                                </div>
                                {isStaffUser && <Lock className="w-4 h-4 text-slate-600" />}
                            </div>
                        </div>
                        
                        <div className="group bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-300">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mobile Number</p>
                                    <input 
                                        type="text" 
                                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-200 outline-none placeholder:text-slate-600"
                                        placeholder="Set Mobile No"
                                        value={profileForm.mobile}
                                        onChange={(e) => setProfileForm({...profileForm, mobile: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="group bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-300">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Staff ID</p>
                                    <input 
                                        type="text" 
                                        disabled={isStaffUser}
                                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-200 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Set ID (e.g. ST-01)"
                                        value={profileForm.staffId}
                                        onChange={(e) => setProfileForm({...profileForm, staffId: e.target.value})}
                                    />
                                </div>
                                {isStaffUser && <Lock className="w-4 h-4 text-slate-600" />}
                            </div>
                        </div>

                        <div className="group bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all duration-300 relative">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-300">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <div className="flex-1 pr-8">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Password</p>
                                    <input 
                                        type={showProfilePassword ? "text" : "password"} 
                                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-200 outline-none placeholder:text-slate-600"
                                        placeholder="Set Password (Optional)"
                                        value={profileForm.password}
                                        onChange={(e) => setProfileForm({...profileForm, password: e.target.value})}
                                    />
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowProfilePassword(!showProfilePassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-white transition-colors"
                            >
                                {showProfilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <button type="submit" className="mt-8 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-3 transition-all active:scale-95 border border-white/10 group">
                            <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            SAVE CHANGES
                        </button>

                        <div className="mt-6 text-center pb-4">
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                Member Since: {modalProfileData?.createdAt ? new Date(modalProfileData.createdAt).toLocaleDateString() : 'Just Now'}
                            </p>
                        </div>
                    </form>
                </div>
            </div>
          </div>
        </div>
      )}
      {/* ADVANCE NOTIFICATION MODAL */}
      {latestAdvanceNotif && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative transform transition-all scale-100 animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setLatestAdvanceNotif(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Banknote className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">নতুন এডভান্স!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">আপনার একাউন্টে নতুন এডভান্স যুক্ত করা হয়েছে</p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/30">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">পরিমাণ</p>
                <p className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-4">৳ {latestAdvanceNotif.amount.toLocaleString('en-US')}</p>
                
                <div className="flex justify-between items-center text-xs font-medium text-gray-600 dark:text-gray-400 border-t border-blue-100 dark:border-blue-800/30 pt-4">
                  <span>{new Date(latestAdvanceNotif.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">{latestAdvanceNotif.type}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;