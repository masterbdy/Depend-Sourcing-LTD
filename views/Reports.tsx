
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
        <title>Attendance Report - Depend Sourcing Ltd</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Hind Siliguri', sans-serif; -webkit-print-color-adjust: exact; }
          @page { size: A4; margin: 10mm; } /* Compact Margin */
          .no-break { break-inside: avoid; }
        </style>
      </head>
      <body class="bg-white text-gray-800">
        <div class="max-w-[210mm] mx-auto p-2">
          <!-- Header -->
          <div class="flex justify-between items-start mb-4 border-b border-green-600 pb-2">
            <div>
               <h1 class="text-xl font-black text-green-800 tracking-tight">Depend Sourcing Ltd.</h1>
               <p class="text-[10px] text-gray-500 font-medium">Monthly Attendance Report</p>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                <span class="font-bold">Period:</span> ${reportStartDate ? new Date(reportStartDate).toLocaleDateString('bn-BD') : 'Start'} — ${reportEndDate ? new Date(reportEndDate).toLocaleDateString('bn-BD') : 'Current'}
              </div>
              <p class="text-[9px] text-gray-400 mt-0.5">Print: ${new Date().toLocaleDateString('bn-BD')}</p>
            </div>
          </div>

          <!-- Summary Table -->
          <div class="mb-4 no-break">
             <h3 className="font-bold text-gray-700 mb-1 text-xs border-l-2 border-green-500 pl-2">Summary</h3>
             <table class="w-full text-left border-collapse border border-gray-200">
                <thead>
                   <tr class="bg-gray-50 text-[10px] font-bold text-gray-600 uppercase">
                      <th class="p-1 border border-gray-200">Staff Name</th>
                      <th class="p-1 border border-gray-200 text-center">Total Present</th>
                      <th class="p-1 border border-gray-200 text-center">Late Days</th>
                   </tr>
                </thead>
                <tbody class="text-[10px]">
                   ${summary.map(s => `
                      <tr>
                         <td class="p-1 border border-gray-200 font-bold">${s.name}</td>
                         <td class="p-1 border border-gray-200 text-center">${s.present}</td>
                         <td class="p-1 border border-gray-200 text-center text-red-600 font-bold">${s.late > 0 ? s.late : '-'}</td>
                      </tr>
                   `).join('')}
                </tbody>
             </table>
          </div>

          <!-- Detailed Log Table -->
          <h3 className="font-bold text-gray-700 mb-1 text-xs border-l-2 border-green-500 pl-2 mt-4">Detailed Log</h3>
          <table class="w-full text-left border-collapse mb-4">
            <thead>
              <tr class="bg-green-800 text-white text-[9px] uppercase tracking-wider">
                <th class="p-1.5 rounded-tl-md font-bold">Date</th>
                <th class="p-1.5 font-bold">Staff Name</th>
                <th class="p-1.5 font-bold text-center">In</th>
                <th class="p-1.5 font-bold text-center">Out</th>
                <th class="p-1.5 font-bold text-center">Status</th>
                <th class="p-1.5 font-bold text-right rounded-tr-md">Location</th>
              </tr>
            </thead>
            <tbody class="text-[10px]">
              ${filteredAttendance.map((a, index) => `
                <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-green-50/30'} border-b border-gray-100 no-break">
                  <td class="p-1.5 whitespace-nowrap font-bold text-gray-600">${new Date(a.date).toLocaleDateString('bn-BD')}</td>
                  <td class="p-1.5 font-bold text-gray-800">${a.staffName}</td>
                  <td class="p-1.5 text-center font-medium">${new Date(a.checkInTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'})}</td>
                  <td class="p-1.5 text-center text-gray-500">${a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'}) : '--'}</td>
                  <td class="p-1.5 text-center">
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight ${
                      a.status === 'LATE' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }">
                      ${a.status}
                    </span>
                  </td>
                  <td class="p-1.5 text-right text-gray-500 truncate max-w-[120px]">${a.location?.address || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
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
        // Only Add bill description if amount > 0
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
        <title>Ledger Report - Depend Sourcing Ltd</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Hind Siliguri', sans-serif; -webkit-print-color-adjust: exact; }
          @page { size: A4; margin: 10mm; } /* Tight Margins for max content */
          .no-break { break-inside: avoid; }
        </style>
      </head>
      <body class="bg-white text-gray-800">
        <div class="max-w-[210mm] mx-auto">
          <!-- Compact Header -->
          <div class="flex justify-between items-center mb-4 border-b-2 border-indigo-600 pb-2">
            <div>
               <h1 class="text-xl font-black text-indigo-900 tracking-tight leading-none">Depend Sourcing Ltd.</h1>
               <p class="text-[10px] text-gray-500 font-medium">Billing & Expense Ledger</p>
            </div>
            <div class="text-right">
              <div class="text-[10px] text-gray-600 font-bold bg-gray-100 px-2 py-1 rounded inline-block">
                ${reportStartDate ? new Date(reportStartDate).toLocaleDateString('bn-BD') : 'Start'} — ${reportEndDate ? new Date(reportEndDate).toLocaleDateString('bn-BD') : 'Current'}
              </div>
              <p class="text-[9px] text-gray-400 mt-0.5">Printed: ${new Date().toLocaleDateString('bn-BD')}</p>
            </div>
          </div>

          <!-- Compact Summary Row -->
          <div class="flex justify-between gap-4 mb-4 text-xs">
            <div class="flex-1 bg-indigo-50 p-2 rounded border border-indigo-100 flex justify-between items-center">
               <span class="font-bold text-indigo-600 uppercase">Total Bill</span>
               <span class="font-black text-indigo-800 text-sm">৳ ${totalExpenseAmount.toLocaleString()}</span>
            </div>
            <div class="flex-1 bg-blue-50 p-2 rounded border border-blue-100 flex justify-between items-center">
               <span class="font-bold text-blue-600 uppercase">Total Advance</span>
               <span class="font-black text-blue-800 text-sm">৳ ${totalAdvanceGiven.toLocaleString()}</span>
            </div>
          </div>

          <!-- Compact Table -->
          <table class="w-full text-left border-collapse mb-4">
            <thead>
              <tr class="bg-indigo-900 text-white text-[9px] uppercase tracking-wider">
                <th class="p-1.5 rounded-tl-md font-bold w-8 text-center">SL</th>
                <th class="p-1.5 font-bold w-20">Date</th>
                <th class="p-1.5 font-bold w-28">Name</th>
                <th class="p-1.5 font-bold">Details</th>
                <th class="p-1.5 font-bold text-right w-20">Bill (৳)</th>
                <th class="p-1.5 font-bold text-right rounded-tr-md w-20">Adv (৳)</th>
              </tr>
            </thead>
            <tbody class="text-[10px]">
              ${allTransactions.map((t, index) => `
                <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-gray-100 no-break">
                  <td class="p-1.5 font-medium text-gray-400 text-center align-top">${index + 1}</td>
                  <td class="p-1.5 whitespace-nowrap align-top">${new Date(t.date).toLocaleDateString('bn-BD')}</td>
                  <td class="p-1.5 font-bold text-gray-700 align-top">${t.staffName}</td>
                  <td class="p-1.5 text-gray-600 align-top">
                     <ul class="list-disc list-inside space-y-0 leading-tight">
                       ${t.descriptions.map(d => `<li>${d}</li>`).join('')}
                     </ul>
                  </td>
                  <td class="p-1.5 text-right font-bold text-gray-800 align-top">${t.billAmount > 0 ? t.billAmount.toLocaleString() : '-'}</td>
                  <td class="p-1.5 text-right font-bold text-blue-700 align-top">${t.advanceAmount > 0 ? t.advanceAmount.toLocaleString() : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
               <tr class="bg-gray-100 text-gray-800 font-bold text-[10px] border-t-2 border-gray-300">
                 <td colspan="4" class="p-2 text-right uppercase tracking-wider">Net Total</td>
                 <td class="p-2 text-right text-indigo-700">৳ ${totalExpenseAmount.toLocaleString()}</td>
                 <td class="p-2 text-right text-blue-700">৳ ${totalAdvanceGiven.toLocaleString()}</td>
               </tr>
            </tfoot>
          </table>

          <!-- Compact Footer -->
          <div class="mt-8 pt-4 border-t border-gray-200 flex justify-between items-end text-[9px] text-gray-400 no-break">
             <div>
                <p class="font-bold text-gray-500">Depend Sourcing Ltd.</p>
                <p>© ${new Date().getFullYear()} Internal Document.</p>
             </div>
             <div class="text-right">
               <div class="h-10 flex flex-col justify-end">
                  <div class="w-32 border-b border-gray-300 mb-1"></div>
               </div>
               <p class="font-bold uppercase tracking-wider">Authorized Signature</p>
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
