import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "danger";
};

const variants = {
  primary: "border-[#f26b21] bg-[#f26b21] text-white hover:bg-[#db5d17]",
  secondary: "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
  quiet: "border-transparent bg-transparent text-slate-700 hover:bg-slate-100",
  danger: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
};

export function Button({
  children,
  className = "",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
