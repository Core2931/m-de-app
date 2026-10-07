import { describe, expect, it } from "vitest";
import { countUpValue } from "@/lib/countUp";

describe("countUpValue", () => {
  it("เริ่มที่ค่าเริ่มต้น จบที่ค่าปลายทางพอดี", () => {
    expect(countUpValue(0, 4596, 0)).toBe(0);
    expect(countUpValue(0, 4596, 1)).toBe(4596);
  });

  it("ค่าปลายทางที่มีเศษสตางค์ จบแล้วได้เศษครบ", () => {
    expect(countUpValue(0, 1234.5, 1)).toBe(1234.5);
  });

  it("ระหว่างทางเป็นจำนวนเต็ม ไม่มีเศษสตางค์วิ่ง", () => {
    for (const progress of [0.1, 0.33, 0.5, 0.77, 0.99]) {
      const value = countUpValue(0, 1234.5, progress);
      expect(Number.isInteger(value), String(progress)).toBe(true);
    }
  });

  it("วิ่งเร็วตอนต้นแล้วชะลอ ครึ่งทางเกินครึ่งของยอดแล้ว", () => {
    expect(countUpValue(0, 1000, 0.5)).toBeGreaterThan(500);
    expect(countUpValue(0, 1000, 0.5)).toBeLessThan(1000);
  });

  it("ค่าไม่ถอยหลังระหว่างนับขึ้น", () => {
    let previous = 0;
    for (let step = 0; step <= 20; step++) {
      const value = countUpValue(0, 4596, step / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("นับลงได้เมื่อยอดใหม่น้อยกว่าเดิม", () => {
    expect(countUpValue(1000, 200, 0)).toBe(1000);
    expect(countUpValue(1000, 200, 1)).toBe(200);
    expect(countUpValue(1000, 200, 0.5)).toBeLessThan(1000);
    expect(countUpValue(1000, 200, 0.5)).toBeGreaterThan(200);
  });

  it("progress นอกช่วง 0–1 ถูกหนีบ ไม่เลยปลายทาง", () => {
    expect(countUpValue(0, 500, -1)).toBe(0);
    expect(countUpValue(0, 500, 3)).toBe(500);
    expect(countUpValue(0, 500, NaN)).toBe(500);
  });
});
