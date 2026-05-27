export type StreamStatus = "Pending" | "Active" | "Completed" | "Cancelled";

const styles: Record<StreamStatus, string> = {
  Active: "border-primary/25 bg-primary/12 text-primary",
  Pending: "border-border bg-secondary/80 text-muted-foreground",
  Completed: "border-brand-emerald/30 bg-brand-emerald/16 text-foreground",
  Cancelled: "border-border bg-muted text-muted-foreground",
};

export function StatusPill({ status }: { status: StreamStatus }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
