
import React, { useState, useEffect } from 'react';
import { Trophy, Gift, Sparkles, Timer, Crown, Star, Award, History, ShieldCheck } from 'lucide-react';
import { Staff, UserRole } from '../types';

interface LuckyDrawProps {
  staffList: Staff[];
  currentUser: string | null;
  onUpdatePoints: (staffId: string, points: number, reason: string) => void;
  onUpdateDrawTime: (staffId: string) => void;
  role: UserRole | null;
}

const LuckyDrawView: React.FC<LuckyDrawProps> = ({ staffList, currentUser, onUpdatePoints, onUpdateDrawTime, role }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Filter out MD and Office from the list used for Leaderboard and Gameplay
  const activeStaff = staffList.filter(s => 
    s.status === 'ACTIVE' && 
    !s.deletedAt && 
    s.role !== UserRole.KIOSK && 
    s.role !== UserRole.MD && 
    !s.name.toLowerCase().includes('office')
  );
  
  const myProfile = activeStaff.find(s => s.name === currentUser);

  // Leaderboard logic
  const sortedStaff = [...activeStaff].sort((a, b) => (b.points || 0) - (a.points || 0));

  // Timer Logic for Next Draw
  useEffect(() => {
    if (!myProfile?.lastLuckyDrawTime) return;

    const interval = setInterval(() => {
      const lastDraw = new Date(myProfile.lastLuckyDrawTime!).getTime();
      const now = new Date().getTime();
      const diff = now - lastDraw;
      const oneHour = 60 * 60 * 1000;

      if (diff < oneHour) {
        const remaining = oneHour - diff;
        const m = Math.floor((remaining / (1000 * 60)) % 60);
        const s = Math.floor((remaining / 1000) % 60);
        setTimeLeft(`${m} মিনিট ${s} সেকেন্ড`);
      } else {
        setTimeLeft('');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [myProfile?.lastLuckyDrawTime]);

  const handleSpin = () => {
    if (!myProfile || isSpinning || timeLeft) return;

    setIsSpinning(true);
    setSpinResult(null);

    // Game Logic
    // Random 1-10. Every 20th draw gets 20 points.
    const currentDrawCount = (myProfile.luckyDrawCount || 0) + 1;
    let pointsWon = Math.floor(Math.random() * 10) + 1;
    
    // Jackpot logic: Every 20th spin
    if (currentDrawCount % 20 === 0) {
      pointsWon = 20;
    }

    setTimeout(() => {
      setIsSpinning(false);
      setSpinResult(pointsWon);
      
      // Update Parent
      onUpdateDrawTime(myProfile.id); // Updates time and count
      onUpdatePoints(myProfile.id, pointsWon, 'LUCKY_DRAW'); // Updates points
      
      // Play sound if possible
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); // Victory sound
        audio.play().catch(() => {});
      } catch (e) {}

    }, 2000); // 2 seconds spin animation
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-8 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-300 drop-shadow-lg" />
        <h2 className="text-3xl font-black tracking-tight mb-2">লাকি ড্র & লিডারবোর্ড</h2>
        <p className="text-indigo-100 text-sm max-w-lg mx-auto">
          প্রতি ঘন্টায় একবার লাকি ড্র করে জিতুন নিশ্চিত পয়েন্ট! মাস শেষে সেরা ৩ জনের জন্য থাকছে আকর্ষণীয় গিফট।
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Lucky Draw Game */}
        <div className="lg:col-span-2 space-y-6">
           {/* Game Card */}
           {!myProfile ? (
             // Management View (MD/Office/Admin who are not in activeStaff list)
             <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="inline-block p-6 rounded-full bg-gray-50 mb-6">
                  <ShieldCheck className="w-16 h-16 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-600">ম্যানেজমেন্ট ভিউ</h3>
                <p className="text-gray-400 mt-2 max-w-xs mx-auto text-sm leading-relaxed">
                  পয়েন্ট এবং লাকি ড্র শুধুমাত্র সাধারণ স্টাফদের জন্য প্রযোজ্য। আপনি লিডারবোর্ড মনিটর করতে পারেন।
                </p>
             </div>
           ) : (
             // Player View
             <div className="bg-white rounded-3xl shadow-xl border border-purple-100 p-8 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Gift className="w-32 h-32 text-purple-600" /></div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" /> আপনার লাকি ড্র জোন
                </h3>

                {/* Point Display */}
                <div className="mb-8">
                   <div className="inline-block bg-purple-50 rounded-full px-6 py-2 border border-purple-100">
                      <span className="text-xs text-purple-600 font-bold uppercase tracking-widest">আপনার মোট পয়েন্ট</span>
                      <p className="text-4xl font-black text-purple-700">{myProfile.points || 0}</p>
                   </div>
                </div>

                {/* Wheel / Button Area */}
                <div className="h-48 flex flex-col items-center justify-center">
                   {isSpinning ? (
                      <div className="animate-spin text-6xl">🎡</div>
                   ) : spinResult ? (
                      <div className="animate-in zoom-in fade-in duration-300">
                         <p className="text-lg font-bold text-gray-500">অভিনন্দন! আপনি পেয়েছেন</p>
                         <p className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-sm">+{spinResult}</p>
                         <p className="text-sm font-bold text-gray-400 mt-2">পয়েন্ট</p>
                      </div>
                   ) : timeLeft ? (
                      <div className="bg-orange-50 text-orange-600 px-6 py-4 rounded-2xl border border-orange-100 flex flex-col items-center">
                         <Timer className="w-8 h-8 mb-2" />
                         <p className="font-bold text-lg">{timeLeft}</p>
                         <p className="text-xs opacity-70">পরবর্তী ড্র এর জন্য অপেক্ষা করুন</p>
                      </div>
                   ) : (
                      <div className="relative group">
                         <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                         <button 
                           onClick={handleSpin}
                           className="relative bg-white text-gray-800 px-8 py-6 rounded-2xl font-black text-xl hover:bg-gray-50 transition-all border-2 border-purple-100 flex flex-col items-center gap-2 w-48"
                         >
                           <Gift className="w-8 h-8 text-purple-600" />
                           SPIN NOW
                         </button>
                      </div>
                   )}
                </div>
                
                <div className="mt-8 text-xs text-gray-400 flex items-center justify-center gap-2">
                   <History className="w-3 h-3" />
                   <span>মোট ড্র খেলেছেন: {myProfile.luckyDrawCount || 0} বার (প্রতি ২০ বারে জ্যাকপট!)</span>
                </div>
             </div>
           )}

           {/* Rules */}
           <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><Award className="w-4 h-4"/> পয়েন্ট জেতার উপায়:</h4>
              <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside font-medium">
                 <li>অ্যাপ ভিজিট করলে ১ পয়েন্ট (প্রতি ১০ মিনিটে একবার)।</li>
                 <li>মুভমেন্ট আপডেট দিলে ১ পয়েন্ট।</li>
                 <li>চ্যাটে মেসেজ দিলে ১ পয়েন্ট।</li>
                 <li>লাকি ড্র তে ১ থেকে ১০ পয়েন্ট (প্রতি ঘন্টায়)।</li>
                 <li>লাকি ড্র তে প্রতি ২০ তম বারে নিশ্চিত ২০ পয়েন্ট জ্যাকপট!</li>
                 <li>MD/Admin খুশি হয়ে স্পেশাল বোনাস পয়েন্ট দিতে পারেন।</li>
              </ul>
           </div>
        </div>

        {/* Right: Leaderboard */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-full max-h-[600px]">
           <div className="p-5 bg-gray-50 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                 <Trophy className="w-5 h-5 text-yellow-500" /> সেরা পারফর্মার (Top List)
              </h3>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2">
              {sortedStaff.length > 0 ? sortedStaff.map((staff, index) => {
                 let rankBadge;
                 if (index === 0) rankBadge = <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
                 else if (index === 1) rankBadge = <div className="w-5 h-5 rounded-full bg-gray-300 text-gray-600 font-bold flex items-center justify-center text-xs">2</div>;
                 else if (index === 2) rankBadge = <div className="w-5 h-5 rounded-full bg-orange-200 text-orange-700 font-bold flex items-center justify-center text-xs">3</div>;
                 else rankBadge = <span className="text-gray-400 font-bold text-xs">#{index + 1}</span>;

                 return (
                    <div key={staff.id} className={`flex items-center gap-3 p-3 rounded-xl mb-1 ${staff.name === currentUser ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'}`}>
                       <div className="w-8 flex justify-center">{rankBadge}</div>
                       <div className="relative">
                          {staff.photo ? (
                             <img src={staff.photo} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                          ) : (
                             <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">{staff.name[0]}</div>
                          )}
                       </div>
                       <div className="flex-1">
                          <p className={`text-sm font-bold ${staff.name === currentUser ? 'text-indigo-700' : 'text-gray-700'}`}>{staff.name}</p>
                          <p className="text-[10px] text-gray-400">{staff.designation}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-gray-800">{staff.points || 0}</p>
                          <p className="text-[9px] text-gray-400">pts</p>
                       </div>
                    </div>
                 );
              }) : (
                <div className="text-center py-10 text-gray-400 text-xs">
                  কোনো একটিভ স্টাফ পাওয়া যায়নি
                </div>
              )}
           </div>
           
           <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400 font-medium">মাস শেষে শীর্ষ ৩ জনের জন্য থাকছে সারপ্রাইজ গিফট! 🎁</p>
           </div>
        </div>

      </div>
    </div>
  );
};

export default LuckyDrawView;
