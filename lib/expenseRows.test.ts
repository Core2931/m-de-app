import { describe, expect, it } from "vitest";
import { expenseToCoreRow, expenseToRow, rowToExpense } from "@/lib/expenseRows";
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
  it("เขียน 8 ช่อง โดย payee อยู่ช่องสุดท้าย", () => {
    expect(expenseToRow({ ...base, payee: "คาเฟ่อเมซอน" })).toEqual([
      "e1",
      "2026-10-01",
      "กาแฟ",
      "115",
      "",
      "2026-10-01T08:00:00.000Z",
      "food",
      "คาเฟ่อเมซอน",
    ]);
  });

  it("ไม่มี payee เขียนช่องสุดท้ายเป็นค่าว่าง", () => {
    const row = expenseToRow(base);
    expect(row).toHaveLength(8);
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
