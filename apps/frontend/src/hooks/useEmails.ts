import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../services/api";
import { getScheduledEmails, getSentEmails } from "../services/email";
import type { Email } from "../types/email";

export function useEmails(type: "scheduled" | "sent", refreshToken = 0) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = type === "scheduled" ? await getScheduledEmails() : await getSentEmails();
      setEmails(rows);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void refetch();
  }, [refetch, refreshToken]);

  return { emails, loading, error, refetch };
}
