"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "หน้าหลัก", icon: "🏠" },
  { href: "/expenses", label: "รายการ", icon: "📋" },
  { href: "/expenses/new", label: "เพิ่ม", icon: "➕", highlight: true },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto px-4 pb-4">
        <div className="glass rounded-3xl px-2 py-2 flex items-center justify-around">
          {tabs.map(({ href, label, icon, highlight }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all",
                  isActive && "bg-white/25",
                  highlight && "bg-white/30 border border-white/40 shadow-md scale-105"
                )}
              >
                <span className="text-xl">{icon}</span>
                <span className={cn("text-[10px] font-medium text-white/70", isActive && "text-white")}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
