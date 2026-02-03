
import React, { useState } from 'react';
import { BarChart3, Download, FileText, Users, Calendar, Table, Printer, UserCheck } from 'lucide-react';
import { Expense, Staff, AdvanceLog, Attendance } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ReportsProps {
  expenses: Expense[];
  staffList: Staff[];
  advances: AdvanceLog[];
  attendanceList: Attendance[];
}

const ReportsView: React.FC<ReportsProps> = ({ expenses, staffList, advances, attendanceList }) => {
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  const approvedExpenses = expenses.filter(e => !e.isDeleted && e.status === 'APPROVED');
  
  // Chart Data Preparation (Staff-wise expenses) - Overall
  const staffData = staffList.map(s => {
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
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th { font-size: 9px; text-transform: uppercase; font-weight: 800; padding: 6px; }
    td { font-size: 10px; padding: 5px 6px; border-bottom: 1px solid #e5e7eb; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #9ca3af; }
  `;

  // Attendance Report Generator
  const generateAttendanceReport = () => {
    const start = reportStartDate ? new Date(reportStartDate).setHours(0, 0, 0, 0) : 0;
    const end = reportEndDate ? new Date(reportEndDate).setHours(23, 59, 59, 999) : Number.MAX_VALUE;

    // Filter
    const filteredAttendance = attendanceList.filter(a => {
      const d = new Date(a.date).getTime();
      return d >= start && d <= end;
    }).sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());

    if (filteredAttendance.length === 0) {
      alert("নির্বাচিত তারিখের মধ্যে কোনো হাজিরা ডাটা পাওয়া যায়নি।");
      return;
    }

    // Summary Calculation
    const summary = staffList.map(staff => {
      const records = filteredAttendance.filter(a => a.staffId === staff.id);
      return {
        name: staff.name,
        present: records.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length, // Total present
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
          .theme-color { color: #166534; } /* Green-800 */
          .theme-bg { background-color: #166534; color: white; }
          .theme-border { border-color: #166534; }
          .theme-light-bg { background-color: #f0fdf4; } /* Green-50 */
        </style>
      </head>
      <body>
        <div class="watermark">DEPEND SOURCING</div>
        <div class="max-w-[210mm] mx-auto">
          
          <!-- Letterhead Header -->
          <div class="header-section theme-border flex justify-between items-end">
             <div>
                <h1 class="company-name theme-color">Depend Sourcing Ltd.</h1>
                <p class="tagline">Promise Beyond Business</p>
             </div>
             <div class="address-block">
                <p><strong>Head Office:</strong> A-14/8, Johir Complex (Ground Floor), Talbagh, Savar, Dhaka, Bangladesh.</p>
                <p>Phone: +8801764700203 | Web: www.dependsourcingltd.com</p>
                <p>Email: dependsource@gmail.com, info@dependsourcingltd.com</p>
             </div>
          </div>

          <!-- Report Title Bar -->
          <div class="report-title-box theme-light-bg border border-green-200">
             <div>
                <h2 class="report-title theme-color">ATTENDANCE REPORT</h2>
                <p class="meta-text text-gray-500">Employee Attendance Log</p>
             </div>
             <div class="text-right meta-text">
                <p><strong>Period:</strong> ${reportStartDate ? new Date(reportStartDate).toLocaleDateString('bn-BD') : 'Start'} — ${reportEndDate ? new Date(reportEndDate).toLocaleDateString('bn-BD') : 'Today'}</p>
                <p>Generated: ${new Date().toLocaleString('bn-BD', {dateStyle:'medium', timeStyle:'short'})}</p>
             </div>
          </div>

          <!-- Summary Table -->
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

          <!-- Detailed Log Table -->
          <h3 class="text-xs font-bold text-gray-700 mb-2 uppercase border-l-2 theme-border pl-2">Detailed Daily Log</h3>
          <table>
            <thead>
              <tr class="theme-bg">
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
                  <td class="font-bold text-gray-600 whitespace-nowrap">${new Date(a.date).toLocaleDateString('bn-BD')}</td>
                  <td class="font-bold text-gray-800">${a.staffName}</td>
                  <td class="text-center font-medium">${new Date(a.checkInTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})}</td>
                  <td class="text-center text-gray-500">${a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'}) : '--'}</td>
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

          <!-- Footer -->
          <div class="footer">
             <div>
                <p>Depend Sourcing Ltd. Internal Document.</p>
                <p>System Generated Report.</p>
             </div>
             <div class="text-right">
               <div class="h-8 border-b border-gray-400 w-32 mb-1"></div>
               <p class="font-bold uppercase">Authorized Signature</p>
             </div>
          </div>

        </div>
        <script>
          window.onload = () => { setTimeout(() => { window.print(); }, 500); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Premium PDF Report Generator (Financial) - COMPACT VERSION
  const generatePDFReport = () => {
    // 1. Filter Expenses and Advances by Date
    const start = reportStartDate ? new Date(reportStartDate).setHours(0, 0, 0, 0) : 0;
    const end = reportEndDate ? new Date(reportEndDate).setHours(23, 59, 59, 999) : Number.MAX_VALUE;

    const filteredExpenses = expenses.filter(e => {
      if (e.isDeleted) return false;
      const d = new Date(e.createdAt).getTime();
      return d >= start && d <= end;
    });

    const filteredAdvances = advances.filter(a => {
      if (a.isDeleted) return false;
      const d = new Date(a.date).getTime();
      return d >= start && d <= end;
    });

    if (filteredExpenses.length === 0 && filteredAdvances.length === 0) {
      alert("নির্বাচিত তারিখের মধ্যে কোনো ডাটা পাওয়া যায়নি।");
      return;
    }

    // --- AGGREGATION LOGIC ---
    // Key: YYYY-MM-DD_staffId
    const groupedData: Record<string, { date: string, staffName: string, descriptions: string[], billAmount: number, advanceAmount: number }> = {};
    const toKey = (dateStr: string, id: string) => `${new Date(dateStr).toDateString()}_${id}`;

    // Process Expenses (Bills)
    filteredExpenses.forEach(e => {
        const key = toKey(e.createdAt, e.staffId);
        if(!groupedData[key]) {
            groupedData[key] = {
                date: e.createdAt,
                staffName: e.staffName,
                descriptions: [],
                billAmount: 0,
                advanceAmount: 0
            };
        }
        groupedData[key].descriptions.push(`${e.reason}`);
        if(e.status !== 'APPROVED') {
           groupedData[key].descriptions[groupedData[key].descriptions.length - 1] += ` (${e.status})`;
        }
        groupedData[key].billAmount += Number(e.amount);
    });

    // Process Advances
    filteredAdvances.forEach(a => {
        const key = toKey(a.date, a.staffId);
        if(!groupedData[key]) {
            groupedData[key] = {
                date: a.date,
                staffName: a.staffName,
                descriptions: [],
                billAmount: 0,
                advanceAmount: 0
            };
        }
        const prefix = a.type === 'SALARY' ? '[Sal.Adv]' : '[Adv]';
        groupedData[key].descriptions.push(`${prefix} ${a.note || ''}`);
        groupedData[key].advanceAmount += Number(a.amount);
    });

    // Convert to Array & Sort
    const allTransactions = Object.values(groupedData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate Totals for Footer
    const totalExpenseAmount = allTransactions.reduce((sum, t) => sum + t.billAmount, 0);
    const totalAdvanceGiven = allTransactions.reduce((sum, t) => sum + t.advanceAmount, 0);

    // Open new window for print view
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>Ledger Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          ${getCommonStyle()}
          .theme-color { color: #312e81; } /* Indigo-900 */
          .theme-bg { background-color: #312e81; color: white; }
          .theme-border { border-color: #312e81; }
          .theme-light-bg { background-color: #e0e7ff; } /* Indigo-100 */
        </style>
      </head>
      <body>
        <div class="watermark">DEPEND FINANCIAL</div>
        <div class="max-w-[210mm] mx-auto">
          
          <!-- Letterhead Header -->
          <div class="header-section theme-border flex justify-between items-end">
             <div>
                <h1 class="company-name theme-color">Depend Sourcing Ltd.</h1>
                <p class="tagline">Promise Beyond Business</p>
             </div>
             <div class="address-block">
                <p><strong>Head Office:</strong> A-14/8, Johir Complex (Ground Floor), Talbagh, Savar, Dhaka, Bangladesh.</p>
                <p>Phone: +8801764700203 | Web: www.dependsourcingltd.com</p>
                <p>Email: dependsource@gmail.com, info@dependsourcingltd.com</p>
             </div>
          </div>

          <!-- Report Title Bar -->
          <div class="report-title-box theme-light-bg border border-indigo-200">
             <div>
                <h2 class="report-title theme-color">FINANCIAL LEDGER</h2>
                <p class="meta-text text-gray-600">Expense & Advance Statement</p>
             </div>
             <div class="text-right meta-text">
                <p><strong>Period:</strong> ${reportStartDate ? new Date(reportStartDate).toLocaleDateString('bn-BD') : 'Start'} — ${reportEndDate ? new Date(reportEndDate).toLocaleDateString('bn-BD') : 'Today'}</p>
                <p>Generated: ${new Date().toLocaleString('bn-BD', {dateStyle:'medium', timeStyle:'short'})}</p>
             </div>
          </div>

          <!-- Summary Cards Row -->
          <div class="flex justify-between gap-4 mb-4 text-xs">
            <div class="flex-1 bg-gray-50 p-2 rounded border border-gray-200 flex justify-between items-center">
               <span class="font-bold text-gray-600 uppercase">Total Bill Submitted</span>
               <span class="font-black text-indigo-900 text-sm">৳ ${totalExpenseAmount.toLocaleString()}</span>
            </div>
            <div class="flex-1 bg-gray-50 p-2 rounded border border-gray-200 flex justify-between items-center">
               <span class="font-bold text-gray-600 uppercase">Total Advance Given</span>
               <span class="font-black text-blue-800 text-sm">৳ ${totalAdvanceGiven.toLocaleString()}</span>
            </div>
          </div>

          <!-- Compact Table -->
          <table>
            <thead>
              <tr class="theme-bg">
                <th class="text-center w-8 rounded-tl">SL</th>
                <th class="text-left w-20">Date</th>
                <th class="text-left w-28">Staff Name</th>
                <th class="text-left">Description (Particulars)</th>
                <th class="text-right w-20">Bill (৳)</th>
                <th class="text-right w-20 rounded-tr">Adv (৳)</th>
              </tr>
            </thead>
            <tbody>
              ${allTransactions.map((t, index) => `
                <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}">
                  <td class="text-center font-medium text-gray-400 align-top">${index + 1}</td>
                  <td class="whitespace-nowrap align-top font-semibold text-gray-600">${new Date(t.date).toLocaleDateString('bn-BD')}</td>
                  <td class="font-bold text-gray-700 align-top">${t.staffName}</td>
                  <td class="text-gray-600 align-top">
                     <ul class="list-disc list-inside space-y-0 leading-tight">
                       ${t.descriptions.map(d => `<li>${d}</li>`).join('')}
                     </ul>
                  </td>
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

          <!-- Footer -->
          <div class="footer">
             <div>
                <p>Depend Sourcing Ltd. Confidential.</p>
                <p>Accounts Department.</p>
             </div>
             <div class="text-right">
               <div class="h-8 border-b border-gray-400 w-32 mb-1"></div>
               <p class="font-bold uppercase">Accounts Signature</p>
             </div>
          </div>

        </div>
        <script>
          window.onload = () => { setTimeout(() => { window.print(); }, 500); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8">
      {/* Report Control Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          রিপোর্ট জেনারেট করুন
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
          <button 
            onClick={generatePDFReport}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Printer className="w-5 h-5" />
            ফিনান্সিয়াল রিপোর্ট (PDF)
          </button>
          <button 
            onClick={generateAttendanceReport}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95"
          >
            <UserCheck className="w-5 h-5" />
            হাজিরা রিপোর্ট (PDF)
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
          <Users className="w-3 h-3" /> 
          রিপোর্টের ধরণ অনুযায়ী বাটন সিলেক্ট করুন।
        </p>
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
