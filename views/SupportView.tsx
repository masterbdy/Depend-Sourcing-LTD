import React from "react";
import {
  Facebook,
  MessageCircle,
  Headphones,
  ExternalLink,
} from "lucide-react";

interface SupportViewProps {
  // Add props if needed, maybe dark mode flag or something
}

const SupportView: React.FC<SupportViewProps> = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl -mx-20 -my-20 opacity-50"></div>
        <div className="relative z-10 space-y-4">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Headphones className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-800 dark:text-white">
              সাপোর্ট সেন্টার
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
              যেকোনো প্রয়োজনে বা সমস্যায় আমাদের সাথে যোগাযোগ করুন
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* WhatsApp Card */}
        <a
          href="https://wa.me/8801307634973"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 flex flex-col items-center text-center hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-green-50 dark:bg-green-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100/50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <MessageCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              WhatsApp এ মেসেজ দিন
            </h3>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-600">
              01307634973
            </p>
            <span className="text-green-600 dark:text-green-400 font-bold text-sm flex items-center gap-1">
              মেসেজ করুন <ExternalLink className="w-4 h-4" />
            </span>
          </div>
        </a>

        {/* Facebook Card */}
        <a
          href="https://www.facebook.com/share/1Eg2XC5SFF/"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 flex flex-col items-center text-center hover:-translate-y-1 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100/50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
              <Facebook className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              Facebook পেইজ
            </h3>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 max-w-[200px] leading-relaxed">
              আমাদের ফেইসবুক পেইজে মেসেজ দিন অথবা আপডেট জানুন
            </p>
            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center gap-1">
              ভিজিট করুন <ExternalLink className="w-4 h-4" />
            </span>
          </div>
        </a>
      </div>
    </div>
  );
};

export default SupportView;
