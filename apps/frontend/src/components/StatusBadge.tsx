import clsx from "clsx";
import type { EmailStatus } from "../types/email";

interface StatusBadgeProps {
  status: EmailStatus;
}

const statusClass: Record<EmailStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 ring-blue-200",
  processing: "bg-amber-50 text-amber-700 ring-amber-200",
  sent: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200"
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex min-w-24 items-center justify-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1",
        statusClass[status]
      )}
    >
      {status}
    </span>
  );
}
