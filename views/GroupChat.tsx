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
  onOpenProfile?: (staffId: string) => void;
}

const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const QUICK_EMOJIS = ["👍", "👋", "✅", "❌", "🎉", "🔥", "❤️", "😂", "😮", "😢", "🙏", "🤝"];
const QUICK_REPLIES = ["👍 ঠিক আছে", "✅ কাজ শেষ", "🚗 অন দ্য ওয়ে", "🙏 ধন্যবাদ", "👀 দেখছি", "❌ হবে না"];

const GroupChatView: React.FC<GroupChatProps> = ({ messages = [], setMessages, currentUser, role, onNavigate, onUpdatePoints, staffList = [], onOpenProfile }) => {
  const [inputText, setInputText] = useState('');
  const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
  const [viewingReactionMsgId, setViewingReactionMsgId] = useState<string | null>(null);
  const [deleteModalMsgId, setDeleteModalMsgId] = useState<string | null>(null); 
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    if (role === UserRole.STAFF) {
       const staff = (staffList || []).find(s => s.name === currentUser);
       if (staff) {
          onUpdatePoints(staff.id, 1, 'CHAT_ACTIVITY');
       }
    }
  };

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
       const staff = (staffList || []).find(s => s.name === currentUser);
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
        
        if (role === UserRole.ADMIN) {
           const newReactions = [...reactions, { userId: currentUser, userName: currentUser, emoji }];
           return { ...msg, reactions: newReactions };
        }

        const existingIndex = reactions.findIndex(r => r.userId === currentUser);
        let newReactions = [...reactions];

        if (existingIndex > -1) {
           const existing = newReactions[existingIndex];
           if (existing.emoji === emoji) {
              newReactions.splice(existingIndex, 1);
           } else {
              newReactions[existingIndex] = { userId: currentUser, userName: currentUser, emoji };
           }
        } else {
           newReactions.push({ userId: currentUser, userName: currentUser, emoji });
        }
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));

    if (role !== UserRole.ADMIN) {
        setActiveReactionId(null);
    }
  };

  const sortedMessages = [...(messages || [])]
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
     const msg = (messages || []).find(m => m.id === viewingReactionMsgId);
     return msg?.reactions || [];
  };

  const handleProfileClick = (name: string) => {
    if (!onOpenProfile) return;
    const staff = staffList.find(s => s.name === name);
    if (staff) {
      onOpenProfile(staff.id);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden relative" onClick={() => { setActiveReactionId(null); setShowEmojiPicker(false); }}>
      {/* Chat Header */}
      <div className="p-4 bg-indigo-600 dark:bg-indigo-900 text-white flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=100&q=80" 
              alt="Team Group" 
              className="w-11 h-11 rounded-full object-cover border-2 border-white/30 shadow-sm" 
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-indigo-600 rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">অফিস টিম চ্যাট</h3>
            <p className="text-xs text-indigo-200 font-medium">সকল স্টাফ, অ্যাডমিন এবং এমডি</p>
          </div>
        </div>
        
        <button 
          onClick={openWhatsApp}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shadow-lg active:scale-95"
          title="Open WhatsApp Group"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">WhatsApp Group</span>
        </button>
      </div>

      {/* Messages Area with Premium Background */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative custom-scrollbar bg-slate-50 dark:bg-[#0f172a]">
        
        {/* Background Pattern Layers */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20">
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            {/* Subtle Texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            {/* Central Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 space-y-6 min-h-full pb-4">
            {sortedMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-60">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-indigo-300" />
                </div>
                <p className="text-sm font-bold">কথপোকথন শুরু করুন</p>
                <p className="text-xs">আপনার টিমের সাথে কানেক্টেড থাকুন</p>
            </div>
            )}

            {sortedMessages.map((msg) => {
            const isMe = msg.sender === currentUser;
            const reactions = msg.reactions || [];
            const canDelete = isMe; 
            const senderStaff = staffList.find(s => s.name === msg.sender);

            if (msg.type === 'SYSTEM_MOVEMENT') {
                return (
                <div key={msg.id} className="flex justify-center my-4 group">
                    <div 
                    onClick={() => msg.targetView && onNavigate(msg.targetView)}
                    className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-orange-100 dark:border-orange-900/50 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-sm transition-transform hover:scale-105 ${msg.targetView ? 'cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/30' : ''}`}
                    >
                    <Car className="w-4 h-4 text-orange-500" />
                    <span>{msg.text}</span>
                    {msg.targetView && <ArrowRightCircle className="w-3 h-3 text-orange-400" />}
                    </div>
                </div>
                );
            }

            return (
                <div key={msg.id} className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start items-end'}`}>
                
                {!isMe && (
                    <div 
                    onClick={() => handleProfileClick(msg.sender)} 
                    className="mr-2 mb-1 cursor-pointer hover:scale-110 transition-transform hidden sm:block"
                    >
                        {senderStaff && senderStaff.photo ? (
                        <img src={senderStaff.photo} className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-sm" />
                        ) : (
                        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-200 dark:border-gray-700 shadow-sm">
                            {msg.sender[0]}
                        </div>
                        )}
                    </div>
                )}

                <div className={`max-w-[85%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
                    
                    {!isMe && (
                    <div className="flex items-center gap-1 mb-1 ml-1 cursor-pointer" onClick={() => handleProfileClick(msg.sender)}>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 hover:underline shadow-sm px-1.5 py-0.5 bg-white/50 dark:bg-black/20 rounded backdrop-blur-sm">{msg.sender}</span>
                        {msg.role !== UserRole.STAFF && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-black uppercase shadow-sm ${msg.role === UserRole.MD ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'}`}>
                            {getRoleIcon(msg.role)}
                            {getRoleLabel(msg.role)}
                        </span>
                        )}
                    </div>
                    )}

                    <div className="relative">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setActiveReactionId(activeReactionId === msg.id ? null : msg.id); }}
                        className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white dark:bg-gray-800 text-gray-400 hover:text-orange-500 shadow-md border border-gray-100 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-all z-10 scale-90 hover:scale-110 ${isMe ? '-left-8' : '-right-8'}`}
                        title="React"
                    >
                        <SmilePlus className="w-4 h-4" />
                    </button>

                    {canDelete && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); openDeleteModal(msg.id); }}
                            className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500 shadow-md border border-gray-100 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-all z-10 scale-90 hover:scale-110 ${isMe ? '-left-20' : '-right-20'}`}
                            title="ডিলিট করুন"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}

                    {activeReactionId === msg.id && (
                        <div 
                            onClick={(e) => e.stopPropagation()} 
                            className={`absolute bottom-full mb-2 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-100 dark:border-gray-700 p-2 flex gap-1 z-30 animate-in zoom-in duration-200 ${isMe ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'}`}
                        >
                            {AVAILABLE_REACTIONS.map(emoji => (
                                <button 
                                key={emoji}
                                onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-transform hover:scale-125 active:scale-95"
                                >
                                {emoji}
                                </button>
                            ))}
                        </div>
                    )}

                    <div 
                        className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm relative z-0 backdrop-blur-sm ${
                        isMe 
                            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-indigo-200 dark:shadow-none border border-indigo-500' 
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-none shadow-sm'
                        }`}
                    >
                        {msg.text}
                    </div>

                    {reactions.length > 0 && (
                        <div className={`absolute -bottom-3 ${isMe ? 'right-0' : 'left-0'} flex -space-x-1 z-10`}>
                            <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewingReactionMsgId(msg.id);
                            }}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5 shadow-md flex items-center gap-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95" 
                            title="Click to see list"
                            >
                                <div className="flex -space-x-1 text-gray-800 dark:text-gray-200">
                                {Array.from(new Set(reactions.map(r => r.emoji))).slice(0, 3).map(emoji => (
                                    <span key={emoji} className="text-xs leading-none">{emoji}</span>
                                ))}
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 ml-1">{reactions.length}</span>
                            </div>
                        </div>
                    )}
                    </div>

                    <span className="text-[9px] text-gray-400 mt-2 mx-1 select-none font-medium">
                    {new Date(msg.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                </div>
            );
            })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0 relative z-20 pb-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        
        <div className="px-4 pt-2 pb-1 flex gap-2 overflow-x-auto scrollbar-hide">
           {QUICK_REPLIES.map((reply, idx) => (
              <button 
                key={idx}
                onClick={() => sendQuickReply(reply)}
                className="bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-full text-[10px] font-bold border border-gray-200 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-800 transition-all whitespace-nowrap active:scale-95"
              >
                 {reply}
              </button>
           ))}
        </div>

        <div className="px-3 pb-1 flex items-end gap-2 relative">
          
          {showEmojiPicker && (
             <div className="absolute bottom-full left-2 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 grid grid-cols-6 gap-2 animate-in zoom-in duration-200 w-64 z-50" onClick={(e) => e.stopPropagation()}>
                {QUICK_EMOJIS.map(emoji => (
                   <button 
                     key={emoji} 
                     onClick={() => addEmoji(emoji)}
                     className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                   >
                      {emoji}
                   </button>
                ))}
             </div>
          )}

          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
            className={`p-3 rounded-full transition-colors ${showEmojiPicker ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
             <Smile className="w-5 h-5" />
          </button>

          <form onSubmit={handleSendMessage} className="flex-1 flex gap-2 items-center bg-gray-50 dark:bg-gray-800 rounded-3xl px-2 py-1 border border-gray-200 dark:border-gray-700 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/30 focus-within:bg-white dark:focus-within:bg-gray-900 transition-all shadow-inner">
            <input
              type="text"
              className="flex-1 px-4 py-3 bg-transparent border-none outline-none font-medium text-gray-800 dark:text-white placeholder:text-gray-400"
              placeholder="মেসেজ লিখুন..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={!inputText.trim()}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 dark:shadow-none active:scale-95 m-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* REACTION LIST MODAL */}
      {viewingReactionMsgId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingReactionMsgId(null)}>
           <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                 <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <SmilePlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Reactions
                 </h3>
                 <button onClick={() => setViewingReactionMsgId(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500 dark:text-gray-400"/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {getReactionsForModal().map((r, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0" onClick={() => handleProfileClick(r.userName)}>
                       <div className="text-2xl">{r.emoji}</div>
                       <div className="flex items-center gap-3 cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase">
                             {r.userName.charAt(0)}
                          </div>
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 hover:underline">{r.userName}</p>
                       </div>
                    </div>
                 ))}
                 {getReactionsForModal().length === 0 && (
                    <div className="py-8 text-center text-gray-400 text-xs">No reactions yet.</div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* DELETE OPTION MODAL */}
      {deleteModalMsgId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
              <h3 className="text-lg font-black text-gray-800 dark:text-white mb-2">মেসেজ ডিলিট করতে চান?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">আপনি নিজের পাঠানো মেসেজ ডিলিট করতে পারেন।</p>
              
              <div className="space-y-3">
                 <button 
                   onClick={deleteForMe}
                   className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                 >
                    <EyeOff className="w-4 h-4" />
                    শুধু আমার জন্য ডিলিট করুন (Delete for me)
                 </button>
                 <button 
                   onClick={deleteForEveryone}
                   className="w-full bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors border border-red-100 dark:border-red-900/30"
                 >
                    <Trash2 className="w-4 h-4" />
                    সবার জন্য ডিলিট করুন (Delete for everyone)
                 </button>
                 <button 
                   onClick={() => setDeleteModalMsgId(null)}
                   className="w-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 py-2 text-sm font-bold"
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