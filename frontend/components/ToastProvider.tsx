"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Toast, type ToastItem, type ToastState } from "./Toast";

type ToastHandle = {
  update: (state: ToastState, message: string, opts?: { href?: string }) => void;
  dismiss: () => void;
};

type ToastContextValue = {
  toast: (
    state: ToastState,
    message: string,
    opts?: { href?: string; duration?: number }
  ) => ToastHandle;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const scheduleAutoDismiss = useCallback(
    (id: string, duration: number) => {
      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const toast = useCallback(
    (
      state: ToastState,
      message: string,
      opts?: { href?: string; duration?: number }
    ): ToastHandle => {
      const id = `${Date.now()}-${Math.random()}`;
      const item: ToastItem = { id, state, message, href: opts?.href };
      setToasts((prev) => [...prev, item]);

      if (state !== "loading") {
        scheduleAutoDismiss(id, opts?.duration ?? 5000);
      }

      return {
        update(newState, newMessage, newOpts) {
          setToasts((prev) =>
            prev.map((t) =>
              t.id === id
                ? { ...t, state: newState, message: newMessage, href: newOpts?.href }
                : t
            )
          );
          if (newState !== "loading") {
            scheduleAutoDismiss(id, 6000);
          }
        },
        dismiss() {
          dismiss(id);
        },
      };
    },
    [scheduleAutoDismiss, dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed right-4 top-4 z-50 flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
