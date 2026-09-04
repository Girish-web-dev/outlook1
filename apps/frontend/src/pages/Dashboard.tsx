import { useState } from "react";
import clsx from "clsx";
import { Inbox, SendHorizontal } from "lucide-react";
import { Navigate } from "react-router-dom";
import { ComposeEmail } from "../components/dashboard/ComposeEmail";
import { ScheduledEmails } from "../components/dashboard/ScheduledEmails";
import { SentEmails } from "../components/dashboard/SentEmails";
import { SlackConnection } from "../components/dashboard/SlackConnection";
import { Header } from "../components/Header";
import { Loading } from "../components/Loading";
import { useAuth } from "../hooks/useAuth";

type Tab = "scheduled" | "sent";

const tabs: { id: Tab; label: string; icon: typeof Inbox }[] = [
  { id: "scheduled", label: "Scheduled Emails", icon: Inbox },
  { id: "sent", label: "Sent Emails", icon: SendHorizontal }
];

export function Dashboard() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("scheduled");
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  if (loading) {
    return (
      <main className="min-h-screen bg-mist p-6">
        <Loading />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="min-h-screen bg-mist">
      <Header user={user} onCompose={() => setComposeOpen(true)} onLogout={() => void logout()} />

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <SlackConnection />

        <section className="mt-6">
          <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Campaign Emails</h1>
              <p className="mt-1 text-sm text-neutral-500">
                Monitor queue state, delivery outcomes, and worker progress.
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-line bg-white p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      "inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition",
                      activeTab === tab.id
                        ? "bg-ink text-white"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-ink"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            {activeTab === "scheduled" ? (
              <ScheduledEmails refreshToken={refreshToken} />
            ) : (
              <SentEmails refreshToken={refreshToken} />
            )}
          </div>
        </section>
      </div>

      <ComposeEmail
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onScheduled={() => setRefreshToken((value) => value + 1)}
      />
    </main>
  );
}
