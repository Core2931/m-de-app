import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlassCard({ children, className }: GlassCardProps) {
  return <div className={cn("glass rounded-3xl p-4", className)}>{children}</div>;
}
