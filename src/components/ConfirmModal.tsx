import React from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'primary'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle className="text-red-500" size={24} />,
          button: 'bg-red-600 hover:bg-red-700 text-white border-red-700',
          accentBorder: 'border-t-2 border-t-red-600'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="text-amber-500" size={24} />,
          button: 'bg-amber-500 hover:bg-amber-600 text-neutral-950 border-amber-600',
          accentBorder: 'border-t-2 border-t-amber-500'
        };
      case 'primary':
      default:
        return {
          icon: <AlertCircle className="text-[#FFCC00]" size={24} />,
          button: 'bg-[#FFCC00] hover:bg-[#E6B800] text-neutral-950 border-[#E6B800]',
          accentBorder: 'border-t-2 border-t-[#FFCC00]'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 id-confirm-modal-overlay bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div 
        id="confirm-modal-box"
        className={`bg-neutral-950 border border-neutral-800 w-full max-w-md p-6 rounded-sm shadow-2xl relative ${styles.accentBorder}`}
      >
        <button
          onClick={onClose}
          id="confirm-modal-close-btn"
          className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 mt-1">
          <div className="p-2 bg-neutral-900 border border-neutral-800 rounded-sm shrink-0">
            {styles.icon}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
              {title}
            </h3>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-900">
          {cancelText && (
            <button
              onClick={onClose}
              id="confirm-modal-cancel-btn"
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-foreground border border-neutral-800 text-xs font-mono font-bold uppercase tracking-wider rounded-sm transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            id="confirm-modal-confirm-btn"
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-sm border transition-all ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
