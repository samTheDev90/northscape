import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from "lucide-react";

type ToastKind = "success" | "error" | "info" | "warning";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  title?: string;
  duration: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (
    message: string,
    opts?: {
      kind?: ToastKind;
      title?: string;
      duration?: number;
      action?: ToastAction;
    },
  ) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  withUndo: (params: {
    message: string;
    title?: string;
    onUndo: () => void;
  }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const KIND_META: Record<
  ToastKind,
  { icon: typeof CheckCircle2; border: string; bg: string; text: string }
> = {
  success: {
    icon: CheckCircle2,
    border: "border-forest/50",
    bg: "bg-forest/10",
    text: "text-forest",
  },
  error: {
    icon: XCircle,
    border: "border-coral/50",
    bg: "bg-coral/10",
    text: "text-coral",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-gold/50",
    bg: "bg-gold/10",
    text: "text-gold",
  },
  info: {
    icon: Info,
    border: "border-peach/50",
    bg: "bg-peach/10",
    text: "text-peach",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (
      message: string,
      opts?: {
        kind?: ToastKind;
        title?: string;
        duration?: number;
        action?: ToastAction;
      },
    ) => {
      const id = uid();
      const item: ToastItem = {
        id,
        kind: opts?.kind ?? "info",
        message,
        title: opts?.title,
        duration: opts?.duration ?? 3500,
        action: opts?.action,
      };
      setItems((prev) => [...prev, item]);
      window.setTimeout(() => remove(id), item.duration);
    },
    [remove],
  );

  const success = useCallback(
    (message: string, title?: string) =>
      toast(message, { kind: "success", title }),
    [toast],
  );
  const error = useCallback(
    (message: string, title?: string) =>
      toast(message, { kind: "error", title }),
    [toast],
  );
  const info = useCallback(
    (message: string, title?: string) =>
      toast(message, { kind: "info", title }),
    [toast],
  );
  const warning = useCallback(
    (message: string, title?: string) =>
      toast(message, { kind: "warning", title }),
    [toast],
  );

  const withUndo = useCallback(
    ({
      message,
      title,
      onUndo,
    }: {
      message: string;
      title?: string;
      onUndo: () => void;
    }) => {
      const id = uid();
      const item: ToastItem = {
        id,
        kind: "warning",
        message,
        title: title ?? "Action completed",
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            onUndo();
            remove(id);
          },
        },
      };
      setItems((prev) => [...prev, item]);
      window.setTimeout(() => remove(id), item.duration);
    },
    [remove],
  );

  const value: ToastContextValue = {
    toast,
    success,
    error,
    info,
    warning,
    withUndo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
        {items.map((t) => {
          const meta = KIND_META[t.kind];
          const Icon = meta.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-xl border ${meta.border} ${meta.bg} backdrop-blur-md bg-indigoDeep/95 px-4 py-3 shadow-soft pv-toast-enter flex items-start gap-3`}
            >
              <Icon className={`w-5 h-5 ${meta.text} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                {t.title && (
                  <p className="text-sm text-textPrimary font-medium mb-0.5">
                    {t.title}
                  </p>
                )}
                <p className="text-xs text-textSecondary leading-relaxed">
                  {t.message}
                </p>
                {t.action && (
                  <button
                    onClick={t.action.onClick}
                    className={`mt-2 text-xs font-medium ${meta.text} hover:underline`}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                className="p-1 rounded hover:bg-purpleDark/60 text-textSecondary shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
