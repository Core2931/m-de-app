import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
}

const styles: Record<Variant, string> = {
  // Raised rather than flat: light falls from the top-left, a thin sheen marks
  // the top edge, and the shadow underneath is the button's own colour. The
  // label sits over the darker half of the gradient, where contrast is best.
  primary:
    "bg-[linear-gradient(135deg,var(--accent-hi),var(--accent)_40%,var(--accent-lo))] shadow-[0_10px_22px_-8px_var(--accent-glow),inset_0_1px_0_var(--sheen)] text-accent-text font-semibold",
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
