
import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, User, Crown, UserCog, Car, ArrowRightCircle } from 'lucide-react';
import { ChatMessage, UserRole, Staff } from '../types';

interface GroupChatProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentUser: string | null;
  role: UserRole | null;
  onNavigate: (view: string) => void; 
  onUpdatePoints: (staffId: string, points: number, reason: string) => void;
  staffList: Staff[];
}

const GroupChatView: React.FC<GroupChatProps> = ({ messages, setMessages, currentUser, role, onNavigate, onUpdatePoints, staffList }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !role) return;

    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      sender: currentUser,
      role: role,
      timestamp: new Date().toISOString(),
      type: 'TEXT'
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Reward 1 Point (For real human staff only)
    if (role === UserRole.STAFF) {
       const staff = staffList.find(s => s.name === currentUser);
       if (staff) {
          onUpdatePoints(staff.id, 1, 'CHAT_ACTIVITY');
       }
    }
  };

  // Sort messages by time
  const sortedMessages = [...messages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 bg-indigo-600 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">অফিস টিম চ্যাট</h3>
            <p className="text-xs text-indigo-200">সকল স্টাফ, অ্যাডমিন এবং এমডি</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {sortedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
            <Users className="w-16 h-16 mb-2" />
            <p className="text-sm font-bold">এখানে মেসেজ শুরু করুন</p>
          </div>
        )}

        {sortedMessages.map((msg) => {
          // --- HANDLE SYSTEM MOVEMENT MESSAGES ---
          if (msg.type === 'SYSTEM_MOVEMENT') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
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

          const isMe = msg.sender === currentUser;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] md:max-w-[60%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                
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

                {/* Message Bubble */}
                <div 
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-gray-400 mt-1 mx-1">
                  {new Date(msg.timestamp).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            placeholder="মেসেজ লিখুন..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!inputText.trim()}
            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupChatView;
