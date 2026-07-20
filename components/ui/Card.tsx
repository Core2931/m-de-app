import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// Padding/radius are passed per use-site to avoid conflicting utilities
// (no tailwind-merge in this project). Defaults match the common card.
export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn("bg-card shadow-card", className)}>{children}</div>
  );
}
