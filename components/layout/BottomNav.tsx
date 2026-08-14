"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_TABS, isTabActive } from "@/lib/nav";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto w-full max-w-md px-5">
        <div
          className="mb-5 flex rounded-[26px] bg-nav px-2 py-[10px]"
          style={{ boxShadow: "0 12px 28px rgba(0,0,0,0.16)" }}
        >
          {NAV_TABS.map(({ href, label }) => {
            const isActive = isTabActive(href, pathname);
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 rounded-[20px] py-2 text-center transition-transform active:scale-[0.96]"
              >
                <span
                  className={cn(
                    "whitespace-nowrap text-sm font-semibold",
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
