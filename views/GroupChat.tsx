
import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, User, Crown, UserCog, Car, ArrowRightCircle, MessageCircle, SmilePlus, X, Paperclip, Smile, Trash2, EyeOff } from 'lucide-react';
import { ChatMessage, UserRole, Staff, Reaction } from '../types';

interface GroupChatProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentUser: string | null;
  role: UserRole | null;
  onNavigate: (view: string) => void; 
  onUpdatePoints: (staffId: string, points: number, reason: string) => void;
  staffList: Staff[];
}

const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const QUICK_EMOJIS = ["👍", "👋", "✅", "❌", "🎉", "🔥", "❤️", "😂", "😮", "😢", "🙏", "🤝"];
const QUICK_REPLIES = ["👍 ঠিক আছে", "✅ কাজ শেষ", "🚗 অন দ্য ওয়ে", "🙏 ধন্যবাদ", "👀 দেখছি", "❌ হবে না"];

const GroupChatView: React.FC<GroupChatProps> = ({ messages, setMessages, currentUser, role, onNavigate, onUpdatePoints, staffList }) => {
  const [inputText, setInputText] = useState('');
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [viewingReactionMsgId, setViewingReactionMsgId] = useState<string | null>(null);
  const [deleteModalMsgId, setDeleteModalMsgId] = useState<string | null>(null); // State for delete options modal
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // REPLACE THIS WITH YOUR ACTUAL WHATSAPP GROUP INVITE LINK
  const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/YOUR_GROUP_INVITE_LINK_HERE";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentUser || !role) return;

    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      sender: currentUser,
      role: role,
      timestamp: new Date().toISOString(),
      type: 'TEXT',
      reactions: [],
      hiddenFor: []
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setShowEmojiPicker(false);

    // Reward 1 Point (For real human staff only)
    if (role === UserRole.STAFF) {
       const staff = staffList.find(s => s.name === currentUser);
       if (staff) {
          onUpdatePoints(staff.id, 1, 'CHAT_ACTIVITY');
       }
    }
  };

  // --- DELETE LOGIC ---
  const openDeleteModal = (msgId: string) => {
    setDeleteModalMsgId(msgId);
  };

  const deleteForMe = () => {
    if (!currentUser || !deleteModalMsgId) return;
    setMessages(prev => prev.map(m => {
      if (m.id === deleteModalMsgId) {
        return {
          ...m,
          hiddenFor: [...(m.hiddenFor || []), currentUser]
        };
      }
      return m;
    }));
    setDeleteModalMsgId(null);
  };

  const deleteForEveryone = () => {
    if (!deleteModalMsgId) return;
    setMessages(prev => prev.filter(m => m.id !== deleteModalMsgId));
    setDeleteModalMsgId(null);
  };
  // --------------------

  const addEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const sendQuickReply = (text: string) => {
    if (!currentUser || !role) return;
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      text: text,
      sender: currentUser,
      role: role,
      timestamp: new Date().toISOString(),
      type: 'TEXT',
      reactions: [],
      hiddenFor: []
    };
    setMessages(prev => [...prev, newMessage]);
    
    if (role === UserRole.STAFF) {
       const staff = staffList.find(s => s.name === currentUser);
       if (staff) {
          onUpdatePoints(staff.id, 1, 'CHAT_ACTIVITY');
       }
    }
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    if (!currentUser) return;

    setMessages(prev => prev.map(msg => {
      if (msg.id === msgId) {
        const reactions = msg.reactions || [];
        
        // --- ADMIN ADVANTAGE: UNLIMITED REACTS ---
        if (role === UserRole.ADMIN) {
           // Just add the reaction, never remove. Allows stacking.
           const newReactions = [...reactions, { userId: currentUser, userName: currentUser, emoji }];
           return { ...msg, reactions: newReactions };
        }

        // --- NORMAL STAFF LOGIC: TOGGLE (MAX 1) ---
        const existingIndex = reactions.findIndex(r => r.userId === currentUser);
        let newReactions = [...reactions];

        if (existingIndex > -1) {
           const existing = newReactions[existingIndex];
           if (existing.emoji === emoji) {
              // Same emoji clicked: Remove (Toggle Off)
              newReactions.splice(existingIndex, 1);
           } else {
              // Different emoji clicked: Replace old with new
              newReactions[existingIndex] = { userId: currentUser, userName: currentUser, emoji };
           }
        } else {
           // No reaction yet: Add new
           newReactions.push({ userId: currentUser, userName: currentUser, emoji });
        }
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));

    // If Admin, keep picker open to allow spamming/multiple reacts
    // For others, close it after selection
    if (role !== UserRole.ADMIN) {
        setActiveReactionId(null);
    }
  };

  // Filter out messages hidden for current user & Sort
  const sortedMessages = [...messages]
    .filter(m => !m.hiddenFor?.includes(currentUser || ''))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getRoleIcon = (userRole: UserRole) => {
    switch (userRole) {
      case UserRole.MD: return <Crown className="w-3 h-3 text-purple-600" />;
      case UserRole.ADMIN: return <UserCog className="w-3 h-3 text-blue-600" />;
      default: return <User className="w-3 h-3 text-gray-500" />;
    }
  };

  const getRoleLabel = (userRole: UserRole) => {
    switch (userRole) {
      case UserRole.MD: return 'MD';
      case UserRole.ADMIN: return 'Admin';
      default: return '';
    }
  };

  const openWhatsApp = () => {
    window.open(WHATSAPP_GROUP_LINK, '_blank');
  };

  const getReactionsForModal = () => {
     if (!viewingReactionMsgId) return [];
     const msg = messages.find(m => m.id === viewingReactionMsgId);
     return msg?.reactions || [];
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative" onClick={() => { setActiveReactionId(null); setShowEmojiPicker(false); }}>
      {/* Chat Header */}
      <div className="p-4 bg-indigo-600 text-white flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">অফিস টিম চ্যাট</h3>
            <p className="text-xs text-indigo-200">সকল স্টাফ, অ্যাডমিন এবং এমডি</p>
          </div>
        </div>
        
        {/* WhatsApp Button */}
        <button 
          onClick={openWhatsApp}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-lg active:scale-95"
          title="Open WhatsApp Group"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">WhatsApp Group</span>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 relative custom-scrollbar">
        {sortedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
            <Users className="w-16 h-16 mb-2" />
            <p className="text-sm font-bold">এখানে মেসেজ শুরু করুন</p>
          </div>
        )}

        {sortedMessages.map((msg) => {
          const isMe = msg.sender === currentUser;
          const reactions = msg.reactions || [];
          // ONLY ALLOW DELETE IF IT'S MY MESSAGE (Strict Rule)
          const canDelete = isMe; 

          // --- HANDLE SYSTEM MOVEMENT MESSAGES ---
          if (msg.type === 'SYSTEM_MOVEMENT') {
            return (
              <div key={msg.id} className="flex justify-center my-2 group">
                <div 
                  onClick={() => msg.targetView && onNavigate(msg.targetView)}
                  className={`bg-orange-50 border border-orange-100 text-gray-700 px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm transition-transform hover:scale-105 ${msg.targetView ? 'cursor-pointer hover:bg-orange-100' : ''}`}
                >
                  <Car className="w-4 h-4 text-orange-500" />
                  <span>{msg.text}</span>
                  {msg.targetView && <ArrowRightCircle className="w-3 h-3 text-orange-400" />}
                </div>
              </div>
            );
          }
          // ---------------------------------------

          return (
            <div key={msg.id} className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
                
                {/* Sender Name & Role */}
                {!isMe && (
                  <div className="flex items-center gap-1 mb-1 ml-1">
                    <span className="text-xs font-bold text-gray-600">{msg.sender}</span>
                    {msg.role !== UserRole.STAFF && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-black uppercase ${msg.role === UserRole.MD ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {getRoleIcon(msg.role)}
                        {getRoleLabel(msg.role)}
                      </span>
                    )}
                  </div>
                )}

                {/* Message Bubble Container */}
                <div className="relative">
                   {/* Reaction Trigger Button */}
                   <button 
                      onClick={(e) => { e.stopPropagation(); setActiveReactionId(activeReactionId === msg.id ? null : msg.id); }}
                      className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white text-gray-400 hover:text-orange-500 shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-all z-10 ${isMe ? '-left-8' : '-right-8'}`}
                      title="React"
                   >
                      <SmilePlus className="w-4 h-4" />
                   </button>

                   {/* Delete Button (Visible ONLY if it's my message) */}
                   {canDelete && (
                      <button 
                         onClick={(e) => { e.stopPropagation(); openDeleteModal(msg.id); }}
                         className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white text-gray-400 hover:text-red-500 shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-all z-10 ${isMe ? '-left-20' : '-right-20'}`}
                         title="ডিলিট করুন"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   )}

                   {/* Reaction Picker Popup */}
                   {activeReactionId === msg.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className={`absolute bottom-full mb-2 bg-white rounded-full shadow-xl border border-gray-100 p-2 flex gap-1 z-30 animate-in zoom-in duration-200 ${isMe ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'}`}
                      >
                         {AVAILABLE_REACTIONS.map(emoji => (
                            <button 
                              key={emoji}
                              onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                              className="w-9 h-9 flex items-center justify-center text-xl hover:bg-indigo-50 rounded-full transition-transform hover:scale-125 active:scale-95"
                            >
                               {emoji}
                            </button>
                         ))}
                      </div>
                   )}

                   {/* Message Bubble */}
                   <div 
                     className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm relative z-0 ${
                       isMe 
                         ? 'bg-indigo-600 text-white rounded-tr-none' 
                         : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                     }`}
                   >
                     {msg.text}
                   </div>

                   {/* Display Reactions - Clickable to see who reacted */}
                   {reactions.length > 0 && (
                      <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex -space-x-1 z-10`}>
                         <div 
                           onClick={(e) => {
                              e.stopPropagation();
                              setViewingReactionMsgId(msg.id);
                           }}
                           className="bg-white border border-gray-200 rounded-full px-2 py-0.5 shadow-sm flex items-center gap-1 cursor-pointer hover:bg-gray-50 transition-all active:scale-95" 
                           title="Click to see list"
                         >
                            <div className="flex -space-x-1">
                               {Array.from(new Set(reactions.map(r => r.emoji))).slice(0, 3).map(emoji => (
                                  <span key={emoji} className="text-xs leading-none">{emoji}</span>
                               ))}
                            </div>
                            <span className="text-[10px] font-bold text-gray-600 ml-1">{reactions.length}</span>
                         </div>
                      </div>
                   )}
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-gray-400 mt-2 mx-1 select-none">
                  {new Date(msg.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area Wrapper */}
      <div className="bg-white border-t border-gray-100 shrink-0 relative z-20">
        
        {/* Quick Replies */}
        <div className="px-4 pt-2 pb-1 flex gap-2 overflow-x-auto scrollbar-hide">
           {QUICK_REPLIES.map((reply, idx) => (
              <button 
                key={idx}
                onClick={() => sendQuickReply(reply)}
                className="bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 px-3 py-1.5 rounded-full text-[10px] font-bold border border-transparent hover:border-indigo-100 transition-all whitespace-nowrap active:scale-95"
              >
                 {reply}
              </button>
           ))}
        </div>

        {/* Main Input Bar */}
        <div className="p-3 flex items-end gap-2 relative">
          
          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
             <div className="absolute bottom-full left-2 mb-2 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 grid grid-cols-6 gap-2 animate-in zoom-in duration-200 w-64 z-50" onClick={(e) => e.stopPropagation()}>
                {QUICK_EMOJIS.map(emoji => (
                   <button 
                     key={emoji} 
                     onClick={() => addEmoji(emoji)}
                     className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-lg transition-colors"
                   >
                      {emoji}
                   </button>
                ))}
             </div>
          )}

          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
            className={`p-3 rounded-full transition-colors ${showEmojiPicker ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
             <Smile className="w-5 h-5" />
          </button>

          <form onSubmit={handleSendMessage} className="flex-1 flex gap-2 items-center bg-gray-100 rounded-2xl px-2 py-1 border border-transparent focus-within:border-indigo-300 focus-within:bg-white transition-all">
            <input
              type="text"
              className="flex-1 px-3 py-3 bg-transparent border-none outline-none font-medium text-gray-800 placeholder:text-gray-400"
              placeholder="মেসেজ লিখুন..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 active:scale-95 m-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* REACTION LIST MODAL */}
      {viewingReactionMsgId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingReactionMsgId(null)}>
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <SmilePlus className="w-5 h-5 text-indigo-600" /> Reactions
                 </h3>
                 <button onClick={() => setViewingReactionMsgId(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {getReactionsForModal().map((r, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0">
                       <div className="text-2xl">{r.emoji}</div>
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                             {r.userName.charAt(0)}
                          </div>
                          <p className="text-sm font-bold text-gray-700">{r.userName}</p>
                       </div>
                    </div>
                 ))}
                 {getReactionsForModal().length === 0 && (
                    <div className="py-8 text-center text-gray-400 text-sm">No reactions yet.</div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* DELETE OPTION MODAL */}
      {deleteModalMsgId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
              <h3 className="text-lg font-black text-gray-800 mb-2">মেসেজ ডিলিট করতে চান?</h3>
              <p className="text-xs text-gray-500 mb-6">আপনি নিজের পাঠানো মেসেজ ডিলিট করতে পারেন।</p>
              
              <div className="space-y-3">
                 <button 
                   onClick={deleteForMe}
                   className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                 >
                    <EyeOff className="w-4 h-4" />
                    শুধু আমার জন্য ডিলিট করুন (Delete for me)
                 </button>
                 <button 
                   onClick={deleteForEveryone}
                   className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-red-100"
                 >
                    <Trash2 className="w-4 h-4" />
                    সবার জন্য ডিলিট করুন (Delete for everyone)
                 </button>
                 <button 
                   onClick={() => setDeleteModalMsgId(null)}
                   className="w-full text-gray-400 hover:text-gray-600 py-2 text-sm font-bold"
                 >
                    বাতিল (Cancel)
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatView;
