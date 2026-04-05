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
      const updatedList = phoneBook.map(p => 
        p.id === editingEntry.id ? { ...p, ...formData } as PhoneBookEntry : p
      );
      setPhoneBook(updatedList);
    } else {
      const newEntry: PhoneBookEntry = {
        ...formData as PhoneBookEntry,
        id: Math.random().toString(36).substr(2, 9),
        isDeleted: false
      };
      setPhoneBook([newEntry, ...phoneBook]);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Phone className="w-6 h-6 text-indigo-600" />
            ফোন বুক (Phone Book)
          </h2>
          <p className="text-sm text-gray-500 font-medium ml-8">সকল কোম্পানি ও সাপ্লায়ার নাম্বার</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => openModal()}
            className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> নতুন কন্টাক্ট
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="কোম্পানি, নাম বা নাম্বার দিয়ে খুঁজুন..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${selectedCategory === 'ALL' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
          >
            সব (All)
          </button>
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.length > 0 ? (
          filteredContacts.map(contact => (
            <div key={contact.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${
                contact.category === 'CLIENT' ? 'bg-blue-500' : 
                contact.category === 'SUPPLIER' ? 'bg-orange-500' : 
                contact.category === 'PARTNER' ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              
              <div className="flex justify-between items-start mb-3 pl-3">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                    contact.category === 'CLIENT' ? 'bg-blue-50 text-blue-600' : 
                    contact.category === 'SUPPLIER' ? 'bg-orange-50 text-orange-600' : 
                    contact.category === 'PARTNER' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {contact.category}
                  </span>
                  <h3 className="text-lg font-black text-gray-800 mt-2 leading-tight">{contact.companyName}</h3>
                  <p className="text-xs font-bold text-gray-500 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" /> {contact.contactPerson}
                  </p>
                </div>
                {(role === UserRole.ADMIN || role === UserRole.MD) && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(contact)} className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(contact.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>

              <div className="space-y-2 pl-3 mt-4 border-t border-gray-50 pt-3">
                <a href={`tel:${contact.mobile}`} className="flex items-center gap-3 text-sm font-bold text-gray-700 hover:text-indigo-600 transition-colors bg-gray-50 p-2 rounded-lg group/phone">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover/phone:scale-110 transition-transform">
                    <Phone className="w-4 h-4 text-indigo-600" />
                  </div>
                  {contact.mobile}
                </a>
                
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors p-1">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {contact.email}
                  </a>
                )}
                
                {contact.address && (
                  <div className="flex items-start gap-3 text-xs font-medium text-gray-500 p-1">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    {contact.address}
                  </div>
                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
                {editingEntry ? <Edit3 className="w-5 h-5 text-indigo-600" /> : <Plus className="w-5 h-5 text-indigo-600" />}
                {editingEntry ? 'কন্টাক্ট এডিট করুন' : 'নতুন কন্টাক্ট যুক্ত করুন'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">কোম্পানি নাম <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input required type="text" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" placeholder="Company Name" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">কন্টাক্ট পার্সন <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input required type="text" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" placeholder="Name" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">ক্যাটাগরি</label>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">মোবাইল <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input required type="tel" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" placeholder="017..." value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">ইমেইল (Optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" placeholder="example@mail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">ঠিকানা (Address)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm resize-none h-20" placeholder="Full Address..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all">বাতিল</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2">
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
