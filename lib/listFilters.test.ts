import { describe, expect, it } from "vitest";
import { hiddenFilterCount } from "@/lib/listFilters";

describe("hiddenFilterCount", () => {
  it("ยังไม่กรองอะไร เป็นศูนย์", () => {
    expect(hiddenFilterCount({ categories: [], pay: "all" })).toBe(0);
  });

  it("นับหมวดทีละอัน ตามที่กดเลือกไว้", () => {
    expect(hiddenFilterCount({ categories: ["food", "goods"], pay: "all" })).toBe(2);
  });

  it("วิธีจ่ายนับเป็นหนึ่ง", () => {
    expect(hiddenFilterCount({ categories: ["food"], pay: "cash" })).toBe(2);
  });
});
