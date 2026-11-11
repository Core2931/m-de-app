import { describe, expect, it } from "vitest";
import { outstandingByExpense } from "@/lib/outstanding";
import type { Expense, Settlement } from "@/types";

function expense(id: string, amount: number, remark = ""): Expense {
  return {
    id,
    date: "2026-11-02",
    item: "x",
    amount,
    remark,
    category: "food",
    createdAt: "2026-11-02T08:00:00.000Z",
  };
}

function settlement(person: string, amount: number, direction: "received" | "paid"): Settlement {
  return {
    id: `s-${person}-${amount}`,
    date: "2026-11-05",
    person,
    amount,
    direction,
    note: "",
    createdAt: "2026-11-05T08:00:00.000Z",
  };
}

describe("outstandingByExpense", () => {
  it("marks an expense where someone still owes us", () => {
    const map = outstandingByExpense([expense("a", 500, "ขนม: [200]")], []);
    expect(map.get("a")).toBe("owed");
  });

  it("marks an expense where we still owe someone", () => {
    const map = outstandingByExpense([expense("a", 500, "ขนมจ่าย: [200]")], []);
    expect(map.get("a")).toBe("owe");
  });

  it("an expense with no splits is never marked", () => {
    expect(outstandingByExpense([expense("a", 500)], []).has("a")).toBe(false);
  });

  it("a fully repaid person clears their expenses", () => {
    const map = outstandingByExpense(
      [expense("a", 500, "ขนม: [200]")],
      [settlement("ขนม", 200, "received")]
    );
    expect(map.has("a")).toBe(false);
  });

  it("a partly repaid person still marks their expenses", () => {
    const map = outstandingByExpense(
      [expense("a", 500, "ขนม: [200]")],
      [settlement("ขนม", 50, "received")]
    );
    expect(map.get("a")).toBe("owed");
  });
});
