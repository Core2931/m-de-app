import { describe, expect, it } from "vitest";
import { markPaidChanges, summarizeCardPending } from "@/lib/cardPending";
import { applyPayChanges } from "@/lib/payMethods";
import { rememberedPay } from "@/lib/payMemory";
import type { Expense, PayMethod } from "@/types";

function row(
  item: string,
  pay: PayMethod | undefined,
  date: string,
  createdAt = `${date}T08:00:00.000Z`
): Expense {
  return {
    id: `${item}-${date}-${createdAt}`,
    date,
    item,
    amount: 20,
    remark: "",
    createdAt,
    category: "transport",
    ...(pay ? { pay } : {}),
  };
}

describe("rememberedPay", () => {
  it("ชื่อใหม่ได้ โอนจ่าย", () => {
    expect(rememberedPay([row("MRT", "card_later", "2026-11-01")], "แท็กซี่")).toBe("bank");
  });

  it.each(["card_due", "card_later", "cash", "bank"] as const)("ล่าสุดเป็น %s ได้ค่านั้น", (pay) => {
    expect(rememberedPay([row("MRT", pay, "2026-11-01")], "MRT")).toBe(pay);
  });

  it("ไม่จำ โอนแล้ว — ยังเป็นบัตร ได้ ต้องโอน ไม่ใช่ค่าเริ่มต้น", () => {
    expect(rememberedPay([row("MRT", "card_paid", "2026-11-01")], "MRT")).toBe("card_due");
  });

  it("ล่าสุดดูวันที่ก่อน แล้วค่อย createdAt", () => {
    const byDate = [
      row("MRT", "cash", "2026-11-05"),
      row("MRT", "bank", "2026-11-01", "2026-11-09T00:00:00.000Z"),
    ];
    expect(rememberedPay(byDate, "MRT")).toBe("cash");
    const sameDay = [
      row("MRT", "bank", "2026-11-05", "2026-11-05T09:00:00.000Z"),
      row("MRT", "cash", "2026-11-05", "2026-11-05T08:00:00.000Z"),
    ];
    expect(rememberedPay(sameDay, "MRT")).toBe("bank");
  });

  it("ข้ามแถวที่ไม่ระบุวิธีจ่าย", () => {
    const rows = [row("MRT", "card_later", "2026-11-01"), row("MRT", undefined, "2026-11-05")];
    expect(rememberedPay(rows, "MRT")).toBe("card_later");
  });

  it("ตัดช่องว่างหัวท้าย แต่ไม่จับคู่แบบใกล้เคียง", () => {
    const rows = [row("MRT ", "card_later", "2026-11-01")];
    expect(rememberedPay(rows, "  MRT  ")).toBe("card_later");
    expect(rememberedPay(rows, "MRT สายสีม่วง")).toBe("bank");
  });

  it("ชื่อว่างได้ โอนจ่าย แม้ใน sheet มีแถวชื่อว่าง", () => {
    const rows = [row("  ", "cash", "2026-11-01")];
    expect(rememberedPay(rows, "")).toBe("bank");
    expect(rememberedPay(rows, "   ")).toBe("bank");
  });
});

describe("หลังกด โอนแล้ว ที่การ์ด", () => {
  function payBucket(rows: Expense[], key: "due" | "later") {
    return applyPayChanges(rows, markPaidChanges(summarizeCardPending(rows)[key], "2026-11-30"));
  }

  it("รายการจากกองสิ้นเดือน ครั้งต่อไปยังเป็นสิ้นเดือน", () => {
    const rows = [row("MRT", "card_later", "2026-11-01"), row("MRT", "card_later", "2026-11-02")];
    const paid = payBucket(rows, "later");
    expect(summarizeCardPending(paid).total).toBe(0);
    expect(rememberedPay(paid, "MRT")).toBe("card_later");
  });

  it("รายการจากกองต้องโอนเลย ครั้งต่อไปเป็นต้องโอน", () => {
    const paid = payBucket([row("กาแฟ", "card_due", "2026-11-01")], "due");
    expect(rememberedPay(paid, "กาแฟ")).toBe("card_due");
  });
});
