import { RefreshCw, SendHorizontal } from "lucide-react";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { Loading } from "../Loading";
import { StatusBadge } from "../StatusBadge";
import { Table, type Column } from "../Table";
import { useEmails } from "../../hooks/useEmails";
import type { Email } from "../../types/email";

interface SentEmailsProps {
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
    key: "sentAt",
    header: "Sent Time",
    render: (email) => (email.sentAt ? new Date(email.sentAt).toLocaleString() : "Not sent")
  },
  {
    key: "status",
    header: "Status",
    render: (email) => <StatusBadge status={email.status} />
  },
  {
    key: "failureReason",
    header: "Failure",
    render: (email) => email.failureReason ?? ""
  }
];

export function SentEmails({ refreshToken }: SentEmailsProps) {
  const { emails, loading, error, refetch } = useEmails("sent", refreshToken);

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
        icon={<SendHorizontal className="h-8 w-8" aria-hidden="true" />}
        title="No sent emails yet"
        description="Delivered Ethereal messages and failed attempts will appear here after the worker runs."
      />
    );
  }

  return <Table columns={columns} rows={emails} getRowKey={(email) => email.id} />;
}
