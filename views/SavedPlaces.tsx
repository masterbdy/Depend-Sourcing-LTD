import React, { useState, useEffect } from "react";
import { UserRole, SavedLocation } from "../types";
import { getApp } from "firebase/app";
import { getDatabase, ref, push, set, update } from "firebase/database";
import { motion, AnimatePresence } from "motion/react";
import {
  MapPin,
  Plus,
  Search,
  Navigation,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Map as MapIcon,
  Crosshair
} from "lucide-react";

interface SavedPlacesProps {
  currentUser: string;
  role: UserRole;
  firebaseConfig: any;
  isCloudEnabled: boolean;
  savedLocations: SavedLocation[];
  setSavedLocations: (val: any) => void;
}

export default function SavedPlaces({
  currentUser,
  role,
  firebaseConfig,
  isCloudEnabled,
  savedLocations,
  setSavedLocations,
}: SavedPlacesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    notes: "",
    transportInfo: ""
  });
  const [editingPlace, setEditingPlace] = useState<SavedLocation | null>(null);

  const isAdmin = role === UserRole.ADMIN || role === UserRole.MD;

  const getLocation = () => {
    setIsLocating(true);
    setLocationError("");
    if ("geolocation" in navigator) {
      const getPos = (highAcc: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setIsLocating(false);
          },
          (error) => {
            console.error("Location error:", error.code, error.message);
            if (highAcc && error.code === 3) {
              // Timeout on high accuracy, try low accuracy
              getPos(false);
            } else {
              let msg = "লোকেশন পাওয়া যায়নি।";
              if (error.code === 1) msg = "লোকেশন পারমিশন দেওয়া হয়নি। ব্রাউজার থেকে পারমিশন দিন।";
              if (error.code === 2) msg = "জিপিএস সিগন্যাল পাওয়া যাচ্ছে না।";
              if (error.code === 3) msg = "লোকেশন পেতে অনেক সময় লাগছে।";
              
              setLocationError(msg);
              setIsLocating(false);
            }
          },
          { enableHighAccuracy: highAcc, timeout: 15000, maximumAge: 10000 }
        );
      };
      getPos(true);
    } else {
      setLocationError("আপনার ডিভাইসে জিপিএস সাপোর্ট করে না।");
      setIsLocating(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) {
      alert("কোম্পানির নাম দিতে হবে।");
      return;
    }
    if (!currentLocation) {
      alert("আগে লোকেশন সংগ্রহ করুন।");
      return;
    }

    try {
      const newPlace = {
        id: "loc_" + Date.now().toString(),
        companyName: formData.companyName,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        address: formData.address,
        notes: formData.notes,
        transportInfo: formData.transportInfo,
        addedBy: currentUser,
        addedAt: new Date().toISOString(),
      };

      setSavedLocations([...savedLocations, newPlace]);
      setIsAddModalOpen(false);
      setFormData({ companyName: "", address: "", notes: "", transportInfo: "" });
      setCurrentLocation(null);
    } catch (err) {
      console.error(err);
      alert("সেভ করতে সমস্যা হয়েছে!");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlace) return;

    try {
      const updated = savedLocations.map(p => {
        if (p.id === editingPlace.id) {
          return {
            ...p,
            companyName: editingPlace.companyName,
            address: editingPlace.address || "",
            notes: editingPlace.notes || "",
            transportInfo: editingPlace.transportInfo || ""
          };
        }
        return p;
      });
      
      setSavedLocations(updated);
      setIsEditModalOpen(false);
      setEditingPlace(null);
    } catch (err) {
      console.error(err);
      alert("আপডেট করতে সমস্যা হয়েছে!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      const updated = savedLocations.map(p => 
        p.id === id ? { ...p, isDeleted: true } : p
      );
      setSavedLocations(updated);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
  };

  const filteredPlaces = savedLocations
    .filter(p => !p.isDeleted)
    .filter(p => p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MapPin className="text-emerald-500" />
            সেভড লোকেশন
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            নতুন জায়গায় গেলে লোকেশন সেভ করে রাখুন
          </p>
        </div>
        <button
          onClick={() => {
            setIsAddModalOpen(true);
            getLocation();
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
        >
          <Plus className="w-5 h-5" />
          লোকেশন সেভ করুন
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="কোম্পানির নাম দিয়ে খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-shadow"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlaces.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <MapIcon className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p>কোনো লোকেশন পাওয়া যায়নি</p>
          </div>
        ) : (
          filteredPlaces.map((place) => (
            <motion.div
              key={place.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg text-slate-800 dark:text-white pr-4">
                  {place.companyName}
                </h3>
                {isAdmin && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingPlace(place);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(place.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              {place.address && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2 flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                  {place.address}
                </p>
              )}
              
              {place.transportInfo && (
                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-400 mb-1">যাতায়াতের উপায় / নোট:</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{place.transportInfo}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  সেভ করেছেন: <span className="font-medium">{place.addedBy}</span>
                  <br />
                  {new Date(place.addedAt).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <button
                  onClick={() => openInGoogleMaps(place.lat, place.lng)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-sm font-medium transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  ম্যাপে দেখুন
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                  <MapPin className="text-emerald-500 w-5 h-5" />
                  নতুন লোকেশন সেভ করুন
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
                {/* GPS Status */}
                <div className={`p-3 rounded-xl flex items-center gap-3 border ${currentLocation ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                  {isLocating ? (
                    <div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full" />
                  ) : currentLocation ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  )}
                  <div className="flex-1 text-sm">
                    {isLocating ? (
                      <span className="text-amber-700 dark:text-amber-400">লোকেশন খোঁজা হচ্ছে...</span>
                    ) : currentLocation ? (
                      <span className="text-emerald-700 dark:text-emerald-400">বর্তমান লোকেশন লক করা হয়েছে!</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">{locationError || "লোকেশন পাওয়া যায়নি"}</span>
                    )}
                  </div>
                  {!currentLocation && !isLocating && (
                    <button type="button" onClick={getLocation} className="p-1.5 bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/60">
                      <Crosshair className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">কোম্পানির নাম / জায়গার নাম <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="উদা: ABC Garments Ltd."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ঠিকানা (অপশনাল)</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="উদা: সেক্টর ৭, উত্তরা"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">অন্যান্য নোট</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    rows={2}
                    placeholder="কোম্পানির কোনো নির্দিষ্ট তথ্য..."
                  />
                </div>
                
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={!currentLocation || isLocating}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-sm"
                  >
                    সেভ করুন
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal (Admin Only) */}
      <AnimatePresence>
        {isEditModalOpen && editingPlace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                  <Edit2 className="text-blue-500 w-5 h-5" />
                  লোকেশন এডিট করুন
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">কোম্পানির নাম</label>
                  <input
                    type="text"
                    required
                    value={editingPlace.companyName}
                    onChange={(e) => setEditingPlace({...editingPlace, companyName: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ঠিকানা</label>
                  <input
                    type="text"
                    value={editingPlace.address || ""}
                    onChange={(e) => setEditingPlace({...editingPlace, address: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">যাতায়াতের উপায় / গাইডলাইন (অ্যাডমিন নোট)</label>
                  <textarea
                    value={editingPlace.transportInfo || ""}
                    onChange={(e) => setEditingPlace({...editingPlace, transportInfo: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    rows={4}
                    placeholder="উদা: মিরপুর ১০ থেকে বাসে করে..."
                  />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">এখানে লিখে দিন পরবর্তীতে কেউ গেলে কীভাবে যাবে।</p>
                </div>
                
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                  >
                    আপডেট করুন
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal (Admin Only) */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                এই লোকেশনটি ডিলিট করলে তা চিরতরে মুছে যাবে এবং কেউ এটি আর দেখতে পারবে না।
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                >
                  বাতিল
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  হ্যাঁ, ডিলিট করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
