import { describe, expect, it } from "vitest";
import { canSave, historyState, shownPay } from "@/lib/saveGate";
import type { Expense } from "@/types";

const lunchByCard: Expense = {
  id: "1",
  date: "2026-11-20",
  item: "ข้าวเที่ยง",
  amount: 60,
  remark: "",
  category: "food",
  createdAt: "2026-11-20T05:00:00.000Z",
  pay: "card_due",
};

describe("historyState", () => {
  it("ยังไม่โหลดและยังไม่มี error คือกำลังโหลด", () => {
    expect(historyState({ isLoaded: false, error: null })).toBe("loading");
  });

  it("ยังไม่โหลดและมี error คือโหลดไม่สำเร็จ", () => {
    expect(historyState({ isLoaded: false, error: "โหลดข้อมูลไม่สำเร็จ" })).toBe("failed");
  });

  it("เคยโหลดสำเร็จแล้ว error ทีหลังยังใช้ข้อมูลเดิมได้", () => {
    expect(historyState({ isLoaded: true, error: "โหลดข้อมูลไม่สำเร็จ" })).toBe("ready");
  });
});

describe("canSave", () => {
  it("กำลังโหลด บันทึกไม่ได้ แม้กดเลือกวิธีจ่ายแล้ว", () => {
    expect(canSave("loading", null)).toBe(false);
    // "โอนแล้ว" needs the history to tell a month-end item apart.
    expect(canSave("loading", "card_paid")).toBe(false);
  });

  it("โหลดไม่สำเร็จ บันทึกได้เมื่อกดเลือกวิธีจ่ายเองแล้วเท่านั้น", () => {
    expect(canSave("failed", null)).toBe(false);
    expect(canSave("failed", "bank")).toBe(true);
  });

  it("โหลดเสร็จแล้ว บันทึกได้โดยไม่ต้องกดเลือก", () => {
    expect(canSave("ready", null)).toBe(true);
  });
});

describe("shownPay", () => {
  it("โหลดไม่สำเร็จและยังไม่กด ไม่เลือกอะไรให้", () => {
    expect(shownPay("failed", null, [], "ข้าวเที่ยง")).toBeNull();
  });

  it("ปุ่มที่กดเองชนะเสมอ", () => {
    expect(shownPay("failed", "cash", [], "ข้าวเที่ยง")).toBe("cash");
    expect(shownPay("ready", "cash", [lunchByCard], "ข้าวเที่ยง")).toBe("cash");
  });

  it("โหลดเสร็จแล้วเลือกตามครั้งก่อนของชื่อนั้น", () => {
    expect(shownPay("ready", null, [lunchByCard], "ข้าวเที่ยง")).toBe("card_due");
  });
});
