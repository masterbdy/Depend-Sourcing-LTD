
import React, { useState, useMemo } from 'react';
import { BarChart3, Download, FileText, Users, Calendar, Table, Printer, UserCheck, PieChart as PieIcon, Wallet, ArrowRight } from 'lucide-react';
import { Expense, Staff, AdvanceLog, Attendance, FundEntry } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface ReportsProps {
  expenses: Expense[];
  staffList: Staff[];
  advances: AdvanceLog[];
  attendanceList: Attendance[];
  funds?: FundEntry[]; // Added funds to props
}

const ReportsView: React.FC<ReportsProps> = ({ expenses = [], staffList = [], advances = [], attendanceList = [], funds = [] }) => {
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  
  // New State for Staff Selection
  const [selectedStaffId, setSelectedStaffId] = useState('');
  
  // New State for Monthly Report
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const approvedExpenses = (expenses || []).filter(e => !e.isDeleted && e.status === 'APPROVED');
  
  // --- MONTHLY STATISTICS CALCULATION ---
  const monthlyStats = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    const isSameMonth = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getFullYear() === year && d.getMonth() === (month - 1);
    };

    // 1. Total Fund Received
    const monthlyFunds = (funds || []).filter(f => !f.isDeleted && isSameMonth(f.date));
    const totalFund = monthlyFunds.reduce((sum, f) => sum + Number(f.amount), 0);

    // 2. Total Expense
    const monthlyExpenses = approvedExpenses.filter(e => isSameMonth(e.createdAt));
    const totalExpense = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // 3. Advances (Split into Regular and Salary)
    const monthlyAdvances = (advances || []).filter(a => !a.isDeleted && isSameMonth(a.date));
    const regularAdvance = monthlyAdvances.filter(a => a.type !== 'SALARY').reduce((sum, a) => sum + Number(a.amount), 0);
    const salaryAdvance = monthlyAdvances.filter(a => a.type === 'SALARY').reduce((sum, a) => sum + Number(a.amount), 0);
    const totalAdvance = regularAdvance + salaryAdvance;

    // 4. Closing Balance Calculation (Fund - Expense - Total Advance)
    const monthlyBalance = totalFund - (totalExpense + totalAdvance);

    return {
       totalFund,
       totalExpense,
       regularAdvance,
       salaryAdvance,
       totalAdvance,
       monthlyBalance,
       monthlyFunds,
       monthlyExpenses,
       monthlyAdvances
    };
  }, [selectedMonth, funds, approvedExpenses, advances]);

  // Chart Data Preparation (Staff-wise expenses) - Overall
  const staffData = (staffList || []).map(s => {
    const total = approvedExpenses.filter(e => e.staffId === s.id).reduce((sum, e) => sum + e.amount, 0);
    return { name: s.name, amount: total };
  }).filter(d => d.amount > 0);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  // --- COMMON STYLES FOR PDF ---
  const getCommonStyle = () => `
    body { font-family: 'Hind Siliguri', sans-serif; -webkit-print-color-adjust: exact; color: #1f2937; }
    @page { size: A4; margin: 10mm; }
    .no-break { break-inside: avoid; }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100px;
      font-weight: 900;
      color: rgba(0, 0, 0, 0.03);
      z-index: -1;
      pointer-events: none;
      white-space: nowrap;
    }
    .header-section { border-bottom: 2px solid; padding-bottom: 10px; margin-bottom: 15px; }
    .company-name { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; line-height: 1; }
    .tagline { font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; color: #6b7280; }
    .address-block { font-size: 9px; text-align: right; color: #4b5563; line-height: 1.3; }
    .report-title-box { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 6px; margin-bottom: 15px; }
    .report-title { font-size: 14px; font-weight: 800; text-transform: uppercase; }
    .meta-text { font-size: 10px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { font-size: 9px; text-transform: uppercase; font-weight: 800; padding: 6px; text-align: left; background-color: #f3f4f6; border-bottom: 1px solid #d1d5db; color: #111827; }
    td { font-size: 10px; padding: 5px 6px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .amount-col { text-align: right; font-weight: 700; font-family: monospace; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #9ca3af; }
    .summary-grid { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 20px; }
    .summary-box { flex: 1; border: 1px solid #e5e7eb; padding: 10px; border-radius: 5px; }
    .summary-label { font-size: 9px; text-transform: uppercase; font-weight: 700; color: #6b7280; display: block; margin-bottom: 4px; }
    .summary-val { font-size: 14px; font-weight: 900; }
  `;

  // --- MONTHLY PDF GENERATOR ---
  const generateMonthlyPDF = () => {
    const monthName = new Date(selectedMonth + "-01").toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const stats = monthlyStats;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>Monthly Account Statement - ${monthName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          ${getCommonStyle()}
          .theme-color { color: #0f172a; } 
          .theme-border { border-color: #0f172a; }
          .income-text { color: #166534; }
          .expense-text { color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="watermark">MONTHLY</div>
        <div class="max-w-[210mm] mx-auto">
          
          <div class="header-section theme-border flex justify-between items-end">
             <div>
                <h1 class="company-name theme-color">Depend Sourcing Ltd.</h1>
                <p class="tagline">Promise Beyond Business</p>
             </div>
             <div class="address-block">
                <p>Monthly Account Statement</p>
                <p>Report Month: <strong>${monthName}</strong></p>
             </div>
          </div>

          <h2 class="report-title text-center mb-4 border-b pb-2">Financial Summary</h2>

          <div class="summary-grid">
             <div class="summary-box bg-green-50 border-green-200">
                <span class="summary-label text-green-700">Total Fund Received (In)</span>
                <span class="summary-val text-green-800">৳ ${stats.totalFund.toLocaleString()}</span>
             </div>
             <div class="summary-box bg-red-50 border-red-200">
                <span class="summary-label text-red-700">Total Expense (Out)</span>
                <span class="summary-val text-red-800">৳ ${stats.totalExpense.toLocaleString()}</span>
             </div>
             <div class="summary-box bg-orange-50 border-orange-200">
                <span class="summary-label text-orange-700">Regular Advance (Out)</span>
                <span class="summary-val text-orange-800">৳ ${stats.regularAdvance.toLocaleString()}</span>
             </div>
             <div class="summary-box bg-purple-50 border-purple-200">
                <span class="summary-label text-purple-700">Salary Advance (Out)</span>
                <span class="summary-val text-purple-800">৳ ${stats.salaryAdvance.toLocaleString()}</span>
             </div>
          </div>

          <div class="summary-box mb-6 bg-gray-50 text-right">
             <span class="summary-label">Net Cash Flow (This Month)</span>
             <span class="summary-val ${stats.monthlyBalance >= 0 ? 'text-gray-800' : 'text-red-600'}">৳ ${stats.monthlyBalance.toLocaleString()}</span>
          </div>

          <!-- Tables -->
          <div class="no-break mb-6">
             <h3 class="text-xs font-bold uppercase mb-2 border-l-4 border-green-600 pl-2">Fund Received Details</h3>
             <table>
                <thead>
                   <tr>
                      <th style="width: 20%">Date</th>
                      <th style="width: 60%">Note / Source</th>
                      <th class="amount-col">Amount</th>
                   </tr>
                </thead>
                <tbody>
                   ${stats.monthlyFunds.map(f => `
                      <tr>
                         <td>${new Date(f.date).toLocaleDateString('en-GB')}</td>
                         <td>${f.note}</td>
                         <td class="amount-col income-text">৳ ${f.amount.toLocaleString()}</td>
                      </tr>
                   `).join('')}
                   ${stats.monthlyFunds.length === 0 ? '<tr><td colspan="3" class="text-center text-gray-400">No funds received this month.</td></tr>' : ''}
                </tbody>
             </table>
          </div>

          <div class="no-break mb-6">
             <h3 class="text-xs font-bold uppercase mb-2 border-l-4 border-red-600 pl-2">Expense Details</h3>
             <table>
                <thead>
                   <tr>
                      <th style="width: 15%">Date</th>
                      <th style="width: 25%">Staff</th>
                      <th style="width: 40%">Reason</th>
                      <th class="amount-col">Amount</th>
                   </tr>
                </thead>
                <tbody>
                   ${stats.monthlyExpenses.map(e => `
                      <tr>
                         <td>${new Date(e.createdAt).toLocaleDateString('en-GB')}</td>
                         <td><strong>${e.staffName}</strong></td>
                         <td>${e.reason}</td>
                         <td class="amount-col expense-text">৳ ${e.amount.toLocaleString()}</td>
                      </tr>
                   `).join('')}
                   ${stats.monthlyExpenses.length === 0 ? '<tr><td colspan="4" class="text-center text-gray-400">No expenses this month.</td></tr>' : ''}
                </tbody>
             </table>
          </div>

          <div class="no-break mb-6">
             <h3 class="text-xs font-bold uppercase mb-2 border-l-4 border-orange-600 pl-2">Advance Given Details</h3>
             <table>
                <thead>
                   <tr>
                      <th style="width: 15%">Date</th>
                      <th style="width: 25%">Staff</th>
                      <th style="width: 40%">Type & Note</th>
                      <th class="amount-col">Amount</th>
                   </tr>
                </thead>
                <tbody>
                   ${stats.monthlyAdvances.map(a => `
                      <tr>
                         <td>${new Date(a.date).toLocaleDateString('en-GB')}</td>
                         <td><strong>${a.staffName}</strong></td>
                         <td>
                            <span class="px-1 rounded border text-[8px] font-bold uppercase ${a.type === 'SALARY' ? 'border-purple-200 text-purple-700' : 'border-blue-200 text-blue-700'}">${a.type}</span>
                            ${a.note}
                         </td>
                         <td class="amount-col expense-text">৳ ${a.amount.toLocaleString()}</td>
                      </tr>
                   `).join('')}
                   ${stats.monthlyAdvances.length === 0 ? '<tr><td colspan="4" class="text-center text-gray-400">No advances given this month.</td></tr>' : ''}
                </tbody>
             </table>
          </div>

          <div class="footer">
             <div><p>System Generated Report.</p></div>
             <div class="text-center" style="width: 200px; margin-left: auto;">
                <div class="h-px bg-gray-800 w-full mb-1"></div>
                <p class="font-bold text-sm text-gray-800">Shariful Islam</p>
                <p class="text-[10px] font-bold text-gray-500 uppercase">Managing Director</p>
             </div>
          </div>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ... (Attendance Report function remains unchanged)
  const generateAttendanceReport = () => {
    // ... [existing logic]
    const start = reportStartDate ? new Date(reportStartDate).setHours(0, 0, 0, 0) : 0;
    const end = reportEndDate ? new Date(reportEndDate).setHours(23, 59, 59, 999) : Number.MAX_VALUE;

    // Filter
    const filteredAttendance = (attendanceList || []).filter(a => {
      const d = new Date(a.date).getTime();
      // If filtering by specific staff in attendance report too:
      if (selectedStaffId && a.staffId !== selectedStaffId) return false;
      return d >= start && d <= end;
    }).sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());

    if (filteredAttendance.length === 0) {
      alert("নির্বাচিত তারিখের মধ্যে কোনো হাজিরা ডাটা পাওয়া যায়নি।");
      return;
    }

    const summary = (staffList || []).filter(s => !selectedStaffId || s.id === selectedStaffId).map(staff => {
      const records = filteredAttendance.filter(a => a.staffId === staff.id);
      return {
        name: staff.name,
        present: records.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length, 
        late: records.filter(a => a.status === 'LATE').length,
        totalRecords: records.length
      };
    }).filter(s => s.totalRecords > 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>Attendance Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          ${getCommonStyle()}
          .theme-color { color: #166534; }
          .theme-border { border-color: #166534; }
          .theme-light-bg { background-color: #f0fdf4; }
          /* Enhanced Header Visibility */
          .table-header { background-color: #dcfce7 !important; color: #14532d !important; border-bottom: 2px solid #166534; }
        </style>
      </head>
      <body>
        <div class="watermark">DEPEND SOURCING</div>
        <div class="max-w-[210mm] mx-auto">
          
          <div class="header-section theme-border flex justify-between items-end">
             <div><h1 class="company-name theme-color">Depend Sourcing Ltd.</h1><p class="tagline">Promise Beyond Business</p></div>
             <div class="address-block"><p>Head Office: A-14/8, Johir Complex, Savar, Dhaka.</p></div>
          </div>

          <div class="report-title-box theme-light-bg border border-green-200">
             <div>
                <h2 class="report-title theme-color">ATTENDANCE REPORT</h2>
                <p class="meta-text text-gray-500">${selectedStaffId ? (staffList || []).find(s=>s.id === selectedStaffId)?.name + ' - Individual Log' : 'All Employee Attendance Log'}</p>
             </div>
             <div class="text-right meta-text">
                <p><strong>Period:</strong> ${reportStartDate ? new Date(reportStartDate).toLocaleDateString('en-GB') : 'Start'} — ${reportEndDate ? new Date(reportEndDate).toLocaleDateString('en-GB') : 'Today'}</p>
             </div>
          </div>

          <div class="mb-6 no-break">
             <h3 class="text-xs font-bold text-gray-700 mb-2 uppercase border-l-2 theme-border pl-2">Attendance Summary</h3>
             <table class="border border-gray-200">
                <thead>
                   <tr class="bg-gray-50 text-gray-600">
                      <th class="text-left border-r border-gray-200">Staff Name</th>
                      <th class="text-center border-r border-gray-200">Total Present</th>
                      <th class="text-center">Late Days</th>
                   </tr>
                </thead>
                <tbody>
                   ${summary.map(s => `
                      <tr>
                         <td class="font-bold border-r border-gray-200">${s.name}</td>
                         <td class="text-center border-r border-gray-200">${s.present}</td>
                         <td class="text-center text-red-600 font-bold">${s.late > 0 ? s.late : '-'}</td>
                      </tr>
                   `).join('')}
                </tbody>
             </table>
          </div>

          <h3 class="text-xs font-bold text-gray-700 mb-2 uppercase border-l-2 theme-border pl-2">Detailed Daily Log</h3>
          <table>
            <thead>
              <tr class="table-header">
                <th class="text-left rounded-tl">Date</th>
                <th class="text-left">Staff Name</th>
                <th class="text-center">Check-In</th>
                <th class="text-center">Check-Out</th>
                <th class="text-center">Status</th>
                <th class="text-right rounded-tr">Location</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAttendance.map((a, index) => `
                <tr class="${index % 2 === 0 ? 'bg-white' : 'theme-light-bg'}">
                  <td class="font-bold text-gray-600 whitespace-nowrap">${new Date(a.date).toLocaleDateString('en-GB')}</td>
                  <td class="font-bold text-gray-800">${a.staffName}</td>
                  <td class="text-center font-medium">${new Date(a.checkInTime).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'})}</td>
                  <td class="text-center text-gray-500">${a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'}) : '--'}</td>
                  <td class="text-center">
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      a.status === 'LATE' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }">
                      ${a.status}
                    </span>
                  </td>
                  <td class="text-right text-gray-500 truncate max-w-[120px]">${a.location?.address || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
             <div><p>Depend Sourcing Ltd. Internal Document.</p></div>
             <div class="text-center" style="width: 200px; margin-left: auto;">
                <div class="h-px bg-gray-800 w-full mb-1"></div>
                <p class="font-bold text-sm text-gray-800">Authorized Signature</p>
             </div>
          </div>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const generatePDFReport = () => {
    const start = reportStartDate ? new Date(reportStartDate).setHours(0, 0, 0, 0) : 0;
    const end = reportEndDate ? new Date(reportEndDate).setHours(23, 59, 59, 999) : Number.MAX_VALUE;

    const filteredExpenses = (expenses || []).filter(e => {
      if (e.isDeleted) return false;
      if (selectedStaffId && e.staffId !== selectedStaffId) return false; // Filter by Staff
      const d = new Date(e.createdAt).getTime();
      return d >= start && d <= end;
    });

    const filteredAdvances = (advances || []).filter(a => {
      if (a.isDeleted) return false;
      if (selectedStaffId && a.staffId !== selectedStaffId) return false; // Filter by Staff
      const d = new Date(a.date).getTime();
      return d >= start && d <= end;
    });

    if (filteredExpenses.length === 0 && filteredAdvances.length === 0) {
      alert("নির্বাচিত তারিখের মধ্যে কোনো ডাটা পাওয়া যায়নি।");
      return;
    }

    const groupedData: Record<string, { date: string, staffName: string, descriptions: string[], billAmount: number, advanceAmount: number }> = {};
    const toKey = (dateStr: string, id: string) => `${new Date(dateStr).toDateString()}_${id}`;

    filteredExpenses.forEach(e => {
        const key = toKey(e.createdAt, e.staffId);
        if(!groupedData[key]) {
            groupedData[key] = { date: e.createdAt, staffName: e.staffName, descriptions: [], billAmount: 0, advanceAmount: 0 };
        }
        groupedData[key].descriptions.push(`${e.reason}`);
        if(e.status !== 'APPROVED') groupedData[key].descriptions[groupedData[key].descriptions.length - 1] += ` (${e.status})`;
        groupedData[key].billAmount += Number(e.amount);
    });

    filteredAdvances.forEach(a => {
        const key = toKey(a.date, a.staffId);
        if(!groupedData[key]) {
            groupedData[key] = { date: a.date, staffName: a.staffName, descriptions: [], billAmount: 0, advanceAmount: 0 };
        }
        const prefix = a.type === 'SALARY' ? '[Sal.Adv]' : '[Adv]';
        groupedData[key].descriptions.push(`${prefix} ${a.note || ''}`);
        groupedData[key].advanceAmount += Number(a.amount);
    });

    const allTransactions = Object.values(groupedData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalExpenseAmount = allTransactions.reduce((sum, t) => sum + t.billAmount, 0);
    const totalAdvanceGiven = allTransactions.reduce((sum, t) => sum + t.advanceAmount, 0);

    // Dynamic Title Logic
    let selectedStaffName = 'All Staff';
    if (selectedStaffId) {
        const staff = (staffList || []).find(s => s.id === selectedStaffId);
        if (staff) selectedStaffName = staff.name;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>Account Statement</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          ${getCommonStyle()}
          .theme-color { color: #312e81; }
          .theme-border { border-color: #312e81; }
          .theme-light-bg { background-color: #e0e7ff; }
          /* Enhanced Header Visibility - Dark Text on Light Background */
          .table-header { background-color: #e0e7ff !important; color: #1e1b4b !important; border-bottom: 2px solid #312e81; }
        </style>
      </head>
      <body>
        <div class="watermark">ACCOUNT STATEMENT</div>
        <div class="max-w-[210mm] mx-auto">
          <div class="header-section theme-border flex justify-between items-end">
             <div><h1 class="company-name theme-color">Depend Sourcing Ltd.</h1><p class="tagline">Promise Beyond Business</p></div>
             <div class="address-block"><p>Head Office: A-14/8, Johir Complex, Savar, Dhaka.</p></div>
          </div>
          <div class="report-title-box theme-light-bg border border-indigo-200">
             <div>
               <h2 class="report-title theme-color">${selectedStaffId ? 'INDIVIDUAL ACCOUNT STATEMENT' : 'ACCOUNT STATEMENT'}</h2>
               <p class="meta-text text-gray-600">${selectedStaffId ? 'Staff Name: ' + selectedStaffName : 'Consolidated Expense & Advance Statement'}</p>
             </div>
             <div class="text-right meta-text"><p><strong>Period:</strong> ${reportStartDate ? new Date(reportStartDate).toLocaleDateString('en-GB') : 'Start'} — ${reportEndDate ? new Date(reportEndDate).toLocaleDateString('en-GB') : 'Today'}</p></div>
          </div>
          <div class="flex justify-between gap-4 mb-4 text-xs">
            <div class="flex-1 bg-gray-50 p-2 rounded border border-gray-200 flex justify-between items-center">
               <span class="font-bold text-gray-600 uppercase">Total Bill</span><span class="font-black text-indigo-900 text-sm">৳ ${totalExpenseAmount.toLocaleString()}</span>
            </div>
            <div class="flex-1 bg-gray-50 p-2 rounded border border-gray-200 flex justify-between items-center">
               <span class="font-bold text-gray-600 uppercase">Total Advance</span><span class="font-black text-blue-800 text-sm">৳ ${totalAdvanceGiven.toLocaleString()}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr class="table-header">
                <th class="text-center w-8 rounded-tl">SL</th>
                <th class="text-left w-20">Date</th>
                <th class="text-left w-28">Staff Name</th>
                <th class="text-left">Description</th>
                <th class="text-right w-20">Bill (৳)</th>
                <th class="text-right w-20 rounded-tr">Adv (৳)</th>
              </tr>
            </thead>
            <tbody>
              ${allTransactions.map((t, index) => `
                <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
                  <td class="text-center font-medium text-gray-400 align-top">${index + 1}</td>
                  <td class="whitespace-nowrap align-top font-semibold text-gray-600">${new Date(t.date).toLocaleDateString('en-GB')}</td>
                  <td class="font-bold text-gray-700 align-top">${t.staffName}</td>
                  <td class="text-gray-600 align-top"><ul class="list-disc list-inside space-y-0 leading-tight">${t.descriptions.map(d => `<li>${d}</li>`).join('')}</ul></td>
                  <td class="text-right font-bold text-gray-800 align-top">${t.billAmount > 0 ? t.billAmount.toLocaleString() : '-'}</td>
                  <td class="text-right font-bold text-blue-700 align-top">${t.advanceAmount > 0 ? t.advanceAmount.toLocaleString() : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
               <tr class="bg-gray-100 font-bold text-[10px] border-t-2 border-gray-300 text-gray-800">
                 <td colspan="4" class="text-right uppercase p-2">Net Total</td>
                 <td class="text-right text-indigo-900 p-2">৳ ${totalExpenseAmount.toLocaleString()}</td>
                 <td class="text-right text-blue-800 p-2">৳ ${totalAdvanceGiven.toLocaleString()}</td>
               </tr>
            </tfoot>
          </table>
          <div class="footer">
             <div><p>Depend Sourcing Ltd. Confidential.</p></div>
             <div class="text-center" style="width: 200px; margin-left: auto;">
                <div class="h-px bg-gray-800 w-full mb-1"></div>
                <p class="font-bold text-sm text-gray-800">Shariful Islam</p>
                <p class="text-[10px] font-bold text-gray-500 uppercase">Managing Director</p>
             </div>
          </div>
        </div>
        <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8">
      
      {/* 1. MONTHLY REPORT SECTION (New) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
         <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-lg">
            <PieIcon className="w-5 h-5 text-indigo-600" />
            মাসিক আর্থিক রিপোর্ট (Monthly Summary)
         </h3>
         
         <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-auto">
               <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">মাস নির্বাচন করুন</label>
               <input 
                 type="month" 
                 className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 bg-gray-50"
                 value={selectedMonth}
                 onChange={(e) => setSelectedMonth(e.target.value)}
               />
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
               <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-[10px] font-bold text-green-600 uppercase">মোট ফান্ড গ্রহণ (In)</p>
                  <p className="text-xl font-black text-green-700 mt-1">৳ {monthlyStats.totalFund.toLocaleString()}</p>
               </div>
               <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-[10px] font-bold text-red-600 uppercase">মোট খরচ (Out)</p>
                  <p className="text-xl font-black text-red-700 mt-1">৳ {monthlyStats.totalExpense.toLocaleString()}</p>
               </div>
               <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-[10px] font-bold text-orange-600 uppercase">রেগুলার অ্যাডভান্স</p>
                  <p className="text-xl font-black text-orange-700 mt-1">৳ {monthlyStats.regularAdvance.toLocaleString()}</p>
               </div>
               <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-[10px] font-bold text-purple-600 uppercase">স্যালারি অ্যাডভান্স</p>
                  <p className="text-xl font-black text-purple-700 mt-1">৳ {monthlyStats.salaryAdvance.toLocaleString()}</p>
               </div>
            </div>
         </div>

         <div className="mt-6 pt-4 border-t border-gray-50 flex justify-end">
            <button 
               onClick={generateMonthlyPDF}
               className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg active:scale-95"
            >
               <Printer className="w-4 h-4" />
               ডাউনলোড রিপোর্ট (PDF)
            </button>
         </div>
      </div>

      {/* 2. CUSTOM RANGE REPORT SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
          <FileText className="w-4 h-4" />
          কাস্টম ডেট রেঞ্জ রিপোর্ট
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">শুরুর তারিখ</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">শেষ তারিখ</label>
            <input 
              type="date" 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
            />
          </div>
          {/* New Staff Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">স্টাফ নির্বাচন করুন</label>
            <select 
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
            >
                <option value="">সকল স্টাফ (All)</option>
                {(staffList || []).filter(s => s.status === 'ACTIVE' && !s.deletedAt).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          </div>
          <button 
            onClick={generatePDFReport}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Printer className="w-5 h-5" />
            অ্যাকাউন্ট স্টেটমেন্ট
          </button>
          <button 
            onClick={generateAttendanceReport}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 md:col-start-4"
          >
            <UserCheck className="w-5 h-5" />
            হাজিরা রিপোর্ট
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
             <h3 className="font-bold text-gray-800 flex items-center gap-2">
               <BarChart3 className="w-5 h-5 text-indigo-500" />
               ব্যক্তি-ভিত্তিক খরচের পরিসংখ্যান (সর্বমোট)
             </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40}>
                  {staffData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Analytics Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-gray-800 mb-6">সিস্টেম অ্যানালিটিক্স</h3>
           <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                 <div className="flex items-center gap-3">
                   <Users className="w-5 h-5 text-indigo-600" />
                   <span className="text-sm font-medium text-gray-600">মোট স্টাফ বিল</span>
                 </div>
                 <span className="font-bold text-gray-800">{staffData.length} জন</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                 <div className="flex items-center gap-3">
                   <Calendar className="w-5 h-5 text-indigo-600" />
                   <span className="text-sm font-medium text-gray-600">গড় দৈনিক খরচ</span>
                 </div>
                 <span className="font-bold text-gray-800">৳ {(approvedExpenses.reduce((s,e)=>s+e.amount,0) / 30).toFixed(0)}</span>
              </div>
           </div>
           <div className="mt-8 p-4 bg-indigo-600 rounded-2xl text-white">
              <p className="text-xs text-indigo-100 uppercase font-bold mb-1">সর্বোচ্চ খরচকারী</p>
              <h4 className="text-xl font-black">
                {staffData.length > 0 ? staffData.sort((a,b) => b.amount - a.amount)[0].name : '--'}
              </h4>
              <p className="text-sm text-indigo-100 mt-2">মোট ৳ {staffData.length > 0 ? staffData.sort((a,b) => b.amount - a.amount)[0].amount.toLocaleString() : '০'}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
