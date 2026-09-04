import { CalendarClock, RefreshCw } from "lucide-react";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Loading } from "../Loading";
import { StatusBadge } from "../StatusBadge";
import { Table, type Column } from "../Table";
import { useEmails } from "../../hooks/useEmails";
import type { Email } from "../../types/email";

interface ScheduledEmailsProps {
  refreshToken: number;
}

const columns: Column<Email>[] = [
  {
    key: "recipient",
    header: "Recipient",
    render: (email) => <span className="font-medium text-ink">{email.recipient}</span>
  },
  {
    key: "subject",
    header: "Subject",
    render: (email) => email.subject
  },
  {
    key: "scheduledAt",
    header: "Scheduled Time",
    render: (email) => new Date(email.scheduledAt).toLocaleString()
  },
  {
    key: "status",
    header: "Status",
    render: (email) => <StatusBadge status={email.status} />
  }
];

export function ScheduledEmails({ refreshToken }: ScheduledEmailsProps) {
  const { emails, loading, error, refetch } = useEmails("scheduled", refreshToken);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-800">{error}</p>
        <Button
          className="mt-4"
          variant="secondary"
          icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        icon={<CalendarClock className="h-8 w-8" aria-hidden="true" />}
        title="No scheduled emails"
        description="Campaign emails waiting on BullMQ delayed jobs will appear here."
      />
    );
  }

  return <Table columns={columns} rows={emails} getRowKey={(email) => email.id} />;
}
