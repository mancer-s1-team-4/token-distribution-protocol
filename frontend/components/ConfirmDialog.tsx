"use client";

import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  confirmTone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  confirmTone = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) onCancel();
  }

  return (
    <dialog
      ref={ref}
      onClick={handleClick}
      onCancel={onCancel}
      className="m-auto max-w-md rounded-lg border border-border bg-card/95 p-0 shadow-lg backdrop:bg-foreground/35 backdrop:backdrop-blur-sm open:flex"
      style={{ flexDirection: "column" }}
    >
      <div className="p-5">
        <h2 className="font-display text-lg font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-9 rounded-md border border-border bg-card/70 px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Go back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`min-h-9 rounded-md px-4 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            confirmTone === "danger"
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/80"
              : "bg-primary text-primary-foreground hover:bg-primary/88"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
