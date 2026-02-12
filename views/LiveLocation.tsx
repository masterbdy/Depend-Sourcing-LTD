import React from 'react';
import { Map, Navigation, Battery, SignalHigh, ExternalLink, Clock, Laptop } from 'lucide-react';
import { Staff, StaffLocation, UserRole } from '../types';

interface LiveLocationProps {
  staffList: Staff[];
  liveLocations: Record<string, StaffLocation>;
}

const LiveLocationView: React.FC<LiveLocationProps> = ({ staffList = [], liveLocations }) => {
  const activeStaff = (staffList || []).filter(s => s.status === 'ACTIVE' && !s.deletedAt && s.role === UserRole.STAFF);

  const getStatus = (lastSeen: string) => {
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 2) return { status: 'ONLINE', color: 'bg-green-500', text: 'text-green-600', label: 'Active Now' };
    if (minutes < 15) return { status: 'IDLE', color: 'bg-orange-500', text: 'text-orange-600', label: `${minutes}m ago` };
    return { status: 'OFFLINE', color: 'bg-gray-400', text: 'text-gray-500', label: `${minutes > 60 ? Math.floor(minutes/60)+'h' : minutes+'m'} ago` };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <Map className="w-6 h-6 text-indigo-600" />
            লাইভ স্টাফ ট্র্যাকিং
          </h2>
          <p className="text-sm text-gray-500 mt-1">কর্মরত স্টাফদের বর্তমান অবস্থান দেখুন (Real-time)</p>
        </div>
        <div className="flex gap-4 text-xs font-bold text-gray-500">
           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div> Online</div>
           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> Idle</div>
           <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div> Offline</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeStaff.map(staff => {
          const location = liveLocations[staff.id];
          const hasLocation = !!location;
          const { color, text, label } = hasLocation ? getStatus(location.timestamp) : { color: 'bg-gray-300', text: 'text-gray-400', label: 'No Data' };

          return (
            <div key={staff.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {staff.photo ? (
                        <img src={staff.photo} alt={staff.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {staff.name.charAt(0)}
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${color}`}></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{staff.name}</h3>
                      <p className="text-xs text-gray-500 font-medium">{staff.designation}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full bg-gray-50 ${text}`}>
                    {label}
                  </span>
                </div>

                {hasLocation ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                       <div className="flex items-center gap-1"><Navigation className="w-3 h-3" /> Lat: {location.lat.toFixed(4)}</div>
                       <div className="flex items-center gap-1"><Navigation className="w-3 h-3" /> Lng: {location.lng.toFixed(4)}</div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                       <div className="flex gap-3">
                          {location.batteryLevel !== undefined && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400" title="Battery Level">
                               <Battery className={`w-3 h-3 ${location.batteryLevel < 0.2 ? 'text-red-500' : 'text-green-500'}`} />
                               {Math.round(location.batteryLevel * 100)}%
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400" title="Speed">
                             <SignalHigh className="w-3 h-3 text-indigo-400" />
                             {location.speed ? (location.speed * 3.6).toFixed(1) : 0} km/h
                          </div>
                       </div>
                       <p className="text-[9px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(location.timestamp).toLocaleTimeString('bn-BD')}
                       </p>
                    </div>

                    {location.deviceName && (
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-indigo-500 font-bold bg-indigo-50 py-1 rounded-lg">
                            <Laptop className="w-3 h-3" /> {location.deviceName}
                        </div>
                    )}

                    <a 
                      href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                    >
                      <ExternalLink className="w-3 h-3" />
                      ম্যাপে দেখুন (Google Map)
                    </a>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-xs text-gray-400 font-medium">লোকেশন ডাটা পাওয়া যায়নি</p>
                    <p className="text-[10px] text-red-300 mt-1">অ্যাপ বা ব্রাউজার ওপেন নেই</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {activeStaff.length === 0 && (
           <div className="col-span-full py-20 text-center text-gray-400">
              কোনো স্টাফ একটিভ নেই
           </div>
        )}
      </div>
    </div>
  );
};

export default LiveLocationView;