"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/expenses", label: "รายการ" },
  { href: "/expenses/new", label: "เพิ่ม" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto w-full max-w-md px-5">
        <div
          className="mb-5 flex rounded-[26px] bg-nav px-2 py-[10px]"
          style={{ boxShadow: "0 12px 28px rgba(0,0,0,0.16)" }}
        >
          {tabs.map(({ href, label }) => {
            let isActive: boolean;
            if (href === "/") isActive = pathname === "/";
            else if (href === "/expenses/new") isActive = pathname === "/expenses/new";
            // List tab owns /expenses and the edit route, but not the add route.
            else isActive = pathname.startsWith("/expenses") && pathname !== "/expenses/new";
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 rounded-[20px] py-2 text-center transition-transform active:scale-[0.96]"
              >
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isActive ? "text-accent" : "text-sub"
                  )}
                >
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
