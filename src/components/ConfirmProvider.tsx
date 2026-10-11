import React, { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface PendingState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const finish = useCallback(
    (value: boolean) => {
      if (!pending) return;
      pending.resolve(value);
      setPending(null);
    },
    [pending],
  );

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {pending && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-sm pv-fade-in"
          onClick={() => finish(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-purpleDark/70 bg-indigoDeep shadow-soft pv-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    pending.danger
                      ? "bg-coral/15 text-coral border border-coral/40"
                      : "bg-peach/15 text-peach border border-peach/40"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0 pt-1">
                  <h3 className="font-serif text-lg text-textPrimary mb-1">
                    {pending.title}
                  </h3>
                  {pending.message && (
                    <p className="text-sm text-textSecondary leading-relaxed">
                      {pending.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => finish(false)}
                  className="px-4 py-2 rounded-lg text-sm text-textSecondary hover:text-textPrimary hover:bg-purpleDark/50 transition-colors"
                >
                  {pending.cancelText ?? "Cancel"}
                </button>
                <button
                  onClick={() => finish(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pending.danger
                      ? "bg-coral text-midnight hover:bg-peach"
                      : "bg-peach text-midnight hover:bg-coral"
                  }`}
                >
                  {pending.confirmText ?? "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx.confirm;
}
