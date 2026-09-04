import { LogOut, Mail, Plus } from "lucide-react";
import { Button } from "./Button";
import type { User } from "../types/auth";

interface HeaderProps {
  user: User;
  onCompose: () => void;
  onLogout: () => void;
}

export function Header({ user, onCompose, onLogout }: HeaderProps) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-base font-semibold text-ink">ReachInbox</p>
            <p className="text-sm text-neutral-500">Email Scheduler</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={onCompose}>
            Compose New Email
          </Button>
          <div className="flex items-center gap-3 rounded-md border border-line bg-mist px-3 py-2">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-neutral-500">{user.email}</p>
            </div>
            <button
              type="button"
              className="rounded-md p-2 text-neutral-500 transition hover:bg-white hover:text-ink"
              onClick={onLogout}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
