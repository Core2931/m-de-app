import { describe, expect, it } from "vitest";
import { summarizePeriod } from "@/lib/periodSplits";
import type { Expense } from "@/types";

function expense(id: string, amount: number, remark: string, date = "2026-07-10"): Expense {
  return {
    id,
    date,
    item: "รายการ " + id,
    amount,
    remark,
    category: "food",
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
    });
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
