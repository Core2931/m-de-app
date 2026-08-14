import { describe, expect, it } from "vitest";
import { buildKnownPeople, isKnownPerson, nearestPerson, type KnownPerson } from "@/lib/people";
import type { Expense } from "@/types";

function expense(id: string, remark: string, date = "2026-07-10"): Expense {
  return {
    id,
    date,
    item: "รายการ " + id,
    amount: 100,
    remark,
    category: "food",
    createdAt: date + "T05:00:00.000Z",
  };
}

function known(...entries: [string, number][]): KnownPerson[] {
  return entries.map(([person, count]) => ({ person, count, lastDate: "2026-07-10" }));
}

describe("buildKnownPeople", () => {
  it("รวมคนเดิมจากหลายรายการเป็นคนเดียวพร้อมนับจำนวน", () => {
    const people = buildKnownPeople([
      expense("e1", "ขนม: [50] ข้าว"),
      expense("e2", "ขนม: [30] กาแฟ"),
    ]);
    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({ person: "ขนม", count: 2 });
  });

  it("ชื่อที่ลงท้ายด้วย จ่าย เป็นคนเดียวกัน", () => {
    // suffix จ่าย บอกแค่ทิศทาง ไม่ใช่คนละคน
    const people = buildKnownPeople([
      expense("e1", "ขนม: [50] ข้าว"),
      expense("e2", "ขนมจ่าย: [30] กาแฟ"),
    ]);
    expect(people).toHaveLength(1);
    expect(people[0].count).toBe(2);
  });

  it("เรียงคนที่เจอบ่อยสุดขึ้นก่อน", () => {
    const people = buildKnownPeople([
      expense("e1", "ต้อม: [10] ก"),
      expense("e2", "ขนม: [10] ข"),
      expense("e3", "ขนม: [10] ค"),
    ]);
    expect(people.map((p) => p.person)).toEqual(["ขนม", "ต้อม"]);
  });

  it("เก็บวันที่ล่าสุดที่เจอ", () => {
    const people = buildKnownPeople([
      expense("e1", "ขนม: [10] ก", "2026-07-01"),
      expense("e2", "ขนม: [10] ข", "2026-07-20"),
    ]);
    expect(people[0].lastDate).toBe("2026-07-20");
  });

  it("รายการที่ไม่มี split ไม่สร้างคน", () => {
    expect(buildKnownPeople([expense("e1", "ข้าวเที่ยง")])).toEqual([]);
  });
});

describe("isKnownPerson", () => {
  it("เจอชื่อที่มีอยู่", () => {
    expect(isKnownPerson("ขนม", known(["ขนม", 2]))).toBe(true);
  });

  it("normalize ก่อนเทียบ", () => {
    expect(isKnownPerson("  ขนม จ่าย ", known(["ขนม", 2]))).toBe(true);
  });

  it("ชื่อใหม่คืน false", () => {
    expect(isKnownPerson("ขนน", known(["ขนม", 2]))).toBe(false);
  });

  it("ลิสต์ว่างคืน false เสมอ", () => {
    // ตอน store ยังไม่โหลด ลิสต์จะว่าง — ฝั่ง UI ต้องไม่เอาไปเตือน
    expect(isKnownPerson("ขนม", [])).toBe(false);
  });
});

describe("nearestPerson", () => {
  it("พิมพ์ผิดตัวเดียวเดาถูก", () => {
    expect(nearestPerson("ขนน", known(["ขนม", 3]))).toBe("ขนม");
  });

  it("ชื่อที่ถูกอยู่แล้วไม่ใช่ typo", () => {
    expect(nearestPerson("ขนม", known(["ขนม", 3]))).toBeNull();
  });

  it("คนละชื่อกันจริงๆ ไม่เดา", () => {
    expect(nearestPerson("ต้อม", known(["ขนม", 3]))).toBeNull();
  });

  it("ห้ามเสนอชื่อที่เจอครั้งเดียว", () => {
    // ชื่อที่เจอหนเดียวอาจเป็น typo เสียเอง เสนอไปคือรับรองความผิดพลาด
    expect(nearestPerson("ขนน", known(["ขนม", 1]))).toBeNull();
  });

  it("ใกล้เท่ากันสองคนไม่เดา", () => {
    expect(nearestPerson("ปอม", known(["ป้อม", 3], ["ตอม", 3]))).toBeNull();
  });

  it("ลิสต์ว่างคืน null", () => {
    expect(nearestPerson("ขนม", [])).toBeNull();
  });

  it("ชื่อว่างคืน null", () => {
    expect(nearestPerson("   ", known(["ขนม", 3]))).toBeNull();
  });

  it("ความยาวต่างกันมากไม่เดา", () => {
    expect(nearestPerson("ก", known(["กขคงจฉ", 5]))).toBeNull();
  });
});
