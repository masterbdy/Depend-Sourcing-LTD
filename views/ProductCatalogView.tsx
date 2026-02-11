import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, LogOut, Phone, Mail, Globe, Search, Filter, ShoppingCart, X, CheckCircle, ExternalLink, Package, Layers, Scissors, Plus, Edit3, Trash2, Save, Camera, Tag, AlertTriangle, Eye, Users } from 'lucide-react';
import { Product, UserRole } from '../types';

interface ProductCatalogProps {
  onLogout: () => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  role: UserRole;
  productEditors: string[];
  currentStaffId: string | null;
  onTrackSearch?: () => void;
  visitCount?: number; // New Prop for Visit Counter
}

const ProductCatalogView: React.FC<ProductCatalogProps> = ({ onLogout, products = [], setProducts, role, productEditors = [], currentStaffId, onTrackSearch, visitCount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<string[]>([]); // Storing Product IDs
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Management State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({});
  const [deleteConfirmProductId, setDeleteConfirmProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SEARCH ANALYTICS TRACKING (Debounced)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length > 2) {
        onTrackSearch && onTrackSearch();
      }
    }, 2000); // 2 seconds pause implies a search intention

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, onTrackSearch]);

  // Updated Permission Logic:
  // Admin ALWAYS has access.
  // Others (including MD) need to be in the 'productEditors' list.
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
    // Simulate API call
    setTimeout(() => {
      setOrderSuccess(true);
      setCart([]);
    }, 1000);
  };

  // --- MANAGEMENT FUNCTIONS ---

  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm({
        name: '', category: '', priceRange: '', moq: '', image: '', description: '', tags: []
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({ ...product });
    setIsEditModalOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteConfirmProductId(id);
  };

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
      reader.onload = (event) => {
        setProductForm(prev => ({ ...prev, image: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.category) {
        alert("পণ্যের নাম এবং ক্যাটাগরি আবশ্যক।");
        return;
    }

    if (editingProduct) {
        // Update existing
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productForm } as Product : p));
    } else {
        // Create new
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
    <div className="min-h-screen bg-gray-50 font-['Hind_Siliguri'] pb-20 md:pb-0 relative">
      
      {/* Navbar */}
      <nav className="bg-white z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Layers className="w-6 h-6" />
               </div>
               <div>
                  <h1 className="text-xl font-black text-gray-800 tracking-tight leading-none">DEPEND SOURCING</h1>
                  <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Raw Materials Catalog</p>
               </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
               {/* VISIT COUNT BADGE - VISIBLE ON ALL DEVICES */}
               {visitCount !== undefined && (
                  <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-full text-[10px] font-bold border border-gray-200 shadow-sm" title="Total Website Visits">
                     <Users className="w-3.5 h-3.5 text-indigo-500" />
                     <span>{visitCount.toLocaleString()} <span className="hidden sm:inline">Views</span></span>
                  </div>
               )}

               {/* Cart Button (Only for Guest, or viewable by Admin too) */}
               <button 
                 onClick={() => cart.length > 0 && setIsOrderModalOpen(true)}
                 className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
               >
                  <ShoppingCart className="w-6 h-6 text-gray-600" />
                  {cart.length > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                      {cart.length}
                    </span>
                  )}
               </button>
               
               {/* Logout Button (Only if Guest Role, otherwise handled by App sidebar) */}
               {role === UserRole.GUEST && (
                   <button 
                     onClick={onLogout}
                     className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-all"
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
      <div className="bg-indigo-900 text-white py-12 px-4 relative overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534951474654-87823058c487?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20"></div>
         <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-indigo-900/90 to-transparent"></div>
         
         <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <h2 className="text-3xl md:text-5xl font-black mb-3 leading-tight">
                Premium Garment <br/>
                <span className="text-yellow-400">Raw Materials</span>
                </h2>
                <p className="text-indigo-200 text-sm md:text-lg max-w-2xl mb-6 font-medium">
                One-stop sourcing solution for Fabrics, Yarn, and Accessories. We ensure export-quality materials for your manufacturing needs.
                </p>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => document.getElementById('catalog')?.scrollIntoView({behavior: 'smooth'})} className="px-6 py-2.5 bg-white text-indigo-900 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-all active:scale-95 flex items-center gap-2 text-sm">
                        <Scissors className="w-4 h-4" /> View Materials
                    </button>
                    <button onClick={() => window.location.href = 'mailto:info@dependsourcing.com'} className="px-6 py-2.5 bg-indigo-700 text-white border border-indigo-500 rounded-full font-bold hover:bg-indigo-600 transition-all flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4" /> Contact Supplier
                    </button>
                </div>
            </div>
         </div>
      </div>

      {/* Main Content */}
      <div id="catalog" className="max-w-7xl mx-auto px-4 py-8">
         
         {/* Filters & Search */}
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
            <div className="w-full md:w-auto overflow-x-auto scrollbar-hide pb-1">
                <div className="flex items-center gap-2">
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border ${
                            selectedCategory === cat 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="relative w-full md:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="Search materials..." 
                 className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold bg-white"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>

         {/* Product Grid */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
               <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
                  <div className="relative h-56 overflow-hidden bg-gray-100 shrink-0">
                     {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">No Image</div>
                     )}
                     
                     <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-700 shadow-sm border border-white/50">
                        MOQ: {product.moq}
                     </div>

                     {/* Admin/Allowed User Controls Overlay */}
                     {canManageCatalog && (
                        <div className="absolute top-3 left-3 flex gap-2">
                            <button onClick={() => openEditModal(product)} className="p-2 bg-white/90 backdrop-blur-sm text-indigo-600 rounded-full shadow-sm hover:bg-indigo-50 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteRequest(product.id)} className="p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-full shadow-sm hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                     )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{product.category}</span>
                        <span className="text-xs font-bold text-gray-900">{product.priceRange}</span>
                     </div>
                     <h3 className="text-lg font-bold text-gray-800 mb-1.5 leading-tight">{product.name}</h3>
                     <p className="text-xs text-gray-500 mb-4 line-clamp-2 flex-1 leading-relaxed">{product.description}</p>
                     
                     <div className="flex flex-wrap gap-1.5 mb-5">
                        {product.tags.map(tag => (
                           <span key={tag} className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium border border-gray-200">#{tag}</span>
                        ))}
                     </div>

                     <button 
                       onClick={() => cart.includes(product.id) ? removeFromCart(product.id) : addToCart(product.id)}
                       className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                          cart.includes(product.id) 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-900 text-white hover:bg-indigo-600 shadow-md'
                       }`}
                     >
                        {cart.includes(product.id) ? (
                           <><CheckCircle className="w-3.5 h-3.5" /> Added</>
                        ) : (
                           <><ShoppingBag className="w-3.5 h-3.5" /> Add to Inquiry</>
                        )}
                     </button>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Floating Add Product Button (Allowed Users Only) */}
      {canManageCatalog && (
        <button
            onClick={openAddModal}
            className="fixed bottom-24 right-6 z-40 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-all hover:scale-110 active:scale-95 flex items-center justify-center group"
            title="Add Product"
        >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
        </button>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-12">
         <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-black tracking-tight mb-2">DEPEND SOURCING LTD.</h2>
            <p className="text-gray-400 text-sm mb-6">Your Trusted Partner in Garment Raw Materials</p>
            <div className="flex justify-center gap-6 text-sm font-bold text-gray-300">
               <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> +880 1764-700203</span>
               <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> www.dependsourcing.com</span>
            </div>
            <p className="text-gray-600 text-xs mt-8">© 2015 Depend Sourcing. All rights reserved.</p>
         </div>
      </footer>

      {/* Inquiry Modal */}
      {isOrderModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               {orderSuccess ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                     <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-bounce">
                        <CheckCircle className="w-10 h-10" />
                     </div>
                     <h3 className="text-2xl font-black text-gray-800 mb-2">Inquiry Sent!</h3>
                     <p className="text-gray-500 mb-8">Thank you for your interest. Our marketing team will contact you shortly with a quotation.</p>
                     <button onClick={() => { setIsOrderModalOpen(false); setOrderSuccess(false); }} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black">
                        Close
                     </button>
                  </div>
               ) : (
                  <>
                     <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-lg text-gray-800">Request Quotation</h3>
                        <button onClick={() => setIsOrderModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5"/></button>
                     </div>
                     <div className="p-6 overflow-y-auto">
                        <div className="mb-6">
                           <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Selected Materials ({cart.length})</h4>
                           <div className="space-y-2">
                              {cart.map(id => {
                                 const p = products.find(prod => prod.id === id);
                                 return p ? (
                                    <div key={id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                       <div className="flex items-center gap-3">
                                          {p.image && <img src={p.image} className="w-10 h-10 rounded-md object-cover" />}
                                          <div>
                                             <p className="text-sm font-bold text-gray-700 line-clamp-1">{p.name}</p>
                                             <p className="text-[10px] text-gray-500">MOQ: {p.moq}</p>
                                          </div>
                                       </div>
                                       <button onClick={() => removeFromCart(id)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                                    </div>
                                 ) : null;
                              })}
                           </div>
                        </div>

                        <form onSubmit={handlePlaceOrder} className="space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Your Name</label>
                                 <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" placeholder="Full Name" />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company</label>
                                 <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" placeholder="Company Name" />
                              </div>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email / Phone</label>
                              <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" placeholder="Contact Details" />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Requirements (Quantity/Specs)</label>
                              <textarea className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" rows={3} placeholder="E.g., I need 2000kg of Cotton Yarn..."></textarea>
                           </div>
                           <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all mt-4">
                              Send Inquiry Now
                           </button>
                        </form>
                     </div>
                  </>
               )}
            </div>
         </div>
      )}

      {/* ADMIN ADD/EDIT PRODUCT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white shrink-0">
                    <h3 className="font-bold text-xl">{editingProduct ? 'পণ্য এডিট করুন' : 'নতুন পণ্য যুক্ত করুন'}</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-indigo-200 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSaveProduct} className="space-y-4">
                        {/* Image Upload */}
                        <div className="flex flex-col items-center mb-4">
                            <div 
                                onClick={() => fileInputRef.current?.click()} 
                                className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition-all overflow-hidden relative group"
                            >
                                {productForm.image ? (
                                    <>
                                        <img src={productForm.image} className="w-full h-full object-cover" alt="Product" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <Camera className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-xs font-bold">পণ্যের ছবি আপলোড করুন</p>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">পণ্যের নাম</label>
                                <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} placeholder="নাম লিখুন" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ক্যাটাগরি</label>
                                <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" value={productForm.category} onChange={(e) => setProductForm({...productForm, category: e.target.value})} placeholder="Yarn, Fabric..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">দামের রেঞ্জ</label>
                                <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" value={productForm.priceRange} onChange={(e) => setProductForm({...productForm, priceRange: e.target.value})} placeholder="$3.00 - $5.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">MOQ</label>
                                <input required type="text" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" value={productForm.moq} onChange={(e) => setProductForm({...productForm, moq: e.target.value})} placeholder="500 kg" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">বিবরণ</label>
                            <textarea rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} placeholder="পণ্যের বিস্তারিত..." />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tags (Comma separated)</label>
                            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
                                <Tag className="w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    className="w-full outline-none text-sm font-medium" 
                                    placeholder="Cotton, Export, Premium..." 
                                    value={productForm.tags?.join(', ')} 
                                    onChange={(e) => setProductForm({...productForm, tags: e.target.value.split(',').map(t => t.trim())})} 
                                />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-all flex items-center justify-center gap-2">
                            <Save className="w-5 h-5" />
                            {editingProduct ? 'আপডেট করুন' : 'সেভ করুন'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmProductId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-sm text-gray-500 mb-6">
                আপনি এই পণ্যটি ক্যাটালগ থেকে মুছে ফেলতে যাচ্ছেন। এটি আর ফিরিয়ে আনা যাবে না।
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmProductId(null)}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  না, বাতিল করুন
                </button>
                <button 
                  onClick={confirmDeleteProduct}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                >
                  হ্যাঁ, ডিলিট করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductCatalogView;