import { Mail } from "lucide-react";
import { Button } from "../components/Button";
import { redirectToGoogleLogin } from "../services/auth";

export function Login() {
  return (
    <main className="min-h-screen bg-mist">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <section>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xl font-semibold text-ink">ReachInbox</p>
              <p className="text-sm text-neutral-500">Email Scheduler</p>
            </div>
          </div>
          <h1 className="mt-10 max-w-xl text-4xl font-semibold tracking-normal text-ink sm:text-5xl">
            Schedule outbound email with real queue discipline.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">
            Compose campaigns, validate leads, and let BullMQ, Redis, PostgreSQL, and Ethereal handle delivery without timer-based schedulers or process-local counters.
          </p>
          <Button className="mt-8" onClick={redirectToGoogleLogin}>
            Continue with Google
          </Button>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="border-b border-line pb-4">
            <p className="text-sm font-semibold text-ink">Today's queue</p>
            <p className="text-xs text-neutral-500">Preview dashboard state</p>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["alex@northstar.io", "scheduled", "10:00 AM"],
              ["maya@forge.dev", "processing", "10:00 AM"],
              ["sam@atlas.co", "sent", "09:58 AM"],
              ["ops@orbit.ai", "failed", "09:56 AM"]
            ].map(([recipient, status, time]) => (
              <div key={recipient} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-line px-3 py-3 text-sm">
                <span className="truncate font-medium text-ink">{recipient}</span>
                <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">{status}</span>
                <span className="text-xs text-neutral-500">{time}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
