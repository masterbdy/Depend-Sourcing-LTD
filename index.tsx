
import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';

// Global intervention: QuotaExceededError recovery
try {
  let totalSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k) {
      totalSize += (localStorage.getItem(k) || "").length;
    }
  }
  // Clear heavy items aggressively if we are over 2MB, to ensure Firebase has room
  if (totalSize > 2 * 1024 * 1024) {
    console.warn(`[Intervention] LocalStorage is ${Math.round(totalSize / 1024 / 1024)}MB. Clearing non-critical heavy items to prevent QuotaExceededError.`);
    const criticalKeys = [
      "auth_token",
      "user_role",
      "current_user",
      "offline_sync_queue",
      "offline_sync_queue_simple",
      "saved_accounts",
      "app_theme",
      "app_permissions_granted",
      "hasSeenWelcome",
      "company_logo",
      "app_settings"
    ];
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !criticalKeys.includes(k) && !k.startsWith("firebase:")) {
        toRemove.push(k);
      }
    }
    for (const k of toRemove) {
      localStorage.removeItem(k);
    }
  }
} catch (e) {
  console.error("Failed to clear local storage", e);
}

import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30 max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-500 mb-2">Something went wrong</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">অ্যাপটি ক্র্যাশ করেছে। দয়া করে রিলোড দিন।</p>
            <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs font-mono text-left mb-6 overflow-auto max-h-32 text-red-800 dark:text-red-400 border border-gray-200 dark:border-gray-700">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 w-full transition-all active:scale-95 shadow-lg"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
