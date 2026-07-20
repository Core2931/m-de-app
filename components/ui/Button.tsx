import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
}

const styles: Record<Variant, string> = {
  // The one place the two accent tones blend together (echoes the stat/chart split).
  primary:
    "bg-[linear-gradient(135deg,var(--accent),var(--accent2))] text-accent-text font-semibold",
  ghost: "bg-transparent border border-border text-text/80",
  danger: "bg-transparent border border-accent text-accent font-semibold",
};

export default function Button({ variant = "primary", children, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded-[14px] px-5 py-[13px] text-base text-center transition-transform active:scale-[0.97] disabled:opacity-50",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
