import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, Camera, CheckCircle, XCircle, Clock, Eye, Trash2, Search, Calendar, FilterX, RotateCcw, CheckCheck, Sparkles, Image as ImageIcon, X, Edit3, Eraser, AlertTriangle, User, ChevronDown, Printer, Loader2, Images, MessageCircle, SpellCheck, Wand2 } from 'lucide-react';
import { Expense, Staff, UserRole, AppNotification, AdvanceLog } from '../types';

interface ExpenseProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  staffList: Staff[];
  role: UserRole;
  currentUser: string | null;
  advances: AdvanceLog[];
  onOpenProfile?: (staffId: string) => void;
  allowedBackdateDays?: number;
}

// Common Bengali Typos Dictionary
const TYPO_DICTIONARY: Record<string, string> = {
  'লান্স': 'লাঞ্চ',
  'লান্চ': 'লাঞ্চ',
  'লাঞ্চ বিল': 'লাঞ্চ',
  'রিস্কা': 'রিকশা',
  'রিকসা': 'রিকশা',
  'রিক্সা': 'রিকশা',
  'ভারা': 'ভাড়া',
  'গারি': 'গাড়ি',
  'বিল্ল': 'বিল',
  'নাষ্তা': 'নাস্তা',
  'নাশ্তা': 'নাস্তা',
  'খাবাড়': 'খাবার',
  'লেত': 'লেট',
  'লেঠ': 'লেট',
  'ওভারটাইম': 'ওভারটাইম',
  'ওভার টাইম': 'ওভারটাইম',
  'মোবাইল বিল': 'মোবাইল',
  'তেল': 'ফুয়েল',
  'পেটেল': 'পেট্রোল',
  'পেট্রোল': 'অকটেন', // If needed strictly
  'সিএনজি': 'CNG',
  'বাইক': 'বাইক',
  'মালামাল': 'মালামাল',
  'কুরিয়ার': 'কুরিয়ার'
};

const ExpenseManagementView: React.FC<ExpenseProps> = ({ expenses, setExpenses, staffList, role, currentUser, advances = [], onOpenProfile, allowedBackdateDays = 1 }) => {
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    staffId: '', 
    amount: 0, 
    reason: '', 
    voucherImage: '',
    date: new Date().toISOString().split('T')[0] // Default to today
  });
  const [viewingVoucher, setViewingVoucher] = useState<string | null>(null);
  
  // Correction/Edit State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionData, setCorrectionData] = useState<{id: string, amount: number, reason: string, date: string} | null>(null);

  // Delete Confirmation State
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);

  // Downloading State (Specific ID)
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('');

  const activeStaff = staffList.filter(s => !s.deletedAt && s.status === 'ACTIVE');

  // Date Logic for Restrictions
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - allowedBackdateDays);
  
  const maxDateStr = today.toISOString().split('T')[0];
  const minDateStr = minDate.toISOString().split('T')[0];

  // Helper for safe date comparison
  const getSafeDateStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Real-time duplicate check for the form
  const duplicateCheck = useMemo(() => {
    if (!formData.staffId || !formData.date) return [];
    
    return expenses.filter(e => 
      !e.isDeleted && 
      e.staffId === formData.staffId && 
      getSafeDateStr(e.createdAt) === formData.date
    );
  }, [expenses, formData.staffId, formData.date]);

  // TYPO CHECKER LOGIC
  const detectedTypos = useMemo(() => {
    const words = formData.reason.split(/[\s,]+/); // Split by space or comma
    const found: { wrong: string, correct: string }[] = [];
    
    words.forEach(word => {
       // Simple check (can be improved with fuzzy search later)
       if (TYPO_DICTIONARY[word]) {
          // Avoid duplicates
          if (!found.some(f => f.wrong === word)) {
             found.push({ wrong: word, correct: TYPO_DICTIONARY[word] });
          }
       }
    });
    return found;
  }, [formData.reason]);

  const fixTypo = (wrong: string, correct: string) => {
     setFormData(prev => ({
        ...prev,
        reason: prev.reason.replace(new RegExp(wrong, 'g'), correct)
     }));
  };

  // Helper: Get Financial Stats for a Staff (For Voucher)
  const getStaffFinancials = (staffId: string) => {
    const approvedExp = expenses
      .filter(e => !e.isDeleted && e.status === 'APPROVED' && e.staffId === staffId)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    
    const regularAdv = advances
      .filter(a => !a.isDeleted && a.type !== 'SALARY' && a.staffId === staffId)
      .reduce((sum, a) => sum + Number(a.amount), 0);
    
    // Balance: Regular Advance - Approved Exp
    const balance = regularAdv - approvedExp;
    return { approvedExp, regularAdv, balance };
  };

  // ... (Voucher Generator Code) ...
  const generateVoucherHTML = (expense: Expense) => {
    const stats = getStaffFinancials(expense.staffId);
    const dateStr = new Date(expense.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
    const staff = staffList.find(s => s.id === expense.staffId);
    const designation = staff?.designation || 'N/A';
    const staffId = staff?.staffId || 'N/A';
    
    // Staff Photo
    const photoHTML = staff?.photo 
      ? `<img src="${staff.photo}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb;" crossorigin="anonymous" />`
      : `<div style="width: 45px; height: 45px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #6b7280; font-size: 18px; border: 2px solid #e5e7eb;">${expense.staffName[0]}</div>`;

    return `
      <div style="width: 650px; padding: 40px; background: white; border: 1px solid #d1d5db; font-family: 'Hind Siliguri', sans-serif; color: #1f2937; position: relative; margin: auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
         <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 30px;">
            <div>
               <h1 style="font-size: 28px; font-weight: 900; margin: 0; color: #111827; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1;">Depend Sourcing Ltd.</h1>
               <p style="font-size: 11px; margin: 6px 0 0; letter-spacing: 3px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Promise Beyond Business</p>
            </div>
            <div style="text-align: right;">
               <div style="background: #111827; color: white; padding: 6px 16px; font-weight: bold; font-size: 12px; border-radius: 4px; text-transform: uppercase; display: inline-block;">Payment Voucher</div>
               <p style="margin-top: 5px; font-size: 10px; font-weight: bold; color: #9ca3af;">#${expense.id.substring(0, 8).toUpperCase()}</p>
            </div>
         </div>
         <div style="display: flex; justify-content: space-between; align-items: center; background: #f9fafb; padding: 20px; border-radius: 12px; border: 1px solid #f3f4f6; margin-bottom: 30px;">
            <div>
               <div style="color: #6b7280; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 4px;">Beneficiary / Payee</div>
               <div style="font-size: 18px; font-weight: 800; color: #111827;">${expense.staffName}</div>
               <div style="font-size: 12px; color: #4b5563; margin-top: 2px; font-weight: 500;">${designation} • ID: ${staffId}</div>
            </div>
            <div>${photoHTML}</div>
         </div>
         <div style="text-align: center; margin-bottom: 35px; padding: 30px 20px; border: 2px dashed #e5e7eb; border-radius: 16px; position: relative;">
            <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: white; padding: 0 10px; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #9ca3af; letter-spacing: 1px;">Amount Authorized</div>
            <div style="font-size: 48px; font-weight: 900; color: #111827; line-height: 1; letter-spacing: -1px;">৳ ${expense.amount.toLocaleString()}</div>
            <div style="font-size: 12px; font-weight: 600; color: #4b5563; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">BDT Taka Only</div>
            <div style="margin-top: 20px; font-size: 14px; font-weight: 500; color: #374151; background: #f3f4f6; padding: 10px 20px; border-radius: 50px; display: inline-block;">"${expense.reason}"</div>
            <div style="margin-top: 10px; font-size: 10px; font-weight: 600; color: #9ca3af;">Date: ${dateStr}</div>
         </div>
         <div style="margin-bottom: 50px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #6b7280; margin-bottom: 10px; letter-spacing: 0.5px; padding-left: 5px;">Current Account Summary</div>
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
               <thead>
                 <tr style="background: #f9fafb;">
                    <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 10px;">Total Regular Advance</th>
                    <th style="padding: 12px 15px; text-align: right; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 10px;">Total Approved Expense</th>
                    <th style="padding: 12px 15px; text-align: right; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #374151; text-transform: uppercase; font-size: 10px;">Net Balance</th>
                 </tr>
               </thead>
               <tbody>
                 <tr>
                    <td style="padding: 15px; text-align: left; border-right: 1px solid #e5e7eb; font-weight: 600; font-size: 13px;">৳ ${stats.regularAdv.toLocaleString()}</td>
                    <td style="padding: 15px; text-align: right; border-right: 1px solid #e5e7eb; font-weight: 600; font-size: 13px;">৳ ${stats.approvedExp.toLocaleString()}</td>
                    <td style="padding: 15px; text-align: right; font-weight: 900; color: ${stats.balance < 0 ? '#dc2626' : '#059669'}; font-size: 14px;">${stats.balance < 0 ? 'Payable' : 'Cash'} ৳ ${Math.abs(stats.balance).toLocaleString()}</td>
                 </tr>
               </tbody>
            </table>
         </div>
         <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px;">
            <div style="text-align: center; width: 30%;">
               <div style="border-top: 1px solid #9ca3af; width: 100%; margin-bottom: 8px;"></div>
               <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Receiver Signature</div>
            </div>
            <div style="text-align: center; width: 30%;">
               <div style="border-top: 1px solid #9ca3af; width: 100%; margin-bottom: 8px;"></div>
               <div style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Authority Signature</div>
            </div>
         </div>
         <div style="position: absolute; bottom: 10px; right: 20px; font-size: 9px; color: #cbd5e1; font-style: italic;">System Generated via Depend App • ${new Date().toLocaleString('bn-BD')}</div>
      </div>
    `;
  };

  const processVoucherDownload = async (expense: Expense) => {
    return new Promise<void>(async (resolve) => {
      try {
        const htmlContent = generateVoucherHTML(expense);
        const container = document.createElement('div');
        container.innerHTML = htmlContent;
        
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.style.width = '700px'; 
        container.style.zIndex = '-1000';
        container.style.backgroundColor = '#ffffff';
        
        document.body.appendChild(container);

        const images = container.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((res) => { img.onload = res; img.onerror = res; });
        });
        
        if (imagePromises.length > 0) await Promise.all(imagePromises);
        
        await new Promise(r => setTimeout(r, 800));

        // @ts-ignore
        if (window.html2canvas) {
           // @ts-ignore
           const canvas = await window.html2canvas(container.firstElementChild as HTMLElement, {
              scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: 1200
           });
           
           const link = document.createElement('a');
           link.download = `Voucher_${expense.staffName}_${expense.id.substring(0,6)}.png`;
           link.href = canvas.toDataURL('image/png');
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
        } else {
            alert("Image generation library (html2canvas) not found. Please refresh the page.");
        }
        document.body.removeChild(container);
      } catch (e) {
        console.error("Voucher Generation Error", e);
      }
      resolve();
    });
  };

  const handleDownloadPNG = async (expense: Expense) => {
    setDownloadingId(expense.id);
    await processVoucherDownload(expense);
    setDownloadingId(null);
  };

  const handleBulkDownload = async () => {
    const latestExpensesMap = new Map<string, Expense>();
    expenses.forEach(e => {
        if (!e.isDeleted && e.status === 'APPROVED') {
            const existing = latestExpensesMap.get(e.staffId);
            if (!existing) latestExpensesMap.set(e.staffId, e);
            else if (new Date(e.createdAt) > new Date(existing.createdAt)) latestExpensesMap.set(e.staffId, e);
        }
    });
    const targetExpenses = Array.from(latestExpensesMap.values());
    if (targetExpenses.length === 0) { alert("কোনো অনুমোদিত বিল পাওয়া যায়নি।"); return; }
    if (window.confirm(`সর্বমোট ${targetExpenses.length} জন স্টাফের লাস্ট ভাউচার ডাউনলোড করতে চান?`)) {
        setIsBulkDownloading(true);
        for (let i = 0; i < targetExpenses.length; i++) {
            setBulkProgress(`${i+1}/${targetExpenses.length}`);
            await processVoucherDownload(targetExpenses[i]);
            await new Promise(resolve => setTimeout(resolve, 2000)); 
        }
        setBulkProgress('');
        setIsBulkDownloading(false);
    }
  };

  const handlePrintPDF = (expense: Expense) => {
    const htmlContent = generateVoucherHTML(expense);
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (printWindow) {
       printWindow.document.open();
       printWindow.document.write(`<!DOCTYPE html><html><head><title>Voucher #${expense.id}</title><link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body { background-color: #f3f4f6; display: flex; justify-content: center; padding-top: 40px; margin: 0; font-family: 'Hind Siliguri', sans-serif; } @media print { body { background-color: white; padding: 0; display: block; -webkit-print-color-adjust: exact; } .no-print { display: none; } }</style></head><body>${htmlContent}<script>window.onload = function() { setTimeout(function() { window.print(); }, 800); };</script></body></html>`);
       printWindow.document.close();
    } else { alert("Print popup blocked. Please allow popups for this site."); }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (e.isDeleted) return false;
      if (role === UserRole.STAFF && currentUser) { if (e.staffName !== currentUser) return false; }
      if (selectedStaffFilter && e.staffId !== selectedStaffFilter) return false;
      
      const matchesSearch = e.reason.toLowerCase().includes(searchTerm.toLowerCase()) || e.staffName.toLowerCase().includes(searchTerm.toLowerCase());
      const expenseDate = new Date(e.createdAt).setHours(0, 0, 0, 0);
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
      const matchesDate = (!start || expenseDate >= start) && (!end || expenseDate <= end);
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [expenses, searchTerm, startDate, endDate, role, currentUser, selectedStaffFilter]);

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const banglaToEng = (str: string) => str.replace(/[০-৯]/g, d => "0123456789"["০১২৩৪৫৬৭৮৯".indexOf(d)]);
    let processedText = banglaToEng(text);
    const exclusionPattern = /(মিরপুর|উত্তরা|সেক্টর|রোড|বাসা|ফ্ল্যাট|লেভেল|তলা|ব্লক|লেন|ওয়ার্ড|নম্বর|নং|প্লাটফর্ম|গাড়ি|বাস নং|Mirpur|Uttara|Sector|Road|House|Flat|Level|Floor|Block|Lane|Ward|No|Num)[\s\-\.]*[0-9]+/gi;
    processedText = processedText.replace(exclusionPattern, (match) => match.replace(/[0-9]/g, 'X'));
    const matches = processedText.match(/(\d+(\.\d+)?)/g);
    let total = 0;
    if (matches) total = matches.reduce((sum, num) => sum + parseFloat(num), 0);
    setFormData(prev => ({ ...prev, reason: text, amount: total }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_WIDTH = 800;
          let width = img.width; let height = img.height;
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          setFormData(prev => ({ ...prev, voucherImage: canvas.toDataURL('image/jpeg', 0.7) }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm("আপনি কি নিশ্চিত যে ছবি মুছে ফেলতে চান?")) {
      setFormData(prev => ({ ...prev, voucherImage: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let targetStaffId = formData.staffId;
    if (role === UserRole.STAFF && currentUser) {
       const myself = activeStaff.find(s => s.name === currentUser);
       if (!myself) { alert("আপনার প্রোফাইল ডাটা পাওয়া যাচ্ছে না।"); return; }
       targetStaffId = myself.id;
    }
    if (!targetStaffId) { alert("স্টাফ নির্বাচন করা হয়নি।"); return; }
    const staff = activeStaff.find(s => s.id === targetStaffId);
    if (!staff) { alert("স্টাফ পাওয়া যায়নি।"); return; }
    if (!formData.amount || Number(formData.amount) <= 0) { alert("টাকার সঠিক পরিমাণ লিখুন।"); return; }
    if (!formData.date) { alert("তারিখ নির্বাচন করুন।"); return; }

    // Date Validation for Staff
    if (role === UserRole.STAFF) {
        if (formData.date < minDateStr) {
            alert(`দুঃখিত! আপনি সর্বোচ্চ ${allowedBackdateDays} দিন আগের বিল সাবমিট করতে পারবেন।`);
            return;
        }
        if (formData.date > maxDateStr) {
             alert("ভবিষ্যতের তারিখের বিল সাবমিট করা যাবে না।");
             return;
        }
    }

    const submitDate = new Date(formData.date);
    const now = new Date();
    submitDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const newExpense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: targetStaffId,
      staffName: staff.name,
      amount: Number(formData.amount),
      reason: formData.reason,
      voucherImage: formData.voucherImage,
      status: 'PENDING',
      createdAt: submitDate.toISOString()
    };
    
    setExpenses(prev => [newExpense, ...prev]);
    setIsSubmitModalOpen(false);
    
    setFormData({ 
      staffId: '', amount: 0, reason: '', voucherImage: '', 
      date: new Date().toISOString().split('T')[0] 
    });
  };

  const updateStatus = (id: string, status: Expense['status']) => {
    if (status === 'REJECTED' && !window.confirm('আপনি কি নিশ্চিত যে এই বিলটি বাতিল (Reject) করতে চান?')) return;
    // Removed confirmation for APPROVE to make it instant/easier
    
    setExpenses(prevExpenses => prevExpenses.map(e => e.id === id ? { ...e, status } : e));
  };

  const requestDelete = (expense: Expense) => setDeleteConfirmExpense(expense);
  const confirmDelete = () => { 
    if (deleteConfirmExpense) { 
      setExpenses(prev => prev.map(e => e.id === deleteConfirmExpense.id ? { ...e, isDeleted: true } : e)); 
      setDeleteConfirmExpense(null); 
    } 
  };

  const handleApproveAll = () => {
    const pendingCount = expenses.filter(e => !e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED')).length;
    if (pendingCount === 0) { alert('কোনো পেন্ডিং বা ভেরিফাইড বিল নেই।'); return; }
    if (window.confirm(`আপনি কি নিশ্চিত যে ${pendingCount} টি বিল একসাথে অ্যাপ্রুভ করতে চান?`)) {
      setExpenses(prevExpenses => prevExpenses.map(e => (!e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED')) ? { ...e, status: 'APPROVED' } : e));
    }
  };

  const handleOpenSubmitModal = () => {
    let initialStaffId = '';
    if (role === UserRole.STAFF && currentUser) {
      const myself = activeStaff.find(s => s.name === currentUser);
      if (myself) initialStaffId = myself.id;
    }
    setFormData({ staffId: initialStaffId, amount: 0, reason: '', voucherImage: '', date: new Date().toISOString().split('T')[0] });
    setIsSubmitModalOpen(true);
  };

  const openCorrectionModal = (e: Expense) => {
    const dateStr = getSafeDateStr(e.createdAt) || new Date().toISOString().split('T')[0];
    setCorrectionData({ id: e.id, amount: e.amount, reason: e.reason, date: dateStr });
    setIsCorrectionModalOpen(true);
  };

  const saveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionData) return;
    setExpenses(prev => prev.map(ex => {
      if (ex.id === correctionData.id) {
        const originalDate = new Date(ex.createdAt);
        const [y, m, d] = correctionData.date.split('-').map(Number);
        const updatedDate = new Date(originalDate);
        updatedDate.setFullYear(y); updatedDate.setMonth(m - 1); updatedDate.setDate(d);
        return { ...ex, amount: Number(correctionData.amount), reason: correctionData.reason, createdAt: updatedDate.toISOString() };
      }
      return ex;
    }));
    setIsCorrectionModalOpen(false); setCorrectionData(null);
  };

  const clearFilters = () => { setSearchTerm(''); setStartDate(''); setEndDate(''); setSelectedStaffFilter(''); };

  const getStaffDisplayId = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff ? staff.staffId : '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">খরচ ও ভাউচার ম্যানেজমেন্ট</h2>
        <div className="flex flex-wrap gap-2">
            {(role === UserRole.ADMIN || role === UserRole.MD) && (
               <button onClick={handleBulkDownload} disabled={isBulkDownloading} className="h-9 px-4 rounded-full bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 border border-indigo-100 dark:border-gray-700 font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 outline-none disabled:opacity-50">
                   {isBulkDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Images className="w-3.5 h-3.5" />} 
                   <span>{isBulkDownloading ? `Processing ${bulkProgress}...` : 'Daily Vouchers'}</span>
               </button>
            )}
            {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
              <button onClick={handleOpenSubmitModal} className="h-9 px-5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 outline-none active:scale-95">
                <Receipt className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">New Bill</span>
              </button>
            )}
            {role === UserRole.MD && (
              <button onClick={handleApproveAll} className="h-9 px-5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center gap-2 outline-none active:scale-95">
                <CheckCheck className="w-3.5 h-3.5" /> <span className="whitespace-nowrap">Approve All</span>
              </button>
            )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 backdrop-blur-xl p-2 rounded-[2rem] shadow-sm shadow-indigo-100/50 dark:shadow-none border border-indigo-100/50 dark:border-gray-700 flex flex-col lg:flex-row items-center gap-2 mb-6 transition-all">
        <div className="relative flex-1 w-full lg:w-auto group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input type="text" placeholder="Search..." className="block w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border-none rounded-full text-xs font-bold text-slate-600 dark:text-gray-300 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-gray-600 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 outline-none h-9 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {(role === UserRole.ADMIN || role === UserRole.MD) && (
          <div className="relative w-full lg:w-40 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500 group-focus-within:text-purple-500 transition-colors" /></div>
              <select className="block w-full pl-9 pr-8 py-2 bg-white dark:bg-gray-800 border-none rounded-full text-xs font-bold text-slate-600 dark:text-gray-300 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-purple-100 dark:focus:ring-gray-600 transition-all appearance-none cursor-pointer outline-none h-9 shadow-sm" value={selectedStaffFilter} onChange={(e) => setSelectedStaffFilter(e.target.value)}>
                <option value="">All Staff</option>
                {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><ChevronDown className="h-3 w-3 text-slate-300" /></div>
          </div>
        )}
        <div className="flex items-center bg-white dark:bg-gray-800 rounded-full px-1 py-1 border border-indigo-50 dark:border-gray-700 h-9 w-full lg:w-auto shadow-sm">
            <div className="relative flex-1 min-w-[100px]"><input type="date" className="block w-full pl-3 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-500 dark:text-gray-400 focus:ring-0 cursor-pointer h-full outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <span className="text-slate-300 dark:text-gray-600 text-[10px] font-bold px-1">to</span>
            <div className="relative flex-1 min-w-[100px]"><input type="date" className="block w-full pl-1 pr-3 py-1 bg-transparent border-none text-[10px] font-bold text-slate-500 dark:text-gray-400 focus:ring-0 cursor-pointer h-full text-right outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <div className="flex items-center gap-1.5 w-full lg:w-auto justify-end">
            <button onClick={clearFilters} className="w-9 h-9 flex items-center justify-center bg-white dark:bg-gray-800 text-slate-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all border border-slate-100 dark:border-gray-700 shadow-sm outline-none" title="Reset Filters"><FilterX className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExpenses.map((expense) => {
          const expenseDateStr = getSafeDateStr(expense.createdAt);
          const isDuplicate = expenses.filter(e => !e.isDeleted && e.staffId === expense.staffId && getSafeDateStr(e.createdAt) === expenseDateStr).length > 1;
          const staffMember = staffList.find(s => s.id === expense.staffId);

          return (
          <div key={expense.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border overflow-hidden flex flex-col hover:shadow-md transition-all ${isDuplicate && (role === UserRole.ADMIN || role === UserRole.MD) ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100 dark:border-gray-700'}`}>
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${expense.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : expense.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : expense.status === 'VERIFIED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                  {expense.status === 'PENDING' ? 'পেন্ডিং' : expense.status === 'VERIFIED' ? 'ভেরিফাইড (MD)' : expense.status === 'APPROVED' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'}
                </span>
                <div className="flex items-center gap-2">
                  {/* EDIT Button Logic: MD can NOT edit Pending bills */}
                  {((role === UserRole.ADMIN && (expense.status === 'PENDING' || expense.status === 'VERIFIED')) || (role === UserRole.MD && expense.status === 'VERIFIED')) && (
                    <button onClick={() => openCorrectionModal(expense)} className="text-orange-500 hover:text-orange-700 transition-colors p-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full" title="বিল সংশোধন করুন"><Edit3 className="w-4 h-4" /></button>
                  )}
                  {expense.voucherImage && (
                    <button onClick={() => setViewingVoucher(expense.voucherImage!)} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full" title="ভাউচার দেখুন"><Eye className="w-4 h-4" /></button>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(expense.createdAt).toLocaleDateString('bn-BD')}</p>
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-1">৳ {expense.amount.toLocaleString()}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 font-medium h-10 line-clamp-2">{expense.reason}</p>
              {isDuplicate && (role === UserRole.ADMIN || role === UserRole.MD) && (
                 <div className="mb-3 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-[10px] font-black flex items-center gap-1.5 border border-red-200 animate-pulse"><AlertTriangle className="w-4 h-4" /> সতর্কতা: ডুপ্লিকেট এন্ট্রি!</div>
              )}
              <div className="flex items-center gap-3 py-3 border-t border-gray-50 dark:border-gray-700">
                <div onClick={() => onOpenProfile && onOpenProfile(expense.staffId)} className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs cursor-pointer hover:ring-2 hover:ring-indigo-200 transition-all overflow-hidden">
                  {staffMember && staffMember.photo ? <img src={staffMember.photo} alt={expense.staffName} className="w-full h-full object-cover" /> : expense.staffName[0]}
                </div>
                <div><p className="text-xs font-bold text-gray-700 dark:text-gray-200">{expense.staffName}</p><p className="text-[10px] text-gray-400">ID: {getStaffDisplayId(expense.staffId)}</p></div>
              </div>
              {expense.status === 'APPROVED' && (
                 <div className="mt-3 flex gap-2">
                    <button onClick={() => handleDownloadPNG(expense)} disabled={downloadingId === expense.id} className="flex-1 bg-gray-900 dark:bg-black text-white py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-black dark:hover:bg-gray-900 transition-all disabled:opacity-70 disabled:cursor-wait">
                       {downloadingId === expense.id ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Downloading...</span> : <><ImageIcon className="w-3 h-3" /> PNG Voucher</>}
                    </button>
                    <button onClick={() => handlePrintPDF(expense)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all border border-gray-200 dark:border-gray-600"><Printer className="w-3 h-3" /> PDF/Print</button>
                 </div>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 flex gap-2 border-t border-gray-100 dark:border-gray-700">
               {role === UserRole.ADMIN && (
                 <>
                   {expense.status === 'PENDING' && (
                     <>
                        <button onClick={() => updateStatus(expense.id, 'VERIFIED')} className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors">MD-র কাছে পাঠান</button>
                        <button onClick={() => updateStatus(expense.id, 'REJECTED')} className="flex-1 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 py-2 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">বাতিল</button>
                        <button onClick={() => requestDelete(expense)} className="px-3 bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 py-2 rounded-lg hover:text-red-500 hover:border-red-200 transition-colors"><Trash2 className="w-4 h-4" /></button>
                     </>
                   )}
                   {expense.status === 'VERIFIED' && (
                     <>
                        <button onClick={() => updateStatus(expense.id, 'PENDING')} className="flex-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 py-2 rounded-lg text-xs font-bold hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors flex items-center justify-center gap-2"><RotateCcw className="w-3.5 h-3.5" /> ফেরত আনুন</button>
                        <button onClick={() => requestDelete(expense)} className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 py-2 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"><Trash2 className="w-3.5 h-3.5" /> ডিলিট করুন</button>
                     </>
                   )}
                 </>
               )}
               {role === UserRole.MD && (
                 <>
                   {expense.status === 'VERIFIED' && (
                      <>
                        <button type="button" onClick={() => updateStatus(expense.id, 'APPROVED')} className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer active:scale-95"><CheckCircle className="w-4 h-4 inline mr-1"/> অ্যাপ্রুভ করুন</button>
                        <button type="button" onClick={() => updateStatus(expense.id, 'REJECTED')} className="flex-1 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 py-2 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer active:scale-95">বাতিল</button>
                      </>
                   )}
                   {expense.status === 'PENDING' && (
                      <div className="flex-[2] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-not-allowed select-none">
                        <Clock className="w-3 h-3" /> অ্যাডমিন ভেরিফিকেশন বাকি
                      </div>
                   )}
                 </>
               )}
               {((role === UserRole.ADMIN || role === UserRole.MD) && (expense.status === 'APPROVED' || expense.status === 'REJECTED')) && (
                  <button onClick={() => requestDelete(expense)} className="w-full bg-white dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-red-200 hover:text-red-500 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> রেকর্ড মুছে ফেলুন</button>
               )}
            </div>
          </div>
        )})}
        {filteredExpenses.length === 0 && <div className="col-span-full py-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">কোনো বিল পাওয়া যায়নি</div>}
      </div>

      {isSubmitModalOpen && createPortal(
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-indigo-600 text-white shrink-0">
              <h3 className="font-bold text-xl">নতুন বিল জমা দিন</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors">×</button>
            </div>
            
            <form id="expense-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto p-4 custom-scrollbar flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">স্টাফ নির্বাচন করুন</label>
                    {role === UserRole.STAFF ? (
                      <div className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between cursor-not-allowed">
                         <span>{currentUser}</span>
                         <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded uppercase">Self</span>
                      </div>
                    ) : (
                      <select required className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})}>
                        <option value="">নির্বাচন করুন</option>
                        {activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">তারিখ (Date)</label>
                      <input 
                        type="date" 
                        required 
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold" 
                        value={formData.date} 
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        min={role === UserRole.STAFF ? minDateStr : undefined}
                        max={maxDateStr}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">টাকার পরিমাণ</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                        <input required type="number" className="w-full pl-7 pr-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-lg text-gray-800 dark:text-white" placeholder="0.00" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                  
                  {duplicateCheck.length > 0 && (
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex flex-col gap-2 animate-in fade-in zoom-in duration-300">
                          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-black text-xs uppercase tracking-widest"><AlertTriangle className="w-4 h-4" /> সতর্কতা: ডুপ্লিকেট এন্ট্রি!</div>
                          <p className="text-xs font-bold text-red-600 dark:text-red-300 leading-relaxed">এই স্টাফের নামের সাথে <u>{new Date(formData.date).toLocaleDateString('bn-BD')}</u> তারিখে ইতিমধ্যে <span className="text-lg">{duplicateCheck.length}</span> টি বিল আছে।</p>
                          <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg max-h-24 overflow-y-auto custom-scrollbar">
                              {duplicateCheck.map(e => (
                                  <div key={e.id} className="flex justify-between text-[10px] font-bold text-red-500 dark:text-red-400 border-b border-red-100 dark:border-red-800 last:border-0 py-1">
                                      <span>{e.reason.substring(0, 20)}...</span><span>৳ {e.amount}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex justify-between">
                      <span>খরচের কারণ ও বিবরণ</span>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3"/> Auto Calculator</span>
                    </label>
                    <textarea required rows={2} className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="যেমন: নাস্তা ৫০, রিক্সা ভাড়া ১০০..." value={formData.reason} onChange={handleReasonChange} />
                    
                    {detectedTypos.length > 0 && (
                       <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg animate-in fade-in zoom-in duration-200">
                          <div className="flex items-center gap-1.5 text-yellow-800 dark:text-yellow-400 text-[10px] font-bold uppercase mb-1.5">
                             <Wand2 className="w-3 h-3" />
                             বানান সতর্কতা (Spelling Suggestion)
                          </div>
                          <div className="flex flex-wrap gap-2">
                             {detectedTypos.map((typo, idx) => (
                                <button 
                                  key={idx}
                                  type="button" 
                                  onClick={() => fixTypo(typo.wrong, typo.correct)}
                                  className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 rounded text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors shadow-sm"
                                  title="ক্লিক করে ঠিক করুন"
                                >
                                   <span className="line-through text-red-400 opacity-70">{typo.wrong}</span>
                                   <span className="text-gray-400">→</span>
                                   <span className="text-green-600 dark:text-green-400">{typo.correct}</span>
                                </button>
                             ))}
                          </div>
                       </div>
                    )}
                  </div>

                  <div className="space-y-2">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ভাউচার ছবি</label>
                     <div className="flex gap-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-600 transition-colors"><ImageIcon className="w-4 h-4" /> গ্যালারি</button>
                        <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-indigo-100 dark:border-indigo-800 transition-colors"><Camera className="w-4 h-4" /> ক্যামেরা</button>
                     </div>
                     <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
                     <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleImageUpload} />
                     
                     {formData.voucherImage ? (
                       <div className="relative h-24 w-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                         <img src={formData.voucherImage} alt="Preview" className="h-full w-full object-contain" />
                         <button type="button" onClick={removeImage} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-sm hover:bg-red-600 transition-colors"><X className="w-3 h-3" /></button>
                       </div>
                     ) : (
                       <div className="h-24 w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-400">
                          <p className="text-xs">কোনো ছবি নির্বাচন করা হয়নি</p>
                       </div>
                     )}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
                    <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95">
                        <MessageCircle className="w-4 h-4" /> সাবমিট করুন (Submit)
                    </button>
                </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isCorrectionModalOpen && correctionData && createPortal(
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
             <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-orange-500 text-white flex justify-between items-center shrink-0">
                <h3 className="font-bold text-lg">বিল সংশোধন (Correction)</h3>
                <button onClick={() => setIsCorrectionModalOpen(false)} className="text-orange-100 hover:text-white"><X className="w-5 h-5"/></button>
             </div>
             <div className="overflow-y-auto p-6 custom-scrollbar">
                 <form onSubmit={saveCorrection} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">তারিখ (Date)</label>
                      <input type="date" required className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-gray-800 dark:text-white" value={correctionData.date} onChange={(e) => setCorrectionData({...correctionData, date: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">সঠিক টাকার পরিমাণ</label>
                      <input type="number" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-xl text-gray-800 dark:text-white" value={correctionData.amount} onChange={(e) => setCorrectionData({...correctionData, amount: Number(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">সংশোধিত কারণ/নোট</label>
                      <textarea rows={4} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-medium dark:text-gray-200" value={correctionData.reason} onChange={(e) => setCorrectionData({...correctionData, reason: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-100 flex items-center justify-center gap-2"><Edit3 className="w-4 h-4" /> সেইভ করুন</button>
                 </form>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmExpense && createPortal(
        <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {deleteConfirmExpense.status === 'APPROVED' ? 
                  `আপনি ৳${deleteConfirmExpense.amount} টাকার একটি "অনুমোদিত" (Approved) বিল ডিলিট করতে চাচ্ছেন।` :
                 deleteConfirmExpense.status === 'PENDING' ?
                  `আপনি ৳${deleteConfirmExpense.amount} টাকার একটি "পেন্ডিং" (Pending) বিল ডিলিট করতে চাচ্ছেন।` :
                 deleteConfirmExpense.status === 'VERIFIED' ?
                  `এই বিলটি ভেরিফাই করা হয়েছে (MD-এর অনুমোদনের অপেক্ষায়)। আপনি কি এটি ডিলিট করতে চান?` :
                 deleteConfirmExpense.status === 'REJECTED' ?
                  `আপনি একটি "বাতিল করা" (Rejected) বিল ডিলিট করছেন।` :
                  `আপনি কি নিশ্চিত যে এই বিলটি ডিলিট করতে চান?`
                }
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmExpense(null)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">না, বাতিল করুন</button>
                <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors">হ্যাঁ, ডিলিট করুন</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {viewingVoucher && createPortal(
        <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in zoom-in duration-200" onClick={() => setViewingVoucher(null)}>
          <div className="relative max-w-3xl w-full max-h-screen p-2">
             <button onClick={() => setViewingVoucher(null)} className="absolute -top-12 right-0 text-white hover:text-red-400 transition-colors"><X className="w-8 h-8" /></button>
             <img src={viewingVoucher} alt="Voucher Full View" className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExpenseManagementView;