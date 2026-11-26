import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendExpense, setPayMethods, updateExpense } from "@/lib/sheets";

// Only the Google client is faked: the thing under test is which cells get
// written, and a real write would need credentials and a live sheet.
const values = {
  get: vi.fn(),
  update: vi.fn(),
  append: vi.fn(),
  batchUpdate: vi.fn(),
};

vi.mock("@/lib/sheetsClient", () => ({
  getSheetsClient: () => ({ spreadsheets: { values } }),
  getSheetId: () => "sheet-id",
  getSheetGid: async () => 0,
  findRowNumber: async (_tab: string, id: string) => (id === "a" ? 2 : null),
}));

beforeEach(() => {
  Object.values(values).forEach((fn) => fn.mockReset());
});

describe("setPayMethods", () => {
  it("เขียนเฉพาะ I:J ของแต่ละแถว ใน request เดียวแบบ RAW", async () => {
    values.get.mockResolvedValue({ data: { values: [["a"], ["b"], ["c"]] } });

    const done = await setPayMethods([
      { id: "c", pay: "card_paid", paidAt: "2026-11-26" },
      { id: "a", pay: "card_later" },
    ]);

    expect(done).toBe(true);
    expect(values.batchUpdate).toHaveBeenCalledTimes(1);
    expect(values.batchUpdate.mock.calls[0][0].requestBody).toEqual({
      valueInputOption: "RAW",
      data: [
        { range: "expenses!I4:J4", values: [["card_paid", "2026-11-26"]] },
        { range: "expenses!I2:J2", values: [["card_later", ""]] },
      ],
    });
  });

  it("หา id ไม่เจอแม้ตัวเดียว ไม่เขียนอะไรเลย", async () => {
    values.get.mockResolvedValue({ data: { values: [["a"]] } });

    const done = await setPayMethods([
      { id: "a", pay: "card_due" },
      { id: "deleted", pay: "card_due" },
    ]);

    expect(done).toBe(false);
    expect(values.batchUpdate).not.toHaveBeenCalled();
  });
});

describe("updateExpense", () => {
  const edit = { date: "2026-11-20", item: "กาแฟ", amount: 70, remark: "", category: "food" as const };

  it("request ไม่ส่ง pay คง pay กับ paidAt เดิม และไม่เขียน H", async () => {
    values.get.mockResolvedValue({
      data: { values: [["2026-11-20T08:00:00.000Z", "food", "ร้านเดิม", "card_paid", "2026-11-21"]] },
    });

    const result = await updateExpense("a", edit);

    expect(result).toMatchObject({ payee: "ร้านเดิม", pay: "card_paid", paidAt: "2026-11-21" });
    const { data } = values.batchUpdate.mock.calls[0][0].requestBody;
    expect(data.map((d: { range: string }) => d.range)).toEqual(["expenses!A2:G2", "expenses!I2:J2"]);
    expect(data[0].values[0]).toHaveLength(7);
    expect(data[1].values[0]).toEqual(["card_paid", "'2026-11-21"]);
  });

  it("เปลี่ยนเป็นเงินสด ล้าง J", async () => {
    values.get.mockResolvedValue({
      data: { values: [["2026-11-20T08:00:00.000Z", "food", "", "card_paid", "2026-11-21"]] },
    });

    await updateExpense("a", { ...edit, pay: "cash" });

    const { data } = values.batchUpdate.mock.calls[0][0].requestBody;
    expect(data[1].values[0]).toEqual(["cash", ""]);
  });
});

describe("appendExpense", () => {
  it("แถวใหม่เขียนช่วง A:J และ paidAt เป็นข้อความ", async () => {
    await appendExpense({
      date: "2026-11-26",
      item: "กาแฟ",
      amount: 65,
      remark: "",
      category: "food",
      pay: "card_paid",
      paidAt: "2026-11-26",
    });

    const call = values.append.mock.calls[0][0];
    expect(call.range).toBe("expenses!A2:J");
    expect(call.requestBody.values[0].slice(8)).toEqual(["card_paid", "'2026-11-26"]);
  });
});
