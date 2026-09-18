import React from 'react';

export interface ToastData {
  id: number;
  title: string;
  desc: string;
  icon: string;
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div
      onClick={onClose}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#081534] text-white px-5 py-3.5 rounded-xl shadow-2xl border border-white/10 cursor-pointer animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <span className="material-symbols-outlined text-[#fea619] text-[24px]">
        {toast.icon || 'check_circle'}
      </span>
      <div>
        <div className="font-bold text-xs sm:text-sm text-white">{toast.title}</div>
        <div className="text-[11px] text-[#bac5ee]">{toast.desc}</div>
      </div>
      <button className="text-white/60 hover:text-white ml-2">
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
};
