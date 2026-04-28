import React, { useRef, useState } from 'react';
import { Settings, Save, Clock, Download, Upload, Database, ShieldCheck, ExternalLink, HelpCircle, Code, Check, AlertTriangle, Package, UserCheck, X, Image as ImageIcon, Trash2, Info, Mail } from 'lucide-react';
import { BillingRule, UserRole, Staff } from '../types';
import packageJson from '../package.json';

interface SettingsProps {
  billingRules: BillingRule[];
  setBillingRules: React.Dispatch<React.SetStateAction<BillingRule[]>>;
  role: UserRole;
  exportData: () => void;
  importData: (data: string) => void;
  cloudConfig: any;
  saveCloudConfig: (config: any) => void;
  staffList: Staff[];
  productEditors: string[];
  setProductEditors: React.Dispatch<React.SetStateAction<string[]>>;
  allowedBackdateDays: number;
  setAllowedBackdateDays: (days: number) => void;
  festivalImage?: string;
  setFestivalImage?: (base64: string) => void;
}

const SettingsView: React.FC<SettingsProps> = ({ billingRules, setBillingRules, role, exportData, importData, cloudConfig, saveCloudConfig, staffList = [], productEditors = [], setProductEditors, allowedBackdateDays, setAllowedBackdateDays, festivalImage, setFestivalImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const festivalImageRef = useRef<HTMLInputElement>(null);
  const [configInput, setConfigInput] = useState(cloudConfig ? JSON.stringify(cloudConfig, null, 2) : '');
  const [parseError, setParseError] = useState<string | null>(null);

  const [smtpConfig, setSmtpConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('smtp_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { host: 'smtp.gmail.com', port: '587', secure: false, user: '', pass: '', from: '' };
  });

  const [showSmtpSuccess, setShowSmtpSuccess] = useState(false);

  const saveSmtpConfig = () => {
    localStorage.setItem('smtp_config', JSON.stringify(smtpConfig));
    setShowSmtpSuccess(true);
    setTimeout(() => setShowSmtpSuccess(false), 3000);

    if (cloudConfig && cloudConfig.databaseURL) {
      import('firebase/database').then(({ getDatabase, ref, set }) => {
        import('firebase/app').then(({ getApp }) => {
          try {
            const app = getApp();
            const db = getDatabase(app, cloudConfig.databaseURL);
            set(ref(db, 'app_settings/smtp_config'), smtpConfig);
          } catch (e) {
            console.error('Failed to sync smtp to cloud', e);
          }
        });
      });
    }
  };

  const handleCloudSave = () => {
    setParseError(null);
    try {
      let jsonString = configInput.trim();

      // 1. Extract object between curly braces if extra code exists
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      }

      // 2. Fix unquoted keys (e.g., apiKey: "..." -> "apiKey": "...")
      jsonString = jsonString.replace(/(\w+)(?=\s*:)/g, '"$1"');

      // 3. Remove trailing commas
      jsonString = jsonString.replace(/,(\s*})/g, '$1');

      // 4. Clean up any potential single quotes
      jsonString = jsonString.replace(/'/g, '"');

      const parsed = JSON.parse(jsonString);

      if (!parsed.apiKey || (!parsed.databaseURL && !parsed.projectId)) {
        throw new Error("Invalid Config: apiKey or databaseURL missing.");
      }

      // If databaseURL is missing but projectId exists, construct it
      if (!parsed.databaseURL && parsed.projectId) {
        parsed.databaseURL = `https://${parsed.projectId}-default-rtdb.firebaseio.com`;
      }

      saveCloudConfig(parsed);
      alert('সফল হয়েছে! পেজ রিলোড হচ্ছে...');
    } catch (e: any) {
      console.error(e);
      setParseError('ভুল ফরম্যাট! Firebase Console থেকে "firebaseConfig" এর পুরো অংশটি কপি করে পেস্ট করুন।');
    }
  };

  const updateRule = (type: BillingRule['type'], field: keyof BillingRule, value: any) => {
    setBillingRules(prev => prev.map(r => r.type === type ? { ...r, [field]: value } : r));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => importData(event.target?.result as string);
      reader.readAsText(file);
    }
  };

  const handleFestivalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && setFestivalImage) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_HEIGHT = 400; // Increased max size for better quality banners
          let width = img.width;
          let height = img.height;
          
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          setFestivalImage(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleProductEditor = (staffId: string) => {
    if (productEditors.includes(staffId)) {
        setProductEditors(prev => prev.filter(id => id !== staffId));
    } else {
        setProductEditors(prev => [...prev, staffId]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12 px-4 sm:px-6 lg:px-8">
      
      {/* General Settings (ADMIN ONLY) */}
      {role === UserRole.ADMIN && (
        <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="bg-teal-50 dark:bg-teal-500/10 p-2.5 rounded-2xl text-teal-600 dark:text-teal-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">সাধারণ সেটিংস (General)</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">অ্যাপের বিভিন্ন গ্লোবাল সেটিংস নিয়ন্ত্রণ করুন।</p>
                </div>
            </div>
            
            <div className="space-y-5">
               {/* Backdate Limit */}
               <div className="bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">স্টাফদের জন্য বিল সাবমিটের সময়সীমা (Backdate Limit)</label>
                  <div className="flex items-center gap-4">
                     <input 
                       type="number" 
                       min="0"
                       className="w-24 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-gray-800 dark:text-white text-center text-lg transition-all"
                       value={allowedBackdateDays} 
                       onChange={(e) => setAllowedBackdateDays(Number(e.target.value))} 
                     />
                     <span className="text-sm font-bold text-gray-600 dark:text-gray-400">দিন (Days)</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1.5">
                     <InfoIcon className="w-4 h-4 text-teal-500 shrink-0" /> 
                     স্টাফরা বর্তমান তারিখ থেকে সর্বোচ্চ {allowedBackdateDays} দিন আগের বিল সাবমিট করতে পারবে। (0 = শুধু আজকের বিল)
                  </p>
               </div>

               {/* Festival / Greeting Banner */}
               {setFestivalImage && (
                   <div className="bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">ফেস্টিভ্যাল / গ্রীটিং ব্যানার (Festival Image)</label>
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                          <div 
                             onClick={() => festivalImageRef.current?.click()}
                             className="w-full sm:w-80 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 dark:hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/5 transition-all group overflow-hidden relative bg-white dark:bg-gray-800"
                          >
                             {festivalImage ? (
                                <img src={festivalImage} alt="Festival" className="w-full h-full object-contain" />
                             ) : (
                                <div className="text-center p-4">
                                   <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors" />
                                   <span className="text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Click to Upload Banner</span>
                                </div>
                             )}
                          </div>
                          
                          {festivalImage && (
                             <button 
                               onClick={() => setFestivalImage('')}
                               className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-100 dark:border-red-500/20 flex items-center justify-center"
                               title="Remove Image"
                             >
                                <Trash2 className="w-5 h-5" />
                             </button>
                          )}
                      </div>
                      <input ref={festivalImageRef} type="file" accept="image/*" hidden onChange={handleFestivalImageUpload} />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                         * এই ছবিটি ড্যাশবোর্ডের হিরো সেকশনে ডানদিকে বড় আকারে দেখাবে। (Recommended: PNG with transparent background, High Quality)
                      </p>
                   </div>
               )}
            </div>
        </div>
      )}

      {/* Product Catalog Permissions (ADMIN ONLY) */}
      {role === UserRole.ADMIN && (
        <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="bg-pink-50 dark:bg-pink-500/10 p-2.5 rounded-2xl text-pink-600 dark:text-pink-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">পণ্য তালিকা পারমিশন (Product Permission)</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">নির্ধারণ করুন কে কে পণ্য তালিকা এডিট বা নতুন পণ্য যুক্ত করতে পারবে।</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                {(staffList || []).filter(s => s.status === 'ACTIVE' && !s.deletedAt && s.role !== UserRole.KIOSK).map((staff, index) => {
                    const isAllowed = productEditors.includes(staff.id);
                    return (
                        <div 
                            key={`${staff.id}-${index}`} 
                            onClick={() => toggleProductEditor(staff.id)}
                            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center justify-between group ${isAllowed ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 shadow-sm shadow-pink-100 dark:shadow-none' : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${isAllowed ? 'bg-pink-200 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                    {staff.name[0]}
                                </div>
                                <div>
                                    <p className={`text-sm font-bold transition-colors ${isAllowed ? 'text-pink-700 dark:text-pink-300' : 'text-gray-700 dark:text-gray-300'}`}>{staff.name}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{staff.role}</p>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isAllowed ? 'bg-pink-500 text-white shadow-sm' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                                {isAllowed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 italic bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
              * শুধুমাত্র অ্যাডমিন এবং এখানে সিলেক্ট করা ব্যক্তিরা পণ্য তালিকায় পরিবর্তন আনতে পারবে।
            </p>
        </div>
      )}

      {/* Cloud Sync Configuration */}
      <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2.5 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">অনলাইন সিঙ্ক (Firebase)</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">একাধিক ডিভাইসে অ্যাপটি রিয়েল-টাইমে চালানোর জন্য কনফিগার করুন।</p>
            </div>
          </div>
          <span className={`self-start sm:self-auto px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${cloudConfig ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'}`}>
            {cloudConfig ? 'Configured' : 'Setup Required'}
          </span>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
             <div className="space-y-4">
               <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-base">
                 <HelpCircle className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> 
                 মাল্টি-ডিভাইস সেটআপ গাইড
               </h4>
               
               <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                 <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                   <h5 className="font-bold text-indigo-700 dark:text-indigo-400 mb-2 text-sm">ধাপ ১: ডাটাবেস রুলস (জরুরী)</h5>
                   <p className="text-xs mb-3 text-indigo-900/70 dark:text-indigo-200/70">মাল্টি-ডিভাইস কাজ না করার প্রধান কারণ পারমিশন না থাকা। Firebase Console {' > '} Realtime Database {' > '} Rules-এ গিয়ে নিচের কোডটি পেস্ট করে Publish করুন:</p>
                   <div className="bg-gray-900 dark:bg-black/50 text-green-400 p-3 rounded-xl font-mono text-xs relative group select-all shadow-inner overflow-x-auto">
                      <pre>{`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`}</pre>
                   </div>
                 </div>

                 <div className="pl-3 border-l-2 border-gray-200 dark:border-gray-700 py-1">
                   <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1.5">ধাপ ২: কনফিগারেশন</h5>
                   <ul className="list-disc list-inside text-xs space-y-1.5 text-gray-600 dark:text-gray-400">
                     <li>Firebase Project Settings {' > '} General {' > '} Your apps এ যান।</li>
                     <li><strong>NPM</strong> বা <strong>CDN</strong> যেকোনো অপশন সিলেক্ট করুন।</li>
                     <li><code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-pink-600 dark:text-pink-400">const firebaseConfig = ...</code> কোডটি কপি করুন।</li>
                     <li>পাশের বক্সে পেস্ট করে সেভ করুন।</li>
                   </ul>
                 </div>
               </div>
               
               <a href="https://console.firebase.google.com/" target="_blank" className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline mt-2 transition-colors bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg">
                 Firebase Console-এ যান <ExternalLink className="w-3.5 h-3.5" />
               </a>
             </div>
             
             <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
               <div className="flex justify-between items-center mb-1">
                 <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Firebase Config Code</label>
                 {cloudConfig && <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-md"><Check className="w-3 h-3"/> Saved</span>}
               </div>
               
               <textarea 
                 rows={6}
                 className={`w-full p-3 font-mono text-xs bg-gray-900 dark:bg-black/80 text-indigo-400 dark:text-indigo-300 rounded-xl outline-none focus:ring-2 transition-all shadow-inner resize-y ${parseError ? 'ring-2 ring-red-500' : 'focus:ring-indigo-500 dark:focus:ring-indigo-400'}`}
                 placeholder={'Paste your firebaseConfig here...\nconst firebaseConfig = {\n  apiKey: "...",\n  ...\n};'}
                 value={configInput}
                 onChange={(e) => {
                   setConfigInput(e.target.value);
                   setParseError(null);
                 }}
               />
               
               {parseError && (
                 <p className="text-xs text-red-500 font-medium flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg border border-red-100 dark:border-red-500/20">
                   <AlertTriangle className="w-4 h-4 shrink-0" /> {parseError}
                 </p>
               )}

               <div className="flex gap-2 pt-1">
                 {cloudConfig && (
                   <button 
                     onClick={() => { if(window.confirm('সতর্কতা: আপনি কি নিশ্চিত যে ক্লাউড কানেকশন বিচ্ছিন্ন করতে চান? \n\nএর ফলে ডাটা সিঙ্ক বন্ধ হয়ে যাবে।')) { localStorage.removeItem('fb_config'); window.location.reload(); } }}
                     className="flex-1 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
                   >
                     রিমুভ করুন
                   </button>
                 )}
                 <button 
                   onClick={handleCloudSave}
                   className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                 >
                   <ShieldCheck className="w-4 h-4" /> সেভ করুন
                 </button>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* SMTP Email Configuration (ADMIN ONLY) */}
      {role === UserRole.ADMIN && (
        <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className="bg-orange-50 dark:bg-orange-500/10 p-2.5 rounded-2xl text-orange-600 dark:text-orange-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">ইমেইল নোটিফিকেশন সেটআপ (SMTP)</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">অটোমেটিক ইমেইল পাঠানোর জন্য আপনার ইমেইল এবং অ্যাপ পাসওয়ার্ড প্রদান করুন।</p>
            </div>
          </div>
          
          <div className="space-y-4">
             <div className="bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">ইমেইল এড্রেস (Sender Email)</label>
                   <input 
                     type="email" 
                     placeholder="e.g. your_email@gmail.com"
                     className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all"
                     value={smtpConfig.user}
                     onChange={(e) => setSmtpConfig({...smtpConfig, user: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">অ্যাপ পাসওয়ার্ড (App Password)</label>
                   <input 
                     type="password" 
                     placeholder="e.g. abcd efgh ijkl mnop"
                     className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all"
                     value={smtpConfig.pass}
                     onChange={(e) => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                   />
                 </div>
               </div>
               <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-start gap-1.5 leading-relaxed">
                 <InfoIcon className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" /> 
                 <span>
                   জিমেইলের ক্ষেত্রে সাধারণ পাসওয়ার্ড দিয়ে লগইন হবে না। আপনাকে <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 underline font-bold">Google Account App Passwords</a> থেকে একটি ১৬ অঙ্কের অ্যাপ পাসওয়ার্ড তৈরি করে এখানে দিতে হবে।
                 </span>
               </p>
               <div className="mt-4 flex justify-end">
                  <button 
                    onClick={saveSmtpConfig}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md"
                  >
                    <Save className="w-4 h-4" /> সেভ করুন 
                  </button>
               </div>
             </div>
          </div>

          {/* Success Popup */}
          {showSmtpSuccess && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 z-50">
              <div className="bg-green-500 rounded-full p-1">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">SMTP Settings saved successfully!</span>
            </div>
          )}
        </div>
      )}

      {/* Automated Billing Rules */}
      <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-500/10 p-2.5 rounded-2xl text-blue-600 dark:text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">অটোমেটেড বিলিং লজিক</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">অ্যালাউন্স হিসাব করার সময় এবং টাকার পরিমাণ এখান থেকে ম্যানেজ করুন।</p>
          </div>
        </div>

        <div className="space-y-4">
          {(billingRules || []).map((rule) => (
            <div key={rule.type} className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${rule.type === 'HOLIDAY' ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/30' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700'}`}>
              <h4 className={`font-bold mb-4 flex items-center gap-2 text-base ${rule.type === 'HOLIDAY' ? 'text-purple-700 dark:text-purple-400' : 'text-gray-800 dark:text-gray-200'}`}>
                <div className={`w-2 h-2 rounded-full shadow-sm ${rule.type === 'HOLIDAY' ? 'bg-purple-500' : 'bg-indigo-500'}`}></div>
                {rule.type} বিল সেটআপ
                {rule.type === 'HOLIDAY' && <span className="text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full ml-2">Friday / Offday</span>}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rule.type !== 'HOLIDAY' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">শুরুর সময়</label>
                    <input type="time" className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-800 dark:text-white transition-all text-sm" value={rule.startTime} onChange={(e) => updateRule(rule.type, 'startTime', e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">টাকার পরিমাণ (৳)</label>
                  <input type="number" className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 dark:text-white transition-all text-sm" value={rule.amount} onChange={(e) => updateRule(rule.type, 'amount', Number(e.target.value))} />
                </div>
                {rule.type === 'LUNCH' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">মিনিমাম মেম্বার</label>
                    <input type="number" className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 dark:text-white transition-all text-sm" value={rule.minPeople || 0} onChange={(e) => updateRule(rule.type, 'minPeople', Number(e.target.value))} />
                  </div>
                )}
                {rule.type === 'HOLIDAY' && (
                  <div className="col-span-1 sm:col-span-2 flex items-center text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100/50 dark:bg-purple-500/10 p-3 rounded-xl border border-purple-100 dark:border-purple-800/20">
                     <AlertTriangle className="w-4 h-4 mr-2 shrink-0" /> 
                     শুক্রবার বা ছুটির দিনে ডিউটি করলে এই রেট প্রযোজ্য হবে।
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Backup & Restore */}
      <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="bg-green-50 dark:bg-green-500/10 p-2.5 rounded-2xl text-green-600 dark:text-green-400">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">অফলাইন ব্যাকআপ</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">ম্যানুয়ালি ডাটা ব্যাকআপ রাখুন অথবা আগের ব্যাকআপ রিস্টোর করুন।</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={exportData} className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 py-3 px-5 rounded-2xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-3 transition-all group">
            <div className="bg-white dark:bg-indigo-500/20 p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <Download className="w-4 h-4" />
            </div>
            <span className="text-sm">ডাটা এক্সপোর্ট (Export JSON)</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 text-green-700 dark:text-green-300 py-3 px-5 rounded-2xl font-bold hover:bg-green-100 dark:hover:bg-green-500/20 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-3 transition-all group">
            <div className="bg-white dark:bg-green-500/20 p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
              <Upload className="w-4 h-4" />
            </div>
            <span className="text-sm">ডাটা ইমপোর্ট (Import JSON)</span>
          </button>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-4">
          <div className="bg-gray-100 dark:bg-gray-700 p-2.5 rounded-2xl text-gray-600 dark:text-gray-300">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">অ্যাপ ভার্সন (App Version)</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Current installed version of the application</p>
          </div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-500/20 self-start sm:self-auto">
          <span className="text-indigo-700 dark:text-indigo-400 font-mono font-bold text-sm tracking-wider">v{packageJson.version}</span>
        </div>
      </div>
    </div>
  );
};

// Helper Icon
const InfoIcon = ({className}: {className: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
);

export default SettingsView;