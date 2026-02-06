
import React, { useState } from 'react';
import { Bell, Plus, Trash2, Megaphone, Info, AlertCircle, X, Check, Pin, Eye, CalendarDays, AlertTriangle } from 'lucide-react';
import { Notice, UserRole } from '../types';
import { ROLE_LABELS } from '../constants';

interface NoticeBoardProps {
  notices: Notice[];
  setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
  role: UserRole;
  currentUser: string;
}

const NoticeBoardView: React.FC<NoticeBoardProps> = ({ notices = [], setNotices, role, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', type: 'NORMAL' as 'NORMAL' | 'URGENT' });
  const [seenListNoticeId, setSeenListNoticeId] = useState<string | null>(null);
  
  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Only show active notices
  const activeNotices = (notices || []).filter(n => !n.isDeleted).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const canPost = role === UserRole.ADMIN || role === UserRole.MD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newNotice: Notice = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      content: formData.content,
      type: formData.type,
      postedBy: `${currentUser} (${ROLE_LABELS[role]})`,
      role: role,
      date: new Date().toISOString(),
      reactions: []
    };
    setNotices(prev => [newNotice, ...prev]);
    setIsModalOpen(false);
    setFormData({ title: '', content: '', type: 'NORMAL' });
  };

  const handleDeleteRequest = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent parent clicks
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      const updatedNotices = notices.map(n => n.id === deleteConfirmId ? { ...n, isDeleted: true } : n);
      setNotices(updatedNotices);
      setDeleteConfirmId(null);
    }
  };

  const toggleReaction = (noticeId: string) => {
    setNotices(prev => prev.map(n => {
      if (n.id === noticeId) {
        const reactions = n.reactions || [];
        const existingIdx = reactions.findIndex(r => r.userId === currentUser);
        
        let newReactions = [...reactions];
        if (existingIdx > -1) {
           newReactions.splice(existingIdx, 1); // Remove seen
        } else {
           newReactions.push({ userId: currentUser, userName: currentUser, emoji: 'seen' }); // Add seen
        }
        return { ...n, reactions: newReactions };
      }
      return n;
    }));
  };

  const getNoticeReactions = (noticeId: string) => {
     const notice = notices.find(n => n.id === noticeId);
     return notice?.reactions || [];
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
             <div className="bg-indigo-100 p-2 rounded-xl">
               <Bell className="w-8 h-8 text-indigo-600" />
             </div>
             অফিস নোটিশ বোর্ড
          </h2>
          <p className="text-gray-500 mt-2 font-medium">অফিসের সকল ঘোষণা, আপডেট এবং নির্দেশাবলী</p>
        </div>
        
        {canPost && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2 active:scale-95 transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            নতুন ঘোষণা প্রকাশ করুন
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {activeNotices.map((notice) => {
            const reactions = notice.reactions || [];
            const hasSeen = reactions.some(r => r.userId === currentUser);
            const isUrgent = notice.type === 'URGENT';

            return (
            <div 
              key={notice.id} 
              className={`group relative rounded-3xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                isUrgent 
                  ? 'bg-gradient-to-br from-red-50 via-white to-red-50/30 border-2 border-red-100 shadow-red-100' 
                  : 'bg-gradient-to-br from-sky-50 via-indigo-50 to-blue-50 border border-sky-100 shadow-lg shadow-sky-50'
              }`}
            >
               {/* Decorative PIN */}
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full shadow-sm mb-[-6px] z-0 ${isUrgent ? 'bg-red-800' : 'bg-indigo-800'}`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 border-white relative z-10 ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      <Pin className="w-4 h-4 fill-current transform -rotate-45" />
                  </div>
               </div>

               {/* Header Section */}
               <div className="mt-4 flex justify-between items-start mb-3">
                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                    isUrgent ? 'bg-red-500 text-white' : 'bg-sky-500 text-white'
                 }`}>
                    {isUrgent ? 'জরুরী ঘোষণা' : 'সাধারণ নোটিশ'}
                 </span>
                 
                 {canPost && (
                   <button 
                      onClick={(e) => handleDeleteRequest(e, notice.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="মুছে ফেলুন"
                   >
                      <Trash2 className="w-4 h-4" />
                   </button>
                 )}
               </div>

               {/* Content */}
               <div className="flex-1 mb-6">
                  <h3 className={`text-xl font-bold mb-3 leading-tight ${isUrgent ? 'text-red-900' : 'text-gray-800'}`}>
                    {notice.title}
                  </h3>
                  <div className={`text-sm leading-relaxed whitespace-pre-line p-3 rounded-xl backdrop-blur-sm border ${
                    isUrgent ? 'bg-red-50/50 border-red-100 text-red-800' : 'bg-indigo-100/50 border-indigo-200/50 text-gray-700'
                  }`}>
                    {notice.content}
                  </div>
               </div>

               {/* Footer Info */}
               <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                     {notice.postedBy.charAt(0)}
                  </div>
                  <div>
                     <p className="text-[10px] uppercase font-bold text-gray-400">প্রকাশক</p>
                     <p className="text-xs font-bold text-gray-700">{notice.postedBy.split('(')[0]}</p>
                  </div>
                  <div className="ml-auto text-right">
                     <p className="text-[10px] uppercase font-bold text-gray-400">তারিখ</p>
                     <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(notice.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                     </p>
                  </div>
               </div>

               {/* Action Bar */}
               <div className="flex justify-between items-center">
                  {/* Reaction Button */}
                  <button 
                    onClick={() => toggleReaction(notice.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm border ${hasSeen ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  >
                     {hasSeen ? <Check className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     {hasSeen ? 'দেখেছি (Seen)' : 'মার্ক করুন (Seen)'}
                  </button>

                  {/* Seen Count & List Trigger */}
                  {reactions.length > 0 && (
                    <button 
                      onClick={() => setSeenListNoticeId(notice.id)}
                      className="flex items-center -space-x-2 overflow-hidden hover:scale-105 transition-transform p-1"
                      title="কারা দেখেছে?"
                    >
                       {reactions.slice(0, 3).map((r, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-white border-2 border-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 shadow-sm" title={r.userName}>
                             {r.userName.charAt(0)}
                          </div>
                       ))}
                       {reactions.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-500 shadow-sm">
                             +{reactions.length - 3}
                          </div>
                       )}
                    </button>
                  )}
               </div>
            </div>
        )})}

        {activeNotices.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
             <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 text-gray-300 mb-6 animate-pulse">
                <Bell className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-bold text-gray-600">বর্তমানে কোনো নোটিশ নেই</h3>
             <p className="text-gray-400 mt-2">সবকিছু আপ-টু-ডেট আছে!</p>
             {canPost && <button onClick={() => setIsModalOpen(true)} className="mt-6 text-indigo-600 font-bold hover:underline">নতুন নোটিশ তৈরি করুন</button>}
          </div>
        )}
      </div>

      {/* Seen List Modal */}
      {seenListNoticeId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200" onClick={() => setSeenListNoticeId(null)}>
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" /> কারা নোটিশটি দেখেছে
                 </h3>
                 <button onClick={() => setSeenListNoticeId(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-4 h-4 text-gray-500"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {getNoticeReactions(seenListNoticeId).map((r, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0">
                       <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                          {r.userName.charAt(0)}
                       </div>
                       <p className="text-sm font-bold text-gray-700">{r.userName}</p>
                    </div>
                 ))}
                 {getNoticeReactions(seenListNoticeId).length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-xs">কেউ এখনো দেখেনি।</div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Create Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                   <Megaphone className="w-6 h-6" />
                   <h3 className="font-bold text-xl">নতুন নোটিশ তৈরি করুন</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
             </div>

             <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">নোটিশের বিষয় (Title)</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-gray-800"
                    placeholder="যেমন: আগামীকাল অফিস বন্ধ থাকবে"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">নোটিশের ধরণ</label>
                   <div className="flex gap-4">
                      <label className={`flex-1 cursor-pointer border-2 rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${formData.type === 'NORMAL' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}>
                         <input type="radio" className="hidden" name="type" checked={formData.type === 'NORMAL'} onChange={() => setFormData({...formData, type: 'NORMAL'})} />
                         <Info className="w-5 h-5" />
                         <span className="font-bold text-sm">সাধারণ নোটিশ</span>
                      </label>
                      <label className={`flex-1 cursor-pointer border-2 rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${formData.type === 'URGENT' ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}>
                         <input type="radio" className="hidden" name="type" checked={formData.type === 'URGENT'} onChange={() => setFormData({...formData, type: 'URGENT'})} />
                         <AlertCircle className="w-5 h-5" />
                         <span className="font-bold text-sm">জরুরী ঘোষণা</span>
                      </label>
                   </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">বিস্তারিত বিবরণ</label>
                  <textarea 
                    required 
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium text-gray-700"
                    placeholder="এখানে বিস্তারিত লিখুন..."
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                  />
                </div>

                <div className="pt-2">
                   <button 
                     type="submit" 
                     className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                   >
                     <Check className="w-5 h-5" />
                     পাবলিশ করুন
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-sm text-gray-500 mb-6">
                আপনি এই নোটিশটি ডিলিট করতে যাচ্ছেন। এটি রিসাইকেল বিনে জমা হবে।
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

export default NoticeBoardView;
