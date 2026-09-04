import type { InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightSlot?: ReactNode;
}

export function Input({ label, error, rightSlot, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-neutral-800">{label}</span>
      <span className="relative block">
        <input
          id={inputId}
          className={clsx(
            "h-11 w-full rounded-md border border-line bg-white px-3 text-ink outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-4 focus:ring-blue-100",
            rightSlot && "pr-12",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
            className
          )}
          {...props}
        />
        {rightSlot ? <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span> : null}
      </span>
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}
