import { describe, expect, it } from "vitest";
import {
  cycleFor,
  daysLeftInCycle,
  missingHolidayYear,
  paydayOf,
  previousCycle,
  previousCycleFrom,
} from "@/lib/payCycle";

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

describe("paydayOf", () => {
  it("วันที่ 29 เป็นวันทำการ เงินออกวันนั้น", () => {
    expect(paydayOf(2026, 9)).toBe("2026-09-29"); // อังคาร
    expect(paydayOf(2026, 10)).toBe("2026-10-29"); // พฤหัส
  });

  it("วันที่ 29 เป็นวันเสาร์ ออกวันศุกร์", () => {
    expect(paydayOf(2026, 8)).toBe("2026-08-28");
  });

  it("วันที่ 29 เป็นวันอาทิตย์ ออกวันศุกร์", () => {
    expect(paydayOf(2026, 3)).toBe("2026-03-27");
    expect(paydayOf(2026, 11)).toBe("2026-11-27");
  });

  it("วันหยุดธนาคารติดกัน ถอยจนเจอวันทำการ", () => {
    // 29 ก.ค. 2569 วันอาสาฬหบูชา, 28 ก.ค. วันเฉลิมฯ — เงินออกจริงวันจันทร์ที่ 27
    expect(paydayOf(2026, 7)).toBe("2026-07-27");
  });

  it("กุมภาพันธ์ปีปกติ ใช้วันสุดท้ายของเดือนแล้วถอยตามกติกา", () => {
    expect(paydayOf(2026, 2)).toBe("2026-02-27"); // 28 เป็นเสาร์
    expect(paydayOf(2027, 2)).toBe("2027-02-26"); // 28 เป็นอาทิตย์
  });

  it("กุมภาพันธ์ปีอธิกสุรทิน มีวันที่ 29", () => {
    expect(paydayOf(2028, 2)).toBe("2028-02-29"); // อังคาร
  });
});

describe("cycleFor", () => {
  it("วันกลางรอบ ได้รอบที่เริ่มวันเงินออกครั้งล่าสุด", () => {
    expect(cycleFor("2026-10-06")).toEqual({
      start: "2026-09-29",
      end: "2026-10-28",
      nextPayday: "2026-10-29",
      budgetMonth: "2026-10",
    });
  });

  it("วันเงินออกเป็นวันแรกของรอบใหม่", () => {
    expect(cycleFor("2026-09-29").start).toBe("2026-09-29");
    expect(cycleFor("2026-09-29").budgetMonth).toBe("2026-10");
  });

  it("วันก่อนเงินออกยังอยู่รอบเก่า", () => {
    expect(cycleFor("2026-09-28")).toEqual({
      start: "2026-08-28",
      end: "2026-09-28",
      nextPayday: "2026-09-29",
      budgetMonth: "2026-09",
    });
  });

  it("เดือนที่เงินออกเร็วเพราะวันหยุด รอบใหม่เริ่มเร็วตาม", () => {
    expect(cycleFor("2026-07-27").start).toBe("2026-07-27");
    expect(cycleFor("2026-07-27").budgetMonth).toBe("2026-08");
    expect(cycleFor("2026-07-26")).toEqual({
      start: "2026-06-29",
      end: "2026-07-26",
      nextPayday: "2026-07-27",
      budgetMonth: "2026-07",
    });
  });

  it("รอบที่เริ่มปลายธันวาคม ใช้งบมกราคมของปีถัดไป", () => {
    const expected = {
      start: "2026-12-29",
      end: "2027-01-28",
      nextPayday: "2027-01-29",
      budgetMonth: "2027-01",
    };
    expect(cycleFor("2026-12-30")).toEqual(expected);
    expect(cycleFor("2027-01-05")).toEqual(expected);
  });

  it("ต้นมกราคม วันเริ่มรอบอยู่ปีก่อน", () => {
    expect(cycleFor("2026-01-10").start).toBe("2025-12-29");
    expect(cycleFor("2026-01-10").budgetMonth).toBe("2026-01");
  });

  it("ทุกวันอยู่ในรอบเดียว และอยู่ระหว่างวันเริ่มกับวันจบของรอบนั้น", () => {
    for (let day = "2026-01-01"; day <= "2027-12-31"; day = addDays(day, 1)) {
      const cycle = cycleFor(day);
      expect(cycle.start <= day && day <= cycle.end, day).toBe(true);
      // Asking again from the cycle's own first and last day gives the same cycle.
      expect(cycleFor(cycle.start), day).toEqual(cycle);
      expect(cycleFor(cycle.end), day).toEqual(cycle);
    }
  });

  it("วันจบรอบคือวันก่อนเงินออกครั้งถัดไป", () => {
    const cycle = cycleFor("2026-10-06");
    expect(addDays(cycle.end, 1)).toBe(cycle.nextPayday);
  });

  it("ปีที่ไม่มีรายการวันหยุด ยังคำนวณได้ด้วยเสาร์อาทิตย์", () => {
    // 29 ก.ค. 2571 เป็นวันเสาร์ → ศุกร์ 28 (ซึ่งจริงๆ เป็นวันหยุด แต่ยังไม่มีข้อมูลปีนั้น)
    expect(cycleFor("2028-08-01").start).toBe("2028-07-28");
  });
});

describe("previousCycle", () => {
  it("ได้รอบก่อนหน้าที่จบหนึ่งวันก่อนรอบนี้เริ่ม", () => {
    expect(previousCycle(cycleFor("2026-10-06"))).toEqual({
      start: "2026-08-28",
      end: "2026-09-28",
      nextPayday: "2026-09-29",
      budgetMonth: "2026-09",
    });
  });

  it("ถอยต่อกันหลายรอบ ไม่มีช่องว่างและไม่ซ้อนกัน", () => {
    let cycle = cycleFor("2027-06-15");
    for (let i = 0; i < 16; i++) {
      const before = previousCycle(cycle);
      expect(addDays(before.end, 1)).toBe(cycle.start);
      expect(before.nextPayday).toBe(cycle.start);
      cycle = before;
    }
  });
});

describe("previousCycleFrom", () => {
  const TODAY = "2026-10-06";

  it("ช่องวันที่ว่าง ถอยจากรอบของวันนี้", () => {
    expect(previousCycleFrom("", TODAY).start).toBe("2026-08-28");
  });

  it("ช่องวันที่เป็นวันเริ่มรอบ ถอยไปหนึ่งรอบ", () => {
    expect(previousCycleFrom("2026-08-28", TODAY).start).toBe("2026-07-27");
  });

  it("ช่องวันที่เป็นวันกลางรอบ ถอยจากรอบที่วันนั้นอยู่", () => {
    // 10 ก.ย. อยู่ในรอบ 28 ส.ค. – 28 ก.ย. → รอบก่อนหน้าคือ 27 ก.ค. – 27 ส.ค.
    expect(previousCycleFrom("2026-09-10", TODAY)).toEqual({
      start: "2026-07-27",
      end: "2026-08-27",
      nextPayday: "2026-08-28",
      budgetMonth: "2026-08",
    });
  });

  it("ค่าที่ไม่ใช่วันที่ ใช้วันนี้แทน", () => {
    expect(previousCycleFrom("abc", TODAY).start).toBe("2026-08-28");
    expect(previousCycleFrom("2026-13-45", TODAY).start).toBe("2026-08-28");
  });
});

describe("daysLeftInCycle", () => {
  const cycle = cycleFor("2026-10-06");

  it("นับวันนี้ ไม่นับวันเงินออกครั้งถัดไป", () => {
    expect(daysLeftInCycle(cycle, "2026-10-06")).toBe(23);
  });

  it("วันแรกของรอบ เท่ากับความยาวรอบ", () => {
    expect(daysLeftInCycle(cycle, "2026-09-29")).toBe(30);
  });

  it("วันสุดท้ายของรอบ เหลือ 1 วัน", () => {
    expect(daysLeftInCycle(cycle, "2026-10-28")).toBe(1);
  });
});

describe("missingHolidayYear", () => {
  it("รอบที่มีรายการวันหยุดครบ คืน null", () => {
    expect(missingHolidayYear(cycleFor("2026-10-06"))).toBeNull();
    expect(missingHolidayYear(cycleFor("2026-12-30"))).toBeNull();
  });

  it("เงินออกครั้งถัดไปอยู่ในปีที่ยังไม่มีรายการ คืนปีนั้น", () => {
    expect(missingHolidayYear(cycleFor("2027-12-30"))).toBe(2028);
  });

  it("ทั้งรอบอยู่ในปีที่ยังไม่มีรายการ คืนปีนั้น", () => {
    expect(missingHolidayYear(cycleFor("2028-03-10"))).toBe(2028);
  });

  it("วันเริ่มรอบอยู่ในปีที่ไม่มีรายการ คืนปีของวันเริ่ม", () => {
    // รอบ 29 ธ.ค. 2568 – ... : ปี 2568 (2025) ไม่มีรายการ
    expect(missingHolidayYear(cycleFor("2026-01-10"))).toBe(2025);
  });
});
