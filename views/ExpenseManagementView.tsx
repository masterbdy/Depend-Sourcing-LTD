
import React, { useState, useMemo, useRef } from 'react';
import { Receipt, Camera, CheckCircle, XCircle, Clock, Eye, Trash2, Search, Calendar, FilterX, RotateCcw, CheckCheck, Sparkles, X, Edit3, User, AlertTriangle, Eraser, FileText, ShieldAlert, Printer, Download, ImageIcon, Loader2, Upload, Files } from 'lucide-react';
import { Expense, Staff, UserRole, AppNotification, AdvanceLog } from '../types';

interface ExpenseProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  staffList: Staff[];
  role: UserRole;
  currentUser: string | null;
  onNotify?: (title: string, message: string, type: AppNotification['type']) => void;
  advances: AdvanceLog[];
  onOpenProfile?: (staffId: string) => void;
}

const ExpenseManagementView: React.FC<ExpenseProps> = ({ expenses = [], setExpenses, staffList = [], role, currentUser, advances = [], onOpenProfile }) => {
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Status Update Confirmation State
  const [statusConfirmData, setStatusConfirmData] = useState<{id: string, status: Expense['status']} | null>(null);

  // Voucher Generator State
  const [voucherPreviewData, setVoucherPreviewData] = useState<Expense | null>(null);
  const voucherRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // SAFE ARRAY ACCESS
  const activeStaff = (staffList || []).filter(s => s && !s.deletedAt && s.status === 'ACTIVE');
  const allStaffForFilter = (staffList || []).filter(s => s && !s.deletedAt);

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

  // Real-time Duplicate Check for Modal
  const isSubmissionDuplicate = useMemo(() => {
    if (!formData.staffId || !formData.date) return false;
    return (expenses || []).some(e => 
      !e.isDeleted && 
      e.staffId === formData.staffId && 
      getSafeDateStr(e.createdAt) === formData.date
    );
  }, [formData.staffId, formData.date, expenses]);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      if (!e || e.isDeleted) return false;

      // SECURITY: Staff can only see their own expenses
      if (role === UserRole.STAFF && currentUser) {
         if (e.staffName !== currentUser) return false;
      }
      
      // Filter by Selected Staff (Dropdown)
      if (selectedStaffFilter && e.staffId !== selectedStaffFilter) {
        return false;
      }
      
      const safeReason = (e.reason || '').toLowerCase();
      const safeStaffName = (e.staffName || '').toLowerCase();
      const safeSearch = searchTerm.toLowerCase();

      const matchesSearch = 
        safeReason.includes(safeSearch) || 
        safeStaffName.includes(safeSearch);
      
      const expenseDate = new Date(e.createdAt).setHours(0, 0, 0, 0);
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

      const matchesDate = (!start || expenseDate >= start) && (!end || expenseDate <= end);

      return matchesSearch && matchesDate;
    })
    // Sort by Date Descending (Newest First)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [expenses, searchTerm, selectedStaffFilter, startDate, endDate, role, currentUser]);

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    // 1. Convert Bengali digits to English
    let processedText = text.replace(/[০-৯]/g, d => "0123456789"["০১২৩৪৫৬৭৮৯".indexOf(d)]);
    // 2. Normalize Separators
    processedText = processedText.replace(/[\u2013\u2014]/g, '-');
    // 3. Remove Explicit Date Ranges
    const explicitDateRangeRegex = /(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s*(?:to|থেকে|\-|–|—)\s*(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/gi;
    processedText = processedText.replace(explicitDateRangeRegex, 'SKIP_DATE_RANGE');
    // 4. Pre-processing
    processedText = processedText.replace(/([a-zA-Z\u0980-\u09FF]+)[\s\-:=]+(\d+)/g, '$1 $2');
    processedText = processedText.replace(/(taka|tk|bdt|টাকা)/gi, 'CURRENCY_SYMBOL');
    // 5. Exclusions
    processedText = processedText.replace(/\d{4}-\d{2}-\d{2}/g, 'SKIP_DATE'); 
    processedText = processedText.replace(/\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/g, 'SKIP_DATE');
    processedText = processedText.replace(/01\d{9}/g, 'SKIP_PHONE');
    processedText = processedText.replace(/\d{1,2}:\d{2}/g, 'SKIP_TIME_COLON'); 
    processedText = processedText.replace(/\d{1,2}[:\.]\d{2}\s*(am|pm|a\.m|p\.m)/gi, 'SKIP_TIME');
    processedText = processedText.replace(/\d{1,2}\s*(am|pm|a\.m|p\.m|টা|বাজে|বাজা)/gi, 'SKIP_TIME');
    
    // Summation
    const matches = processedText.match(/(\d+(\.\d+)?)/g);
    let total = 0;
    if (matches) {
      total = matches.reduce((sum, num) => sum + parseFloat(num), 0);
    }

    setFormData(prev => ({
      ...prev,
      reason: text,
      amount: total 
    }));
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
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ ...prev, voucherImage: dataUrl }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm("ছবি মুছতে চান?")) {
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
       if (!myself) {
         alert("প্রোফাইল ডাটা পাওয়া যাচ্ছে না।");
         return;
       }
       targetStaffId = myself.id;
    }

    if (!targetStaffId) return alert("স্টাফ নির্বাচন করুন।");
    
    const staff = activeStaff.find(s => s.id === targetStaffId);
    if (!staff) return alert("স্টাফ পাওয়া যায়নি।");

    if (!formData.amount || Number(formData.amount) <= 0) return alert("টাকার পরিমাণ লিখুন।");
    if (!formData.date) return alert("তারিখ দিন।");

    if (role === UserRole.STAFF) {
        const [y, m, d] = formData.date.split('-').map(Number);
        const selectedDate = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - selectedDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) return alert(`স্টাফরা সর্বোচ্চ ১ দিন আগের বিল দিতে পারবে।`);
        if (diffDays < 0) return alert("ভবিষ্যতের তারিখ দেওয়া যাবে না।");
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
    setFormData({ staffId: '', amount: 0, reason: '', voucherImage: '', date: new Date().toISOString().split('T')[0] });
  };

  const updateStatus = (id: string, status: Expense['status']) => {
    setStatusConfirmData({ id, status });
  };

  const confirmStatusUpdate = () => {
    if (statusConfirmData) {
      setExpenses(prev => prev.map(e => e.id === statusConfirmData.id ? { ...e, status: statusConfirmData.status } : e));
      setStatusConfirmData(null);
    }
  };

  const softDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setExpenses(prev => prev.map(e => e.id === deleteConfirmId ? { ...e, isDeleted: true } : e));
      setDeleteConfirmId(null);
    }
  };

  const handleClearHistory = () => {
    const candidates = (expenses || []).filter(e => !e.isDeleted && (e.status === 'APPROVED' || e.status === 'REJECTED'));
    const count = candidates.length;

    if (count === 0) return alert('কোনো ডাটা নেই।');

    if (window.confirm(`${count} টি পুরনো বিল (Approved/Rejected) ডিলিট করতে চান?`)) {
      setExpenses(prev => prev.map(e => (e.status === 'APPROVED' || e.status === 'REJECTED') ? { ...e, isDeleted: true } : e));
      alert('ক্লিন করা হয়েছে।');
    }
  };

  const handleApproveAll = () => {
    if (window.confirm(`সব পেন্ডিং বিল অ্যাপ্রুভ করতে চান?`)) {
      setExpenses(prev => prev.map(e => (!e.isDeleted && (e.status === 'PENDING' || e.status === 'VERIFIED')) ? { ...e, status: 'APPROVED' } : e));
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
    if (!correctionData || !correctionData.date) return;
    
    setExpenses(prev => prev.map(ex => {
      if (ex.id === correctionData.id) {
        try {
            const originalDate = new Date(ex.createdAt);
            const [y, m, d] = correctionData.date.split('-').map(Number);
            const updatedDate = new Date(originalDate);
            updatedDate.setFullYear(y);
            updatedDate.setMonth(m - 1);
            updatedDate.setDate(d);
            
            return { ...ex, amount: Number(correctionData.amount), reason: correctionData.reason, createdAt: updatedDate.toISOString() };
        } catch { return ex; }
      }
      return ex;
    }));
    
    setIsCorrectionModalOpen(false);
    setCorrectionData(null);
  };

  const getStaffDisplayId = (staffId: string) => {
    const staff = (staffList || []).find(s => s.id === staffId);
    return staff ? staff.staffId : '';
  };

  // Helper to convert number to words (Simple version for demo)
  const numberToWords = (num: number) => {
     return `${num} Taka Only`;
  };

  // --- CORPORATE VOUCHER GENERATION ---
  const generateApprovalVoucher = (expense: Expense) => {
    const staff = (staffList || []).find(s => s.id === expense.staffId);
    
    // Ledger Calculation
    const staffApprovedExpenses = (expenses || [])
      .filter(e => !e.isDeleted && e.status === 'APPROVED' && e.staffId === expense.staffId)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const staffRegularAdvances = (advances || [])
      .filter(a => !a.isDeleted && a.type !== 'SALARY' && a.staffId === expense.staffId)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const balance = staffRegularAdvances - staffApprovedExpenses;
    let balanceText = '';
    let balanceColor = '#16a34a'; // Green

    if (balance < 0) {
       balanceText = `Payable: ${Math.abs(balance).toLocaleString()} BDT`;
       balanceColor = '#dc2626'; // Red
    } else {
       balanceText = `Cash In Hand: ${balance.toLocaleString()} BDT`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const voucherHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Payment Voucher #${expense.id}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          body { 
            font-family: 'Inter', sans-serif; 
            background: #fff;
            color: #1e293b; /* Slate 800 */
            margin: 0;
            padding: 40px;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          
          .voucher-box {
            border: 1px solid #e2e8f0; /* Very light border */
            padding: 40px;
            max-width: 210mm;
            margin: 0 auto;
            position: relative;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); /* Soft shadow for screen */
          }

          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f1f5f9; /* Light divider */
          }

          .company-logo {
             width: 40px; 
             height: 40px; 
             background: #0f172a; 
             border-radius: 8px;
             display: flex;
             align-items: center;
             justify-content: center;
             color: white;
             font-weight: bold;
             font-size: 20px;
             margin-right: 12px;
          }

          .company-info h1 {
            font-size: 24px;
            font-weight: 800;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .company-info p {
            font-size: 11px;
            margin: 4px 0 0;
            color: #64748b;
            font-weight: 500;
            letter-spacing: 0.5px;
          }

          .voucher-meta {
            text-align: right;
          }
          .voucher-badge {
            background-color: #f8fafc;
            color: #64748b;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: inline-block;
            margin-bottom: 8px;
            border: 1px solid #e2e8f0;
          }
          .voucher-id {
            font-size: 14px;
            font-weight: 700;
            color: #334155;
            font-family: monospace;
          }

          /* Grid Layout for Info */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          
          .info-group {
            margin-bottom: 15px;
          }
          .info-label {
            font-size: 10px;
            color: #94a3b8;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            display: block;
          }
          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
            padding-bottom: 4px;
            border-bottom: 1px solid #f1f5f9;
            display: block;
          }

          /* Table Styling */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            text-align: left;
            padding: 12px 16px;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
          }
          td {
            padding: 16px;
            font-size: 13px;
            color: #334155;
            border-bottom: 1px solid #f1f5f9;
          }
          .amount-cell {
            text-align: right;
            font-weight: 700;
            font-family: monospace;
            font-size: 14px;
          }
          .total-row td {
            border-top: 2px solid #e2e8f0;
            border-bottom: none;
            font-weight: 800;
            font-size: 16px;
            color: #0f172a;
            padding-top: 20px;
          }

          /* Ledger Box */
          .ledger-summary {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .ledger-item {
            text-align: center;
            flex: 1;
          }
          .ledger-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            display: block;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
          }
          .ledger-value {
            font-size: 14px;
            font-weight: 700;
            color: #334155;
          }

          /* Footer Signatures */
          .footer {
            display: flex;
            justify-content: space-between;
            margin-top: 80px;
            padding-top: 20px;
          }
          .signature-box {
            width: 22%;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #cbd5e1;
            margin-bottom: 10px;
          }
          .signature-text {
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          /* Watermark */
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 100px;
            font-weight: 900;
            color: rgba(241, 245, 249, 0.8); /* Very faint slate */
            pointer-events: none;
            z-index: 0;
            white-space: nowrap;
            user-select: none;
          }

          @media print {
            body { background: white; padding: 0; margin: 0; }
            .voucher-box { border: none; box-shadow: none; padding: 40px; }
          }
        </style>
      </head>
      <body>
        <div class="voucher-box">
           <div class="watermark">OFFICE COPY</div>
           
           <div class="header">
              <div style="display: flex; align-items: center;">
                 <div class="company-logo">DS</div>
                 <div class="company-info">
                    <h1>Depend Sourcing Ltd.</h1>
                    <p>Promise Beyond Business</p>
                    <p>Head Office: A-14/8, Johir Complex, Savar, Dhaka.</p>
                 </div>
              </div>
              <div class="voucher-meta">
                 <div class="voucher-badge">Payment Voucher</div>
                 <div class="voucher-id">#${expense.id.substring(0, 8).toUpperCase()}</div>
                 <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${new Date(expense.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
           </div>

           <div class="info-grid">
              <div class="left-col">
                 <div class="info-group">
                    <span class="info-label">Pay To</span>
                    <span class="info-value">${expense.staffName}</span>
                 </div>
                 <div class="info-group">
                    <span class="info-label">Designation</span>
                    <span class="info-value">${staff?.designation || 'Staff'}</span>
                 </div>
              </div>
              <div class="right-col">
                 <div class="info-group">
                    <span class="info-label">Staff ID</span>
                    <span class="info-value">${staff?.staffId || 'N/A'}</span>
                 </div>
                 <div class="info-group">
                    <span class="info-label">Payment Mode</span>
                    <span class="info-value">Cash / Adjustment</span>
                 </div>
              </div>
           </div>

           <table>
              <thead>
                 <tr>
                    <th style="width: 10%">SL</th>
                    <th style="width: 70%">Description</th>
                    <th style="width: 20%; text-align: right;">Amount</th>
                 </tr>
              </thead>
              <tbody>
                 <tr>
                    <td>01</td>
                    <td>
                       <span style="font-weight: 600; display: block; margin-bottom: 4px; color: #1e293b;">Expense Reimbursement</span>
                       <span style="color: #64748b; font-size: 12px;">${expense.reason}</span>
                    </td>
                    <td class="amount-cell">৳ ${expense.amount.toLocaleString()}</td>
                 </tr>
                 <!-- Spacer Row -->
                 <tr style="height: 60px;"><td></td><td></td><td></td></tr>
                 <tr class="total-row">
                    <td colspan="2" style="text-align: right; padding-right: 20px;">TOTAL AMOUNT</td>
                    <td class="amount-cell">৳ ${expense.amount.toLocaleString()}</td>
                 </tr>
              </tbody>
           </table>

           <div style="font-size: 11px; color: #64748b; margin-bottom: 30px; font-style: italic; padding-left: 10px;">
              <strong>In Words:</strong> ${expense.amount} Taka Only (approx).
           </div>

           <div class="ledger-summary">
              <div class="ledger-item">
                 <span class="ledger-label">Total Expenses</span>
                 <span class="ledger-value">৳ ${staffApprovedExpenses.toLocaleString()}</span>
              </div>
              <div style="width: 1px; height: 30px; background: #e2e8f0;"></div>
              <div class="ledger-item">
                 <span class="ledger-label">Total Advance</span>
                 <span class="ledger-value">৳ ${staffRegularAdvances.toLocaleString()}</span>
              </div>
              <div style="width: 1px; height: 30px; background: #e2e8f0;"></div>
              <div class="ledger-item">
                 <span class="ledger-label">Net Balance</span>
                 <span class="ledger-value" style="color: ${balanceColor}">${balanceText}</span>
              </div>
           </div>

           <div class="footer">
              <div class="signature-box">
                 <div class="signature-line"></div>
                 <div class="signature-text">Prepared By</div>
              </div>
              <div class="signature-box">
                 <div class="signature-line"></div>
                 <div class="signature-text">Verified By</div>
              </div>
              <div class="signature-box">
                 <div class="signature-line"></div>
                 <div class="signature-text">Authorized By</div>
              </div>
              <div class="signature-box">
                 <div class="signature-line"></div>
                 <div class="signature-text">Receiver</div>
              </div>
           </div>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 800); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(voucherHtml);
    printWindow.document.close();
  };

  const handleBulkDownloadLastVouchers = () => {
    if (role !== UserRole.ADMIN) return;

    const latestVouchers: Expense[] = [];
    
    // Iterate active staff to ensure we get one per staff
    activeStaff.forEach(staff => {
        const staffExpenses = expenses.filter(e => 
            !e.isDeleted && 
            e.status === 'APPROVED' && 
            e.staffId === staff.id
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (staffExpenses.length > 0) {
            latestVouchers.push(staffExpenses[0]);
        }
    });

    if (latestVouchers.length === 0) {
        alert("কোনো অনুমোদিত ভাউচার পাওয়া যায়নি।");
        return;
    }

    // Generate HTML
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let vouchersHtml = '';

    latestVouchers.forEach((expense, index) => {
        const staff = staffList.find(s => s.id === expense.staffId);
        
        // Ledger Calculation (Same as individual voucher)
        const staffApprovedExpenses = expenses
          .filter(e => !e.isDeleted && e.status === 'APPROVED' && e.staffId === expense.staffId)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const staffRegularAdvances = advances
          .filter(a => !a.isDeleted && a.type !== 'SALARY' && a.staffId === expense.staffId)
          .reduce((sum, a) => sum + Number(a.amount), 0);

        const balance = staffRegularAdvances - staffApprovedExpenses;
        let balanceText = '';
        let balanceColor = '#16a34a'; 

        if (balance < 0) {
           balanceText = `Payable: ${Math.abs(balance).toLocaleString()} BDT`;
           balanceColor = '#dc2626';
        } else {
           balanceText = `Cash In Hand: ${balance.toLocaleString()} BDT`;
        }

        vouchersHtml += `
            <div class="voucher-wrapper" style="page-break-after: always; height: 100vh; display: flex; flex-direction: column; justify-content: center;">
                <div class="voucher-box">
                   <div class="watermark">OFFICE COPY</div>
                   
                   <div class="header">
                      <div style="display: flex; align-items: center;">
                         <div class="company-logo">DS</div>
                         <div class="company-info">
                            <h1>Depend Sourcing Ltd.</h1>
                            <p>Promise Beyond Business</p>
                            <p>Head Office: A-14/8, Johir Complex, Savar, Dhaka.</p>
                         </div>
                      </div>
                      <div class="voucher-meta">
                         <div class="voucher-badge">Payment Voucher</div>
                         <div class="voucher-id">#${expense.id.substring(0, 8).toUpperCase()}</div>
                         <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${new Date(expense.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      </div>
                   </div>

                   <div class="info-grid">
                      <div class="left-col">
                         <div class="info-group">
                            <span class="info-label">Pay To</span>
                            <span class="info-value">${expense.staffName}</span>
                         </div>
                         <div class="info-group">
                            <span class="info-label">Designation</span>
                            <span class="info-value">${staff?.designation || 'Staff'}</span>
                         </div>
                      </div>
                      <div class="right-col">
                         <div class="info-group">
                            <span class="info-label">Staff ID</span>
                            <span class="info-value">${staff?.staffId || 'N/A'}</span>
                         </div>
                         <div class="info-group">
                            <span class="info-label">Payment Mode</span>
                            <span class="info-value">Cash / Adjustment</span>
                         </div>
                      </div>
                   </div>

                   <table>
                      <thead>
                         <tr>
                            <th style="width: 10%">SL</th>
                            <th style="width: 70%">Description</th>
                            <th style="width: 20%; text-align: right;">Amount</th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr>
                            <td>01</td>
                            <td>
                               <span style="font-weight: 600; display: block; margin-bottom: 4px; color: #1e293b;">Expense Reimbursement</span>
                               <span style="color: #64748b; font-size: 12px;">${expense.reason}</span>
                            </td>
                            <td class="amount-cell">৳ ${expense.amount.toLocaleString()}</td>
                         </tr>
                         <tr style="height: 60px;"><td></td><td></td><td></td></tr>
                         <tr class="total-row">
                            <td colspan="2" style="text-align: right; padding-right: 20px;">TOTAL AMOUNT</td>
                            <td class="amount-cell">৳ ${expense.amount.toLocaleString()}</td>
                         </tr>
                      </tbody>
                   </table>

                   <div style="font-size: 11px; color: #64748b; margin-bottom: 30px; font-style: italic; padding-left: 10px;">
                      <strong>In Words:</strong> ${expense.amount} Taka Only (approx).
                   </div>

                   <div class="ledger-summary">
                      <div class="ledger-item">
                         <span class="ledger-label">Total Expenses</span>
                         <span class="ledger-value">৳ ${staffApprovedExpenses.toLocaleString()}</span>
                      </div>
                      <div style="width: 1px; height: 30px; background: #e2e8f0;"></div>
                      <div class="ledger-item">
                         <span class="ledger-label">Total Advance</span>
                         <span class="ledger-value">৳ ${staffRegularAdvances.toLocaleString()}</span>
                      </div>
                      <div style="width: 1px; height: 30px; background: #e2e8f0;"></div>
                      <div class="ledger-item">
                         <span class="ledger-label">Net Balance</span>
                         <span class="ledger-value" style="color: ${balanceColor}">${balanceText}</span>
                      </div>
                   </div>

                   <div class="footer">
                      <div class="signature-box">
                         <div class="signature-line"></div>
                         <div class="signature-text">Prepared By</div>
                      </div>
                      <div class="signature-box">
                         <div class="signature-line"></div>
                         <div class="signature-text">Verified By</div>
                      </div>
                      <div class="signature-box">
                         <div class="signature-line"></div>
                         <div class="signature-text">Authorized By</div>
                      </div>
                      <div class="signature-box">
                         <div class="signature-line"></div>
                         <div class="signature-text">Receiver</div>
                      </div>
                   </div>
                </div>
            </div>
        `;
    });

    const finalHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Bulk Vouchers - ${new Date().toLocaleDateString()}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          body { 
            font-family: 'Inter', sans-serif; 
            background: #fff;
            color: #1e293b;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          
          .voucher-box {
            border: 1px solid #e2e8f0; 
            padding: 40px;
            max-width: 210mm;
            margin: 0 auto;
            position: relative;
            background: white;
            /* box-shadow removed for print optimization */
          }

          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f1f5f9;
          }

          .company-logo {
             width: 40px; 
             height: 40px; 
             background: #0f172a; 
             border-radius: 8px;
             display: flex;
             align-items: center;
             justify-content: center;
             color: white;
             font-weight: bold;
             font-size: 20px;
             margin-right: 12px;
          }

          .company-info h1 {
            font-size: 24px;
            font-weight: 800;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .company-info p {
            font-size: 11px;
            margin: 4px 0 0;
            color: #64748b;
            font-weight: 500;
            letter-spacing: 0.5px;
          }

          .voucher-meta {
            text-align: right;
          }
          .voucher-badge {
            background-color: #f8fafc;
            color: #64748b;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: inline-block;
            margin-bottom: 8px;
            border: 1px solid #e2e8f0;
          }
          .voucher-id {
            font-size: 14px;
            font-weight: 700;
            color: #334155;
            font-family: monospace;
          }

          /* Grid Layout for Info */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          
          .info-group {
            margin-bottom: 15px;
          }
          .info-label {
            font-size: 10px;
            color: #94a3b8;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
            display: block;
          }
          .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
            padding-bottom: 4px;
            border-bottom: 1px solid #f1f5f9;
            display: block;
          }

          /* Table Styling */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            text-align: left;
            padding: 12px 16px;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
          }
          td {
            padding: 16px;
            font-size: 13px;
            color: #334155;
            border-bottom: 1px solid #f1f5f9;
          }
          .amount-cell {
            text-align: right;
            font-weight: 700;
            font-family: monospace;
            font-size: 14px;
          }
          .total-row td {
            border-top: 2px solid #e2e8f0;
            border-bottom: none;
            font-weight: 800;
            font-size: 16px;
            color: #0f172a;
            padding-top: 20px;
          }

          /* Ledger Box */
          .ledger-summary {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 50px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .ledger-item {
            text-align: center;
            flex: 1;
          }
          .ledger-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            display: block;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
          }
          .ledger-value {
            font-size: 14px;
            font-weight: 700;
            color: #334155;
          }

          /* Footer Signatures */
          .footer {
            display: flex;
            justify-content: space-between;
            margin-top: 80px;
            padding-top: 20px;
          }
          .signature-box {
            width: 22%;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #cbd5e1;
            margin-bottom: 10px;
          }
          .signature-text {
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          /* Watermark */
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 100px;
            font-weight: 900;
            color: rgba(241, 245, 249, 0.5); /* Faint slate */
            pointer-events: none;
            z-index: 0;
            white-space: nowrap;
            user-select: none;
          }

          @media print {
            body { background: white; padding: 0; margin: 0; }
            .voucher-wrapper {
               break-inside: avoid;
               height: 100vh;
               width: 100%;
               display: flex;
               flex-direction: column;
               justify-content: center;
            }
            .voucher-box { border: none; padding: 40px; margin: 0 auto; width: 100%; max-width: 210mm; }
          }
        </style>
      </head>
      <body>
        ${vouchersHtml}
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 1000); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(finalHtml);
    printWindow.document.close();
  };

  const getStatusStyles = (status: Expense['status']) => {
    switch(status) {
      case 'APPROVED': return { 
        bg: 'bg-green-100', text: 'text-green-700', 
        cardBg: 'bg-gradient-to-br from-white to-green-50/50',
        border: 'border-green-100 hover:border-green-200',
        shadow: 'hover:shadow-green-100'
      };
      case 'PENDING': return { 
        bg: 'bg-orange-100', text: 'text-orange-700',
        cardBg: 'bg-gradient-to-br from-white to-orange-50/50',
        border: 'border-orange-100 hover:border-orange-200',
        shadow: 'hover:shadow-orange-100'
      };
      case 'VERIFIED': return { 
        bg: 'bg-blue-100', text: 'text-blue-700',
        cardBg: 'bg-gradient-to-br from-white to-blue-50/50',
        border: 'border-blue-100 hover:border-blue-200',
        shadow: 'hover:shadow-blue-100'
      };
      case 'REJECTED': return { 
        bg: 'bg-red-100', text: 'text-red-700',
        cardBg: 'bg-gradient-to-br from-white to-red-50/50',
        border: 'border-red-100 hover:border-red-200',
        shadow: 'hover:shadow-red-100'
      };
      default: return { 
        bg: 'bg-gray-100', text: 'text-gray-700',
        cardBg: 'bg-white',
        border: 'border-gray-100',
        shadow: 'hover:shadow-gray-100'
      };
    }
  };

  // --- NEW VOUCHER LOGIC (Image Download) ---
  const downloadVoucherImage = async () => {
    if (voucherRef.current) {
      setIsDownloading(true);
      try {
        const html2canvas = (window as any).html2canvas;
        if (!html2canvas) {
           alert("html2canvas library not loaded. Please check your internet connection.");
           return;
        }
        
        // Optimization: Temporarily remove shadow for faster rendering
        const originalShadow = voucherRef.current.style.boxShadow;
        voucherRef.current.style.boxShadow = 'none';

        const canvas = await html2canvas(voucherRef.current, {
          scale: 1, // Reduced from 1.5 to 1 for speed
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          allowTaint: true,
          imageTimeout: 0,
          removeContainer: true,
        });

        // Restore shadow
        voucherRef.current.style.boxShadow = originalShadow;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Slightly lower quality for speed
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Voucher_${voucherPreviewData?.id}.jpg`;
        link.click();
      } catch (e) {
        console.error("Voucher download failed", e);
        alert("ডাউনলোডে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const getVoucherData = () => {
    if (!voucherPreviewData) return null;
    
    // Calculate ledger for the preview
    const staffApprovedExpenses = (expenses || [])
      .filter(e => !e.isDeleted && e.status === 'APPROVED' && e.staffId === voucherPreviewData.staffId)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const staffRegularAdvances = (advances || [])
      .filter(a => !a.isDeleted && a.type !== 'SALARY' && a.staffId === voucherPreviewData.staffId)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const balance = staffRegularAdvances - staffApprovedExpenses;
    const staffInfo = (staffList || []).find(s => s.id === voucherPreviewData.staffId);

    return {
       ...voucherPreviewData,
       designation: staffInfo?.designation || 'Staff',
       staffDisplayId: staffInfo?.staffId || 'N/A',
       balance,
       totalExp: staffApprovedExpenses,
       totalAdv: staffRegularAdvances
    };
  };

  return (
    <div className="space-y-6">
      {/* ... (Header and Filters omitted for brevity, keeping existing logic) ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">খরচ ও ভাউচার ম্যানেজমেন্ট</h2>
        <div className="flex flex-wrap gap-3">
          {(role === UserRole.ADMIN) && (
             <button
               onClick={handleBulkDownloadLastVouchers}
               className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold hover:bg-purple-100 hover:text-purple-800 border border-purple-200 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
             >
               <Files className="w-5 h-5" />
               সকল সর্বশেষ ভাউচার
             </button>
          )}
          {(role === UserRole.ADMIN || role === UserRole.MD) && (
             <button onClick={handleClearHistory} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 hover:text-red-700 border border-red-200 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"><Eraser className="w-5 h-5" /> হিস্ট্রি ক্লিন</button>
          )}
          {(role === UserRole.ADMIN || role === UserRole.STAFF) && (
            <button onClick={handleOpenSubmitModal} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-100"><Receipt className="w-5 h-5" /> নতুন বিল সাবমিট করুন</button>
          )}
          {role === UserRole.MD && (
            <button onClick={handleApproveAll} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg shadow-green-100"><CheckCheck className="w-5 h-5" /> সব অ্যাপ্রুভ</button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">খুঁজুন</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        {(role === UserRole.ADMIN || role === UserRole.MD) && (
          <div className="w-full sm:w-auto min-w-[150px]">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">স্টাফ</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 appearance-none" value={selectedStaffFilter} onChange={(e) => setSelectedStaffFilter(e.target.value)}>
                <option value="">All Staff</option>
                {allStaffForFilter.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="w-full sm:w-auto"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শুরু</label><input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="w-full sm:w-auto"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">শেষ</label><input type="date" className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <button onClick={() => { setSearchTerm(''); setSelectedStaffFilter(''); setStartDate(''); setEndDate(''); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl"><FilterX className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExpenses.map((expense) => {
          const expenseDateStr = getSafeDateStr(expense.createdAt);
          const isDuplicate = expenses.filter(e => !e.isDeleted && e.staffId === expense.staffId && getSafeDateStr(e.createdAt) === expenseDateStr).length > 1;
          const styles = getStatusStyles(expense.status);
          const staffMember = (staffList || []).find(s => s.id === expense.staffId);

          return (
          <div key={expense.id} className={`group relative rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden ${styles.cardBg} ${styles.border} ${styles.shadow}`}>
            
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform group-hover:scale-110 transition-transform duration-500 pointer-events-none">
               <Receipt className="w-32 h-32" />
            </div>

            <div className="p-5 flex-1 relative z-10">
              {isDuplicate && (role === UserRole.ADMIN || role === UserRole.MD) && (
                 <div className="mb-3 bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg animate-pulse"><div className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-600" /><h4 className="text-xs font-black text-red-700 uppercase">ডুপ্লিকেট বিল ডিটেক্টেড!</h4></div><p className="text-[10px] text-red-600 mt-1 font-medium leading-tight">এই তারিখে এই স্টাফের আরও একটি বিল আছে। দয়া করে চেক করুন।</p></div>
              )}

              <div className="flex justify-between items-center mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${styles.bg} ${styles.text}`}>
                  {expense.status === 'PENDING' ? 'Waiting' : expense.status}
                </span>
                <span className="text-[10px] font-bold text-gray-400 bg-white/50 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-100">
                   {new Date(expense.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              
              <div className="mb-2">
                 <h4 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 group-hover:from-indigo-600 group-hover:to-purple-600 transition-all">৳ {expense.amount.toLocaleString()}</h4>
              </div>

              <p className="text-sm text-gray-600 font-medium line-clamp-2 leading-relaxed h-10 mb-4">{expense.reason}</p>
              
              <div className="h-px w-full bg-gray-100/50 mb-4"></div>

              <div className="flex justify-between items-end">
                 <div 
                   className="flex items-center gap-2.5 cursor-pointer hover:scale-105 transition-transform" 
                   onClick={() => onOpenProfile && onOpenProfile(expense.staffId)}
                 >
                    <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-indigo-700 font-bold text-xs shadow-sm overflow-hidden shrink-0">
                       {staffMember && staffMember.photo ? <img src={staffMember.photo} alt={expense.staffName} className="w-full h-full object-cover" /> : (expense.staffName || '?')[0]}
                    </div>
                    <div>
                       <p className="text-xs font-bold text-gray-700 line-clamp-1 hover:text-indigo-600 hover:underline">{expense.staffName}</p>
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{getStaffDisplayId(expense.staffId)}</p>
                    </div>
                 </div>

                 <div className="flex gap-1 bg-white/50 rounded-lg p-0.5 backdrop-blur-sm">
                    {/* APPROVED VOUCHER DOWNLOAD - AVAILABLE TO ALL */}
                    {expense.status === 'APPROVED' && (
                        <button 
                           onClick={() => setVoucherPreviewData(expense)}
                           className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                           title="ভাউচার ছবি ডাউনলোড"
                        >
                           <ImageIcon className="w-4 h-4" />
                        </button>
                    )}
                    {/* PDF Print Button */}
                    {expense.status === 'APPROVED' && (
                        <button 
                           onClick={() => generateApprovalVoucher(expense)}
                           className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                           title="ভাউচার প্রিন্ট করুন"
                        >
                           <Printer className="w-4 h-4" />
                        </button>
                    )}

                    {((role === UserRole.ADMIN || role === UserRole.MD) && (expense.status === 'PENDING' || expense.status === 'VERIFIED')) && (
                       <button onClick={() => openCorrectionModal(expense)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
                    )}
                    {expense.voucherImage ? (
                       <button onClick={() => setViewingVoucher(expense.voucherImage!)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Voucher"><FileText className="w-4 h-4" /></button>
                    ) : (
                       <div className="p-1.5 text-gray-300" title="No Voucher"><FileText className="w-4 h-4" /></div>
                    )}
                 </div>
              </div>
            </div>

            <div className="bg-white/50 p-2 grid grid-cols-2 gap-2 border-t border-gray-100 backdrop-blur-sm">
               {role === UserRole.ADMIN && expense.status === 'PENDING' && (
                 <>
                    <button onClick={() => updateStatus(expense.id, 'VERIFIED')} className="col-span-2 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors">MD-র কাছে পাঠান</button>
                    <button onClick={() => updateStatus(expense.id, 'REJECTED')} className="bg-white text-red-600 border border-gray-200 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-colors">বাতিল</button>
                    <button onClick={() => softDelete(expense.id)} className="bg-white text-gray-400 border border-gray-200 py-1.5 rounded-lg text-xs font-bold hover:text-red-500 hover:border-red-200 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                 </>
               )}
               {role === UserRole.MD && (expense.status === 'VERIFIED' || expense.status === 'PENDING') && (
                 <>
                   <button onClick={() => updateStatus(expense.id, 'APPROVED')} className="col-span-2 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition-colors flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> অ্যাপ্রুভ করুন</button>
                   <button onClick={() => updateStatus(expense.id, 'REJECTED')} className="bg-white text-red-600 border border-gray-200 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-colors">বাতিল</button>
                   <button onClick={() => softDelete(expense.id)} className="bg-white text-gray-400 border border-gray-200 py-1.5 rounded-lg text-xs font-bold hover:text-red-500 hover:border-red-200 transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button>
                 </>
               )}
               {((role === UserRole.ADMIN && (expense.status === 'VERIFIED' || expense.status === 'APPROVED' || expense.status === 'REJECTED')) || (role === UserRole.STAFF && (expense.status === 'PENDING' || expense.status === 'REJECTED'))) && (
                  <div className="col-span-2 flex gap-2">
                     {role === UserRole.ADMIN && expense.status === 'VERIFIED' && <button onClick={() => updateStatus(expense.id, 'PENDING')} className="flex-1 bg-orange-50 text-orange-700 border border-orange-200 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-100 flex items-center justify-center gap-1"><RotateCcw className="w-3 h-3" /> ফেরত</button>}
                     <button onClick={() => softDelete(expense.id)} className="flex-1 bg-white text-gray-400 border border-gray-200 hover:border-red-200 hover:text-red-500 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" /> ডিলিট</button>
                  </div>
               )}
            </div>
          </div>
        )})}
      </div>
      
      {filteredExpenses.length === 0 && <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-gray-400"><div className="flex flex-col items-center gap-2 opacity-50"><Receipt className="w-10 h-10" /><p className="text-sm font-medium">কোনো বিল পাওয়া যায়নি</p></div></div>}

      {/* --- VOUCHER PREVIEW & DOWNLOAD MODAL --- */}
      {voucherPreviewData && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 pb-24 md:pb-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] md:max-h-[90vh]">
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-800">ভাউচার ডাউনলোড</h3>
                 <button onClick={() => setVoucherPreviewData(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-600"/></button>
              </div>
              
              {/* SCROLLABLE AREA */}
              <div className="overflow-auto p-4 bg-gray-100 flex-1 flex justify-center items-start">
                 {/* ACTUAL VOUCHER TO CAPTURE */}
                 {/* Fixed width to ensure consistent layout capture */}
                 <div ref={voucherRef} id="voucher-content" className="bg-white p-8 w-[450px] shadow-lg relative text-gray-800 border border-gray-300 shrink-0 mx-auto">
                    {/* Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-30 opacity-[0.05] pointer-events-none select-none border-4 border-black p-4 text-center">
                       <span className="text-4xl font-black uppercase text-black block">OFFICE</span>
                       <span className="text-4xl font-black uppercase text-black block">COPY</span>
                    </div>

                    {/* Header */}
                    <div className="border-b-2 border-black pb-4 mb-4">
                       <h1 className="text-xl font-black uppercase tracking-tight">Depend Sourcing Ltd.</h1>
                       <p className="text-[10px] text-gray-500 mt-1">Head Office: A-14/8, Johir Complex, Savar, Dhaka.</p>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                       <div className="bg-black text-white px-3 py-1 text-xs font-bold uppercase">Payment Voucher</div>
                       <div className="text-right">
                          <p className="text-[10px] font-bold">NO: #${voucherPreviewData.id.substring(0,8).toUpperCase()}</p>
                          <p className="text-[10px]">Date: {new Date(voucherPreviewData.createdAt).toLocaleDateString('en-GB')}</p>
                       </div>
                    </div>

                    {/* Pay To Section */}
                    <div className="mb-4 text-xs">
                       <div className="flex mb-1"><span className="w-20 font-bold">Pay To:</span> <span className="border-b border-dotted border-gray-400 flex-1">{voucherPreviewData.staffName}</span></div>
                       <div className="flex mb-1"><span className="w-20 font-bold">ID:</span> <span className="border-b border-dotted border-gray-400 flex-1">{getVoucherData()?.staffDisplayId}</span></div>
                       <div className="flex"><span className="w-20 font-bold">Role:</span> <span className="border-b border-dotted border-gray-400 flex-1">{getVoucherData()?.designation}</span></div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-xs border-collapse border border-black mb-4">
                       <thead>
                          <tr className="bg-gray-100">
                             <th className="border border-black p-2 text-left w-10">SL</th>
                             <th className="border border-black p-2 text-left">Description</th>
                             <th className="border border-black p-2 text-right w-20">Amount</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr>
                             <td className="border border-black p-2 text-center align-top">01</td>
                             <td className="border border-black p-2 align-top h-20">{voucherPreviewData.reason}</td>
                             <td className="border border-black p-2 text-right align-top font-bold">{voucherPreviewData.amount.toLocaleString()}</td>
                          </tr>
                          <tr>
                             <td className="border border-black p-2 text-right font-black" colSpan={2}>TOTAL</td>
                             <td className="border border-black p-2 text-right font-black">{voucherPreviewData.amount.toLocaleString()}</td>
                          </tr>
                       </tbody>
                    </table>

                    <div className="text-[10px] italic text-gray-600 mb-6">
                       <strong>In Words:</strong> {voucherPreviewData.amount} Taka Only (approx).
                    </div>

                    {/* Ledger Box */}
                    <div className="border border-black p-2 mb-8 bg-gray-50 text-[10px]">
                       <p className="font-bold border-b border-gray-300 pb-1 mb-1">Account Summary:</p>
                       <div className="flex justify-between"><span>Total Exp:</span> <span>{getVoucherData()?.totalExp.toLocaleString()}</span></div>
                       <div className="flex justify-between"><span>Total Adv:</span> <span>{getVoucherData()?.totalAdv.toLocaleString()}</span></div>
                       <div className="flex justify-between font-bold border-top border-gray-300 pt-1 mt-1">
                          <span>Balance:</span> 
                          <span className={(getVoucherData()?.balance || 0) < 0 ? 'text-red-600' : 'text-green-600'}>
                             {(getVoucherData()?.balance || 0) < 0 ? 'Payable' : 'Cash In Hand'} {Math.abs(getVoucherData()?.balance || 0).toLocaleString()}
                          </span>
                       </div>
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between items-end pt-4">
                       <div className="text-center w-20">
                          <div className="border-t border-black mb-1"></div>
                          <p className="text-[8px] font-bold uppercase">Prepared By</p>
                       </div>
                       <div className="text-center w-20">
                          <div className="border-t border-black mb-1"></div>
                          <p className="text-[8px] font-bold uppercase">Receiver</p>
                       </div>
                       <div className="text-center w-20">
                          <div className="border-t border-black mb-1"></div>
                          <p className="text-[8px] font-bold uppercase">Authorized By</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-gray-100 bg-white flex gap-3">
                 <button 
                   onClick={downloadVoucherImage} 
                   disabled={isDownloading}
                   className={`flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed`}
                 >
                    {isDownloading ? (
                       <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                       <Download className="w-5 h-5" />
                    )}
                    {isDownloading ? 'Processing...' : 'Download JPG'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ... (Other modals like Submit, Status Confirm, Delete Confirm, Correction remain unchanged) ... */}
      {/* Keeping previous modals rendered logic exactly as is to avoid breaking functionality */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white shrink-0">
              <h3 className="font-bold text-xl">নতুন বিল</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-indigo-200 hover:text-white">×</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col h-full" id="expense-form">
                <div className="overflow-y-auto p-6 flex-1 space-y-4">
                  {isSubmissionDuplicate && <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 animate-pulse"><AlertTriangle className="w-6 h-6 text-red-500 shrink-0" /><div><h4 className="font-bold text-red-700 text-sm">সতর্কতা: ডুপ্লিকেট বিল!</h4><p className="text-xs text-red-600 mt-1">নির্বাচিত তারিখে এই স্টাফের ইতিমধ্যে একটি বিল সিস্টেমে আছে।</p></div></div>}
                  
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">স্টাফ মেম্বার</label><select required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 text-slate-700 font-bold rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm appearance-none text-sm" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})}><option value="">স্টাফ নির্বাচন করুন</option>{activeStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">তারিখ</label><input type="date" required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 text-slate-700 font-bold rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm text-sm" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between"><span>খরচের কারণ ও বিবরণ</span><span className="text-xs text-indigo-600 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3"/> Auto Calculator</span></label><textarea required rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" placeholder="কারণ..." value={formData.reason} onChange={handleReasonChange} /></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">টাকার পরিমাণ</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span><input required type="number" className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-100 text-slate-800 font-black text-base rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm placeholder:text-slate-300" placeholder="0.00" value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} /></div></div>
                  
                  {/* Image Options Grid */}
                  <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">ভাউচার ইমেজ (অপশনাল)</label>
                     <div className="grid grid-cols-2 gap-2">
                        <div 
                           onClick={() => fileInputRef.current?.click()} 
                           className="group py-2.5 px-2 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-lg bg-indigo-50/30 hover:bg-indigo-50 cursor-pointer transition-all flex flex-row items-center justify-center gap-2 text-center"
                        >
                           <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
                           <Upload className="w-4 h-4 text-indigo-500 group-hover:text-indigo-700 transition-colors"/>
                           <span className="text-[11px] font-bold text-indigo-600 group-hover:text-indigo-800">গ্যালারি</span>
                        </div>

                        <div 
                           onClick={() => cameraInputRef.current?.click()} 
                           className="group py-2.5 px-2 border border-dashed border-purple-200 hover:border-purple-400 rounded-lg bg-purple-50/30 hover:bg-purple-50 cursor-pointer transition-all flex flex-row items-center justify-center gap-2 text-center"
                        >
                           <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleImageUpload} />
                           <Camera className="w-4 h-4 text-purple-500 group-hover:text-purple-700 transition-colors"/>
                           <span className="text-[11px] font-bold text-purple-600 group-hover:text-purple-800">ক্যামেরা</span>
                        </div>
                     </div>
                     {formData.voucherImage && (
                        <div className="mt-2 relative rounded-lg overflow-hidden border border-gray-200 h-24 bg-gray-50">
                           <img src={formData.voucherImage} alt="Voucher Preview" className="w-full h-full object-contain" />
                           <button 
                              type="button"
                              onClick={removeImage}
                              className="absolute top-1 right-1 bg-white/80 hover:bg-white text-red-500 p-1 rounded-full shadow-sm transition-colors"
                           >
                              <XCircle className="w-4 h-4" />
                           </button>
                        </div>
                     )}
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                   <button type="submit" form="expense-form" className={`w-full text-white py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl ${isSubmissionDuplicate ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-indigo-200'}`}>{isSubmissionDuplicate ? <><AlertTriangle className="w-5 h-5"/> তবুও সাবমিট করুন</> : 'বিল সাবমিট করুন'}</button>
                </div>
            </form>
          </div>
        </div>
      )}
      {statusConfirmData && <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200"><div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"><h3 className="font-bold text-lg mb-2">নিশ্চিত করুন</h3><p className="text-sm text-gray-500 mb-4">স্ট্যাটাস পরিবর্তন করতে চান?</p><div className="flex gap-3"><button onClick={() => setStatusConfirmData(null)} className="flex-1 py-2 border rounded-lg font-bold text-gray-600">না</button><button onClick={confirmStatusUpdate} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold">হ্যাঁ</button></div></div></div>}
      {deleteConfirmId && <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200"><div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"><div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><Trash2 className="w-6 h-6" /></div><h3 className="font-bold text-lg mb-2">ডিলিট করবেন?</h3><div className="flex gap-3 mt-4"><button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 border rounded-lg font-bold text-gray-600">না</button><button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold">হ্যাঁ</button></div></div></div>}
      {isCorrectionModalOpen && correctionData && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in duration-200"><div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden"><div className="flex justify-between items-start mb-4"><h3 className="font-bold text-lg text-gray-800">বিল সংশোধন</h3><div className="flex flex-col items-end"><label className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">তারিখ</label><input type="date" className="text-xs border border-gray-200 rounded-lg px-2 py-1 font-bold text-gray-900 bg-white focus:outline-none focus:border-orange-400 shadow-sm" value={correctionData.date} onChange={(e) => setCorrectionData({...correctionData, date: e.target.value})} /></div></div><form onSubmit={saveCorrection} className="space-y-4"><div><label className="block text-xs font-bold text-gray-600 mb-1">টাকার পরিমাণ</label><input type="number" className="w-full border border-gray-200 p-3 rounded-xl font-black text-2xl text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-100 outline-none transition-colors" value={correctionData.amount} onChange={e => setCorrectionData({...correctionData, amount: Number(e.target.value)})} /></div><div><label className="block text-xs font-bold text-gray-600 mb-1">কারণ</label><textarea rows={3} className="w-full border border-gray-200 p-3 rounded-xl text-sm font-medium text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-100 outline-none resize-none transition-colors" value={correctionData.reason} onChange={e => setCorrectionData({...correctionData, reason: e.target.value})} /></div><div className="flex gap-3 mt-2"><button type="button" onClick={() => setIsCorrectionModalOpen(false)} className="flex-1 border border-gray-200 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors">বাতিল</button><button type="submit" className="flex-[2] bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200 transition-colors">আপডেট করুন</button></div></form></div></div>}
      {viewingVoucher && <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200" onClick={() => setViewingVoucher(null)}><div className="relative max-w-3xl w-full max-h-screen p-2"><button onClick={() => setViewingVoucher(null)} className="absolute -top-10 right-0 text-white hover:text-red-400 transition-colors"><X className="w-8 h-8" /></button><img src={viewingVoucher} alt="Voucher" className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white" /></div></div>}
    </div>
  );
};

export default ExpenseManagementView;
