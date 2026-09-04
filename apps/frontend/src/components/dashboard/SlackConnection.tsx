import { Plug, Power, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../Button";
import { getApiErrorMessage } from "../../services/api";
import {
  disconnectSlack,
  getSlackStatus,
  redirectToSlackConnect,
  type SlackStatus
} from "../../services/slack";

export function SlackConnection() {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getSlackStatus());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectSlack();
    await load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Slack Notifications</p>
          <p className="mt-1 text-sm text-neutral-500">
            {loading
              ? "Checking connection"
              : status?.connected
                ? `Connected to ${status.teamName ?? "Slack"}`
                : "Not Connected"}
          </p>
          {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            onClick={() => void load()}
            loading={loading}
          >
            Refresh
          </Button>
          {status?.connected ? (
            <Button
              variant="danger"
              icon={<Power className="h-4 w-4" aria-hidden="true" />}
              onClick={() => void disconnect()}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              icon={<Plug className="h-4 w-4" aria-hidden="true" />}
              onClick={redirectToSlackConnect}
              disabled={loading}
            >
              Connect Slack
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
