import { describe, expect, it } from "vitest";
import {
  buildSlipRow,
  findDuplicateIds,
  isRowReady,
  rowToNewExpense,
  saveRows,
  type SlipRow,
} from "@/lib/slipImport";
import type { SlipRead } from "@/lib/slipParse";
import type { Expense, NewExpense } from "@/types";

const TODAY = "2026-10-02";

function read(overrides: Partial<SlipRead> = {}): SlipRead {
  return { amount: 60, date: "2026-10-01", time: "12:57", payee: "ทองใบshop", ...overrides };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "e1",
    date: "2026-10-01",
    item: "ข้าวเที่ยง",
    amount: 60,
    remark: "",
    category: "food",
    createdAt: "2026-10-01T05:00:00.000Z",
    ...overrides,
  };
}

function row(overrides: Partial<SlipRow> = {}): SlipRow {
  return {
    id: "r1",
    fileName: "slip.jpg",
    date: "2026-10-01",
    amount: "60",
    item: "ข้าวเที่ยง",
    category: "food",
    payee: "ทองใบshop",
    dateGuessed: false,
    readError: false,
    ...overrides,
  };
}

describe("buildSlipRow", () => {
  it("ใช้ยอด วันที่ และชื่อร้านจากสลิป", () => {
    const built = buildSlipRow("r1", "slip.jpg", read(), [], TODAY);
    expect(built).toMatchObject({
      id: "r1",
      fileName: "slip.jpg",
      date: "2026-10-01",
      amount: "60",
      payee: "ทองใบshop",
      dateGuessed: false,
      readError: false,
    });
  });

  it("ร้านที่ไม่เคยเจอ รายการว่างและหมวดเป็นค่าเริ่มต้น", () => {
    const built = buildSlipRow("r1", "slip.jpg", read(), [], TODAY);
    expect(built.item).toBe("");
    expect(built.category).toBe("food");
  });

  it("ร้านที่เคยบันทึก เติมรายการกับหมวดให้", () => {
    const history = [expense({ payee: "ทองใบshop", item: "ข้าวกล่อง", category: "goods" })];
    const built = buildSlipRow("r1", "slip.jpg", read(), history, TODAY);
    expect(built.item).toBe("ข้าวกล่อง");
    expect(built.category).toBe("goods");
  });

  it("อ่านวันที่ไม่ได้ ใช้วันนี้และติดป้ายว่าเดา", () => {
    const built = buildSlipRow("r1", "slip.jpg", read({ date: null, time: null }), [], TODAY);
    expect(built.date).toBe(TODAY);
    expect(built.dateGuessed).toBe(true);
  });

  it("อ่านยอดไม่ได้ ช่องยอดว่าง ไม่ใช่ 0 หรือ null", () => {
    expect(buildSlipRow("r1", "slip.jpg", read({ amount: null }), [], TODAY).amount).toBe("");
  });

  it("อ่านชื่อร้านไม่ได้ payee เป็นข้อความว่าง", () => {
    expect(buildSlipRow("r1", "slip.jpg", read({ payee: null }), [], TODAY).payee).toBe("");
  });

  it("ไฟล์ที่อ่านไม่ได้เลย ได้แถวว่างที่ติดป้ายอ่านไม่ได้", () => {
    // เช่น HEIC หรือไฟล์ที่ไม่ใช่รูป — ผู้ใช้ยังกรอกเองหรือลบแถวได้
    const built = buildSlipRow("r1", "photo.heic", null, [], TODAY);
    expect(built).toEqual({
      id: "r1",
      fileName: "photo.heic",
      date: TODAY,
      amount: "",
      item: "",
      category: "food",
      payee: "",
      dateGuessed: false,
      readError: true,
    });
  });
});

describe("isRowReady", () => {
  it("มีรายการและยอดมากกว่า 0 พร้อมบันทึก", () => {
    expect(isRowReady(row())).toBe(true);
    expect(isRowReady(row({ amount: "115.50" }))).toBe(true);
  });

  it("รายการว่างหรือมีแต่ช่องว่าง ยังไม่พร้อม", () => {
    expect(isRowReady(row({ item: "" }))).toBe(false);
    expect(isRowReady(row({ item: "   " }))).toBe(false);
  });

  it("ยอดว่าง ศูนย์ ติดลบ หรือไม่ใช่ตัวเลข ยังไม่พร้อม", () => {
    expect(isRowReady(row({ amount: "" }))).toBe(false);
    expect(isRowReady(row({ amount: "   " }))).toBe(false);
    expect(isRowReady(row({ amount: "0" }))).toBe(false);
    expect(isRowReady(row({ amount: "-5" }))).toBe(false);
    expect(isRowReady(row({ amount: "abc" }))).toBe(false);
    expect(isRowReady(row({ amount: "12abc" }))).toBe(false);
  });

  it("วันที่ที่ไม่ใช่ YYYY-MM-DD ยังไม่พร้อม", () => {
    expect(isRowReady(row({ date: "" }))).toBe(false);
    expect(isRowReady(row({ date: "01/10/2026" }))).toBe(false);
  });
});

describe("findDuplicateIds", () => {
  it("วันที่และยอดตรงกับรายการที่มีอยู่ ถือว่าอาจซ้ำ", () => {
    const duplicates = findDuplicateIds([row()], [expense()]);
    expect([...duplicates]).toEqual(["r1"]);
  });

  it("ยอดตรงแต่คนละวัน ไม่ซ้ำ", () => {
    expect(findDuplicateIds([row({ date: "2026-10-02" })], [expense()]).size).toBe(0);
  });

  it("วันตรงแต่คนละยอด ไม่ซ้ำ", () => {
    expect(findDuplicateIds([row({ amount: "61" })], [expense()]).size).toBe(0);
  });

  it("60 กับ 60.00 คือยอดเดียวกัน", () => {
    expect(findDuplicateIds([row({ amount: "60.00" })], [expense()]).size).toBe(1);
  });

  it("สลิปใบเดียวกันถูกเลือกสองครั้งในรอบเดียว ซ้ำทั้งสองแถว", () => {
    const rows = [row({ id: "r1" }), row({ id: "r2" })];
    expect([...findDuplicateIds(rows, [])].sort()).toEqual(["r1", "r2"]);
  });

  it("แถวที่ยอดยังใช้ไม่ได้ ไม่ถูกนับว่าซ้ำ", () => {
    const rows = [row({ id: "r1", amount: "" }), row({ id: "r2", amount: "" })];
    expect(findDuplicateIds(rows, []).size).toBe(0);
  });
});

describe("rowToNewExpense", () => {
  it("แปลงเป็นรายจ่ายใหม่ โดย remark ว่างเสมอ", () => {
    expect(rowToNewExpense(row({ item: "  ข้าวเที่ยง  ", amount: "60.00" }))).toEqual({
      date: "2026-10-01",
      item: "ข้าวเที่ยง",
      amount: 60,
      remark: "",
      category: "food",
      payee: "ทองใบshop",
    });
  });

  it("ไม่มีชื่อร้าน ไม่มี key payee", () => {
    expect(rowToNewExpense(row({ payee: "" }))).not.toHaveProperty("payee");
  });
});

describe("saveRows", () => {
  it("บันทึกทีละแถวตามลำดับ", async () => {
    const saved: NewExpense[] = [];
    const outcome = await saveRows(
      [row({ id: "r1", item: "หนึ่ง" }), row({ id: "r2", item: "สอง" })],
      async (input) => {
        saved.push(input);
      }
    );
    expect(saved.map((s) => s.item)).toEqual(["หนึ่ง", "สอง"]);
    expect(outcome).toEqual({ savedIds: ["r1", "r2"], error: null });
  });

  it("แถวถัดไปไม่เริ่มจนกว่าแถวก่อนหน้าจะเสร็จ", async () => {
    // Sheets append ที่ซ้อนกันเสี่ยงเขียนทับแถว — ต้องไม่มีสองคำขอค้างพร้อมกัน
    let inFlight = 0;
    let maxInFlight = 0;
    await saveRows([row({ id: "r1" }), row({ id: "r2" }), row({ id: "r3" })], async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
    });
    expect(maxInFlight).toBe(1);
  });

  it("ล้มกลางคัน หยุดทันทีและบอกว่าแถวไหนสำเร็จแล้ว", async () => {
    const attempted: string[] = [];
    const outcome = await saveRows(
      [row({ id: "r1", item: "หนึ่ง" }), row({ id: "r2", item: "สอง" }), row({ id: "r3", item: "สาม" })],
      async (input) => {
        attempted.push(input.item);
        if (input.item === "สอง") throw new Error("บันทึกไม่สำเร็จ");
      }
    );
    expect(attempted).toEqual(["หนึ่ง", "สอง"]);
    expect(outcome).toEqual({ savedIds: ["r1"], error: "บันทึกไม่สำเร็จ" });
  });

  it("ไม่มีแถว ไม่เรียกบันทึกเลย", async () => {
    let calls = 0;
    const outcome = await saveRows([], async () => {
      calls += 1;
    });
    expect(calls).toBe(0);
    expect(outcome).toEqual({ savedIds: [], error: null });
  });
});
