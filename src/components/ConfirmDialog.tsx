import React from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: string;
  isAlert?: boolean; // When true, behaves like an explanatory modal (only 1 dismiss button)
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  icon,
  isAlert = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    if (icon) return icon;
    if (variant === 'danger') return 'warning';
    if (variant === 'warning') return 'help';
    return 'info';
  };

  const getColors = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-[#ffdad6]',
          iconColor: 'text-[#ba1a1a]',
          btnBg: 'bg-[#ba1a1a] hover:bg-[#93000a] text-white',
        };
      case 'warning':
        return {
          iconBg: 'bg-[#fff8e1]',
          iconColor: 'text-[#855300]',
          btnBg: 'bg-[#fea619] hover:bg-[#e09112] text-[#2a1700]',
        };
      case 'primary':
      default:
        return {
          iconBg: 'bg-[#dae2ff]',
          iconColor: 'text-[#081534]',
          btnBg: 'bg-[var(--theme-color,#081534)] text-white hover:opacity-90',
        };
    }
  };

  const colors = getColors();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#e0e3e5] space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${colors.iconBg} ${colors.iconColor}`}
          >
            <span className="material-symbols-outlined text-[24px]">{getIcon()}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-extrabold text-[#191c1e] leading-snug">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-[#45464e] mt-1.5 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#e0e3e5]/60">
          {!isAlert && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-[#e0e3e5] text-xs sm:text-sm font-bold text-[#45464e] hover:bg-[#f2f4f6] active:scale-95 transition-all cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all cursor-pointer ${colors.btnBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
