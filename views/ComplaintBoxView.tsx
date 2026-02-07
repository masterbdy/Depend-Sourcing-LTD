import React, { useState, useMemo } from 'react';
import { MessageSquareWarning, Search, FilterX, Send, ShieldAlert, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, User, Lightbulb, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { Complaint, Staff, UserRole } from '../types';

interface ComplaintProps {
  complaints: Complaint[];
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  staffList: Staff[];
  role: UserRole;
  currentUser: string | null;
  onOpenProfile?: (staffId: string) => void;
}

const ComplaintBoxView: React.FC<ComplaintProps> = ({ complaints = [], setComplaints, staffList = [], role, currentUser, onOpenProfile }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    againstStaffId: '', 
    subject: '', 
    description: '', 
    type: 'COMPLAINT' as 'COMPLAINT' | 'SUGGESTION' 
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const activeStaff = (staffList || []).filter(s => !s.deletedAt && s.status === 'ACTIVE');
  const isManagement = role === UserRole.ADMIN || role === UserRole.MD;

  const visibleComplaints = useMemo(() => {
    let list = (complaints || []).filter(c => !c.isDeleted);
    
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

    let accusedStaffId = 'GENERAL';
    let accusedStaffName = 'General / System';

    if (formData.type === 'COMPLAINT') {
        const accusedStaff = activeStaff.find(s => s.id === formData.againstStaffId);
        if (!accusedStaff) return alert('যার বিরুদ্ধে অভিযোগ তাকে নির্বাচন করুন');
        accusedStaffId = accusedStaff.id;
        accusedStaffName = accusedStaff.name;
    } else {
        accusedStaffName = 'পরামর্শ (Suggestion)';
    }

    const submitter = (staffList || []).find(s => s.name === currentUser);

    const newComplaint: Complaint = {
      id: Math.random().toString(36).substr(2, 9),
      submittedBy: currentUser,
      submittedById: submitter?.id || 'unknown',
      againstStaffId: accusedStaffId,
      againstStaffName: accusedStaffName,
      subject: formData.subject,
      description: formData.description,
      date: new Date().toISOString(),
      status: 'PENDING',
      type: formData.type
    };

    setComplaints(prev => [newComplaint, ...prev]);
    setIsModalOpen(false);
    setFormData({ againstStaffId: '', subject: '', description: '', type: 'COMPLAINT' });
  };

  const updateStatus = (id: string, status: Complaint['status']) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      setComplaints(prev => prev.map(c => c.id === deleteConfirmId ? { ...c, isDeleted: true } : c));
      setDeleteConfirmId(null);
    }
  };

  const handleProfileClick = (name: string) => {
    if (!onOpenProfile) return;
    const staff = (staffList || []).find(s => s.name === name);
    if (staff) {
      onOpenProfile(staff.id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
             <div className="bg-gradient-to-br from-red-100 to-orange-100 p-2 rounded-xl">
               <MessageSquareWarning className="w-6 h-6 text-red-600" />
             </div>
             অভিযোগ ও পরামর্শ বক্স
           </h2>
           <p className="text-sm text-gray-500 mt-1 font-medium">
             {isManagement 
               ? 'স্টাফদের মতামত, অভিযোগ ও পরামর্শ পর্যালোচনা করুন।' 
               : 'আপনার অভিযোগ বা পরামর্শ গোপনীয়তার সাথে জানান।'}
           </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2 active:scale-95 transform hover:-translate-y-0.5"
        >
          <Send className="w-5 h-5" />
          নতুন সাবমিশন
        </button>
      </div>

      {isManagement && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['ALL', 'PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                filterStatus === status 
                  ? 'bg-gray-800 text-white shadow-lg' 
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {status === 'ALL' ? 'সব দেখুন' : status}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {visibleComplaints.map((item) => {
          const isSuggestion = item.type === 'SUGGESTION';
          
          return (
          <div key={item.id} className={`group bg-white rounded-3xl p-6 shadow-sm border transition-all hover:shadow-md ${isSuggestion ? 'border-teal-100 hover:border-teal-200' : 'border-red-100 hover:border-red-200'}`}>
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                <div className="flex items-start gap-4">
                   <div className={`mt-1 p-3 rounded-2xl shadow-sm ${
                      item.status === 'RESOLVED' ? 'bg-green-100 text-green-600' : 
                      isSuggestion ? 'bg-teal-100 text-teal-600' : 'bg-red-50 text-red-500'
                   }`}>
                      {item.status === 'RESOLVED' ? <CheckCircle2 className="w-6 h-6" /> : 
                       isSuggestion ? <Lightbulb className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                   </div>
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isSuggestion ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'}`}>
                           {isSuggestion ? 'পরামর্শ' : 'অভিযোগ'}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs font-bold text-gray-400">{new Date(item.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      <h3 className="font-bold text-gray-800 text-lg leading-tight">{item.subject}</h3>
                      
                      {!isSuggestion && (
                        <div className="flex items-center gap-2 text-xs mt-1">
                           <span className="font-bold text-gray-500">Against:</span>
                           <span 
                             className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded cursor-pointer hover:underline"
                             onClick={() => handleProfileClick(item.againstStaffName)}
                           >
                             {item.againstStaffName}
                           </span>
                        </div>
                      )}
                      
                      {isManagement && (
                        <p 
                          className="text-xs text-indigo-600 mt-2 font-bold flex items-center gap-1 bg-indigo-50 w-fit px-2 py-1 rounded-lg cursor-pointer hover:bg-indigo-100"
                          onClick={() => handleProfileClick(item.submittedBy)}
                        >
                          <User className="w-3 h-3" /> প্রেরক: {item.submittedBy}
                        </p>
                      )}
                   </div>
                </div>

                <div className="flex flex-col items-end gap-2 pl-14 md:pl-0">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                      item.status === 'PENDING' ? 'bg-orange-100 text-orange-600' :
                      item.status === 'INVESTIGATING' ? 'bg-blue-100 text-blue-600' :
                      item.status === 'RESOLVED' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-500'
                   }`}>
                      {item.status}
                   </span>
                   <button 
                     onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                     className="text-xs font-bold text-gray-400 flex items-center gap-1 hover:text-indigo-600 transition-colors bg-gray-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg"
                   >
                     {expandedId === item.id ? 'বিস্তারিত লুকান' : 'বিস্তারিত দেখুন'} 
                     {expandedId === item.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                   </button>
                </div>
             </div>

             {expandedId === item.id && (
               <div className="mt-4 pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className={`p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-line mb-4 border ${isSuggestion ? 'bg-teal-50/50 border-teal-100 text-teal-900' : 'bg-red-50/50 border-red-100 text-gray-800'}`}>
                     {item.description}
                  </div>

                  {isManagement && (
                    <div className="flex flex-wrap gap-2 justify-end">
                       {item.status !== 'INVESTIGATING' && item.status !== 'RESOLVED' && (
                         <button onClick={() => updateStatus(item.id, 'INVESTIGATING')} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100">
                           Investigate
                         </button>
                       )}
                       {item.status !== 'RESOLVED' && (
                         <button onClick={() => updateStatus(item.id, 'RESOLVED')} className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors border border-green-100">
                           Mark Resolved
                         </button>
                       )}
                       {item.status !== 'DISMISSED' && (
                         <button onClick={() => updateStatus(item.id, 'DISMISSED')} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors border border-gray-200">
                           Dismiss
                         </button>
                       )}
                       <button 
                         onClick={() => handleDeleteRequest(item.id)} 
                         className="px-4 py-2 bg-white text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors border border-red-200 flex items-center gap-1"
                       >
                         <Trash2 className="w-3 h-3" /> Delete
                       </button>
                    </div>
                  )}
               </div>
             )}
          </div>
        )})}

        {visibleComplaints.length === 0 && (
          <div className="py-24 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
             <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 text-gray-300 mb-6">
                <Sparkles className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-bold text-gray-600">বর্তমানে কোনো রেকর্ড নেই</h3>
             <p className="text-gray-400 mt-2">আপনার কোনো অভিযোগ বা পরামর্শ থাকলে জানাতে পারেন!</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
             <div className={`p-6 border-b border-gray-100 flex justify-between items-center text-white ${formData.type === 'SUGGESTION' ? 'bg-teal-600' : 'bg-red-600'}`}>
                <div className="flex items-center gap-3">
                   {formData.type === 'SUGGESTION' ? <Lightbulb className="w-6 h-6" /> : <MessageSquareWarning className="w-6 h-6" />}
                   <h3 className="font-bold text-xl">{formData.type === 'SUGGESTION' ? 'পরামর্শ দিন' : 'অভিযোগ করুন'}</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
             </div>

             <div className="overflow-y-auto p-6 space-y-5">
                <div className="flex p-1 bg-gray-100 rounded-xl">
                   <button 
                     type="button"
                     onClick={() => setFormData({...formData, type: 'COMPLAINT'})}
                     className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${formData.type === 'COMPLAINT' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                      <ShieldAlert className="w-4 h-4" /> অভিযোগ
                   </button>
                   <button 
                     type="button"
                     onClick={() => setFormData({...formData, type: 'SUGGESTION'})}
                     className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${formData.type === 'SUGGESTION' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                      <Lightbulb className="w-4 h-4" /> পরামর্শ
                   </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className={`p-3 rounded-xl flex items-start gap-3 text-xs border ${formData.type === 'SUGGESTION' ? 'bg-teal-50 text-teal-800 border-teal-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
                      {formData.type === 'SUGGESTION' ? <Sparkles className="w-5 h-5 shrink-0" /> : <ShieldAlert className="w-5 h-5 shrink-0" />}
                      <p>
                        {formData.type === 'SUGGESTION' 
                          ? 'অফিস বা কাজের মান উন্নয়নের জন্য যেকোনো গঠনমূলক পরামর্শ দিন। এটি পজিটিভলি দেখা হবে।' 
                          : 'আপনার অভিযোগটি অত্যন্ত গোপনীয়তার সাথে দেখা হবে। এটি শুধুমাত্র অ্যাডমিন এবং এমডি দেখতে পাবেন।'}
                      </p>
                    </div>

                    {formData.type === 'COMPLAINT' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
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
                    )}

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">বিষয় (Subject)</label>
                      <input 
                        required 
                        type="text" 
                        className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 outline-none transition-all font-bold text-gray-800 ${formData.type === 'SUGGESTION' ? 'focus:ring-teal-500' : 'focus:ring-red-500'}`}
                        placeholder={formData.type === 'SUGGESTION' ? "যেমন: লাঞ্চের মান উন্নয়ন" : "যেমন: অনাচার বা সমস্যা"}
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">বিস্তারিত বিবরণ</label>
                      <textarea 
                        required 
                        rows={5}
                        className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 outline-none transition-all text-sm font-medium text-gray-700 ${formData.type === 'SUGGESTION' ? 'focus:ring-teal-500' : 'focus:ring-red-500'}`}
                        placeholder="বিস্তারিত লিখুন..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    <div className="pt-2">
                       <button 
                         type="submit" 
                         className={`w-full text-white py-4 rounded-xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${formData.type === 'SUGGESTION' ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
                       >
                         <Send className="w-5 h-5" />
                         জমা দিন
                       </button>
                    </div>
                </form>
             </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-sm text-gray-500 mb-6">
                আপনি এই রেকর্ডটি ডিলিট করতে যাচ্ছেন। এটি রিসাইকেল বিনে জমা হবে।
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  না, বাতিল করুন
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                >
                  হ্যাঁ, ডিলিট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintBoxView;