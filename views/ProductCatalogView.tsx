import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, LogOut, Phone, Mail, Globe, Search, Filter, ShoppingCart, X, CheckCircle, ExternalLink, Package, Layers, Scissors, Plus, Edit3, Trash2, Save, Camera, Tag, AlertTriangle, Eye, Users, ArrowRight, Truck, ShieldCheck, Star, Send } from 'lucide-react';
import { Product, UserRole, Complaint } from '../types';

interface ProductCatalogProps {
  onLogout: () => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  role: UserRole;
  productEditors: string[];
  currentStaffId: string | null;
  onTrackSearch?: () => void;
  visitCount?: number;
  setComplaints?: React.Dispatch<React.SetStateAction<Complaint[]>>;
}

const ProductCatalogView: React.FC<ProductCatalogProps> = ({ onLogout, products = [], setProducts, role, productEditors = [], currentStaffId, onTrackSearch, visitCount, setComplaints }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<string[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Order Form State
  const [orderForm, setOrderForm] = useState({
    name: '',
    company: '',
    contact: '',
    details: ''
  });

  // Management State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({});
  const [deleteConfirmProductId, setDeleteConfirmProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll Listener for Navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // SEARCH ANALYTICS TRACKING
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length > 2) {
        onTrackSearch && onTrackSearch();
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, onTrackSearch]);

  const canManageCatalog = role === UserRole.ADMIN || (currentStaffId && productEditors.includes(currentStaffId));
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (id: string) => {
    if (!cart.includes(id)) {
      setCart([...cart, id]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(itemId => itemId !== id));
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedItems = products.filter(p => cart.includes(p.id));
    const itemsList = selectedItems.map(p => `- ${p.name} (MOQ: ${p.moq})`).join('\n');
    
    if (setComplaints) {
        const newInquiry: Complaint = {
            id: Math.random().toString(36).substr(2, 9),
            submittedBy: `${orderForm.name} ${orderForm.company ? `(${orderForm.company})` : ''}`,
            submittedById: 'GUEST',
            againstStaffId: 'SALES_INQUIRY',
            againstStaffName: 'Sales Inquiry',
            subject: `🛒 Order Inquiry: ${cart.length} Items`,
            description: `Contact Info: ${orderForm.contact}\n\nRequested Items:\n${itemsList}\n\nCustomer Note:\n${orderForm.details}`,
            date: new Date().toISOString(),
            status: 'PENDING',
            type: 'SUGGESTION'
        };
        setComplaints(prev => [newInquiry, ...prev]);
    }
    setOrderSuccess(true);
    setCart([]);
    setOrderForm({ name: '', company: '', contact: '', details: '' });
  };

  // --- MANAGEMENT FUNCTIONS ---
  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({ name: '', category: '', priceRange: '', moq: '', image: '', description: '', tags: [] });
    setIsEditModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({ ...product });
    setIsEditModalOpen(true);
  };

  const handleDeleteRequest = (id: string) => setDeleteConfirmProductId(id);

  const confirmDeleteProduct = () => {
    if (deleteConfirmProductId) {
        setProducts(prev => prev.filter(p => p.id !== deleteConfirmProductId));
        setDeleteConfirmProductId(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setProductForm(prev => ({ ...prev, image: event.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.category) return alert("পণ্যের নাম এবং ক্যাটাগরি আবশ্যক।");

    if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productForm } as Product : p));
    } else {
        const newProduct: Product = {
            id: Math.random().toString(36).substr(2, 9),
            name: productForm.name || 'New Product',
            category: productForm.category || 'General',
            priceRange: productForm.priceRange || 'TBD',
            moq: productForm.moq || 'N/A',
            image: productForm.image || '',
            description: productForm.description || '',
            tags: productForm.tags || []
        };
        setProducts(prev => [newProduct, ...prev]);
    }
    setIsEditModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Hind_Siliguri'] pb-20 md:pb-0 relative selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Floating Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-2' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
               <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${isScrolled ? 'bg-indigo-600' : 'bg-white text-indigo-900'}`}>
                  <Layers className="w-6 h-6" />
               </div>
               <div>
                  <h1 className={`text-xl font-black tracking-tight leading-none ${isScrolled ? 'text-gray-900' : 'text-white'}`}>DEPEND</h1>
                  <p className={`text-[10px] font-bold tracking-widest uppercase ${isScrolled ? 'text-gray-500' : 'text-indigo-200'}`}>Sourcing Ltd.</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
               {visitCount !== undefined && (
                  <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border shadow-sm ${isScrolled ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-white/10 text-white border-white/20 backdrop-blur-sm'}`}>
                     <Users className="w-3.5 h-3.5" />
                     <span>{visitCount.toLocaleString()} Views</span>
                  </div>
               )}

               <button 
                 onClick={() => cart.length > 0 && setIsOrderModalOpen(true)}
                 className={`relative p-2.5 rounded-full transition-all hover:scale-105 active:scale-95 ${isScrolled ? 'hover:bg-gray-100 text-gray-600' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'}`}
               >
                  <ShoppingCart className="w-5 h-5" />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-in zoom-in">
                      {cart.length}
                    </span>
                  )}
               </button>
               
               {role === UserRole.GUEST && (
                   <button 
                     onClick={onLogout}
                     className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${isScrolled ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600' : 'bg-white text-indigo-900 hover:bg-gray-100 shadow-lg'}`}
                   >
                     <LogOut className="w-4 h-4" />
                     <span className="hidden sm:inline">Exit</span>
                   </button>
               )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-[#0F172A] pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden rounded-b-[3rem] shadow-2xl">
         {/* Abstract Background */}
         <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]"></div>
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>

         <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold mb-6 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-700">
               <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> Premium Quality Assured
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 tracking-tight drop-shadow-sm animate-in slide-in-from-bottom-6 duration-700">
               Garment Raw Materials <br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Sourcing Simplified.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-in slide-in-from-bottom-8 duration-700">
               Access a curated catalog of export-quality Fabrics, Yarn, and Accessories. 
               Direct from the best manufacturers to your production line.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in slide-in-from-bottom-10 duration-700">
                <button onClick={() => document.getElementById('catalog')?.scrollIntoView({behavior: 'smooth'})} className="px-8 py-4 bg-white text-indigo-900 rounded-2xl font-bold shadow-[0_20px_50px_-12px_rgba(255,255,255,0.3)] hover:shadow-[0_20px_50px_-8px_rgba(255,255,255,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2">
                    <Scissors className="w-5 h-5" /> Explore Collection
                </button>
                <button onClick={() => window.location.href = 'mailto:info@dependsourcing.com'} className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 backdrop-blur-md transition-all flex items-center justify-center gap-2">
                    <Mail className="w-5 h-5" /> Contact Supplier
                </button>
            </div>
         </div>

         {/* Stats Bar */}
         <div className="absolute bottom-0 w-full bg-white/5 border-t border-white/10 backdrop-blur-md py-4">
            <div className="max-w-7xl mx-auto px-4 flex justify-around text-indigo-200">
               <div className="flex items-center gap-2 text-xs md:text-sm font-bold"><Truck className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" /> <span className="hidden md:inline">Fast Delivery</span></div>
               <div className="flex items-center gap-2 text-xs md:text-sm font-bold"><ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-blue-400" /> <span className="hidden md:inline">Verified Quality</span></div>
               <div className="flex items-center gap-2 text-xs md:text-sm font-bold"><Globe className="w-4 h-4 md:w-5 md:h-5 text-purple-400" /> <span className="hidden md:inline">Global Sourcing</span></div>
            </div>
         </div>
      </div>

      {/* Main Content */}
      <div id="catalog" className="max-w-7xl mx-auto px-4 py-12 -mt-10 relative z-20">
         
         {/* Search & Filter Bar */}
         <div className="bg-white p-4 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4 mb-10 sticky top-24 z-30 transition-all">
            <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto scrollbar-hide pb-1 lg:pb-0">
                <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1">
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                            selectedCategory === cat 
                                ? 'bg-white text-indigo-600 shadow-md transform scale-105' 
                                : 'text-gray-500 hover:bg-slate-200 hover:text-gray-700'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="relative w-full lg:w-80 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="Search by name, tags..." 
                 className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>

         {/* Product Grid */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, idx) => (
               <div 
                 key={product.id} 
                 className="group bg-white rounded-3xl p-3 shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 flex flex-col hover:-translate-y-2 animate-in fade-in zoom-in"
                 style={{ animationDelay: `${idx * 50}ms` }}
               >
                  {/* Image Container */}
                  <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-100">
                     {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400"><Package className="w-10 h-10 opacity-20" /></div>
                     )}
                     
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                     {/* Badges */}
                     <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-indigo-600 uppercase tracking-wider shadow-sm">
                        {product.category}
                     </div>
                     <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm">
                        MOQ: {product.moq}
                     </div>

                     {/* Action Overlay */}
                     <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 flex gap-2">
                        <button 
                          onClick={() => cart.includes(product.id) ? removeFromCart(product.id) : addToCart(product.id)}
                          className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg backdrop-blur-md transition-all active:scale-95 ${
                             cart.includes(product.id) 
                               ? 'bg-emerald-500 text-white' 
                               : 'bg-white text-slate-900 hover:bg-indigo-50'
                          }`}
                        >
                           {cart.includes(product.id) ? <CheckCircle className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                           {cart.includes(product.id) ? 'Added' : 'Add to Inquiry'}
                        </button>
                        {canManageCatalog && (
                           <button onClick={() => openEditModal(product)} className="p-3 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-white hover:text-indigo-600 transition-all shadow-lg">
                              <Edit3 className="w-4 h-4" />
                           </button>
                        )}
                     </div>
                  </div>

                  {/* Info Area */}
                  <div className="p-3 flex-1 flex flex-col">
                     <div className="mb-2">
                        <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">{product.name}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">{product.priceRange}</p>
                     </div>
                     
                     <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-4 flex-1">
                        {product.description}
                     </p>

                     <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-50">
                        {product.tags.slice(0, 3).map(tag => (
                           <span key={tag} className="text-[9px] bg-slate-50 text-slate-500 px-2 py-1 rounded-md font-bold border border-slate-100 group-hover:border-indigo-100 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">#{tag}</span>
                        ))}
                     </div>
                  </div>
               </div>
            ))}
         </div>

         {filteredProducts.length === 0 && (
            <div className="py-20 text-center">
               <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-slate-700">No products found</h3>
               <p className="text-slate-400 mt-2">Try adjusting your search or filters.</p>
            </div>
         )}
      </div>

      {/* Floating Add Product Button */}
      {canManageCatalog && (
        <button
            onClick={openAddModal}
            className="fixed bottom-8 right-8 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all group border-4 border-white/20"
            title="Add Product"
        >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-[#0B1120] text-white py-16 mt-20 relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
         <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-900/50">
               <Layers className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">DEPEND SOURCING LTD.</h2>
            <p className="text-slate-400 text-sm mb-8 font-medium">Your Trusted Partner in Garment Raw Materials</p>
            <div className="flex flex-col md:flex-row justify-center gap-6 text-sm font-bold text-slate-300">
               <a href="tel:+8801764700203" className="flex items-center justify-center gap-2 hover:text-white transition-colors"><Phone className="w-4 h-4" /> +880 1764-700203</a>
               <a href="mailto:info@dependsourcing.com" className="flex items-center justify-center gap-2 hover:text-white transition-colors"><Mail className="w-4 h-4" /> info@dependsourcing.com</a>
               <a href="#" className="flex items-center justify-center gap-2 hover:text-white transition-colors"><Globe className="w-4 h-4" /> www.dependsourcing.com</a>
            </div>
            <div className="h-px w-full max-w-xs bg-white/10 mx-auto my-8"></div>
            <p className="text-slate-600 text-xs">© 2015 Depend Sourcing. All rights reserved.</p>
         </div>
      </footer>

      {/* Inquiry Modal - Modernized */}
      {isOrderModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               {orderSuccess ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                     <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-6 animate-bounce border-4 border-green-100">
                        <CheckCircle className="w-12 h-12" />
                     </div>
                     <h3 className="text-3xl font-black text-slate-800 mb-2">Inquiry Sent!</h3>
                     <p className="text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">Thank you. Our marketing team will review your request and send a quotation shortly.</p>
                     <button onClick={() => { setIsOrderModalOpen(false); setOrderSuccess(false); }} className="px-10 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-lg">
                        Close Window
                     </button>
                  </div>
               ) : (
                  <>
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                           <h3 className="font-bold text-xl text-slate-800">Request Quotation</h3>
                           <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-wider">{cart.length} ITEMS SELECTED</p>
                        </div>
                        <button onClick={() => setIsOrderModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button>
                     </div>
                     <div className="p-6 overflow-y-auto">
                        <div className="mb-8">
                           <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                              {cart.map(id => {
                                 const p = products.find(prod => prod.id === id);
                                 return p ? (
                                    <div key={id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                       <div className="flex items-center gap-3">
                                          {p.image && <img src={p.image} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />}
                                          <div>
                                             <p className="text-sm font-bold text-slate-700 line-clamp-1">{p.name}</p>
                                             <p className="text-[10px] text-slate-400 font-bold">MOQ: {p.moq}</p>
                                          </div>
                                       </div>
                                       <button onClick={() => removeFromCart(id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                 ) : null;
                              })}
                           </div>
                        </div>

                        <form onSubmit={handlePlaceOrder} className="space-y-5">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Name</label>
                                 <input 
                                    required 
                                    type="text" 
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-800" 
                                    placeholder="Full Name" 
                                    value={orderForm.name}
                                    onChange={(e) => setOrderForm({...orderForm, name: e.target.value})}
                                 />
                              </div>
                              <div className="space-y-1.5">
                                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company</label>
                                 <input 
                                    type="text" 
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-800" 
                                    placeholder="Company Name" 
                                    value={orderForm.company}
                                    onChange={(e) => setOrderForm({...orderForm, company: e.target.value})}
                                 />
                              </div>
                           </div>
                           <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Info</label>
                              <input 
                                required 
                                type="text" 
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-800" 
                                placeholder="Email or Phone Number" 
                                value={orderForm.contact}
                                onChange={(e) => setOrderForm({...orderForm, contact: e.target.value})}
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Requirements</label>
                              <textarea 
                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-800" 
                                rows={3} 
                                placeholder="Quantity, Specific Color Codes, etc."
                                value={orderForm.details}
                                onChange={(e) => setOrderForm({...orderForm, details: e.target.value})}
                              ></textarea>
                           </div>
                           <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all mt-2 active:scale-95 flex items-center justify-center gap-2">
                              <Send className="w-5 h-5" /> Send Inquiry
                           </button>
                        </form>
                     </div>
                  </>
               )}
            </div>
         </div>
      )}

      {/* ADMIN ADD/EDIT MODAL (Keep minimal but clean) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-900 text-white shrink-0">
                    <h3 className="font-bold text-xl">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSaveProduct} className="space-y-4">
                        <div 
                            onClick={() => fileInputRef.current?.click()} 
                            className="w-full h-40 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-500 transition-all overflow-hidden relative group bg-slate-50"
                        >
                            {productForm.image ? (
                                <img src={productForm.image} className="w-full h-full object-cover" alt="Product" />
                            ) : (
                                <div className="text-center text-slate-400">
                                    <Camera className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-xs font-bold">Upload Image</p>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Name</label><input required className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Category</label><input required className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Price</label><input className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={productForm.priceRange} onChange={(e) => setProductForm({...productForm, priceRange: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">MOQ</label><input className="w-full px-3 py-2 border rounded-lg text-sm font-bold" value={productForm.moq} onChange={(e) => setProductForm({...productForm, moq: e.target.value})} /></div>
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Description</label><textarea rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} /></div>
                        <div><label className="text-xs font-bold text-slate-500 uppercase">Tags</label><input className="w-full px-3 py-2 border rounded-lg text-sm" value={productForm.tags?.join(', ')} onChange={(e) => setProductForm({...productForm, tags: e.target.value.split(',').map(t => t.trim())})} /></div>

                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg">Save Product</button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmProductId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><AlertTriangle className="w-8 h-8" /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Delete Product?</h3>
              <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmProductId(null)} className="flex-1 py-3 border rounded-xl font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={confirmDeleteProduct} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg">Delete</button>
              </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductCatalogView;