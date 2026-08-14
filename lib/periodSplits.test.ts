import { describe, expect, it } from "vitest";
import { summarizePeriod } from "@/lib/periodSplits";
import type { Expense } from "@/types";

function expense(
  id: string,
  amount: number,
  remark: string,
  date = "2026-07-10",
  category: Expense["category"] = "food"
): Expense {
  return {
    id,
    date,
    item: "รายการ " + id,
    amount,
    remark,
    category,
    createdAt: date + "T05:00:00.000Z",
  };
}

describe("summarizePeriod", () => {
  it("แยกยอดรวม ยอดที่ออกให้ และยอดของเราเอง", () => {
    const s = summarizePeriod([
      expense("e1", 300, "ขนม: [100] ข้าว"),
      expense("e2", 200, "ค่าน้ำ"),
    ]);
    expect(s.total).toBe(500);
    expect(s.lentOut).toBe(100);
    expect(s.borrowed).toBe(0);
    expect(s.myShare).toBe(400);
  });

  it("รวมยอดคนเดิมจากหลายรายการเข้าด้วยกัน", () => {
    const s = summarizePeriod([
      expense("e1", 300, "ขนม: [100] ข้าว"),
      expense("e2", 80, "ขนม: [40] กาแฟ"),
    ]);
    expect(s.people).toHaveLength(1);
    expect(s.people[0]).toMatchObject({ person: "ขนม", lentOut: 140, borrowed: 0, net: 140 });
    expect(s.people[0].entries).toHaveLength(2);
  });

  it("ยอดที่คนอื่นออกให้เราเป็น borrowed และทำให้ net ติดลบ", () => {
    const s = summarizePeriod([expense("e1", 200, "ขนมจ่าย: [200] คลีนซิ่ง")]);
    expect(s.borrowed).toBe(200);
    expect(s.myShare).toBe(200); // myShare หัก lentOut เท่านั้น ไม่หัก borrowed
    expect(s.people[0]).toMatchObject({ lentOut: 0, borrowed: 200, net: -200 });
  });

  it("คนที่ออกให้กันไปมาจนเท่ากันยังอยู่ในรายการด้วย net 0", () => {
    const s = summarizePeriod([
      expense("e1", 100, "ขนม: [100] ข้าว"),
      expense("e2", 100, "ขนมจ่าย: [100] กาแฟ"),
    ]);
    expect(s.people).toHaveLength(1);
    expect(s.people[0]).toMatchObject({ lentOut: 100, borrowed: 100, net: 0 });
  });

  it("เรียงคนที่ค้างเยอะสุดขึ้นก่อน", () => {
    const s = summarizePeriod([expense("e1", 500, "ขนม: [50] ก; ต้อมจ่าย: [300] ข")]);
    expect(s.people.map((p) => p.person)).toEqual(["ต้อม", "ขนม"]);
  });

  it("ยอดเท่ากันเรียงคนที่มีรายการเยอะกว่าขึ้นก่อน", () => {
    const s = summarizePeriod([
      expense("e1", 200, "ขนม: [100] ก"),
      expense("e2", 200, "ต้อม: [150] ข; ต้อมจ่าย: [50] ค"),
    ]);
    // net เท่ากันที่ 100 ทั้งคู่ แต่ ต้อม มี gross 200 > ขนม 100
    expect(s.people.map((p) => p.net)).toEqual([100, 100]);
    expect(s.people.map((p) => p.person)).toEqual(["ต้อม", "ขนม"]);
  });

  it("entry ของแต่ละคนเรียงวันที่ล่าสุดก่อน", () => {
    const s = summarizePeriod([
      expense("e1", 100, "ขนม: [50] เก่า", "2026-07-01"),
      expense("e2", 100, "ขนม: [50] ใหม่", "2026-07-20"),
    ]);
    expect(s.people[0].entries.map((e) => e.date)).toEqual(["2026-07-20", "2026-07-01"]);
  });

  it("รายการที่ไม่มี split ไม่สร้างคน แต่ยังนับเข้ายอดรวม", () => {
    const s = summarizePeriod([expense("e1", 120, "ข้าวเที่ยง")]);
    expect(s.people).toEqual([]);
    expect(s.total).toBe(120);
    expect(s.myShare).toBe(120);
  });

  it("ไม่มีรายการคืนศูนย์ทั้งหมด", () => {
    expect(summarizePeriod([])).toEqual({
      total: 0,
      lentOut: 0,
      borrowed: 0,
      myShare: 0,
      people: [],
      byCategory: [],
    });
  });

  it("ยอดต่อหมวดบวกกันแล้วต้องเท่ายอดรวม", () => {
    const s = summarizePeriod([
      expense("e1", 300, "ขนม: [100] ข้าว", "2026-07-10", "food"),
      expense("e2", 200, "", "2026-07-10", "transport"),
      expense("e3", 50, "ต้อม: [20] น้ำ", "2026-07-11", "food"),
    ]);
    const sumTotal = s.byCategory.reduce((n, c) => n + c.total, 0);
    const sumMyShare = s.byCategory.reduce((n, c) => n + c.myShare, 0);
    expect(sumTotal).toBeCloseTo(s.total, 10);
    expect(sumMyShare).toBeCloseTo(s.myShare, 10);
  });

  it("หมวดเดียวกันหลายรายการยุบเป็นแถวเดียวพร้อม count", () => {
    const s = summarizePeriod([
      expense("e1", 300, "ขนม: [100] ข้าว", "2026-07-10", "food"),
      expense("e2", 50, "", "2026-07-11", "food"),
    ]);
    expect(s.byCategory).toHaveLength(1);
    expect(s.byCategory[0]).toEqual({
      category: "food",
      total: 350,
      myShare: 250, // (300-100) + 50 — คิดต่อรายการ ไม่ใช่ 350 - lentOut รวม
      count: 2,
    });
  });

  it("เรียงหมวดที่ใช้เยอะสุดขึ้นก่อน", () => {
    const s = summarizePeriod([
      expense("e1", 100, "", "2026-07-10", "food"),
      expense("e2", 500, "", "2026-07-10", "transport"),
      expense("e3", 300, "", "2026-07-10", "goods"),
    ]);
    expect(s.byCategory.map((c) => c.category)).toEqual(["transport", "goods", "food"]);
  });

  it("ยอดเท่ากันเรียงตามลำดับ CATEGORIES ไม่ใช่ชื่อไทย", () => {
    // CATEGORIES = food, transport, life, goods, other — ลำดับเดียวกับ chip filter
    const s = summarizePeriod([
      expense("e1", 100, "", "2026-07-10", "other"),
      expense("e2", 100, "", "2026-07-10", "food"),
      expense("e3", 100, "", "2026-07-10", "goods"),
    ]);
    expect(s.byCategory.map((c) => c.category)).toEqual(["food", "goods", "other"]);
  });

  it("หมวดที่ไม่มีรายการต้องไม่โผล่", () => {
    const s = summarizePeriod([expense("e1", 100, "", "2026-07-10", "life")]);
    expect(s.byCategory.map((c) => c.category)).toEqual(["life"]);
  });

  it("เศษทศนิยมไม่ทำให้ยอดที่เท่ากันเหลือ -0.0000001", () => {
    // 0.1 + 0.2 !== 0.3 — ถ้าไม่ snap หน้าจอจะขึ้น "-฿0" ทั้งที่เคลียร์กันหมดแล้ว
    const s = summarizePeriod([
      expense("e1", 1, "ขนม: [0.1] ก"),
      expense("e2", 1, "ขนม: [0.2] ข"),
      expense("e3", 1, "ขนมจ่าย: [0.3] ค"),
    ]);
    expect(s.people[0].net).toBe(0);
    expect(s.myShare).toBeCloseTo(2.7, 10);
  });
});
