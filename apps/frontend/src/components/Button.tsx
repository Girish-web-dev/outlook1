import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  icon?: ReactNode;
  loading?: boolean;
}

const variantClass = {
  primary: "bg-brand text-white hover:bg-blue-700 focus-visible:outline-brand",
  secondary: "border border-line bg-white text-ink hover:bg-mist focus-visible:outline-brand",
  ghost: "text-neutral-700 hover:bg-neutral-100 focus-visible:outline-brand",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600"
};

const sizeClass = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm"
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variantClass[variant],
        sizeClass[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
