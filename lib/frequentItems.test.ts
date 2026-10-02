import { describe, expect, it } from "vitest";
import { buildFrequentItems } from "@/lib/frequentItems";
import type { Category } from "@/lib/categories";
import type { Expense } from "@/types";

const TODAY = "2026-10-02";

let seq = 0;
function expense(
  item: string,
  date: string,
  amount = 50,
  category: Category = "food",
  createdAt = date + "T05:00:00.000Z"
): Expense {
  seq += 1;
  return { id: "e" + seq, date, item, amount, remark: "", category, createdAt };
}

describe("buildFrequentItems", () => {
  it("รวมรายการชื่อเดียวกันเป็นอันเดียวพร้อมนับจำนวน", () => {
    const items = buildFrequentItems(
      [expense("ข้าวเที่ยง", "2026-10-01"), expense("ข้าวเที่ยง", "2026-09-30")],
      TODAY
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ item: "ข้าวเที่ยง", count: 2 });
  });

  it("รายการที่เคยบันทึกครั้งเดียวไม่นับเป็นรายการประจำ", () => {
    expect(buildFrequentItems([expense("ค่าตัดผม", "2026-10-01")], TODAY)).toEqual([]);
  });

  it("เรียงรายการที่บันทึกบ่อยสุดขึ้นก่อน", () => {
    const items = buildFrequentItems(
      [
        expense("กาแฟ", "2026-10-01"),
        expense("กาแฟ", "2026-09-30"),
        expense("ข้าวเที่ยง", "2026-10-01"),
        expense("ข้าวเที่ยง", "2026-09-30"),
        expense("ข้าวเที่ยง", "2026-09-29"),
      ],
      TODAY
    );
    expect(items.map((i) => i.item)).toEqual(["ข้าวเที่ยง", "กาแฟ"]);
  });

  it("จำนวนครั้งเท่ากัน รายการที่บันทึกล่าสุดขึ้นก่อน", () => {
    const items = buildFrequentItems(
      [
        expense("กาแฟ", "2026-09-20"),
        expense("กาแฟ", "2026-09-21"),
        expense("ค่ารถ", "2026-09-30"),
        expense("ค่ารถ", "2026-10-01"),
      ],
      TODAY
    );
    expect(items.map((i) => i.item)).toEqual(["ค่ารถ", "กาแฟ"]);
  });

  it("ยอดเงินใช้ของครั้งล่าสุด", () => {
    const items = buildFrequentItems(
      [
        expense("ข้าวเที่ยง", "2026-10-01", 65),
        expense("ข้าวเที่ยง", "2026-09-28", 50),
        expense("ข้าวเที่ยง", "2026-09-29", 55),
      ],
      TODAY
    );
    expect(items[0].amount).toBe(65);
  });

  it("วันเดียวกันหลายครั้ง ยอดเงินใช้ของที่บันทึกทีหลัง", () => {
    const items = buildFrequentItems(
      [
        expense("กาแฟ", "2026-10-01", 70, "food", "2026-10-01T09:00:00.000Z"),
        expense("กาแฟ", "2026-10-01", 45, "food", "2026-10-01T02:00:00.000Z"),
      ],
      TODAY
    );
    expect(items[0].amount).toBe(70);
  });

  it("หมวดหมู่ใช้หมวดที่ถูกเลือกบ่อยสุดของรายการนั้น", () => {
    // ครั้งล่าสุดเลือกผิดหมวดไปครั้งเดียว ไม่ควรลากทั้งรายการตามไป
    const items = buildFrequentItems(
      [
        expense("กาแฟ", "2026-10-01", 50, "other"),
        expense("กาแฟ", "2026-09-30", 50, "food"),
        expense("กาแฟ", "2026-09-29", 50, "food"),
      ],
      TODAY
    );
    expect(items[0].category).toBe("food");
  });

  it("หมวดหมู่เสมอกัน ใช้ของครั้งล่าสุด", () => {
    const items = buildFrequentItems(
      [
        expense("น้ำ", "2026-09-29", 10, "food"),
        expense("น้ำ", "2026-10-01", 10, "goods"),
      ],
      TODAY
    );
    expect(items[0].category).toBe("goods");
  });

  it("รายการเก่ากว่า 60 วันไม่ถูกนับ", () => {
    // 2026-08-03 คือ 60 วันก่อน TODAY พอดี — ยังนับ, 2026-08-02 ไม่นับแล้ว
    const items = buildFrequentItems(
      [
        expense("ค่าเน็ต", "2026-08-02"),
        expense("ค่าเน็ต", "2026-08-03"),
        expense("ค่ารถ", "2026-08-03"),
        expense("ค่ารถ", "2026-10-01"),
      ],
      TODAY
    );
    expect(items.map((i) => i.item)).toEqual(["ค่ารถ"]);
  });

  it("ช่องว่างหน้าหลังชื่อรายการไม่ทำให้เป็นคนละรายการ", () => {
    const items = buildFrequentItems(
      [expense("ข้าวเที่ยง ", "2026-10-01"), expense(" ข้าวเที่ยง", "2026-09-30")],
      TODAY
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ item: "ข้าวเที่ยง", count: 2 });
  });
});
