
import React, { useState, useMemo } from 'react';
import { MessageSquareWarning, Search, FilterX, Send, ShieldAlert, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Complaint, Staff, UserRole } from '../types';

interface ComplaintProps {
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  staffList: Staff[];
  role: UserRole;
  currentUser: string | null;
}

const ComplaintBoxView: React.FC<ComplaintProps> = ({ complaints, setComplaints, staffList, role, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ againstStaffId: '', subject: '', description: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const activeStaff = staffList.filter(s => !s.deletedAt && s.status === 'ACTIVE');
  const isManagement = role === UserRole.ADMIN || role === UserRole.MD;

  // Filter Logic: 
  // - Management sees ALL complaints.
  // - Staff sees ONLY their own submitted complaints.
  const visibleComplaints = useMemo(() => {
    let list = complaints.filter(c => !c.isDeleted);
    
    if (!isManagement) {
      list = list.filter(c => c.submittedBy === currentUser);
    }

    if (filterStatus !== 'ALL') {
      list = list.filter(c => c.status === filterStatus);
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [complaints, role, currentUser, filterStatus, isManagement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const accusedStaff = staffList.find(s => s.id === formData.againstStaffId);
    if (!accusedStaff) return alert('স্টাফ নির্বাচন করুন');

    // Find submitter ID if possible, otherwise use random/auth logic
    const submitter = staffList.find(s => s.name === currentUser);

    const newComplaint: Complaint = {
      id: Math.random().toString(36).substr(2, 9),
      submittedBy: currentUser,
      submittedById: submitter?.id || 'unknown',
      againstStaffId: accusedStaff.id,
      againstStaffName: accusedStaff.name,
      subject: formData.subject,
      description: formData.description,
      date: new Date().toISOString(),
      status: 'PENDING'
    };

    setComplaints(prev => [newComplaint, ...prev]);
    setIsModalOpen(false);
    setFormData({ againstStaffId: '', subject: '', description: '' });
  };

  const updateStatus = (id: string, status: Complaint['status']) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
             <MessageSquareWarning className="w-6 h-6 text-red-600" />
             অভিযোগ বাক্স (Complaint Box)
           </h2>
           <p className="text-sm text-gray-500 mt-1">
             {isManagement 
               ? 'স্টাফদের করা অভিযোগগুলো এখানে দেখুন এবং ব্যবস্থা নিন।' 
               : 'আপনার কোনো অভিযোগ থাকলে এখানে গোপনীয়ভাবে জানাতে পারেন।'}
           </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-100 flex items-center gap-2 active:scale-95"
        >
          <ShieldAlert className="w-5 h-5" />
          অভিযোগ দাখিল করুন
        </button>
      </div>

      {/* Filters (Management Only) */}
      {isManagement && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['ALL', 'PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                filterStatus === status 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {status === 'ALL' ? 'সব দেখুন' : status}
            </button>
          ))}
        </div>
      )}

      {/* Complaint List */}
      <div className="grid grid-cols-1 gap-4">
        {visibleComplaints.map((complaint) => (
          <div key={complaint.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-red-100 transition-all">
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                <div className="flex items-start gap-3">
                   <div className={`mt-1 p-2 rounded-full ${complaint.status === 'RESOLVED' ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {complaint.status === 'RESOLVED' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                   </div>
                   <div>
                      <h3 className="font-bold text-gray-800 text-lg">{complaint.subject}</h3>
                      <div className="flex items-center gap-2 text-sm mt-1">
                         <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-[10px] uppercase">Against</span>
                         <span className="font-semibold text-gray-700">{complaint.againstStaffName}</span>
                         <span className="text-gray-300">•</span>
                         <span className="text-gray-500 text-xs">{new Date(complaint.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      
                      {/* Only Management sees who submitted it */}
                      {isManagement && (
                        <p className="text-xs text-indigo-600 mt-1 font-medium flex items-center gap-1">
                          <User className="w-3 h-3" /> অভিযোগকারী: {complaint.submittedBy}
                        </p>
                      )}
                   </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      complaint.status === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                      complaint.status === 'INVESTIGATING' ? 'bg-blue-100 text-blue-600' :
                      complaint.status === 'RESOLVED' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-500'
                   }`}>
                      {complaint.status}
                   </span>
                   <button 
                     onClick={() => setExpandedId(expandedId === complaint.id ? null : complaint.id)}
                     className="text-xs font-bold text-gray-400 flex items-center gap-1 hover:text-gray-600"
                   >
                     {expandedId === complaint.id ? 'বিস্তারিত লুকান' : 'বিস্তারিত দেখুন'} 
                     {expandedId === complaint.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                   </button>
                </div>
             </div>

             {/* Expanded Content */}
             {expandedId === complaint.id && (
               <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-4 border border-gray-100">
                     {complaint.description}
                  </div>

                  {/* Management Actions */}
                  {isManagement && (
                    <div className="flex flex-wrap gap-2 justify-end">
                       {complaint.status !== 'INVESTIGATING' && complaint.status !== 'RESOLVED' && (
                         <button onClick={() => updateStatus(complaint.id, 'INVESTIGATING')} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                           Mark as Investigating
                         </button>
                       )}
                       {complaint.status !== 'RESOLVED' && (
                         <button onClick={() => updateStatus(complaint.id, 'RESOLVED')} className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                           Mark as Resolved
                         </button>
                       )}
                       {complaint.status !== 'DISMISSED' && (
                         <button onClick={() => updateStatus(complaint.id, 'DISMISSED')} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">
                           Dismiss
                         </button>
                       )}
                    </div>
                  )}
               </div>
             )}
          </div>
        ))}

        {visibleComplaints.length === 0 && (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-300 mb-4">
                <ShieldAlert className="w-8 h-8" />
             </div>
             <p className="text-lg font-bold text-gray-500">কোনো অভিযোগ নেই</p>
             <p className="text-sm text-gray-400">সবকিছু ঠিকঠাক চলছে!</p>
          </div>
        )}
      </div>

      {/* Submit Complaint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-600 text-white">
                <div className="flex items-center gap-3">
                   <MessageSquareWarning className="w-6 h-6" />
                   <h3 className="font-bold text-xl">অভিযোগ দাখিল করুন</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-red-200 hover:text-white transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
             </div>

             <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="bg-red-50 p-3 rounded-lg flex items-start gap-2 text-xs text-red-700">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>আপনার অভিযোগটি অত্যন্ত গোপনীয়তার সাথে দেখা হবে। এটি শুধুমাত্র অ্যাডমিন এবং এমডি দেখতে পাবেন।</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">কার বিরুদ্ধে অভিযোগ?</label>
                  <select 
                    required 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-gray-800"
                    value={formData.againstStaffId}
                    onChange={(e) => setFormData({...formData, againstStaffId: e.target.value})}
                  >
                    <option value="">স্টাফ নির্বাচন করুন...</option>
                    {activeStaff.filter(s => s.name !== currentUser).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">অভিযোগের বিষয় (Subject)</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-gray-800"
                    placeholder="অল্প কথায় বিষয়টি লিখুন"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">বিস্তারিত বিবরণ</label>
                  <textarea 
                    required 
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm font-medium text-gray-700"
                    placeholder="ঘটনাটি বিস্তারিত লিখুন..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="pt-2">
                   <button 
                     type="submit" 
                     className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-sm hover:bg-red-700 shadow-xl shadow-red-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                   >
                     <Send className="w-5 h-5" />
                     জমা দিন
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintBoxView;
