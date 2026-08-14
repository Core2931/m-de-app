import { describe, expect, it } from "vitest";
import { NAV_TABS, isTabActive } from "@/lib/nav";

// The bottom nav is the only way into most of the app, and a wrong rule here
// fails silently — two tabs lit, or none. The "exactly one" assertions below
// are the real point of this file; the individual cases just name the routes.
function activeLabels(pathname: string): string[] {
  return NAV_TABS.filter((tab) => isTabActive(tab.href, pathname)).map((t) => t.label);
}

const APP_ROUTES = ["/", "/expenses", "/expenses/new", "/expenses/abc-123", "/people"];

describe("isTabActive", () => {
  it("ทุกหน้าในแอปแอคทีฟได้แท็บเดียว", () => {
    for (const route of APP_ROUTES) {
      expect(activeLabels(route), route).toHaveLength(1);
    }
  });

  it("หน้าหลัก", () => {
    expect(activeLabels("/")).toEqual(["หน้าหลัก"]);
  });

  it("รายการ", () => {
    expect(activeLabels("/expenses")).toEqual(["รายการ"]);
  });

  it("หน้าแก้ไขรายการเป็นของแท็บรายการ", () => {
    expect(activeLabels("/expenses/abc-123")).toEqual(["รายการ"]);
  });

  it("หน้าเพิ่มมีแท็บของตัวเอง ไม่ใช่ของรายการ", () => {
    // The exact rules must be decided before the /expenses prefix rule —
    // otherwise this route lights up both tabs.
    expect(activeLabels("/expenses/new")).toEqual(["เพิ่ม"]);
  });

  it("ค้างอยู่", () => {
    expect(activeLabels("/people")).toEqual(["ค้างอยู่"]);
  });

  it("/peoples ไม่ใช่ /people", () => {
    expect(activeLabels("/peoples")).toEqual([]);
  });

  it("หน้า login ไม่แอคทีฟแท็บไหนเลย", () => {
    // Login renders its own shell without the nav, so no tab should claim it.
    expect(activeLabels("/login")).toEqual([]);
  });

  it("query string ต้องไม่หลุดเข้ามา", () => {
    // usePathname() excludes the query string, which is why /expenses/new?from=<id>
    // (feature: ซ้ำรายการ) still resolves to the Add tab. This asserts the
    // dependency: if a caller ever passes a full URL instead, the exact-match
    // tabs stop working and this test says so.
    expect(activeLabels("/expenses/new")).toEqual(["เพิ่ม"]);
    expect(activeLabels("/expenses/new?from=abc")).not.toEqual(["เพิ่ม"]);
  });

  it("แท็บทั้งหมดมี href ไม่ซ้ำ", () => {
    const hrefs = NAV_TABS.map((t) => t.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
