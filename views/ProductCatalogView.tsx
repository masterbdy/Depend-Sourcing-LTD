
import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, FilterX, Plus, Edit3, Trash2, X, Save, Image as ImageIcon, Tag, DollarSign, Package, Info, Upload, CheckCircle, ShieldCheck, LogOut, ShoppingBag, Send, Phone, Star, Tag as TagIcon, Layers, Mail, ArrowRight, Award, Truck, Gem, Eye, ChevronRight, Globe, Shield, MapPin, Linkedin, Facebook } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0B1120] pb-20 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* PREMIUM HEADER - Compact Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1F36]/95 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
         <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="relative group cursor-pointer transition-transform active:scale-95" onClick={() => canEdit && (setUploadingTarget('company'), logoInputRef.current?.click())}>
                  {companyLogo ? (
                     <img src={companyLogo} alt="Logo" className="w-8 h-8 object-contain bg-white rounded-lg p-1" />
                  ) : (
                     <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#1A1F36] font-black text-lg">D</div>
                  )}
                  {canEdit && <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"><Edit3 className="w-3 h-3 text-white"/></div>}
               </div>
               <input ref={logoInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
               
               <div className="flex flex-col">
                  <span className="text-base font-bold text-white tracking-wide leading-none">DEPEND</span>
                  <span className="text-[9px] text-gray-400 font-bold tracking-[0.2em] uppercase">Sourcing Ltd.</span>
               </div>
            </div>

            <div className="flex items-center gap-3">
               {canEdit && (
                  <button onClick={openAddModal} className="text-blue-400 text-xs font-bold hover:text-white transition-colors flex items-center gap-1">
                     <Plus className="w-3 h-3" /> Add Item
                  </button>
               )}
               {isGuest && (
                  <button onClick={onLogout} className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-white/20 transition-all flex items-center gap-1.5">
                     <LogOut className="w-3 h-3" /> Exit
                  </button>
               )}
            </div>
         </div>
      </header>

      {/* COMPACT PREMIUM HERO SECTION */}
      <section className="pt-20 pb-4 bg-[#1A1F36] relative overflow-hidden">
         {/* Background Glows */}
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full z-0"></div>
         <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full z-0"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 z-0"></div>

         <div className="max-w-4xl mx-auto px-6 text-center relative z-10 pt-4 pb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold mb-4">
               <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Premium Quality Assured
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3 tracking-tight">
               Garment Raw Materials <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Sourcing Simplified.</span>
            </h1>
            
            <p className="text-gray-400 text-xs md:text-sm max-w-xl mx-auto mb-6 font-medium leading-relaxed">
               Curated catalog of export-quality Fabrics, Yarn, and Accessories. <br className="hidden md:block"/> 
               Direct from best manufacturers with guaranteed standards.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
               <button 
                 onClick={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })}
                 className="w-full sm:w-auto bg-white text-[#1A1F36] px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/10 active:scale-95 text-sm"
               >
                  <Gem className="w-4 h-4" /> Explore Collection
               </button>
               <button 
                 onClick={() => setIsInquiryModalOpen(true)}
                 className="w-full sm:w-auto bg-[#1A1F36] border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
               >
                  <Mail className="w-4 h-4" /> Contact us
               </button>
            </div>

            {/* Certifications Badge Area - Compact */}
            <div className="flex justify-center gap-4 scale-90 origin-top flex-wrap">
               <div 
                  className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => canEdit && (setUploadingTarget('oeko'), certInputRef.current?.click())}
               >
                  <img src={certLogos.oeko} alt="Oeko-Tex" className="h-6 object-contain" />
                  <div className="text-left">
                     <p className="text-[7px] font-bold text-gray-400 uppercase">Certification</p>
                     <p className="text-[9px] font-black text-gray-800">OEKO-TEX® 100</p>
                  </div>
               </div>
               <div 
                  className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => canEdit && (setUploadingTarget('gscs'), certInputRef.current?.click())}
               >
                  <img src={certLogos.gscs} alt="GSCS" className="h-6 object-contain" />
                  <div className="text-left">
                     <p className="text-[7px] font-bold text-gray-400 uppercase">Verified By</p>
                     <p className="text-[9px] font-black text-gray-800">Global Recycled</p>
                  </div>
               </div>
               <input ref={certInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
            </div>
         </div>

         {/* Bottom Feature Bar */}
         <div className="border-t border-white/5 bg-black/20 backdrop-blur-sm">
            <div className="max-w-5xl mx-auto px-6 py-3 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
               <div className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-indigo-400" /> <span className="hidden sm:inline">Fast Delivery</span></div>
               <div className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-green-400" /> <span className="hidden sm:inline">Verified Suppliers</span></div>
               <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-blue-400" /> <span className="hidden sm:inline">Global Sourcing</span></div>
            </div>
         </div>
      </section>

      {/* CATALOG SECTION CONTAINER */}
      <div className="relative -mt-4 z-20 rounded-t-[2rem] bg-[#F5F5F7] dark:bg-[#0B1120] pt-6 min-h-screen">
         
         {/* SEARCH & FILTER */}
         <section id="catalog-section" className="px-4 mb-6">
            <div className="max-w-3xl mx-auto">
               <div className="bg-white dark:bg-[#1A1F36] rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none p-2 flex flex-col md:flex-row items-center gap-2 border border-white dark:border-gray-700">
                  <div className="relative flex-1 w-full group">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                     <input 
                       type="text" 
                       className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 dark:text-white outline-none placeholder:text-gray-400"
                       placeholder="Search products..."
                       value={searchTerm}
                       onChange={handleSearch}
                     />
                  </div>
               </div>

               <div className="flex flex-wrap gap-2 justify-center mt-4">
                     {categories.map(cat => (
                       <button
                           key={cat}
                           onClick={() => setSelectedCategory(cat)}
                           className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wide ${
                               selectedCategory === cat 
                               ? 'bg-[#1A1F36] text-white shadow-lg transform scale-105' 
                               : 'bg-white dark:bg-[#1A1F36] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm'
                           }`}
                       >
                           {cat}
                       </button>
                       ))}
               </div>
            </div>
         </section>

         {/* PRODUCT GRID */}
         <main className="max-w-7xl mx-auto px-4 py-4 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {filteredProducts.map(product => (
                  <div 
                    key={product.id}
                    onClick={() => setViewingProduct(product)}
                    className="group bg-white dark:bg-[#1A1F36] rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-none dark:hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 border border-transparent dark:border-gray-800"
                  >
                     <div className="relative aspect-[4/5] bg-gray-100 dark:bg-black/20 overflow-hidden">
                        {product.image ? (
                           <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                              <ShoppingBag className="w-12 h-12 opacity-50" />
                           </div>
                        )}
                        <div className="absolute top-3 left-3">
                           <span className="bg-black/70 backdrop-blur-md text-[9px] font-bold text-white px-2 py-0.5 rounded whitespace-nowrap">
                              {product.category}
                           </span>
                        </div>
                     </div>

                     <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-white text-xs mb-1 line-clamp-2 leading-snug">
                           {product.name}
                        </h3>
                        
                        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-end justify-between">
                           <div>
                              <p className="text-[8px] font-bold text-gray-400 uppercase">Price</p>
                              <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">{product.priceRange}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[8px] font-bold text-gray-400 uppercase">MOQ</p>
                              <p className="text-[9px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{product.moq}</p>
                           </div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
            
            {filteredProducts.length === 0 && (
               <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 dark:text-gray-600">
                     <Package className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white">No products found</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Try adjusting your search or category filter.</p>
               </div>
            )}
         </main>

         {/* Company Footer */}
         <footer className="mt-8 pt-16 pb-8 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f172a]">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            {companyLogo ? (
                                <img src={companyLogo} alt="Logo" className="w-8 h-8 object-contain" />
                            ) : (
                                <div className="w-8 h-8 bg-[#1A1F36] rounded-lg flex items-center justify-center text-white font-black">D</div>
                            )}
                            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">DEPEND</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs font-medium">
                            Your trusted partner for export-quality garment raw materials. Ensuring quality, reliability, and speed for the textile industry.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">Quick Links</h4>
                        <ul className="space-y-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <li><button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left">Home</button></li>
                            <li><button onClick={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left">Product Catalog</button></li>
                            <li><button onClick={() => setIsInquiryModalOpen(true)} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left">Send Inquiry</button></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest mb-4">Contact Info</h4>
                        <ul className="space-y-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                <span>A-14/8, Johir Complex, Savar,<br/>Dhaka, Bangladesh.</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span>+880 1764-700203</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span>info@dependsourcing.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">© {new Date().getFullYear()} Depend Sourcing Ltd. All rights reserved.</p>
                    <div className="flex gap-4">
                        <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Facebook className="w-4 h-4" /></a>
                        <a href="#" className="text-gray-400 hover:text-blue-500 transition-colors"><Linkedin className="w-4 h-4" /></a>
                        <a href="#" className="text-gray-400 hover:text-indigo-500 transition-colors"><Globe className="w-4 h-4" /></a>
                    </div>
                </div>
            </div>
         </footer>
      </div>

      {/* Product Detail Modal - With Portal */}
      {viewingProduct && createPortal(
         <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in duration-300" onClick={() => setViewingProduct(null)}>
            <div className="bg-white dark:bg-[#1A1F36] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]" onClick={e => e.stopPropagation()}>
               <div className="w-full md:w-1/2 bg-gray-100 dark:bg-black relative group flex items-center justify-center p-8">
                  {viewingProduct.image ? (
                     <img src={viewingProduct.image} alt={viewingProduct.name} className="w-full h-full object-contain drop-shadow-xl" />
                  ) : (
                     <ShoppingBag className="w-24 h-24 text-gray-300" />
                  )}
                  <button onClick={() => setViewingProduct(null)} className="absolute top-6 left-6 bg-white/50 dark:bg-black/50 backdrop-blur-md p-2 rounded-full hover:bg-white transition-colors md:hidden"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col overflow-y-auto bg-white dark:bg-[#1A1F36]">
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-2 block">{viewingProduct.category}</span>
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight">{viewingProduct.name}</h2>
                     </div>
                     <button onClick={() => setViewingProduct(null)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white hidden md:block p-2 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Price Range</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{viewingProduct.priceRange}</p>
                     </div>
                     <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Minimum Order</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{viewingProduct.moq}</p>
                     </div>
                  </div>

                  <div className="prose dark:prose-invert text-sm text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                     {viewingProduct.description}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-8">
                     {viewingProduct.tags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg font-semibold">#{tag}</span>
                     ))}
                  </div>

                  <div className="mt-auto flex flex-col gap-3">
                     <button 
                       onClick={() => setIsInquiryModalOpen(true)}
                       className="w-full bg-[#1A1F36] dark:bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-black dark:hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                     >
                        Contact for Pricing <ArrowRight className="w-4 h-4" />
                     </button>
                     {canEdit && (
                        <div className="flex gap-3">
                           <button onClick={() => { setIsModalOpen(true); openEditModal(viewingProduct); }} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-bold hover:bg-gray-200 transition-colors">
                              Edit
                           </button>
                           <button onClick={() => handleDeleteProduct(viewingProduct.id)} className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors">
                              Delete
                           </button>
                        </div>
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
                        <input required type="text" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800 dark:text-white" value={inquiryData.name} onChange={e => setInquiryData({...inquiryData,name: e.target.value})} />
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
