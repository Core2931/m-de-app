import { describe, expect, it } from "vitest";
import { validateExpenseInput, validateSettlementInput } from "@/lib/validation";

describe("validateExpenseInput", () => {
  const valid = {
    date: "2026-07-20",
    item: "  ข้าวเที่ยง  ",
    amount: 120.5,
    remark: "  ขนม: [50] ข้าว  ",
    category: "food",
  };

  it("รับข้อมูลที่ถูกต้อง และ trim item กับ remark", () => {
    expect(validateExpenseInput(valid)).toEqual({
      date: "2026-07-20",
      item: "ข้าวเที่ยง",
      amount: 120.5,
      remark: "ขนม: [50] ข้าว",
      category: "food",
    });
  });

  it("ปฏิเสธหมายเหตุที่ยังมี ? ค้างอยู่", () => {
    // "?" ที่หลุดลงชีตจะกลายเป็นคนผีถาวรในยอดค้างหน้า /people
    // ฟอร์มกันไว้แล้ว แต่ตรงนี้ทำให้ POST ตรงก็ทะลุไม่ได้
    expect(validateExpenseInput({ ...valid, remark: "?: [50] " })).toBeNull();
    expect(validateExpenseInput({ ...valid, remark: "ขนม: [20]; ?: [50] " })).toBeNull();
  });

  it("? ที่อยู่ใน label ไม่ใช่ placeholder ต้องผ่าน", () => {
    expect(validateExpenseInput({ ...valid, remark: "ขนม: [50] ค่าอะไร?" })).not.toBeNull();
  });

  it("ปฏิเสธวันที่ผิดรูปแบบ", () => {
    expect(validateExpenseInput({ ...valid, date: "20/07/2026" })).toBeNull();
  });

  it("ปฏิเสธรายการว่าง", () => {
    expect(validateExpenseInput({ ...valid, item: "   " })).toBeNull();
  });

  it("ปฏิเสธจำนวนเงินที่ใช้ไม่ได้", () => {
    expect(validateExpenseInput({ ...valid, amount: 0 })).toBeNull();
    expect(validateExpenseInput({ ...valid, amount: -5 })).toBeNull();
    expect(validateExpenseInput({ ...valid, amount: "120" })).toBeNull();
  });

  it("หมวดที่ไม่รู้จักตกกลับเป็นค่าเริ่มต้น", () => {
    expect(validateExpenseInput({ ...valid, category: "ห้วย" })?.category).toBe("food");
  });
});

// validateSettlementInput is the only thing standing between an untrusted
// request body and a row written into the settlements tab, so every rejection
// path gets pinned down here.
describe("validateSettlementInput", () => {
  const valid = {
    date: "2026-07-20",
    person: "ขนม",
    amount: 120.5,
    direction: "received",
    note: "  โอนคืน  ",
  };

  it("รับข้อมูลที่ถูกต้อง และ trim note", () => {
    expect(validateSettlementInput(valid)).toEqual({
      date: "2026-07-20",
      person: "ขนม",
      amount: 120.5,
      direction: "received",
      note: "โอนคืน",
    });
  });

  it("ตัดคำว่า จ่าย ท้ายชื่อออกเหมือนตอน parse remark", () => {
    expect(validateSettlementInput({ ...valid, person: " ขนม จ่าย " })?.person).toBe("ขนม");
  });

  it("ไม่มี note ก็ได้ คืนเป็นสตริงว่าง", () => {
    const { date, person, amount, direction } = valid;
    expect(validateSettlementInput({ date, person, amount, direction })?.note).toBe("");
  });

  it("note ที่ไม่ใช่สตริงกลายเป็นสตริงว่าง", () => {
    expect(validateSettlementInput({ ...valid, note: 42 })?.note).toBe("");
  });

  it("body ที่ไม่ใช่ object ถูกปฏิเสธ", () => {
    expect(validateSettlementInput(null)).toBeNull();
    expect(validateSettlementInput("ขนม")).toBeNull();
    expect(validateSettlementInput(undefined)).toBeNull();
  });

  it("วันที่ผิดรูปแบบถูกปฏิเสธ", () => {
    expect(validateSettlementInput({ ...valid, date: "20/07/2026" })).toBeNull();
    expect(validateSettlementInput({ ...valid, date: "2026-7-20" })).toBeNull();
    expect(validateSettlementInput({ ...valid, date: "" })).toBeNull();
    expect(validateSettlementInput({ ...valid, date: 20260720 })).toBeNull();
  });

  it("ชื่อว่างหรือมีแต่ช่องว่างถูกปฏิเสธ", () => {
    expect(validateSettlementInput({ ...valid, person: "" })).toBeNull();
    expect(validateSettlementInput({ ...valid, person: "   " })).toBeNull();
    // "จ่าย" is only a direction marker, so it normalizes away to nothing.
    expect(validateSettlementInput({ ...valid, person: "จ่าย" })).toBeNull();
    expect(validateSettlementInput({ ...valid, person: 123 })).toBeNull();
  });

  it("จำนวนเงินที่ไม่เป็นบวกถูกปฏิเสธ", () => {
    expect(validateSettlementInput({ ...valid, amount: 0 })).toBeNull();
    expect(validateSettlementInput({ ...valid, amount: -50 })).toBeNull();
  });

  it("จำนวนเงินที่ไม่ใช่ตัวเลขถูกปฏิเสธ", () => {
    expect(validateSettlementInput({ ...valid, amount: "120" })).toBeNull();
    expect(validateSettlementInput({ ...valid, amount: Number.NaN })).toBeNull();
    expect(validateSettlementInput({ ...valid, amount: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it("ทิศทางนอกเหนือจาก received/paid ถูกปฏิเสธ", () => {
    expect(validateSettlementInput({ ...valid, direction: "paid" })?.direction).toBe("paid");
    expect(validateSettlementInput({ ...valid, direction: "RECEIVED" })).toBeNull();
    expect(validateSettlementInput({ ...valid, direction: "owed_to_me" })).toBeNull();
    expect(validateSettlementInput({ ...valid, direction: undefined })).toBeNull();
  });
});
