import { describe, expect, it } from "vitest";
import { expenseToCoreRow, expenseToPayCells, expenseToRow, rowToExpense } from "@/lib/expenseRows";
import type { Expense } from "@/types";

const base: Expense = {
  id: "e1",
  date: "2026-10-01",
  item: "กาแฟ",
  amount: 115,
  remark: "",
  createdAt: "2026-10-01T08:00:00.000Z",
  category: "food",
};

describe("rowToExpense", () => {
  it("แถวที่มี column H ได้ payee", () => {
    const row = ["e1", "2026-10-01", "กาแฟ", "115", "", "2026-10-01T08:00:00.000Z", "food", "คาเฟ่อเมซอน"];
    expect(rowToExpense(row)).toEqual({ ...base, payee: "คาเฟ่อเมซอน" });
  });

  it("แถวที่ไม่มี column H ไม่มี key payee", () => {
    const row = ["e1", "2026-10-01", "กาแฟ", "115", "", "2026-10-01T08:00:00.000Z", "food"];
    expect(rowToExpense(row)).toEqual(base);
    expect(rowToExpense(row)).not.toHaveProperty("payee");
  });

  it("แถวเก่าที่ไม่มี column G ได้หมวดเริ่มต้น", () => {
    const row = ["e1", "2026-10-01", "กาแฟ", "115", "", "2026-10-01T08:00:00.000Z"];
    expect(rowToExpense(row).category).toBe("food");
  });

  it("ยอดที่ไม่ใช่ตัวเลขเป็น 0 ไม่ใช่ NaN", () => {
    const row = ["e1", "2026-10-01", "กาแฟ", "abc", "", "2026-10-01T08:00:00.000Z", "food"];
    expect(rowToExpense(row).amount).toBe(0);
  });
});

describe("expenseToRow", () => {
  it("เขียน 10 ช่อง payee อยู่ H ส่วน I กับ J ว่างเมื่อไม่ระบุ", () => {
    expect(expenseToRow({ ...base, payee: "คาเฟ่อเมซอน" })).toEqual([
      "e1",
      "2026-10-01",
      "กาแฟ",
      "115",
      "",
      "2026-10-01T08:00:00.000Z",
      "food",
      "คาเฟ่อเมซอน",
      "",
      "",
    ]);
  });

  it("ไม่มี payee เขียนช่อง H เป็นค่าว่าง", () => {
    const row = expenseToRow(base);
    expect(row).toHaveLength(10);
    expect(row[7]).toBe("");
  });

  it("อ่านกลับได้ค่าเดิม", () => {
    const expense = { ...base, payee: "คาเฟ่อเมซอน" };
    expect(rowToExpense(expenseToRow(expense))).toEqual(expense);
  });
});

describe("expenseToCoreRow", () => {
  it("เขียนแค่ 7 ช่อง ไม่มี payee แม้ expense จะมี", () => {
    // update เขียนช่วง A:G — ถ้าหลุดเป็น 8 ช่อง Sheets จะปฏิเสธ request
    const row = expenseToCoreRow({ ...base, payee: "คาเฟ่อเมซอน" });
    expect(row).toHaveLength(7);
    expect(row).not.toContain("คาเฟ่อเมซอน");
  });
});

describe("คอลัมน์ pay (I) และ paidAt (J)", () => {
  const core = ["e1", "2026-10-01", "กาแฟ", "115", "", "2026-10-01T08:00:00.000Z", "food"];

  it("แถวเก่า 8 ช่อง ไม่มี key pay และ paidAt", () => {
    expect(rowToExpense([...core, ""])).not.toHaveProperty("pay");
    expect(rowToExpense([...core, ""])).not.toHaveProperty("paidAt");
  });

  it("อ่าน I และ J", () => {
    expect(rowToExpense([...core, "", "card_paid", "2026-11-26"])).toMatchObject({
      pay: "card_paid",
      paidAt: "2026-11-26",
    });
  });

  it("อ่าน card_later_paid พร้อมวันที่โอน", () => {
    expect(rowToExpense([...core, "", "card_later_paid", "2026-11-26"])).toMatchObject({
      pay: "card_later_paid",
      paidAt: "2026-11-26",
    });
  });

  it("ค่า pay ที่ไม่รู้จักถือว่าว่าง และ paidAt ถูกทิ้ง", () => {
    const read = rowToExpense([...core, "", "visa", "2026-11-26"]);
    expect(read).not.toHaveProperty("pay");
    expect(read).not.toHaveProperty("paidAt");
  });

  it("paidAt ที่ไม่ใช่ YYYY-MM-DD หรือไม่ใช่โอนแล้ว ถูกทิ้ง", () => {
    expect(rowToExpense([...core, "", "card_paid", "26/11/2026"])).not.toHaveProperty("paidAt");
    expect(rowToExpense([...core, "", "cash", "2026-11-26"])).not.toHaveProperty("paidAt");
  });

  it("แถวใหม่เขียน paidAt เป็นข้อความ ไม่ให้ Sheets แปลงเป็นวันที่", () => {
    const row = expenseToRow({ ...base, pay: "card_paid", paidAt: "2026-11-26" });
    expect(row.slice(8)).toEqual(["card_paid", "'2026-11-26"]);
  });

  it("expenseToPayCells สำหรับเขียนแบบ RAW ไม่มี apostrophe", () => {
    expect(expenseToPayCells({ pay: "card_paid", paidAt: "2026-11-26" })).toEqual([
      "card_paid",
      "2026-11-26",
    ]);
    expect(expenseToPayCells({})).toEqual(["", ""]);
  });
});
