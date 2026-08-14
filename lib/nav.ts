export interface NavTab {
  href: string;
  label: string;
}

// Order is the on-screen order. "ค้างอยู่" goes last so muscle memory for the
// first three tabs survives its arrival.
export const NAV_TABS: NavTab[] = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/expenses", label: "รายการ" },
  { href: "/expenses/new", label: "เพิ่ม" },
  { href: "/people", label: "ค้างอยู่" },
];

/**
 * Which tab owns a given pathname.
 *
 * Every tab except the List matches exactly; the List deliberately owns the
 * whole /expenses subtree (including the edit route /expenses/<id>) minus the
 * Add route, which has its own tab. The exact-match rules therefore have to be
 * decided before the prefix rule, or /expenses/new would light up two tabs.
 *
 * Callers pass `usePathname()`, which excludes the query string — so
 * /expenses/new?from=<id> still resolves to the Add tab.
 */
export function isTabActive(href: string, pathname: string): boolean {
  if (href === "/expenses") {
    return pathname.startsWith("/expenses") && pathname !== "/expenses/new";
  }
  return pathname === href;
}
