import { describe, expect, it } from "vitest";
import { buildPersonBalances, summarizeBalances } from "@/lib/balances";
import type { Expense, Settlement } from "@/types";

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

function settlement(person: string, amount: number, direction: Settlement["direction"]): Settlement {
  return {
    id: "s-" + person + "-" + amount,
    date: "2026-07-20",
    person,
    amount,
    direction,
    note: "",
    createdAt: "2026-07-20T05:00:00.000Z",
  };
}

describe("buildPersonBalances", () => {
  it("รวมยอดที่คนอื่นติดเราเป็นบวก", () => {
    const [b] = buildPersonBalances([expense("e1", 150, "ขนม: [50] ข้าว")], []);
    expect(b.person).toBe("ขนม");
    expect(b.lentOut).toBe(50);
    expect(b.borrowed).toBe(0);
    expect(b.balance).toBe(50);
  });

  it("รวมยอดที่เราติดคนอื่นเป็นลบ", () => {
    const [b] = buildPersonBalances([expense("e1", 200, "ขนมจ่าย: [200] คลีนซิ่ง")], []);
    expect(b.balance).toBe(-200);
  });

  it("net สองทิศทางของคนเดียวกันเหลือยอดเดียว", () => {
    const balances = buildPersonBalances(
      [expense("e1", 50, "ขนม: [50] ข้าว"), expense("e2", 200, "ขนมจ่าย: [200] คลีนซิ่ง")],
      []
    );
    expect(balances).toHaveLength(1);
    expect(balances[0].balance).toBe(-150);
    expect(balances[0].entries).toHaveLength(2);
  });

  it("settlement บางส่วนหักยอดออก", () => {
    const [b] = buildPersonBalances(
      [expense("e1", 150, "ขนม: [100] ข้าว")],
      [settlement("ขนม", 40, "received")]
    );
    expect(b.settledNet).toBe(40);
    expect(b.balance).toBe(60);
  });

  it("settlement เต็มยอดทำให้คนนั้นหายจากรายการ", () => {
    const balances = buildPersonBalances(
      [expense("e1", 150, "ขนม: [100] ข้าว")],
      [settlement("ขนม", 100, "received")]
    );
    expect(balances).toEqual([]);
  });

  it("เราคืนเงินเขาแล้วยอดที่ติดหายไป", () => {
    const balances = buildPersonBalances(
      [expense("e1", 200, "ขนมจ่าย: [200] คลีนซิ่ง")],
      [settlement("ขนม", 200, "paid")]
    );
    expect(balances).toEqual([]);
  });

  it("เรียงตามยอดคงค้างมากไปน้อย", () => {
    const balances = buildPersonBalances(
      [expense("e1", 500, "ขนม: [50] ก; ต้อมจ่าย: [300] ข")],
      []
    );
    expect(balances.map((b) => b.person)).toEqual(["ต้อม", "ขนม"]);
  });

  it("รายการที่ไม่มี split ไม่สร้างคน", () => {
    expect(buildPersonBalances([expense("e1", 100, "ข้าวเที่ยง")], [])).toEqual([]);
  });
});

describe("summarizeBalances", () => {
  it("แยกยอดต้องกันไว้กับยอดจะได้คืน", () => {
    const balances = buildPersonBalances(
      [expense("e1", 500, "ขนม: [120] ก; ต้อมจ่าย: [350] ข")],
      []
    );
    expect(summarizeBalances(balances)).toEqual({ reserved: 350, receivable: 120 });
  });

  it("ไม่มีหนี้คืนศูนย์ทั้งคู่", () => {
    expect(summarizeBalances([])).toEqual({ reserved: 0, receivable: 0 });
  });
});
