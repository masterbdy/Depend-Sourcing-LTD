import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Search, Image as ImageIcon, Calendar, Trash2, StickyNote, Pencil, TrendingUp, TrendingDown, ShoppingCart, Tag } from 'lucide-react';
import { AppNote, UserRole, Staff } from '../types';

interface NotesProps {
  notes: AppNote[];
  setNotes: React.Dispatch<React.SetStateAction<AppNote[]>>;
  currentUser: string | null;
  role: UserRole;
  staffList: Staff[];
}

const NotesView: React.FC<NotesProps> = ({ notes, setNotes, currentUser, role, staffList }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '' as string | null,
    imageUrls: [] as string[],
    purchasePrice: '',
    sellingPrice: ''
  });

  // Only show strictly the user's own notes. No one else can see another person's personal note.
  const myNotes = notes.filter(n => !n.isDeleted && n.createdBy === currentUser);
  const visibleNotes = myNotes.filter(n => 
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      n.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate totals for Moyna
  const isMoyna = currentUser === 'Moyna Islam';
  let totalPurchase = 0;
  let totalSelling = 0;
  
  if (isMoyna) {
      myNotes.forEach(note => {
          totalPurchase += note.purchasePrice || 0;
          totalSelling += note.sellingPrice || 0;
      });
  }
  const profitOrLoss = totalSelling - totalPurchase;
  const isProfit = profitOrLoss >= 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const isMoyna = currentUser === 'Moyna Islam';

    Array.from(files).forEach(file => {
      if (!isMoyna && file.size > 2 * 1024 * 1024) {
         alert('File size must be under 2MB.');
         return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
         const img = new Image();
         img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1024;
            const MAX_HEIGHT = 1024;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round(height * (MAX_WIDTH / width));
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round(width * (MAX_HEIGHT / height));
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
               ctx.drawImage(img, 0, 0, width, height);
               let quality = 0.6;
               let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
               
               while (compressedBase64.length > 3 * 1024 * 1024 && quality > 0.1) {
                  quality -= 0.1;
                  compressedBase64 = canvas.toDataURL('image/jpeg', quality);
               }
               
               if (compressedBase64.length > 8 * 1024 * 1024) {
                  alert('ছবিটি অনেক বড়। আ্যপটি ক্র্যাশ করতে পারে। দয়া করে অন্য ছবি ব্যবহার করুন।');
                  return;
               }
               
               if (isMoyna) {
                  setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, compressedBase64] }));
               } else {
                  setFormData(prev => ({ ...prev, imageUrl: compressedBase64 }));
               }
            }
         };
         if (event.target?.result) {
            img.src = event.target.result as string;
         }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() && !formData.content.trim()) return;

    const isMoyna = currentUser === 'Moyna Islam';

    if (editingNoteId) {
       setNotes(prev => prev.map(n => {
          if (n.id === editingNoteId) {
             return {
                ...n,
                title: formData.title.trim(),
                content: formData.content.trim(),
                imageUrl: formData.imageUrl || undefined,
                imageUrls: isMoyna && formData.imageUrls.length > 0 ? formData.imageUrls : undefined,
                ...(isMoyna && formData.purchasePrice ? { purchasePrice: Number(formData.purchasePrice) } : { purchasePrice: undefined }),
                ...(isMoyna && formData.sellingPrice ? { sellingPrice: Number(formData.sellingPrice) } : { sellingPrice: undefined })
             };
          }
          return n;
       }));
    } else {
       const newNote: AppNote = {
         id: Date.now().toString(),
         title: formData.title.trim(),
         content: formData.content.trim(),
         imageUrl: formData.imageUrl || undefined,
         imageUrls: isMoyna && formData.imageUrls.length > 0 ? formData.imageUrls : undefined,
         date: new Date().toISOString(),
         createdBy: currentUser || 'Admin',
         isDeleted: false,
         ...(isMoyna && formData.purchasePrice ? { purchasePrice: Number(formData.purchasePrice) } : {}),
         ...(isMoyna && formData.sellingPrice ? { sellingPrice: Number(formData.sellingPrice) } : {})
       };
       setNotes(prev => {
          // Prevent duplicates if accidentally fired twice
          if (prev.some(n => n.id === newNote.id)) return prev;
          return [...prev, newNote];
       });
    }

    setIsModalOpen(false);
    setEditingNoteId(null);
    setFormData({ title: '', content: '', imageUrl: null, imageUrls: [], purchasePrice: '', sellingPrice: '' });
  };

  const handleEdit = (note: AppNote) => {
    setFormData({
      title: note.title,
      content: note.content,
      imageUrl: note.imageUrl || null,
      imageUrls: note.imageUrls || [],
      purchasePrice: note.purchasePrice?.toString() || '',
      sellingPrice: note.sellingPrice?.toString() || ''
    });
    setEditingNoteId(note.id);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    setNotes(prev => prev.map(n => n.id === deleteConfirmId ? { ...n, isDeleted: true } : n));
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
             <StickyNote className="w-8 h-8 text-amber-500" />
             নোটস ও হিসাব
          </h1>
          <p className="text-gray-500 font-bold mt-1">প্রয়োজনীয় ব্যক্তিগত বা টিমের বিভিন্ন হিসাব ও নোট এখানে সংরক্ষণ করুন।</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> নতুন নোট
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="নোট বা হিসাব খুঁজুন..." 
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-gray-700 dark:text-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isMoyna && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-1 shadow-lg shadow-amber-500/20">
          {/* Subtle background patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none -mt-4 -mr-4"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl pointer-events-none -mb-4 -ml-4"></div>
          
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-[22px] p-5 md:p-6 grid grid-cols-3 gap-3 md:gap-6 relative z-10">
            
            {/* Purchase Block */}
            <div className="group flex flex-col items-center p-4 md:p-5 bg-gradient-to-b from-red-50/50 to-red-100/50 dark:from-red-900/10 dark:to-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30 transition-all hover:scale-[1.02]">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-2 md:mb-3 text-red-500 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">মোট ক্রয়</span>
              <div className="text-sm md:text-2xl font-black text-red-600 dark:text-red-400">
                 ৳ {totalPurchase.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Selling Block */}
            <div className="group flex flex-col items-center p-4 md:p-5 bg-gradient-to-b from-green-50/50 to-green-100/50 dark:from-green-900/10 dark:to-green-900/20 rounded-2xl border border-green-100 dark:border-green-900/30 transition-all hover:scale-[1.02]">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-2 md:mb-3 text-green-500 group-hover:scale-110 transition-transform">
                <Tag className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">মোট বিক্রয়</span>
              <div className="text-sm md:text-2xl font-black text-green-600 dark:text-green-400">
                 ৳ {totalSelling.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Profit/Loss Block */}
            <div className={`group flex flex-col items-center p-4 md:p-5 rounded-2xl border transition-all hover:scale-[1.02] ${isProfit ? 'bg-gradient-to-b from-amber-50/50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/20 border-amber-200 dark:border-amber-900/40' : 'bg-gradient-to-b from-gray-50/50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 border-gray-200 dark:border-gray-700'}`}>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mb-2 md:mb-3 transition-transform group-hover:scale-110 ${isProfit ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-500' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
                {isProfit ? <TrendingUp className="w-4 h-4 md:w-5 md:h-5" /> : <TrendingDown className="w-4 h-4 md:w-5 md:h-5" />}
              </div>
              <span className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                 {isProfit ? 'মোট লাভ' : 'মোট ক্ষতি'}
              </span>
              <div className={`text-sm md:text-2xl font-black ${isProfit ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                 ৳ {Math.abs(profitOrLoss).toLocaleString('en-IN')}
              </div>
            </div>

          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleNotes.map(note => (
          <div key={note.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm relative group hover:shadow-xl transition-all duration-300 flex flex-col h-full">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-black text-gray-800 dark:text-gray-100 text-lg line-clamp-1">{note.title}</h3>
              {note.createdBy === currentUser && (
                <div className="flex items-center gap-1 transition-opacity">
                  <button 
                    onClick={() => handleEdit(note)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmId(note.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-4 flex-1">{note.content}</p>
            
            {/* Render single image backwards compatibility */}
            {note.imageUrl && (!note.imageUrls || note.imageUrls.length === 0) && (
              <div 
                className="mt-4 h-32 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 cursor-pointer relative group/img"
                onClick={() => setViewingImage(note.imageUrl as string)}
              >
                <img src={note.imageUrl} alt="Note Attachment" className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                   <span className="text-white font-bold opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-md bg-black/50 px-3 py-1 rounded-full text-xs">বড় করে দেখুন</span>
                </div>
              </div>
            )}
            
            {/* Render multiple images array */}
            {note.imageUrls && note.imageUrls.length > 0 && (
               <div className="mt-4 flex gap-2 overflow-x-auto pb-2 snap-x">
                 {note.imageUrls.map((url, i) => (
                    <div 
                      key={i}
                      className="min-w-[120px] max-w-[120px] h-24 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 cursor-pointer relative group/img shrink-0 snap-start"
                      onClick={() => setViewingImage(url)}
                    >
                      <img src={url} alt={`Note ${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                         <span className="text-white font-bold opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow-md bg-black/50 px-2 py-1 rounded-full text-[10px]">বড় করুন</span>
                      </div>
                    </div>
                 ))}
               </div>
            )}
            
            {(note.purchasePrice !== undefined || note.sellingPrice !== undefined) && (
              <div className="mt-3 flex gap-2">
                {note.purchasePrice !== undefined && (
                  <div className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded-lg text-xs font-bold text-center border border-red-100 dark:border-red-800/30">
                    ক্রয়: ৳{note.purchasePrice}
                  </div>
                )}
                {note.sellingPrice !== undefined && (
                  <div className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-2 rounded-lg text-xs font-bold text-center border border-green-100 dark:border-green-800/30">
                    বিক্রয়: ৳{note.sellingPrice}
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-[10px] uppercase font-bold text-gray-400">
               <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><Calendar className="w-3 h-3" /> {new Date(note.date).toLocaleDateString()}</span>
               <span>{note.createdBy}</span>
            </div>
          </div>
        ))}

        {visibleNotes.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-400">
             <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-20" />
             <p className="text-lg font-bold">কোনো নোট পাওয়া যায়নি</p>
          </div>
        )}
      </div>

      {/* Add/Edit Note Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-amber-500 text-white shrink-0">
               <h3 className="font-bold text-xl flex items-center gap-2">
                 <StickyNote className="w-6 h-6" /> {editingNoteId ? 'নোট আপডেট করুন' : 'নতুন হিসাব / নোট যোগ করুন'}
               </h3>
               <button 
                 onClick={() => { setIsModalOpen(false); setEditingNoteId(null); setFormData({ title: '', content: '', imageUrl: null, purchasePrice: '', sellingPrice: '' }); }} 
                 className="p-2 hover:bg-white/20 rounded-full transition-colors"
               ><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
               <form onSubmit={handleSave} className="space-y-4 pb-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">শিরোনাম (Title)</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                      placeholder="নোটের বিষয় বা শিরোনাম..."
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">বর্ননা বা হিসাব (Details)</label>
                    <textarea 
                      required 
                      rows={5}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 custom-scrollbar"
                      placeholder="এখানে আপনার নোট বা হিসাব লিখুন..."
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                    ></textarea>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ছবি বা মেমো যুক্ত করুন (Image)</label>
                     {/* Rendering existing images array for Moyna */}
                     {currentUser === 'Moyna Islam' ? (
                        <div className="space-y-4">
                           {formData.imageUrls.length > 0 && (
                              <div className="flex gap-2 overflow-x-auto pb-2 snap-x">
                                 {formData.imageUrls.map((url, i) => (
                                    <div key={i} className="min-w-[120px] max-w-[120px] h-32 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 relative group overflow-hidden shrink-0 snap-start">
                                       <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <button type="button" onClick={() => setFormData(prev => ({...prev, imageUrls: prev.imageUrls.filter((_, idx) => idx !== i)}))} className="bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:scale-105 transition-transform">মুছে ফেলুন</button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                           <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-6 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-amber-400 transition-all text-gray-400"
                           >
                              <ImageIcon className="w-8 h-8" />
                              <span className="text-xs font-bold px-4 text-center">আরো ছবি যুক্ত করুন<br/><span className="text-[10px] font-medium opacity-70">একসাথে অনেকগুলো ছবি সিলেক্ট করতে পারবেন</span></span>
                              <input type="file" hidden accept="image/*" multiple ref={fileInputRef} onChange={handleImageUpload} />
                           </div>
                        </div>
                     ) : (
                        // Standard user UI
                        formData.imageUrl ? (
                           <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden group">
                              <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                 <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white text-black px-4 py-2 rounded-lg font-bold text-xs hover:scale-105 transition-transform">পরিবর্তন</button>
                                 <button type="button" onClick={() => setFormData({...formData, imageUrl: null})} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs hover:scale-105 transition-transform">মুছে ফেলুন</button>
                              </div>
                              <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageUpload} />
                           </div>
                        ) : (
                           <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full py-8 bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-amber-400 transition-all text-gray-400"
                           >
                              <ImageIcon className="w-8 h-8" />
                              <span className="text-xs font-bold px-4 text-center">ক্লিক করে ছবি নির্বাচন করুন<br/><span className="text-[10px] font-medium opacity-70">সর্বোচ্চ 2MB সাইজের ছবি দিন</span></span>
                              <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageUpload} />
                           </div>
                        )
                     )}
                  </div>

                  {currentUser === 'Moyna Islam' && formData.imageUrls.length > 0 && (
                     <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ক্রয় মূল্য (৳)</label>
                          <input 
                            type="number" 
                            className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all font-bold text-red-600 dark:text-red-400 placeholder:text-red-300"
                            placeholder="ক্রয় মূল্য..."
                            value={formData.purchasePrice}
                            onChange={e => setFormData({...formData, purchasePrice: e.target.value})}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">বিক্রয় মূল্য (৳)</label>
                          <input 
                            type="number" 
                            className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-green-600 dark:text-green-400 placeholder:text-green-300"
                            placeholder="বিক্রয় মূল্য..."
                            value={formData.sellingPrice}
                            onChange={e => setFormData({...formData, sellingPrice: e.target.value})}
                          />
                        </div>
                     </div>
                  )}

                  <div className="pt-6">
                     <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-amber-500/30 transition-all active:scale-95 flex justify-center items-center gap-2">
                        <Plus className="w-6 h-6" /> সেভ করুন
                     </button>
                  </div>
               </form>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Image Viewer Modal */}
      {viewingImage && createPortal(
         <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 p-4" onClick={() => setViewingImage(null)}>
            <div className="relative max-w-5xl w-full h-full flex justify-center items-center">
               <button 
                  className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors z-[201]"
                  onClick={(e) => { e.stopPropagation(); setViewingImage(null); }}
               >
                  <X className="w-6 h-6" />
               </button>
               <img src={viewingImage} alt="Full View" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
            </div>
         </div>, document.body
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col">
             <div className="p-6">
               <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">নোট ডিলিট করুন</h3>
               <p className="text-gray-500 dark:text-gray-400 font-medium">আপনি কি নিশ্চিত যে এই নোটটি ডিলিট করতে চান? এই কাজ পরবর্তীতে বাতিল করা যাবে না।</p>
             </div>
             <div className="px-6 pb-6 flex gap-3">
               <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-colors">বাতিল</button>
               <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-95">ডিলিট করুন</button>
             </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default NotesView;
