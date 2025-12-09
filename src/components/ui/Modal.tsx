"use client";

import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "full";
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    full: "max-w-full h-full m-0 rounded-none",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative bg-white w-full ${size === "full" ? "h-full" : sizeClasses[size]} ${
          size === "full" ? "" : "rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        } animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-4 md:p-6 border-b border-slate-200 flex-shrink-0">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-lg md:text-xl font-semibold text-slate-900 truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs md:text-sm text-slate-500 mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex-shrink-0 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              aria-label="Zatvori"
            >
              <XMarkIcon className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        )}

        {/* Content - Scrollable */}
        <div
          className={`flex-1 overflow-y-auto ${
            size === "full" ? "p-4 md:p-6" : "p-4 md:p-6"
          }`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
