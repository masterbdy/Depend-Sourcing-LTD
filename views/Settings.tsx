import React, { useRef, useState } from 'react';
import { Settings, Save, Clock, Download, Upload, Database, ShieldCheck, ExternalLink, HelpCircle, Code, Check, AlertTriangle, Package, UserCheck, X } from 'lucide-react';
import { BillingRule, UserRole, Staff } from '../types';

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
}

const SettingsView: React.FC<SettingsProps> = ({ billingRules, setBillingRules, role, exportData, importData, cloudConfig, saveCloudConfig, staffList = [], productEditors = [], setProductEditors }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [configInput, setConfigInput] = useState(cloudConfig ? JSON.stringify(cloudConfig, null, 2) : '');
  const [parseError, setParseError] = useState<string | null>(null);

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

  const toggleProductEditor = (staffId: string) => {
    if (productEditors.includes(staffId)) {
        setProductEditors(prev => prev.filter(id => id !== staffId));
    } else {
        setProductEditors(prev => [...prev, staffId]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Product Catalog Permissions (ADMIN ONLY) */}
      {role === UserRole.ADMIN && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                <div className="bg-pink-100 p-2.5 rounded-2xl text-pink-600"><Package className="w-6 h-6" /></div>
                <div>
                    <h2 className="text-xl font-black text-gray-800">পণ্য তালিকা পারমিশন (Product Permission)</h2>
                    <p className="text-xs text-gray-400">নির্ধারণ করুন কে কে পণ্য তালিকা এডিট বা নতুন পণ্য যুক্ত করতে পারবে।</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto custom-scrollbar p-2">
                {(staffList || []).filter(s => s.status === 'ACTIVE' && !s.deletedAt && s.role !== UserRole.KIOSK).map(staff => {
                    const isAllowed = productEditors.includes(staff.id);
                    return (
                        <div 
                            key={staff.id} 
                            onClick={() => toggleProductEditor(staff.id)}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${isAllowed ? 'border-pink-500 bg-pink-50' : 'border-gray-100 hover:border-gray-300'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isAllowed ? 'bg-pink-200 text-pink-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {staff.name[0]}
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${isAllowed ? 'text-pink-700' : 'text-gray-700'}`}>{staff.name}</p>
                                    <p className="text-[10px] text-gray-400">{staff.role}</p>
                                </div>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isAllowed ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                {isAllowed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            </div>
                        </div>
                    );
                })}
            </div>
            <p className="text-[10px] text-gray-400 mt-4 italic">* শুধুমাত্র অ্যাডমিন এবং এখানে সিলেক্ট করা ব্যক্তিরা পণ্য তালিকায় পরিবর্তন আনতে পারবে।</p>
        </div>
      )}

      {/* Cloud Sync Configuration */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2.5 rounded-2xl text-indigo-600"><Database className="w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-black text-gray-800">অনলাইন সিঙ্ক (Firebase)</h2>
              <p className="text-xs text-gray-400">একাধিক ডিভাইসে অ্যাপটি রিয়েল-টাইমে চালানোর জন্য কনফিগার করুন।</p>
            </div>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cloudConfig ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {cloudConfig ? 'Configured' : 'Setup Required'}
          </span>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-5">
               <h4 className="font-bold text-gray-800 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-indigo-500" /> মাল্টি-ডিভাইস সেটআপ গাইড</h4>
               
               <div className="space-y-4 text-sm text-gray-600">
                 <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                   <h5 className="font-bold text-indigo-700 mb-2">ধাপ ১: ডাটাবেস রুলস (জরুরী)</h5>
                   <p className="text-xs mb-3">মাল্টি-ডিভাইস কাজ না করার প্রধান কারণ পারমিশন না থাকা। Firebase Console {' > '} Realtime Database {' > '} Rules-এ গিয়ে নিচের কোডটি পেস্ট করে Publish করুন:</p>
                   <div className="bg-gray-800 text-green-400 p-3 rounded-lg font-mono text-[10px] relative group select-all">
                      <pre>{`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`}</pre>
                   </div>
                 </div>

                 <div className="pl-2 border-l-2 border-gray-200">
                   <h5 className="font-bold text-gray-700">ধাপ ২: কনফিগারেশন</h5>
                   <ul className="list-disc list-inside text-xs space-y-1 mt-1 text-gray-500">
                     <li>Firebase Project Settings {' > '} General {' > '} Your apps এ যান।</li>
                     <li><strong>NPM</strong> বা <strong>CDN</strong> যেকোনো অপশন সিলেক্ট করুন।</li>
                     <li><code>const firebaseConfig = ...</code> কোডটি কপি করুন।</li>
                     <li>পাশের বক্সে পেস্ট করে সেভ করুন।</li>
                   </ul>
                 </div>
               </div>
               
               <a href="https://console.firebase.google.com/" target="_blank" className="inline-flex items-center gap-2 text-indigo-600 font-bold text-sm hover:underline mt-2">
                 Firebase Console-এ যান <ExternalLink className="w-4 h-4" />
               </a>
             </div>
             
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Firebase Config Code</label>
                 {cloudConfig && <span className="text-[10px] text-green-600 flex items-center gap-1"><Check className="w-3 h-3"/> Saved</span>}
               </div>
               
               <textarea 
                 rows={12}
                 className={`w-full p-4 font-mono text-[10px] bg-gray-900 text-indigo-400 rounded-2xl outline-none focus:ring-2 transition-all ${parseError ? 'ring-2 ring-red-500' : 'focus:ring-indigo-500'}`}
                 placeholder={'Paste your firebaseConfig here...\nconst firebaseConfig = {\n  apiKey: "...",\n  ...\n};'}
                 value={configInput}
                 onChange={(e) => {
                   setConfigInput(e.target.value);
                   setParseError(null);
                 }}
               />
               
               {parseError && (
                 <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                   <AlertTriangle className="w-3 h-3" /> {parseError}
                 </p>
               )}

               <div className="flex gap-3">
                 {cloudConfig && (
                   <button 
                     onClick={() => { if(window.confirm('সতর্কতা: আপনি কি নিশ্চিত যে ক্লাউড কানেকশন বিচ্ছিন্ন করতে চান? \n\nএর ফলে ডাটা সিঙ্ক বন্ধ হয়ে যাবে।')) { localStorage.removeItem('fb_config'); window.location.reload(); } }}
                     className="flex-1 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
                   >
                     রিমুভ করুন
                   </button>
                 )}
                 <button 
                   onClick={handleCloudSave}
                   className="flex-[2] bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                 >
                   <ShieldCheck className="w-5 h-5" />
                   সেভ করুন
                 </button>
               </div>
             </div>
          </div>
        </div>
      </div>

      {/* Automated Billing Rules */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
          <div className="bg-blue-100 p-2.5 rounded-2xl text-blue-600"><Clock className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-black text-gray-800">অটোমেটেড বিলিং লজিক</h2>
            <p className="text-xs text-gray-400">অ্যালাউন্স হিসাব করার সময় এবং টাকার পরিমাণ এখান থেকে ম্যানেজ করুন।</p>
          </div>
        </div>

        <div className="space-y-6">
          {(billingRules || []).map((rule) => (
            <div key={rule.type} className={`p-6 rounded-2xl border ${rule.type === 'HOLIDAY' ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
              <h4 className={`font-bold mb-4 flex items-center gap-2 ${rule.type === 'HOLIDAY' ? 'text-purple-700' : 'text-gray-700'}`}>
                <div className={`w-2 h-2 rounded-full ${rule.type === 'HOLIDAY' ? 'bg-purple-600' : 'bg-indigo-500'}`}></div>
                {rule.type} বিল সেটআপ
                {rule.type === 'HOLIDAY' && <span className="text-[10px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded">Friday / Offday</span>}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {rule.type !== 'HOLIDAY' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">শুরুর সময়</label>
                    <input type="time" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={rule.startTime} onChange={(e) => updateRule(rule.type, 'startTime', e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">টাকার পরিমাণ (৳)</label>
                  <input type="number" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={rule.amount} onChange={(e) => updateRule(rule.type, 'amount', Number(e.target.value))} />
                </div>
                {rule.type === 'LUNCH' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">মিনিমাম মেম্বার</label>
                    <input type="number" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={rule.minPeople || 0} onChange={(e) => updateRule(rule.type, 'minPeople', Number(e.target.value))} />
                  </div>
                )}
                {rule.type === 'HOLIDAY' && (
                  <div className="col-span-2 flex items-center text-xs text-purple-600">
                     <AlertTriangle className="w-4 h-4 mr-2" /> 
                     শুক্রবার বা ছুটির দিনে ডিউটি করলে এই রেট প্রযোজ্য হবে।
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Backup & Restore */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
          <div className="bg-green-100 p-2.5 rounded-2xl text-green-600"><Download className="w-6 h-6" /></div>
          <h2 className="text-xl font-black text-gray-800">অফলাইন ব্যাকআপ</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={exportData} className="border-2 border-dashed border-indigo-200 text-indigo-600 p-6 rounded-3xl font-bold hover:bg-indigo-50 flex flex-col items-center justify-center gap-3 transition-all">
            <Download className="w-8 h-8" />
            <span>ডাটা এক্সপোর্ট (Export JSON)</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-green-200 text-green-600 p-6 rounded-3xl font-bold hover:bg-green-50 flex flex-col items-center justify-center gap-3 transition-all">
            <Upload className="w-8 h-8" />
            <span>ডাটা ইমপোর্ট (Import JSON)</span>
          </button>
          <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
        </div>
      </div>
    </div>
  );
};

export default SettingsView;