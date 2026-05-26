export type StreamStatus = "Pending" | "Active" | "Completed" | "Cancelled";

const styles: Record<StreamStatus, string> = {
  Active: "bg-primary/15 text-primary",
  Pending: "bg-secondary text-muted-foreground",
  Completed: "bg-[#e9f8ec] text-[#187640]",
  Cancelled: "bg-muted text-muted-foreground",
};

export function StatusPill({ status }: { status: StreamStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
