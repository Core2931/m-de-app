import { describe, expect, it } from "vitest";
import { normalizePayee, suggestFromPayee } from "@/lib/payees";
import type { Category } from "@/lib/categories";
import type { Expense } from "@/types";

let seq = 0;
function expense(
  payee: string | undefined,
  item: string,
  date = "2026-10-01",
  category: Category = "food",
  createdAt = date + "T05:00:00.000Z"
): Expense {
  seq += 1;
  return {
    id: "e" + seq,
    date,
    item,
    amount: 50,
    remark: "",
    category,
    createdAt,
    ...(payee === undefined ? {} : { payee }),
  };
}

describe("normalizePayee", () => {
  it("ตัดช่องว่าง ตัวเลข เครื่องหมาย และสระบน/วรรณยุกต์ออก", () => {
    expect(normalizePayee("ลอว์สัน-P3821-โอเอไอ ทาวเวอร์")).toBe("ลอวสนpโอเอไอทาวเวอร");
  });

  it("เลขไทยถูกตัดเหมือนเลขอารบิก", () => {
    expect(normalizePayee("ทองใบรก๐๐")).toBe("ทองใบรก");
  });
});

describe("suggestFromPayee", () => {
  it("ไม่มีประวัติเลย คืน null", () => {
    expect(suggestFromPayee("คาเฟ่อเมซอน", [])).toBeNull();
  });

  it("ชื่อตรงกัน คืนรายการกับหมวดของร้านนั้น", () => {
    const history = [expense("คาเฟ่อเมซอน อาคารไทยซัมมิท", "กาแฟ", "2026-10-01", "food")];
    expect(suggestFromPayee("คาเฟ่อเมซอน อาคารไทยซัมมิท", history)).toEqual({
      item: "กาแฟ",
      category: "food",
    });
  });

  it("OCR ทำวรรณยุกต์หาย ยังจับคู่ได้", () => {
    const history = [expense("คาเฟ่อเมซอน อาคารไทยซัมมิท", "กาแฟ")];
    expect(suggestFromPayee("คาเฟอเมซอน อาคารไทยซัมมิท", history)?.item).toBe("กาแฟ");
  });

  it("OCR อ่านตัวอักษรในรหัสสาขาเพี้ยน ยังจับคู่ได้", () => {
    const history = [expense("ลอว์สัน-P3821-โอเอไอ ทาวเวอร์", "ขนม", "2026-10-01", "goods")];
    expect(suggestFromPayee("ลอว์สัน-23821-โอเอไอ ทาวเวอร์", history)).toEqual({
      item: "ขนม",
      category: "goods",
    });
  });

  it("ร้านที่ไม่เกี่ยวกัน คืน null", () => {
    const history = [expense("คาเฟ่อเมซอน อาคารไทยซัมมิท", "กาแฟ")];
    expect(suggestFromPayee("ชานานาชาติ ชามารวย", history)).toBeNull();
  });

  it("ชื่อสั้นกว่า 3 ตัวอักษรไม่จับคู่ แม้จะตรงกันเป๊ะ", () => {
    const history = [expense("กข", "ของ")];
    expect(suggestFromPayee("กข", history)).toBeNull();
  });

  it("ใกล้เคียงสองร้านเท่ากัน ไม่เดา", () => {
    const history = [expense("กขคงจช", "ร้านหนึ่ง"), expense("กขคงจซ", "ร้านสอง")];
    expect(suggestFromPayee("กขคงจฉ", history)).toBeNull();
  });

  it("ร้านเดียวหลายรายการ ใช้ของวันล่าสุด", () => {
    const history = [
      expense("ทองใบshop", "ข้าวเที่ยง", "2026-09-28", "food"),
      expense("ทองใบshop", "ข้าวเย็น", "2026-10-01", "food"),
      expense("ทองใบshop", "ข้าวเช้า", "2026-09-30", "food"),
    ];
    expect(suggestFromPayee("ทองใบshop", history)?.item).toBe("ข้าวเย็น");
  });

  it("วันเดียวกัน ใช้ของที่บันทึกทีหลัง", () => {
    const history = [
      expense("ทองใบshop", "รอบเช้า", "2026-10-01", "food", "2026-10-01T02:00:00.000Z"),
      expense("ทองใบshop", "รอบค่ำ", "2026-10-01", "food", "2026-10-01T12:00:00.000Z"),
    ];
    expect(suggestFromPayee("ทองใบshop", history)?.item).toBe("รอบค่ำ");
  });

  it("รายการที่ไม่มี payee ไม่ถูกนำมาจับคู่", () => {
    const history = [expense(undefined, "ทองใบshop"), expense("", "ทองใบshop")];
    expect(suggestFromPayee("ทองใบshop", history)).toBeNull();
  });

  it("ชื่อร้านว่าง คืน null", () => {
    expect(suggestFromPayee("   ", [expense("ทองใบshop", "ข้าว")])).toBeNull();
  });
});
