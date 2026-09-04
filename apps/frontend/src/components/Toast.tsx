import clsx from "clsx";

interface ToastProps {
  tone: "success" | "error" | "info";
  message: string;
}

const toneClass = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800"
};

export function Toast({ tone, message }: ToastProps) {
  return (
    <div className={clsx("rounded-md border px-4 py-3 text-sm font-medium", toneClass[tone])}>
      {message}
    </div>
  );
}
