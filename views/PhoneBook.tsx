import React, { useState, useMemo } from 'react';
import { Phone, Search, Plus, Trash2, Edit3, MapPin, Mail, Building2, User, Filter, X, Save } from 'lucide-react';
import { PhoneBookEntry, UserRole } from '../types';

interface PhoneBookProps {
  phoneBook: PhoneBookEntry[];
  setPhoneBook: (data: PhoneBookEntry[]) => void;
  role: UserRole;
}

const PhoneBook: React.FC<PhoneBookProps> = ({ phoneBook, setPhoneBook, role }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PhoneBookEntry | null>(null);
  const [formData, setFormData] = useState<Partial<PhoneBookEntry>>({
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    address: '',
    note: '',
    category: 'CLIENT'
  });

  const categories = ['CLIENT', 'SUPPLIER', 'PARTNER', 'OTHER'];

  const filteredContacts = useMemo(() => {
    return phoneBook.filter(contact => {
      if (contact.isDeleted || contact.isHardDeleted) return false;
      const matchesSearch = 
        contact.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.mobile.includes(searchTerm);
      const matchesCategory = selectedCategory === 'ALL' || contact.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [phoneBook, searchTerm, selectedCategory]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingEntry) {
      setPhoneBook(prev => prev.map(p => 
        p.id === editingEntry.id ? { ...p, ...formData } as PhoneBookEntry : p
      ));
    } else {
      const newEntry: PhoneBookEntry = {
        ...formData as PhoneBookEntry,
        id: Math.random().toString(36).substr(2, 9),
        isDeleted: false
      };
      setPhoneBook(prev => [newEntry, ...prev]);
    }
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      const updatedList = phoneBook.map(p => 
        p.id === id ? { ...p, isHardDeleted: true } : p
      );
      setPhoneBook(updatedList);
    }
  };

  const openModal = (entry?: PhoneBookEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData(entry);
    } else {
      setEditingEntry(null);
      setFormData({
        companyName: '',
        contactPerson: '',
        mobile: '',
        email: '',
        address: '',
        note: '',
        category: 'CLIENT'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-500 opacity-20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
                <Phone className="w-6 h-6 text-indigo-100" />
              </div>
              ফোন বুক <span className="text-indigo-300/80 font-medium hidden sm:inline">| <span className="text-xl">Directory</span></span>
            </h2>
            <p className="text-indigo-200/90 text-sm font-medium sm:ml-16 ml-2">সকল কোম্পানি ও সাপ্লায়ার নাম্বার</p>
          </div>
          
          <button 
            onClick={() => openModal()}
            className="w-full md:w-auto bg-white text-indigo-900 px-6 py-3.5 rounded-xl font-bold hover:bg-indigo-50 hover:scale-[1.02] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> নতুন কন্টাক্ট
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-100 dark:border-gray-600">
            <Search className="text-gray-400 dark:text-gray-300 w-4 h-4" />
          </div>
          <input 
            type="text" 
            placeholder="কোম্পানি, নাম বা নাম্বার দিয়ে খুঁজুন..." 
            className="w-full pl-14 pr-4 py-3 rounded-xl border border-transparent bg-gray-50 dark:bg-gray-700 hover:bg-gray-100/50 dark:hover:bg-gray-600 focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-100 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-900/50 outline-none font-medium text-gray-700 dark:text-gray-200 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 p-1 overflow-x-auto scrollbar-hide shrink-0 items-center">
          <button 
            onClick={() => setSelectedCategory('ALL')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${selectedCategory === 'ALL' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-gray-800' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 hover:border-gray-200 dark:hover:border-gray-500'}`}
          >
            সব (All)
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all duration-300 ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50 ring-2 ring-indigo-600 ring-offset-2 dark:ring-offset-gray-800' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-100 dark:border-gray-600 hover:border-gray-200 dark:hover:border-gray-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.length > 0 ? (
          filteredContacts.map(contact => (
            <div key={contact.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl dark:shadow-none hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-gray-700 group overflow-hidden relative flex flex-col">
              {/* Top decorative gradient line */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${
                contact.category === 'CLIENT' ? 'from-blue-400 to-blue-600' :
                contact.category === 'SUPPLIER' ? 'from-orange-400 to-orange-600' :
                contact.category === 'PARTNER' ? 'from-emerald-400 to-emerald-600' : 'from-gray-400 to-gray-600'
              }`} />
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex gap-4 items-center flex-1 pr-2">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white bg-gradient-to-br shadow-sm shrink-0 ${
                       contact.category === 'CLIENT' ? 'from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800' :
                       contact.category === 'SUPPLIER' ? 'from-orange-500 to-orange-700 dark:from-orange-600 dark:to-orange-800' :
                       contact.category === 'PARTNER' ? 'from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-800' : 'from-gray-500 to-gray-700 dark:from-gray-600 dark:to-gray-800'
                    }`}>
                      {contact.companyName.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="min-w-0">
                       <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight truncate">{contact.companyName}</h3>
                       <div className="mt-1">
                         <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                           contact.category === 'CLIENT' ? 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 
                           contact.category === 'SUPPLIER' ? 'bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' : 
                           contact.category === 'PARTNER' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-gray-50 text-gray-700 border border-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                         }`}>
                           {contact.category}
                         </span>
                       </div>
                    </div>
                  </div>
                  
                  {(role === UserRole.ADMIN || role === UserRole.MD) && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 shrink-0">
                      <button onClick={() => openModal(contact)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(contact.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50/80 dark:bg-gray-700/50 rounded-xl p-4 space-y-3.5 flex-1 border border-gray-100/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{contact.contactPerson}</p>
                  </div>
                  
                  <a href={`tel:${contact.mobile}`} className="flex items-center gap-3 group/phone">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 group-hover/phone:bg-indigo-600 group-hover/phone:shadow-md transition-all duration-300">
                      <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover/phone:text-white transition-colors" />
                    </div>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover/phone:text-indigo-600 dark:group-hover/phone:text-indigo-400 transition-colors">{contact.mobile}</p>
                  </a>

                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-3 group/email">
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-center shrink-0 group-hover/email:bg-gray-100 dark:group-hover/email:bg-gray-700 transition-colors">
                        <Mail className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover/email:text-indigo-600 dark:group-hover/email:text-indigo-400 truncate transition-colors">{contact.email}</p>
                    </a>
                  )}

                  {contact.address && (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed pt-1.5">{contact.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold">কোনো কন্টাক্ট পাওয়া যায়নি</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 dark:border-gray-700">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
              <h3 className="font-black text-xl text-gray-800 dark:text-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  {editingEntry ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                {editingEntry ? 'কন্টাক্ট এডিট করুন' : 'নতুন কন্টাক্ট'}
              </h3>
              <button onClick={closeModal} className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700 rounded-xl transition-colors group">
                <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5 bg-gray-50/30 dark:bg-gray-800/50">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider pl-1">কোম্পানি নাম <span className="text-red-500">*</span></label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                  <input required type="text" className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-900/50 outline-none font-bold text-sm transition-all shadow-sm" placeholder="Company Name" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider pl-1">কন্টাক্ট পার্সন <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                    <input required type="text" className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-900/50 outline-none font-bold text-sm transition-all shadow-sm" placeholder="Name" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider pl-1">ক্যাটাগরি</label>
                  <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                    <select className="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-900/50 outline-none font-bold text-sm appearance-none transition-all shadow-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider pl-1">মোবাইল <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                    <input required type="tel" className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-900/50 outline-none font-bold text-sm transition-all shadow-sm" placeholder="017..." value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider pl-1">ইমেইল <span className="text-gray-400 normal-case">(Optional)</span></label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                    <input type="email" className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-900/50 outline-none font-bold text-sm transition-all shadow-sm" placeholder="example@mail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider pl-1">ঠিকানা <span className="text-gray-400 normal-case">(Address)</span></label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-3.5 w-4.5 h-4.5 text-gray-400 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                  <textarea className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 dark:focus:ring-indigo-900/50 outline-none font-medium text-sm resize-none h-24 transition-all shadow-sm leading-relaxed" placeholder="Full Address..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3.5 border border-indigo-100 dark:border-gray-600 text-indigo-900 dark:text-gray-300 bg-indigo-50/50 dark:bg-gray-700 font-bold rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-600 transition-all">বাতিল</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneBook;
