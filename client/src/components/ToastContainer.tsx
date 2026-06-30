import { useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Context para gerenciar toasts globalmente
let toastListeners: ((toast: Toast) => void)[] = [];

export const showToast = (message: string, type: ToastType = 'info', duration = 4000) => {
  const id = Math.random().toString(36).substr(2, 9);
  const toast: Toast = { id, message, type, duration };
  
  toastListeners.forEach(listener => listener(toast));
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
};

export const removeToast = (id: string) => {
  toastListeners.forEach(listener => listener({ id, message: '', type: 'info', duration: 0 }));
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    if (toast.message) {
      setToasts(prev => [...prev, toast]);
    } else {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }
  }, []);

  // Registrar listener
  useState(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter(l => l !== addToast);
    };
  });

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/20 border-green-700/50';
      case 'error':
        return 'bg-red-900/20 border-red-700/50';
      case 'info':
        return 'bg-blue-900/20 border-blue-700/50';
    }
  };

  return (
    <div className="fixed bottom-32 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-lg border backdrop-blur-sm ${getBgColor(toast.type)} animate-in fade-in slide-in-from-right-4 duration-300`}
        >
          {getIcon(toast.type)}
          <p className="text-sm text-slate-200 flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
