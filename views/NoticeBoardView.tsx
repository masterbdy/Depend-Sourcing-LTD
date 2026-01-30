
import React, { useState } from 'react';
import { Bell, Plus, Trash2, Megaphone, Info, AlertCircle, X, Check, Pin, Eye, User } from 'lucide-react';
import { Notice, UserRole } from '../types';
import { ROLE_LABELS } from '../constants';

interface NoticeBoardProps {
  notices: Notice[];
  setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
  role: UserRole;
  currentUser: string;
}

const NoticeBoardView: React.FC<NoticeBoardProps> = ({ notices, setNotices, role, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', type: 'NORMAL' as 'NORMAL' | 'URGENT' });
  const [seenListNoticeId, setSeenListNoticeId] = useState<string | null>(null);

  // Only show active notices
  const activeNotices = notices.filter(n => !n.isDeleted).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
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

  const deleteNotice = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent any parent clicks
    if (confirm('আপনি কি এই নোটিশটি মুছে ফেলতে চান?')) {
      const updatedNotices = notices.map(n => n.id === id ? { ...n, isDeleted: true } : n);
      setNotices(updatedNotices);
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
             <Bell className="w-6 h-6 text-indigo-600" />
             অফিস নোটিশ বোর্ড
          </h2>
          <p className="text-sm text-gray-500 mt-1">অফিসের সকল ঘোষণা ও নির্দেশাবলী</p>
        </div>
        
        {canPost && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            নতুন নোটিশ দিন
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeNotices.map((notice) => {
            const reactions = notice.reactions || [];
            const hasSeen = reactions.some(r => r.userId === currentUser);

            return (
            <div 
              key={notice.id} 
              className={`relative rounded-2xl shadow-sm border p-6 flex flex-col transition-transform hover:-translate-y-1 duration-300 ${
                notice.type === 'URGENT' 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-white border-gray-100'
              }`}
            >
               <div className="flex justify-between items-start mb-4">
                 <div className={`p-2 rounded-xl ${notice.type === 'URGENT' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                   {notice.type === 'URGENT' ? <AlertCircle className="w-6 h-6 animate-pulse" /> : <Pin className="w-6 h-6" />}
                 </div>
                 {canPost && (
                   <button 
                      onClick={(e) => deleteNotice(e, notice.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors z-10"
                      title="মুছে ফেলুন"
                   >
                      <Trash2 className="w-4 h-4" />
                   </button>
                 )}
               </div>

               <div className="flex-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-2 inline-block ${
                    notice.type === 'URGENT' ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {notice.type === 'URGENT' ? 'জরুরী ঘোষণা' : 'সাধারণ নোটিশ'}
                  </span>
                  <h3 className={`text-lg font-bold mb-2 ${notice.type === 'URGENT' ? 'text-red-900' : 'text-gray-800'}`}>
                    {notice.title}
                  </h3>
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${notice.type === 'URGENT' ? 'text-red-800' : 'text-gray-600'}`}>
                    {notice.content}
                  </p>
               </div>

               <div className="mt-4 pt-4 border-t border-gray-200/50 flex justify-between items-center">
                  {/* Reaction Button */}
                  <button 
                    onClick={() => toggleReaction(notice.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border ${hasSeen ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                  >
                     {hasSeen ? <Check className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                     {hasSeen ? 'Seen' : 'Mark as Seen'}
                  </button>

                  {/* Seen Count & List Trigger */}
                  {reactions.length > 0 && (
                    <button 
                      onClick={() => setSeenListNoticeId(notice.id)}
                      className="flex items-center -space-x-2 overflow-hidden hover:scale-105 transition-transform"
                      title="Click to view list"
                    >
                       {reactions.slice(0, 3).map((r, i) => (
                          <div key={i} className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600" title={r.userName}>
                             {r.userName.charAt(0)}
                          </div>
                       ))}
                       {reactions.length > 3 && (
                          <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-500">
                             +{reactions.length - 3}
                          </div>
                       )}
                       <span className="text-[10px] text-gray-400 font-bold ml-3 underline">View All</span>
                    </button>
                  )}
               </div>
               
               <div className="mt-2 text-right">
                  <p className="text-[9px] text-gray-400">
                    Posted: {new Date(notice.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                  </p>
               </div>
            </div>
        )})}

        {activeNotices.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-300 mb-4">
                <Bell className="w-8 h-8" />
             </div>
             <p className="text-lg font-bold text-gray-500">বর্তমানে কোনো নোটিশ নেই</p>
             {canPost && <p className="text-sm text-gray-400">নতুন ঘোষণা দিতে উপরের বাটনে ক্লিক করুন</p>}
          </div>
        )}
      </div>

      {/* Seen List Modal */}
      {seenListNoticeId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200" onClick={() => setSeenListNoticeId(null)}>
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-600" /> Seen By List
                 </h3>
                 <button onClick={() => setSeenListNoticeId(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-4 h-4 text-gray-500"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {getNoticeReactions(seenListNoticeId).map((r, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                       <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {r.userName.charAt(0)}
                       </div>
                       <p className="text-sm font-bold text-gray-700">{r.userName}</p>
                    </div>
                 ))}
                 {getNoticeReactions(seenListNoticeId).length === 0 && (
                    <p className="text-center text-gray-400 text-xs py-4">No one has seen this yet.</p>
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
    </div>
  );
};

export default NoticeBoardView;
