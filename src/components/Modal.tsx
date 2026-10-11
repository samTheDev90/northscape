import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg";
}

export default function Modal({
  open,
  title,
  onClose,
  children,
  width = "md",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW =
    width === "sm" ? "max-w-md" : width === "lg" ? "max-w-3xl" : "max-w-xl";

  const content = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-midnight/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxW} flex flex-col rounded-2xl border border-purpleDark/70 bg-indigoDeep shadow-soft`}
        style={{ maxHeight: "calc(100dvh - 2rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-purpleDark/60 shrink-0 rounded-t-2xl">
          <h2 className="font-serif text-lg md:text-xl text-textPrimary truncate">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-purpleDark/60 text-textSecondary shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto p-5 flex-1 min-h-0 rounded-b-2xl"
          style={{ overscrollBehavior: "contain" }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  // Render into <body>, escaping any transformed ancestors.
  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}
