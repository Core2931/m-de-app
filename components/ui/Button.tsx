import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-white/25 hover:bg-white/35 border border-white/40 text-white font-semibold shadow-lg",
  ghost: "bg-transparent hover:bg-white/15 border border-white/30 text-white/80",
  danger:
    "bg-red-500/70 hover:bg-red-500/80 border border-red-400/40 text-white font-semibold",
};

export default function Button({ variant = "primary", children, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-2xl px-5 py-2.5 text-sm transition-all active:scale-95 disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
