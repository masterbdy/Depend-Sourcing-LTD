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
    products: [{ id: Date.now().toString(), code: '', purchasePrice: '', sellingPrice: '' }]
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
          if (note.products && note.products.length > 0) {
              note.products.forEach(p => {
                  totalPurchase += p.purchasePrice || 0;
                  totalSelling += p.sellingPrice || 0;
              });
          } else {
              totalPurchase += note.purchasePrice || 0;
              totalSelling += note.sellingPrice || 0;
          }
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
    
    // Parse the products for Moyna
    const parsedProducts = isMoyna ? formData.products.map(p => ({
        id: p.id,
        code: p.code?.trim() || undefined,
        purchasePrice: p.purchasePrice ? Number(p.purchasePrice) : undefined,
        sellingPrice: p.sellingPrice ? Number(p.sellingPrice) : undefined
    })).filter(p => p.code || p.purchasePrice || p.sellingPrice) : undefined;
    
    // Fallback logic for normal user
    const userProductCode = !isMoyna && formData.products[0]?.code?.trim() ? formData.products[0].code.trim() : undefined;

    if (editingNoteId) {
       setNotes(prev => prev.map(n => {
          if (n.id === editingNoteId) {
             return {
                ...n,
                title: formData.title.trim(),
                content: formData.content.trim(),
                imageUrl: formData.imageUrl || undefined,
                imageUrls: isMoyna && formData.imageUrls.length > 0 ? formData.imageUrls : undefined,
                products: parsedProducts && parsedProducts.length > 0 ? parsedProducts : undefined,
                ...(!isMoyna ? { productCode: userProductCode } : {})
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
         products: parsedProducts && parsedProducts.length > 0 ? parsedProducts : undefined,
         productCode: userProductCode,
         date: new Date().toISOString(),
         createdBy: currentUser || 'Admin',
         isDeleted: false
       };
       setNotes(prev => {
          // Prevent duplicates if accidentally fired twice
          if (prev.some(n => n.id === newNote.id)) return prev;
          return [...prev, newNote];
       });
    }

    setIsModalOpen(false);
    setEditingNoteId(null);
    setFormData({ title: '', content: '', imageUrl: null, imageUrls: [], products: [{ id: Date.now().toString(), code: '', purchasePrice: '', sellingPrice: '' }] });
  };

  const handleEdit = (note: AppNote) => {
    let initialProducts = note.products ? note.products.map(p => ({
        id: p.id || Date.now().toString() + Math.random(),
        code: p.code || '',
        purchasePrice: p.purchasePrice?.toString() || '',
        sellingPrice: p.sellingPrice?.toString() || ''
    })) : [];

    // Fallback if legacy fields exist and no products array
    if (initialProducts.length === 0 && (note.productCode || note.purchasePrice || note.sellingPrice)) {
       initialProducts = [{
          id: Date.now().toString(),
          code: note.productCode || '',
          purchasePrice: note.purchasePrice?.toString() || '',
          sellingPrice: note.sellingPrice?.toString() || ''
       }];
    }
    
    if (initialProducts.length === 0) {
        initialProducts = [{ id: Date.now().toString(), code: '', purchasePrice: '', sellingPrice: '' }];
    }

    setFormData({
      title: note.title,
      content: note.content,
      imageUrl: note.imageUrl || null,
      imageUrls: note.imageUrls || [],
      products: initialProducts
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-gray-700/50 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mt-20 -mr-20"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
             <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl shadow-inner">
               <StickyNote className="w-7 h-7 text-amber-500 drop-shadow-sm" />
             </div>
             নোটস ও হিসাব
          </h1>
          <p className="text-gray-500 font-bold mt-2 ml-1">প্রয়োজনীয় ব্যক্তিগত বা টিমের বিভিন্ন হিসাব ও নোট এখানে সংরক্ষণ করুন।</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="relative z-10 bg-amber-500 hover:bg-amber-400 text-white px-6 py-3.5 rounded-2xl font-black shadow-[0_4px_0_theme(colors.amber.700),0_10px_20px_theme(colors.amber.500/0.3)] transition-all active:translate-y-[4px] active:shadow-[0_0px_0_theme(colors.amber.700),0_0px_0px_theme(colors.amber.500/0.3)] flex items-center gap-2 border-b-2 border-amber-600 active:border-b-0"
        >
          <Plus className="w-5 h-5 drop-shadow-md" /> নতুন নোট
        </button>
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
          <input 
            type="text" 
            placeholder="নোট বা হিসাব খুঁজুন..." 
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border-2 border-transparent shadow-[inset_0_-2px_4px_rgba(0,0,0,0.02)] focus:border-amber-500/30 rounded-2xl outline-none transition-all font-bold text-gray-700 dark:text-gray-100 placeholder:text-gray-400 hover:shadow-md focus:shadow-lg focus:shadow-amber-500/10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isMoyna && (
        <div className="relative overflow-hidden bg-gradient-to-b from-amber-400 to-amber-600 rounded-3xl p-[2px] shadow-[0_8px_30px_rgba(245,158,11,0.3)]">
          {/* Subtle background patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none -mt-4 -mr-4"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/20 rounded-full blur-xl pointer-events-none -mb-4 -ml-4"></div>
          
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-[22px] p-5 md:p-6 grid grid-cols-3 gap-3 md:gap-6 relative z-10 shadow-[inner_0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[inner_0_0_10px_rgba(0,0,0,0.5)]">
            
            {/* Purchase Block */}
            <div className="group flex flex-col items-center p-4 md:p-5 bg-gradient-to-b from-white to-red-50/80 dark:from-gray-800 dark:to-red-900/20 rounded-2xl border-t-2 border-white dark:border-gray-700 shadow-[0_4px_15px_-3px_rgba(239,68,68,0.15)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_20px_-3px_rgba(239,68,68,0.25)]">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 flex items-center justify-center mb-2 md:mb-3 text-red-600 group-hover:scale-110 transition-transform shadow-inner">
                <ShoppingCart className="w-4 h-4 md:w-6 md:h-6 drop-shadow-sm" />
              </div>
              <span className="text-[10px] md:text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">মোট ক্রয়</span>
              <div className="text-sm md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-600 to-red-800 dark:from-red-400 dark:to-red-600 drop-shadow-sm">
                 ৳ {totalPurchase.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Selling Block */}
            <div className="group flex flex-col items-center p-4 md:p-5 bg-gradient-to-b from-white to-green-50/80 dark:from-gray-800 dark:to-green-900/20 rounded-2xl border-t-2 border-white dark:border-gray-700 shadow-[0_4px_15px_-3px_rgba(34,197,94,0.15)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_20px_-3px_rgba(34,197,94,0.25)]">
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 flex items-center justify-center mb-2 md:mb-3 text-green-600 group-hover:scale-110 transition-transform shadow-inner">
                <Tag className="w-4 h-4 md:w-6 md:h-6 drop-shadow-sm" />
              </div>
              <span className="text-[10px] md:text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">মোট বিক্রয়</span>
              <div className="text-sm md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-600 to-green-800 dark:from-green-400 dark:to-green-600 drop-shadow-sm">
                 ৳ {totalSelling.toLocaleString('en-IN')}
              </div>
            </div>

            {/* Profit/Loss Block */}
            <div className={`group flex flex-col items-center p-4 md:p-5 rounded-2xl border-t-2 border-white dark:border-gray-700 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_20px_-3px_rgba(0,0,0,0.1)] ${isProfit ? 'bg-gradient-to-b from-white to-amber-50/80 dark:from-gray-800 dark:to-amber-900/20' : 'bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/50'}`}>
              <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-2 md:mb-3 transition-transform group-hover:scale-110 shadow-inner ${isProfit ? 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/50 dark:to-amber-800/50 text-amber-600' : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-500'}`}>
                {isProfit ? <TrendingUp className="w-4 h-4 md:w-6 md:h-6 drop-shadow-sm" /> : <TrendingDown className="w-4 h-4 md:w-6 md:h-6 drop-shadow-sm" />}
              </div>
              <span className="text-[10px] md:text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                 {isProfit ? 'মোট লাভ' : 'মোট ক্ষতি'}
              </span>
              <div className={`text-sm md:text-2xl font-black text-transparent bg-clip-text drop-shadow-sm ${isProfit ? 'bg-gradient-to-br from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400' : 'bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-200'}`}>
                 ৳ {Math.abs(profitOrLoss).toLocaleString('en-IN')}
              </div>
            </div>

          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleNotes.map(note => (
          <div key={note.id} className="bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 rounded-2xl p-5 border-t-2 border-l border-white dark:border-gray-700 shadow-[0_4px_15px_rgba(0,0,0,0.05)] relative group hover:-translate-y-2 hover:shadow-[0_12px_25px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col h-full overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
            <div className="flex justify-between items-start mb-3 relative z-10">
              <div className="flex flex-col gap-1.5 flex-1 pr-2">
                <h3 className="font-black text-gray-800 dark:text-gray-100 text-lg line-clamp-1 drop-shadow-sm">{note.title}</h3>
                
                {/* Product Tags */}
                <div className="flex flex-wrap gap-1.5">
                   {note.products && note.products.length > 0 ? (
                      note.products.filter(p => p.code).map((p, idx) => (
                         <span key={`${p.id}-${idx}`} className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 bg-gradient-to-b from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/10 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800 shadow-sm">
                            <Tag className="w-3 h-3 drop-shadow-sm" /> {p.code}
                         </span>
                      ))
                   ) : note.productCode && (
                       <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 bg-gradient-to-b from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/10 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800 shadow-sm">
                          <Tag className="w-3 h-3 drop-shadow-sm" /> {note.productCode}
                       </span>
                   )}
                </div>
              </div>
              {note.createdBy === currentUser && (
                <div className="flex items-center gap-1 transition-opacity">
                  <button 
                    onClick={() => handleEdit(note)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 hover:shadow-inner dark:hover:bg-blue-900/20 rounded-lg transition-all active:scale-90"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmId(note.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 hover:shadow-inner dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-90"
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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 perspective-[1000px]">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)] overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white shrink-0 relative overflow-hidden flex justify-between items-center shadow-md">
               <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20"></div>
               <h3 className="font-black text-xl flex items-center gap-2 relative z-10 drop-shadow-md">
                 <div className="p-1.5 bg-white/20 rounded-lg shadow-inner">
                   <StickyNote className="w-5 h-5" />
                 </div>
                 {editingNoteId ? 'নোট আপডেট করুন' : 'নতুন হিসাব / নোট'}
               </h3>
               <button 
                 onClick={() => { setIsModalOpen(false); setEditingNoteId(null); setFormData({ title: '', content: '', imageUrl: null, imageUrls: [], products: [{ id: Date.now().toString(), code: '', purchasePrice: '', sellingPrice: '' }] }); }} 
                 className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors relative z-10 shadow-inner"
               ><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-gray-800/50">
               <form onSubmit={handleSave} className="space-y-5 pb-4">
                  <div className="relative group/input">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 ml-1">শিরোনাম (Title)</label>
                    <input 
                      required 
                      type="text" 
                      className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border-2 border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] rounded-2xl focus:border-amber-500/30 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_0_0_4px_rgba(245,158,11,0.1)] outline-none transition-all font-bold text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                      placeholder="নোটের বিষয় বা শিরোনাম..."
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </div>
                  {currentUser !== 'Moyna Islam' && (
                     <div className="relative group/input">
                       <label className="block text-xs font-black text-blue-500/80 uppercase tracking-wider mb-2 ml-1">প্রোডাক্ট কোড (ঐচ্ছিক)</label>
                       <input 
                         type="text" 
                         className="w-full px-4 py-3.5 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-transparent shadow-[inset_0_2px_4px_rgba(59,130,246,0.05)] rounded-2xl focus:border-blue-500/30 focus:shadow-[inset_0_2px_4px_rgba(59,130,246,0.05),0_0_0_4px_rgba(59,130,246,0.1)] outline-none transition-all font-bold text-blue-700 dark:text-blue-400 placeholder:text-blue-300 dark:placeholder:text-blue-800"
                         placeholder="যেমন: BSH-102"
                         value={formData.products[0]?.code || ''}
                         onChange={e => {
                            const newProducts = [...formData.products];
                            newProducts[0].code = e.target.value;
                            setFormData({...formData, products: newProducts});
                         }}
                       />
                     </div>
                  )}

                  <div className="relative group/input">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 ml-1">বর্ননা বা হিসাব (Details)</label>
                    <textarea 
                      required 
                      rows={5}
                      className="w-full px-4 py-3.5 bg-white dark:bg-gray-900 border-2 border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] rounded-2xl focus:border-amber-500/30 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.05),0_0_0_4px_rgba(245,158,11,0.1)] outline-none transition-all font-medium text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 custom-scrollbar resize-none"
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

                  {currentUser === 'Moyna Islam' && (
                     <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                           <label className="block text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">হিসাব (প্রোডাক্টস)</label>
                           <button 
                              type="button" 
                              onClick={() => setFormData(prev => ({...prev, products: [...prev.products, { id: Date.now().toString(), code: '', purchasePrice: '', sellingPrice: '' }]}))}
                              className="text-xs font-bold bg-white dark:bg-gray-800 border-b-2 border-blue-200 dark:border-blue-900 border text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all active:translate-y-[2px] active:border-b-0 shadow-sm"
                           >
                              <Plus className="w-3.5 h-3.5 shadow-sm" /> যোগ করুন
                           </button>
                        </div>
                        
                        {formData.products.map((product, index) => (
                           <div key={product.id} className="p-4 bg-white dark:bg-gray-800 shadow-[0_4px_10px_rgba(0,0,0,0.03)] border-b-[3px] border-gray-200 dark:border-gray-700 rounded-2xl relative group transition-all">
                              {formData.products.length > 1 && (
                                 <button 
                                    type="button" 
                                    onClick={() => setFormData(prev => ({...prev, products: prev.products.filter(p => p.id !== product.id)}))}
                                    className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 border border-red-600 text-white p-1.5 rounded-full shadow-[0_3px_5px_rgba(239,68,68,0.4)] transition-all z-10 active:translate-y-1 active:shadow-none"
                                    title="মুছে ফেলুন"
                                 >
                                    <X className="w-4 h-4 drop-shadow-sm" />
                                 </button>
                              )}
                              
                              <div className="mb-3 relative group/input">
                                 <label className="block text-[10px] font-black text-blue-500/80 uppercase tracking-wider mb-1.5 ml-1">প্রোডাক্ট কোড (ঐচ্ছিক)</label>
                                 <input 
                                    type="text" 
                                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border-2 border-transparent focus:border-blue-500/30 focus:shadow-[inset_0_2px_4px_rgba(59,130,246,0.05),0_0_0_4px_rgba(59,130,246,0.1)] rounded-xl outline-none transition-all font-bold text-blue-600 dark:text-blue-400 placeholder:text-gray-300"
                                    placeholder="যেমন: P-01"
                                    value={product.code}
                                    onChange={e => {
                                       const newProducts = [...formData.products];
                                       newProducts[index].code = e.target.value;
                                       setFormData({...formData, products: newProducts});
                                    }}
                                 />
                              </div>
                              
                              <div className="flex gap-3">
                                 <div className="flex-1 relative group/input">
                                    <label className="block text-[10px] font-black text-red-500/80 uppercase tracking-wider mb-1.5 ml-1">ক্রয় মূল্য</label>
                                    <div className="relative">
                                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 text-sm font-black drop-shadow-sm">৳</span>
                                       <input 
                                          type="number" 
                                          className="w-full pl-7 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border-2 border-transparent focus:border-red-500/30 focus:shadow-[inset_0_2px_4px_rgba(239,68,68,0.05),0_0_0_4px_rgba(239,68,68,0.1)] rounded-xl outline-none transition-all font-bold text-red-600 dark:text-red-400 placeholder:text-red-300"
                                          placeholder="0"
                                          value={product.purchasePrice}
                                          onChange={e => {
                                             const newProducts = [...formData.products];
                                             newProducts[index].purchasePrice = e.target.value;
                                             setFormData({...formData, products: newProducts});
                                          }}
                                       />
                                    </div>
                                 </div>
                                 <div className="flex-1 relative group/input">
                                    <label className="block text-[10px] font-black text-green-500/80 uppercase tracking-wider mb-1.5 ml-1">বিক্রয় মূল্য</label>
                                    <div className="relative">
                                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 text-sm font-black drop-shadow-sm">৳</span>
                                       <input 
                                          type="number" 
                                          className="w-full pl-7 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border-2 border-transparent focus:border-green-500/30 focus:shadow-[inset_0_2px_4px_rgba(34,197,94,0.05),0_0_0_4px_rgba(34,197,94,0.1)] rounded-xl outline-none transition-all font-bold text-green-600 dark:text-green-400 placeholder:text-green-300"
                                          placeholder="0"
                                          value={product.sellingPrice}
                                          onChange={e => {
                                             const newProducts = [...formData.products];
                                             newProducts[index].sellingPrice = e.target.value;
                                             setFormData({...formData, products: newProducts});
                                          }}
                                       />
                                    </div>
                                 </div>
                              </div>
                           </div>
                        ))}
                        
                        {formData.products.length > 1 && (
                           <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 mt-4">
                              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 text-center border-b border-amber-200/50 dark:border-amber-800/50 pb-2">হিসাবের যোগফল</h4>
                              <div className="flex justify-between items-center font-bold">
                                 <span className="text-sm text-gray-600 dark:text-gray-300">মোট ক্রয়: <span className="text-red-500">৳{formData.products.reduce((sum, p) => sum + (Number(p.purchasePrice) || 0), 0).toLocaleString()}</span></span>
                                 <span className="text-sm text-gray-600 dark:text-gray-300">মোট বিক্রয়: <span className="text-green-500">৳{formData.products.reduce((sum, p) => sum + (Number(p.sellingPrice) || 0), 0).toLocaleString()}</span></span>
                              </div>
                           </div>
                        )}
                     </div>
                  )}

                  <div className="pt-6">
                     <button type="submit" className="relative w-full bg-amber-500 hover:bg-amber-400 text-white py-4 rounded-xl font-black text-lg shadow-[0_6px_0_theme(colors.amber.700),0_15px_20px_theme(colors.amber.500/0.4)] transition-all active:translate-y-[6px] active:shadow-[0_0px_0_theme(colors.amber.700),0_0px_0px_theme(colors.amber.500/0.4)] flex justify-center items-center gap-2 border-b-2 border-amber-600 active:border-b-0">
                        <Plus className="w-6 h-6 drop-shadow-md" /> সেভ করুন
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
               <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl border-b-2 border-gray-300 dark:border-gray-900 active:translate-y-[2px] active:border-b-0 transition-all shadow-sm">বাতিল</button>
               <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl shadow-[0_4px_0_theme(colors.red.700),0_10px_15px_theme(colors.red.500/0.3)] transition-all active:translate-y-[4px] active:shadow-[0_0px_0_theme(colors.red.700),0_0px_0px_theme(colors.red.500/0.3)] border-b-2 border-red-600 active:border-b-0">ডিলিট করুন</button>
             </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default NotesView;
