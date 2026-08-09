"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "loading";

export type ToastInput = {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  loading: Loader2,
} satisfies Record<ToastType, typeof CheckCircle2>;

function createToastId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = "info", duration = 3600, ...toast }: ToastInput) => {
      const id = createToastId();
      const nextToast: ToastItem = {
        id,
        type,
        duration,
        ...toast,
      };

      setToasts((current) => [nextToast, ...current].slice(0, 4));

      if (type !== "loading" && duration > 0) {
        window.setTimeout(() => dismissToast(id), duration);
      }

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = toastIcons[toast.type];

          return (
            <div
              key={toast.id}
              className={cn(
                "rounded-md border bg-background p-4 shadow-lg",
                toast.type === "success" && "border-primary/30",
                toast.type === "error" && "border-destructive/35",
              )}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={cn(
                    "mt-0.5 size-5 shrink-0",
                    toast.type === "success" && "text-primary",
                    toast.type === "error" && "text-destructive",
                    toast.type === "info" && "text-muted-foreground",
                    toast.type === "loading" && "animate-spin text-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {toast.description}
                    </p>
                  ) : null}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0"
                  onClick={() => dismissToast(toast.id)}
                >
                  <X className="size-4" />
                  <span className="sr-only">关闭提示</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
