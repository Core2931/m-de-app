import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
}

const styles: Record<Variant, string> = {
  // Solid navy in light, light grey in dark. While disabled, .action-button in
  // globals.css takes over.
  primary: "action-button [background:var(--action-fill)] text-action-text font-semibold",
  ghost: "bg-transparent border border-border text-text/80",
  danger: "bg-transparent border border-danger text-danger font-semibold",
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
