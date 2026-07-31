import { describe, expect, it } from "vitest";
import { normalizePerson, parseRemark, summarizeExpense } from "@/lib/splits";
import type { Expense } from "@/types";

describe("normalizePerson", () => {
  it("ตัดคำว่า จ่าย ท้ายชื่อออก", () => {
    expect(normalizePerson("ขนมจ่าย")).toBe("ขนม");
  });

  it("ชื่อที่มีช่องว่างซ้อนถูกยุบเหลือช่องเดียว", () => {
    expect(normalizePerson("  พี่  ต้อม จ่าย ")).toBe("พี่ ต้อม");
  });

  it("ชื่อธรรมดาไม่ถูกแก้", () => {
    expect(normalizePerson("ขนม")).toBe("ขนม");
  });
});

describe("parseRemark", () => {
  it("อ่านรายการเดียวทิศทาง owed_to_me", () => {
    const result = parseRemark("ขนม: [50] ค่าอาหาร");
    expect(result.splits).toEqual([
      { person: "ขนม", amount: 50, label: "ค่าอาหาร", direction: "owed_to_me" },
    ]);
    expect(result.invalid).toBe(false);
    expect(result.freeText).toBe("");
  });

  it("ชื่อลงท้าย จ่าย เป็นทิศทาง i_owe", () => {
    const result = parseRemark("ขนมจ่าย: [200] ค่าคลีนซิ่ง");
    expect(result.splits).toEqual([
      { person: "ขนม", amount: 200, label: "ค่าคลีนซิ่ง", direction: "i_owe" },
    ]);
  });

  it("แยก block หลายอันด้วย +", () => {
    const result = parseRemark("ขนม: [100] ค่าอาหาร+ [50] ค่าเดินทาง");
    expect(result.splits).toEqual([
      { person: "ขนม", amount: 100, label: "ค่าอาหาร", direction: "owed_to_me" },
      { person: "ขนม", amount: 50, label: "ค่าเดินทาง", direction: "owed_to_me" },
    ]);
  });

  it("แยกหลายคนด้วย ;", () => {
    const result = parseRemark("ขนม: [50] ข้าว; ต้อมจ่าย: [80] แท็กซี่");
    expect(result.splits).toEqual([
      { person: "ขนม", amount: 50, label: "ข้าว", direction: "owed_to_me" },
      { person: "ต้อม", amount: 80, label: "แท็กซี่", direction: "i_owe" },
    ]);
  });

  it("แยกหลายคนด้วยขึ้นบรรทัดใหม่", () => {
    const result = parseRemark("ขนม: [50] ข้าว\nต้อม: [80] น้ำ");
    expect(result.splits).toHaveLength(2);
    expect(result.splits[1].person).toBe("ต้อม");
  });

  it("รับตัวเลขที่มี comma และทศนิยม", () => {
    const result = parseRemark("ขนม: [1,250.50] ค่าโรงแรม");
    expect(result.splits[0].amount).toBe(1250.5);
  });

  it("label ว่างได้", () => {
    const result = parseRemark("ขนม: [50]");
    expect(result.splits[0].label).toBe("");
  });

  it("remark ธรรมดาไม่มี pattern เก็บเป็น freeText", () => {
    const result = parseRemark("จ่ายค่าน้ำแล้ว");
    expect(result.splits).toEqual([]);
    expect(result.freeText).toBe("จ่ายค่าน้ำแล้ว");
    expect(result.invalid).toBe(false);
  });

  it("มีวงเล็บตัวเลขแต่ไม่มี colon ถือว่า invalid", () => {
    const result = parseRemark("ขนม [50]");
    expect(result.splits).toEqual([]);
    expect(result.invalid).toBe(true);
    expect(result.freeText).toBe("ขนม [50]");
  });

  it("remark ว่างคืนค่าเปล่า", () => {
    expect(parseRemark("")).toEqual({ splits: [], freeText: "", invalid: false });
  });

  it("จำนวนเงินเป็นศูนย์ถูกข้าม", () => {
    const result = parseRemark("ขนม: [0] ฟรี");
    expect(result.splits).toEqual([]);
    expect(result.invalid).toBe(true);
  });

  it("ใช้ , คั่นคนแทน ; ติดธง invalid แต่ยังเก็บ split ไว้", () => {
    // "," is not a separator on purpose, so ต้อม's 80 lands on ขนม. The data is
    // kept as-is, but the label swallowed a ":" — enough to raise the warning.
    const result = parseRemark("ขนม: [50] ข้าว, ต้อม: [80] น้ำ");
    expect(result.invalid).toBe(true);
    expect(result.splits).toHaveLength(2);
    expect(result.splits.every((s) => s.person === "ขนม")).toBe(true);
  });

  it("label ปกติที่ไม่มี : ไม่ติดธง", () => {
    const result = parseRemark("ขนม: [50] ข้าว, น้ำ, ขนมหวาน");
    expect(result.invalid).toBe(false);
    expect(result.splits).toHaveLength(1);
  });

  it("ชื่อที่เป็นคำว่า จ่าย ล้วนถือว่า invalid", () => {
    const result = parseRemark("จ่าย: [50] อะไรสักอย่าง");
    expect(result.splits).toEqual([]);
    expect(result.invalid).toBe(true);
  });
});

function makeExpense(amount: number, remark: string): Expense {
  return {
    id: "e1",
    date: "2026-07-31",
    item: "ข้าวเที่ยง",
    amount,
    remark,
    category: "food",
    createdAt: "2026-07-31T05:00:00.000Z",
  };
}

describe("summarizeExpense", () => {
  it("ไม่มี split ยอดของฉันเท่ายอดบิล", () => {
    const s = summarizeExpense(makeExpense(150, "อร่อยดี"));
    expect(s.lentOut).toBe(0);
    expect(s.borrowed).toBe(0);
    expect(s.myShare).toBe(150);
    expect(s.cashOut).toBe(150);
    expect(s.overAllocated).toBe(false);
  });

  it("เราออกให้คนอื่น ลด myShare แต่ cashOut เท่าเดิม", () => {
    const s = summarizeExpense(makeExpense(150, "ขนม: [50] ค่าอาหาร"));
    expect(s.lentOut).toBe(50);
    expect(s.myShare).toBe(100);
    expect(s.cashOut).toBe(150);
  });

  it("คนอื่นออกให้เรา ลด cashOut แต่ myShare เท่าเดิม", () => {
    const s = summarizeExpense(makeExpense(150, "ขนมจ่าย: [50] ค่าอาหาร"));
    expect(s.borrowed).toBe(50);
    expect(s.myShare).toBe(150);
    expect(s.cashOut).toBe(100);
  });

  it("เศษทศนิยม 0.1 + 0.2 เทียบ 0.3 ไม่ถือว่าเกินยอดบิล", () => {
    const s = summarizeExpense(makeExpense(0.3, "ก: [0.1] a+ [0.2] b"));
    expect(s.lentOut).toBeCloseTo(0.3, 10);
    expect(s.overAllocated).toBe(false);
    // Without the snap this is -5.5e-17, which formatCurrency renders as "-฿0".
    expect(Object.is(s.myShare, 0)).toBe(true);
  });

  it("split รวมเกินยอดบิลติดธง overAllocated", () => {
    const s = summarizeExpense(makeExpense(100, "ขนม: [80] ก; ต้อมจ่าย: [50] ข"));
    expect(s.overAllocated).toBe(true);
    expect(s.myShare).toBe(20);
    expect(s.cashOut).toBe(50);
  });
});
