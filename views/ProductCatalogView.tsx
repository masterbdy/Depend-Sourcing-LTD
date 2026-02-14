
import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, FilterX, Plus, Edit3, Trash2, X, Save, Image as ImageIcon, Tag, DollarSign, Package, Info, Upload, CheckCircle, ShieldCheck, LogOut, ShoppingBag, Send, Phone, Star, Tag as TagIcon, Layers, Mail, ArrowRight, Award, Truck, Gem, Eye } from 'lucide-react';
import { Product, UserRole, Complaint } from '../types';

interface ProductCatalogProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  role: UserRole | null;
  productEditors: string[];
  currentStaffId: string | null;
  onTrackSearch: () => void;
  setComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  onLogout: () => void;
  certLogos: { oeko: string; gscs: string };
  onUpdateCertLogo: (key: 'oeko' | 'gscs', base64: string) => void;
  companyLogo: string;
  onUpdateCompanyLogo: (base64: string) => void;
}

const ProductCatalogView: React.FC<ProductCatalogProps> = ({ 
  products = [], 
  setProducts, 
  role, 
  productEditors = [], 
  currentStaffId, 
  onTrackSearch, 
  setComplaints,
  onLogout,
  certLogos,
  onUpdateCertLogo,
  companyLogo,
  onUpdateCompanyLogo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', category: '', priceRange: '', moq: '', image: '', description: '', tags: []
  });
  const [tagInput, setTagInput] = useState('');

  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryData, setInquiryData] = useState({ name: '', contact: '', message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTarget, setUploadingTarget] = useState<'product' | 'company' | 'oeko' | 'gscs' | null>(null);

  const canEdit = role === UserRole.ADMIN || (role === UserRole.STAFF && currentStaffId && productEditors.includes(currentStaffId));
  const isGuest = role === UserRole.GUEST;

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['ALL', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 2) onTrackSearch();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          if (uploadingTarget === 'product') {
             setFormData(prev => ({ ...prev, image: dataUrl }));
          } else if (uploadingTarget === 'company') {
             onUpdateCompanyLogo(dataUrl);
          } else if (uploadingTarget === 'oeko') {
             onUpdateCertLogo('oeko', dataUrl);
          } else if (uploadingTarget === 'gscs') {
             onUpdateCertLogo('gscs', dataUrl);
          }
          setUploadingTarget(null);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', category: '', priceRange: '', moq: '', image: '', description: '', tags: [] });
    setTagInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setTagInput('');
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return alert("Name and Category are required");

    if (editingProduct) {
       setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...formData } as Product : p));
    } else {
       const newProduct: Product = {
          id: Math.random().toString(36).substr(2, 9),
          ...formData as Product
       };
       setProducts(prev => [...prev, newProduct]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
       setProducts(prev => prev.filter(p => p.id !== id));
       if (viewingProduct?.id === id) setViewingProduct(null);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
       setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
       setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }));
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryData.contact || !inquiryData.message) return alert("Contact and Message are required");

    const newComplaint: Complaint = {
      id: Math.random().toString(36).substr(2, 9),
      submittedBy: inquiryData.name || 'Guest User',
      submittedById: 'GUEST',
      againstStaffId: 'PRODUCT_INQUIRY',
      againstStaffName: viewingProduct ? `Product: ${viewingProduct.name}` : 'General Inquiry',
      subject: 'Product Inquiry',
      description: `Contact: ${inquiryData.contact}\nMessage: ${inquiryData.message}`,
      date: new Date().toISOString(),
      status: 'PENDING',
      type: 'SUGGESTION' 
    };
    setComplaints(prev => [newComplaint, ...prev]);
    setIsInquiryModalOpen(false);
    setInquiryData({ name: '', contact: '', message: '' });
    alert("Inquiry Sent Successfully! We will contact you soon.");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 font-['Hind_Siliguri']">
      
      {/* Navbar / Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 transition-all duration-300">
         <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
            <div className="flex items-center gap-3">
               <div className="relative group cursor-pointer" onClick={() => canEdit && (setUploadingTarget('company'), logoInputRef.current?.click())}>
                  {companyLogo ? (
                     <img src={companyLogo} alt="Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                  ) : (
                     <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/30">D</div>
                  )}
                  {canEdit && <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl transition-opacity"><Edit3 className="w-4 h-4 text-white"/></div>}
               </div>
               <input ref={logoInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
               
               <div>
                  <h1 className="text-lg font-black text-slate-800 dark:text-white leading-none tracking-tight">DEPEND <span className="text-indigo-600 dark:text-indigo-400">SOURCING</span></h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.2em] uppercase">Premium Product Catalog</p>
               </div>
            </div>

            <div className="flex items-center gap-2">
               {canEdit && (
                  <button onClick={openAddModal} className="bg-indigo-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 whitespace-nowrap active:scale-95">
                     <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Item</span>
                  </button>
               )}
               {isGuest && (
                  <button onClick={onLogout} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-red-50 hover:text-red-500 transition-colors active:scale-95">
                     <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Exit</span>
                  </button>
               )}
            </div>
         </div>
      </header>

      {/* Hero Section - Compact & Effective */}
      <section className="relative pt-24 pb-12 overflow-hidden bg-[#0F172A]">
         {/* Abstract Background Elements */}
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
         <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[80px]"></div>
         
         <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
               {/* Text Content */}
               <div className="text-center lg:text-left space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-200/10 to-yellow-500/10 border border-amber-500/20 backdrop-blur-md">
                     <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                     <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">Premium Quality</span>
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                     Premium Garment <br />
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Raw Materials</span>
                  </h1>
                  
                  <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-lg mx-auto lg:mx-0">
                     Access a curated collection of export-quality Fabrics, Yarn, and Accessories. 
                     Sourced directly from top-tier manufacturers.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                     <button onClick={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })} className="px-6 py-3 bg-white text-indigo-950 rounded-xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2 group text-sm">
                        Start Sourcing <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                     </button>
                     <button onClick={() => window.location.href = 'mailto:info@dependsourcingltd.com,dependsource@gmail.com'} className="px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl font-bold hover:bg-white/10 backdrop-blur-md transition-all flex items-center justify-center gap-2 text-sm">
                        <Mail className="w-4 h-4" /> Contact Us
                     </button>
                  </div>

                  {/* Certifications Row */}
                  <div className="pt-3 border-t border-white/5 flex flex-wrap justify-center lg:justify-start items-center gap-4 opacity-90">
                     <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mr-2">Certified By:</p>
                     <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group relative" onClick={() => canEdit && (setUploadingTarget('oeko'), certInputRef.current?.click())}>
                           <div className="bg-white p-0.5 rounded-sm h-5 w-auto flex items-center justify-center">
                              <img src={certLogos.oeko} className="h-full object-contain" alt="Oeko-Tex" />
                           </div>
                           <span className="text-[10px] font-bold text-slate-300">OEKO-TEX®</span>
                           {canEdit && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-lg"><Edit3 className="w-3 h-3"/></div>}
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group relative" onClick={() => canEdit && (setUploadingTarget('gscs'), certInputRef.current?.click())}>
                           <div className="bg-white p-0.5 rounded-sm h-5 w-auto flex items-center justify-center">
                              <img src={certLogos.gscs} className="h-full object-contain" alt="GSCS" />
                           </div>
                           <span className="text-[10px] font-bold text-slate-300">GSCS International</span>
                           {canEdit && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-lg"><Edit3 className="w-3 h-3"/></div>}
                        </div>
                        <input ref={certInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
                     </div>
                  </div>
               </div>

               {/* Right: Visual Elements */}
               <div className="relative hidden lg:block scale-90 origin-right">
                  {/* Floating Glass Card 1 */}
                  <div className="absolute top-0 right-10 z-20 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl animate-[bounce_3s_infinite]">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white"><Gem className="w-5 h-5" /></div>
                        <div>
                           <p className="text-xs font-bold text-indigo-200 uppercase">Quality</p>
                           <p className="text-sm font-black text-white">Top Tier</p>
                        </div>
                     </div>
                  </div>

                  {/* Main Visual Composition */}
                  <div className="relative z-10 bg-gradient-to-br from-slate-800 to-black p-2 rounded-[2.5rem] shadow-2xl rotate-[-2deg] hover:rotate-0 transition-transform duration-500 border border-slate-700">
                     <div className="bg-slate-900 rounded-[2rem] overflow-hidden h-[300px] relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="grid grid-cols-2 gap-3 opacity-50 p-6">
                              <div className="bg-white/5 rounded-xl h-24 w-full animate-pulse"></div>
                              <div className="bg-white/5 rounded-xl h-24 w-full animate-pulse delay-100"></div>
                              <div className="bg-white/5 rounded-xl h-24 w-full animate-pulse delay-200"></div>
                              <div className="bg-white/5 rounded-xl h-24 w-full animate-pulse delay-300"></div>
                           </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                           <div className="flex justify-between items-end">
                              <div>
                                 <p className="text-xs text-indigo-400 font-bold mb-1">LIVE CATALOG</p>
                                 <p className="text-xl font-bold text-white">Global Collection</p>
                              </div>
                              <div className="bg-white text-black p-3 rounded-full">
                                 <ArrowRight className="w-5 h-5" />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Floating Glass Card 2 */}
                  <div className="absolute bottom-10 -left-10 z-20 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Truck className="w-5 h-5" /></div>
                        <div>
                           <p className="text-xs font-bold text-emerald-200 uppercase">Delivery</p>
                           <p className="text-sm font-black text-white">Fast & Safe</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* SEARCH & FILTER SECTION - Optimized with Light Shadow */}
      <section id="catalog-section" className="relative z-30 -mt-8 px-4 mb-8">
        <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-full shadow-xl shadow-indigo-100/50 dark:shadow-none p-2 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-2 backdrop-blur-md">
                {/* Search Input */}
                <div className="relative flex-1 w-full group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-3 rounded-full bg-transparent border-none focus:ring-0 text-base font-bold text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400"
                    placeholder="Search premium products..."
                    value={searchTerm}
                    onChange={handleSearch}
                  />
               </div>
            </div>

            {/* Categories as Pills below */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border shadow-sm ${
                            selectedCategory === cat 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 transform scale-105' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50'
                        }`}
                    >
                        {cat}
                    </button>
                    ))}
            </div>
        </div>
      </section>

      {/* Main Product Grid - PREMIUM DESIGN */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-20">
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
               <div 
                 key={product.id}
                 onClick={() => setViewingProduct(product)}
                 className="group relative bg-white dark:bg-slate-800 rounded-3xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] dark:shadow-none dark:hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] transition-all duration-500 hover:-translate-y-2 border border-slate-100 dark:border-slate-700 overflow-hidden cursor-pointer flex flex-col h-full"
               >
                  {/* Image Area */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-slate-100 dark:bg-slate-700">
                     {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-500 bg-slate-50 dark:bg-slate-800">
                           <ShoppingBag className="w-16 h-16 opacity-50" />
                        </div>
                     )}
                     
                     {/* Gradient Overlay on Hover */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                     
                     {/* Category Badge */}
                     <div className="absolute top-3 left-3 z-10">
                        <span className="bg-white/90 dark:bg-black/60 backdrop-blur-md text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-slate-800 dark:text-white shadow-sm border border-white/20">
                           {product.category}
                        </span>
                     </div>

                     {/* Quick Action Button */}
                     <button className="absolute bottom-4 right-4 bg-white text-indigo-600 p-3 rounded-full shadow-lg translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10 hover:bg-indigo-50">
                        <ArrowRight className="w-5 h-5" />
                     </button>
                  </div>

                  {/* Content Area */}
                  <div className="p-5 flex flex-col flex-1">
                     <h3 className="font-black text-lg text-slate-800 dark:text-white leading-tight mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {product.name}
                     </h3>
                     
                     <div className="mt-auto space-y-3">
                        <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-700">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Price</span>
                              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{product.priceRange}</span>
                           </div>
                           <div className="flex flex-col items-end">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">MOQ</span>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{product.moq}</span>
                           </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                           {product.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[9px] font-bold px-2 py-0.5 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded-md border border-slate-100 dark:border-slate-600">
                                 #{tag}
                              </span>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            ))}
         </div>
         
         {filteredProducts.length === 0 && (
            <div className="py-24 text-center">
               <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
                  <Package className="w-10 h-10" />
               </div>
               <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No products found</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Try adjusting your search or category filter.</p>
            </div>
         )}
      </main>

      {/* Footer / Certifications */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 mt-auto py-8">
         <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
               <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm mb-1">Depend Sourcing Ltd.</h4>
               <p className="text-xs text-slate-500 dark:text-slate-400">Promise Beyond Business</p>
            </div>
            <div className="flex items-center gap-6 opacity-60 hover:opacity-100 transition-opacity">
               <div className="relative group cursor-pointer flex items-center gap-2" onClick={() => canEdit && (setUploadingTarget('oeko'), certInputRef.current?.click())}>
                  <img src={certLogos.oeko || "https://placehold.co/100x50?text=OEKO-TEX"} alt="OEKO-TEX" className="h-6 object-contain grayscale hover:grayscale-0 transition-all" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">OEKO-TEX®</span>
               </div>
               <div className="relative group cursor-pointer flex items-center gap-2" onClick={() => canEdit && (setUploadingTarget('gscs'), certInputRef.current?.click())}>
                  <img src={certLogos.gscs || "https://placehold.co/100x50?text=GSCS"} alt="GSCS" className="h-6 object-contain grayscale hover:grayscale-0 transition-all" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">GSCS</span>
               </div>
            </div>
         </div>
      </footer>

      {/* Product Detail Modal - With Portal */}
      {viewingProduct && createPortal(
         <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-200" onClick={() => setViewingProduct(null)}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
               <div className="w-full md:w-1/2 bg-slate-100 dark:bg-slate-700 relative group">
                  {viewingProduct.image ? (
                     <img src={viewingProduct.image} alt={viewingProduct.name} className="w-full h-full object-cover" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-500">
                        <ShoppingBag className="w-24 h-24" />
                     </div>
                  )}
                  <button onClick={() => setViewingProduct(null)} className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors md:hidden"><X className="w-5 h-5"/></button>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
               </div>
               
               <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto bg-white dark:bg-slate-800">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 px-2.5 py-1 rounded-lg mb-3 inline-block shadow-sm">{viewingProduct.category}</span>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{viewingProduct.name}</h2>
                     </div>
                     <button onClick={() => setViewingProduct(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hidden md:block p-1 bg-slate-100 dark:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                  </div>

                  <div className="flex items-center gap-4 mb-6 text-sm">
                     <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
                        <Package className="w-4 h-4 text-indigo-500" /> MOQ: {viewingProduct.moq}
                     </div>
                     <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                        <DollarSign className="w-4 h-4" /> {viewingProduct.priceRange}
                     </div>
                  </div>

                  <div className="prose dark:prose-invert text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                     {viewingProduct.description}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-8">
                     {viewingProduct.tags.map(tag => (
                        <span key={tag} className="text-xs bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-3 py-1 rounded-lg font-bold border border-slate-100 dark:border-slate-600">#{tag}</span>
                     ))}
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                     <button 
                       onClick={() => setIsInquiryModalOpen(true)}
                       className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 group"
                     >
                        <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> Inquiry For This Item
                     </button>
                     {canEdit && (
                        <>
                           <button onClick={() => { setIsModalOpen(true); openEditModal(viewingProduct); }} className="p-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                              <Edit3 className="w-5 h-5" />
                           </button>
                           <button onClick={() => handleDeleteProduct(viewingProduct.id)} className="p-3.5 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                              <Trash2 className="w-5 h-5" />
                           </button>
                        </>
                     )}
                  </div>
               </div>
            </div>
         </div>,
         document.body
      )}

      {/* Add/Edit Modal - With Portal */}
      {isModalOpen && createPortal(
         <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-indigo-600 text-white shrink-0">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                     {editingProduct ? <Edit3 className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                     {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form onSubmit={handleSaveProduct} className="space-y-4">
                     {/* Image Upload */}
                     <div className="flex justify-center mb-4">
                        <div 
                           onClick={() => { setUploadingTarget('product'); fileInputRef.current?.click(); }}
                           className="w-32 h-32 bg-gray-100 dark:bg-slate-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors overflow-hidden group relative"
                        >
                           {formData.image ? (
                              <img src={formData.image} className="w-full h-full object-cover" />
                           ) : (
                              <>
                                 <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                 <span className="text-[10px] text-gray-500 font-bold uppercase">Upload Image</span>
                              </>
                           )}
                           <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Edit3 className="w-6 h-6 text-white" />
                           </div>
                        </div>
                        <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Product Name</label>
                           <input required type="text" className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Category</label>
                           <input required type="text" list="cat-suggestions" className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                           <datalist id="cat-suggestions">
                              {categories.filter(c => c !== 'ALL').map(c => <option key={c} value={c} />)}
                           </datalist>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Price Range</label>
                           <input type="text" className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" placeholder="e.g. $5 - $10" value={formData.priceRange} onChange={e => setFormData({...formData, priceRange: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">MOQ</label>
                           <input type="text" className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" placeholder="e.g. 500 pcs" value={formData.moq} onChange={e => setFormData({...formData, moq: e.target.value})} />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Description</label>
                        <textarea rows={4} className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Tags</label>
                        <div className="flex gap-2 mb-2">
                           <input 
                             type="text" 
                             className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                             placeholder="Add tag..."
                             value={tagInput}
                             onChange={e => setTagInput(e.target.value)}
                             onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                           />
                           <button type="button" onClick={handleAddTag} className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-4 rounded-lg font-bold hover:bg-indigo-200 transition-colors"><Plus className="w-5 h-5"/></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {formData.tags?.map(tag => (
                              <span key={tag} className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full flex items-center gap-1">
                                 #{tag} 
                                 <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => removeTag(tag)} />
                              </span>
                           ))}
                        </div>
                     </div>

                     <div className="pt-4">
                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                           <Save className="w-5 h-5" /> Save Product
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         </div>,
         document.body
      )}

      {/* Inquiry Modal - With Portal */}
      {isInquiryModalOpen && createPortal(
         <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6">
               <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-400">
                     <Send className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800 dark:text-white">Product Inquiry</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">We will get back to you shortly.</p>
               </div>
               
               <form onSubmit={handleInquirySubmit} className="space-y-4">
                  {!role && (
                     <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Your Name</label>
                        <input required type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 dark:text-white" value={inquiryData.name} onChange={e => setInquiryData({...inquiryData, name: e.target.value})} />
                     </div>
                  )}
                  <div>
                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Contact Info (Email/Phone)</label>
                     <input required type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 dark:text-white" value={inquiryData.contact} onChange={e => setInquiryData({...inquiryData, contact: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Message</label>
                     <textarea required rows={3} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-800 dark:text-white" value={inquiryData.message} onChange={e => setInquiryData({...inquiryData, message: e.target.value})} placeholder="I am interested in..." />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                     <button type="button" onClick={() => setIsInquiryModalOpen(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700">Cancel</button>
                     <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg active:scale-95">Send</button>
                  </div>
               </form>
            </div>
         </div>,
         document.body
      )}
    </div>
  );
};

export default ProductCatalogView;
