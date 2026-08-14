import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Filter/List inputs sit on a card surface; form inputs stay transparent. */
  filled?: boolean;
  /** Lets a caller focus or select inside the field — used by the add form to
   *  put the cursor back on the amount after a save. React 19 passes `ref`
   *  through as an ordinary prop, so it just rides along with the spread and
   *  no forwardRef wrapper is needed. */
  ref?: React.Ref<HTMLInputElement>;
}

export default function Input({ label, className, id, filled, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sub text-[13px] font-medium">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-border px-3 py-[11px] text-[15px] text-text outline-none",
          "placeholder:text-sub focus:border-accent transition-colors",
          filled ? "bg-card" : "bg-transparent",
          className
        )}
        {...props}
      />
    </div>
  );
}
