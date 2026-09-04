import { UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../Button";
import { Input } from "../Input";
import { Modal } from "../Modal";
import { Toast } from "../Toast";
import { getApiErrorMessage } from "../../services/api";
import { createCampaign } from "../../services/email";
import { parseLeadFile, type LeadParseResult } from "../../utils/csvParser";

interface ComposeEmailProps {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
}

function defaultStartTime(): string {
  const date = new Date(Date.now() + 10 * 60 * 1000);
  date.setSeconds(0, 0);
  return date.toISOString().slice(0, 16);
}

export function ComposeEmail({ open, onClose, onScheduled }: ComposeEmailProps) {
  const [subject, setSubject] = useState("Welcome to ReachInbox");
  const [body, setBody] = useState("Hello {{email}},\n\nI wanted to reach out at the right time.");
  const [startTime, setStartTime] = useState(defaultStartTime());
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [leadResult, setLeadResult] = useState<LeadParseResult | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => subject.trim() && body.trim() && leadResult && leadResult.validEmails.length > 0 && !submitting,
    [body, leadResult, subject, submitting]
  );

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) {
      return;
    }

    try {
      const parsed = await parseLeadFile(file);
      setLeadResult(parsed);
      setToast({
        tone: "info",
        message: `${parsed.validEmails.length} valid email addresses detected`
      });
    } catch (error) {
      setLeadResult(null);
      setToast({ tone: "error", message: getApiErrorMessage(error) });
    }
  }

  async function submit(): Promise<void> {
    if (!leadResult) {
      return;
    }

    setSubmitting(true);
    setToast(null);

    try {
      const result = await createCampaign({
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delaySeconds,
        hourlyLimit,
        recipients: leadResult.validEmails
      });
      setToast({
        tone: "success",
        message: `${result.stats.scheduled} emails scheduled`
      });
      onScheduled();
      setTimeout(onClose, 800);
    } catch (error) {
      setToast({ tone: "error", message: getApiErrorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Compose Email Campaign" onClose={onClose}>
      <div className="space-y-5">
        {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}

        <Input label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-neutral-800">Body</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            className="w-full resize-y rounded-md border border-line bg-white px-3 py-3 text-ink outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-7 text-center transition hover:border-brand hover:bg-blue-50">
          <UploadCloud className="h-8 w-8 text-neutral-500" aria-hidden="true" />
          <span className="mt-2 text-sm font-semibold text-ink">Upload CSV or TXT leads</span>
          <span className="mt-1 text-xs text-neutral-500">Maximum file size is 2 MB</span>
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </label>

        {leadResult ? (
          <div className="grid gap-3 rounded-lg border border-line bg-mist p-4 text-sm sm:grid-cols-4">
            <div>
              <p className="font-semibold text-ink">{leadResult.totalRows}</p>
              <p className="text-neutral-500">Total rows</p>
            </div>
            <div>
              <p className="font-semibold text-signal">{leadResult.validEmails.length}</p>
              <p className="text-neutral-500">Valid emails</p>
            </div>
            <div>
              <p className="font-semibold text-warning">{leadResult.invalidCount}</p>
              <p className="text-neutral-500">Invalid</p>
            </div>
            <div>
              <p className="font-semibold text-warning">{leadResult.duplicateCount}</p>
              <p className="text-neutral-500">Duplicates removed</p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Start Time"
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
          <Input
            label="Delay Between Emails"
            type="number"
            min={0}
            value={delaySeconds}
            onChange={(event) => setDelaySeconds(Number(event.target.value))}
          />
          <Input
            label="Hourly Limit"
            type="number"
            min={1}
            value={hourlyLimit}
            onChange={(event) => setHourlyLimit(Number(event.target.value))}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={submitting} disabled={!canSubmit}>
            Schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
}
