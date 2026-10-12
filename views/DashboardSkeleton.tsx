import React from "react";
import { UserRole } from "../types";

interface DashboardSkeletonProps {
  role?: UserRole | null;
  isDarkMode?: boolean;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  role,
  isDarkMode = false,
}) => {
  const isStaff = role === UserRole.STAFF;

  return (
    <div className="space-y-5 animate-pulse" aria-busy="true" aria-label="Loading dashboard...">
      {/* Skeleton Header Banner */}
      <div className="relative overflow-hidden rounded-2xl min-h-[180px] md:min-h-[220px] bg-slate-900/80 border border-slate-800 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 space-y-3 w-full">
          <div className="h-3 w-28 bg-slate-800 rounded-full"></div>
          <div className="h-9 w-64 md:w-80 bg-slate-800 rounded-xl"></div>
          <div className="h-4 w-44 bg-slate-800/80 rounded-md"></div>
        </div>
        <div className="w-48 h-14 bg-slate-800/60 rounded-xl border border-slate-700/50"></div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Stats Section */}
        <div className="lg:col-span-2 space-y-5">
          {/* Stat Cards Skeleton (6 for Admin/MD, 4 for Staff) */}
          <div className={`grid ${isStaff ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"} gap-3`}>
            {Array.from({ length: isStaff ? 4 : 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800/80 rounded-xl p-3 border-2 border-b-[5px] border-r-[5px] border-gray-100 dark:border-gray-800 shadow-sm space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-750"></div>
                  <div className="w-12 h-3 bg-gray-100 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="w-20 h-2.5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-28 h-6 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>

          {/* Activity Skeleton List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-b-[4px] border-r-[4px] border-gray-100 dark:border-gray-700 p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-3 w-16 bg-gray-100 dark:bg-gray-750 rounded"></div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-36 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-2.5 w-24 bg-gray-100 dark:bg-gray-800 rounded"></div>
                  </div>
                </div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-b-[4px] border-r-[4px] border-gray-100 dark:border-gray-700 p-4 space-y-3">
            <div className="h-5 w-32 mx-auto bg-gray-200 dark:bg-gray-700 rounded"></div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-750 rounded-lg">
                <div className="w-4 h-4 bg-gray-300 dark:bg-gray-650 rounded"></div>
                <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-650"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 bg-gray-300 dark:bg-gray-650 rounded"></div>
                  <div className="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-b-[4px] border-r-[4px] border-gray-100 dark:border-gray-700 text-center space-y-2">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto"></div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 mx-auto rounded"></div>
            <div className="h-3 w-36 bg-gray-100 dark:bg-gray-750 mx-auto rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ViewLoadingFallback: React.FC<{ title?: string }> = ({ title = "মডিউল লোড হচ্ছে..." }) => (
  <div className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center space-y-3">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-950 border-t-indigo-600 animate-spin"></div>
    </div>
    <p className="text-sm font-bold text-gray-600 dark:text-gray-300 tracking-wide">{title}</p>
    <p className="text-xs text-gray-400">অপেক্ষা করুন...</p>
  </div>
);
