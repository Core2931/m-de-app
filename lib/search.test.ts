import { describe, expect, it } from "vitest";
import { matchesQuery, parseQuery, normalizeSearchText } from "@/lib/search";
import type { Expense } from "@/types";

function expense(item: string, remark = ""): Expense {
  return {
    id: "e1",
    date: "2026-07-10",
    item,
    amount: 100,
    remark,
    category: "food",
    createdAt: "2026-07-10T05:00:00.000Z",
  };
}

const ZWSP = "\u200B"; // escape, not the literal char — it is invisible in an editor

function hit(item: string, query: string, remark = ""): boolean {
  return matchesQuery(expense(item, remark), parseQuery(query));
}

describe("matchesQuery", () => {
  it("หาคำไทยกลางคำได้", () => {
    // ไทยไม่มีขอบเขตคำ substring จึงเป็น primitive เดียวที่ใช้ได้
    expect(hit("ข้าวเที่ยง", "เที่ยง")).toBe(true);
    expect(hit("ข้าวเที่ยง", "าวเท")).toBe(true);
  });

  it("zero-width space ในข้อความที่เก็บไว้ ต้องยังหาเจอ", () => {
    // ข้อความ paste จาก LINE/เว็บ มักมี ZWSP เป็น soft break
    expect(hit(`ข้าว${ZWSP}เที่ยง`, "ข้าวเที่ยง")).toBe(true);
  });

  it("zero-width space ในคำค้นหา ต้องยังหาเจอ", () => {
    expect(hit("ข้าวเที่ยง", `ข้าว${ZWSP}เที่ยง`)).toBe(true);
  });

  it("อังกฤษไม่สนตัวพิมพ์เล็กใหญ่ทั้งสองทาง", () => {
    expect(hit("Grab Taxi", "grab")).toBe(true);
    expect(hit("grab taxi", "GRAB")).toBe(true);
  });

  it("หลาย term ต้องเจอครบทุกตัว ไม่สนลำดับ", () => {
    expect(hit("ข้าวเที่ยงกับขนม", "ขนม ข้าว")).toBe(true);
    expect(hit("ข้าวเที่ยง", "ขนม ข้าว")).toBe(false);
  });

  it("เจอในหมายเหตุอย่างเดียวก็นับ", () => {
    expect(hit("ข้าวเที่ยง", "ขนม", "ขนม: [50] ค่าข้าว")).toBe(true);
  });

  it("term เดียวห้ามคร่อมรอยต่อ item กับ remark", () => {
    // haystack เป็น "ข้าว\nขนม" → normalize เป็น "ข้าว ขนม"
    // term ไม่มีทางมีช่องว่าง จึงคร่อมไม่ได้
    expect(hit("ข้าว", "ข้าวขนม", "ขนม")).toBe(false);
  });

  it("คำค้นหาว่างหรือมีแต่ช่องว่าง ผ่านหมด", () => {
    expect(hit("อะไรก็ได้", "")).toBe(true);
    expect(hit("อะไรก็ได้", "   ")).toBe(true);
  });

  it("ไม่เจอคืน false", () => {
    expect(hit("ข้าวเที่ยง", "กาแฟ")).toBe(false);
  });

  it("ห้ามหาเจอจากชื่อหมวด", () => {
    // category ของ fixture นี้คือ food แต่ต้องไม่ match "อาหาร"
    // เพราะ chip filter อยู่เหนือช่องค้นหาอยู่แล้ว
    expect(hit("ข้าวเที่ยง", "อาหาร")).toBe(false);
  });
});

describe("parseQuery", () => {
  it("แยก term ด้วยช่องว่าง ตัดตัวว่างทิ้ง", () => {
    expect(parseQuery("  ข้าว   ขนม ")).toEqual(["ข้าว", "ขนม"]);
  });

  it("คำค้นหาว่างคืน array ว่าง", () => {
    expect(parseQuery("")).toEqual([]);
    expect(parseQuery("   ")).toEqual([]);
  });
});

describe("normalizeSearchText", () => {
  it("ยุบช่องว่างและตัดหัวท้าย", () => {
    expect(normalizeSearchText("  a   b  ")).toBe("a b");
  });

  it("ตัด zero-width space ออก", () => {
    expect(normalizeSearchText(`a${ZWSP}b`)).toBe("ab");
  });
});
