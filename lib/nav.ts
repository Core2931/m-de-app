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

// Both ways of adding an expense light up the Add tab.
const ADD_ROUTES = ["/expenses/new", "/expenses/import"];

/**
 * Which tab owns a given pathname.
 *
 * Every tab except the List and Add matches exactly. The List deliberately
 * owns the whole /expenses subtree (including the edit route /expenses/<id>)
 * minus the Add routes, which belong to the Add tab. Those rules have to be
 * decided before the prefix rule, or /expenses/new would light up two tabs.
 *
 * Callers pass `usePathname()`, which excludes the query string — so
 * /expenses/new?from=<id> still resolves to the Add tab.
 */
export function isTabActive(href: string, pathname: string): boolean {
  if (href === "/expenses/new") {
    return ADD_ROUTES.includes(pathname);
  }
  if (href === "/expenses") {
    return pathname.startsWith("/expenses") && !ADD_ROUTES.includes(pathname);
  }
  return pathname === href;
}
