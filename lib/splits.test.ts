import { describe, expect, it } from "vitest";
import { normalizePerson, parseRemark } from "@/lib/splits";

describe("normalizePerson", () => {
  it("ตัดคำว่า จ่าย ท้ายชื่อออก", () => {
    expect(normalizePerson("ขนมจ่าย")).toBe("ขนม");
  });

  it("ชื่อที่มีช่องว่างซ้อนถูกยุบเหลือช่องเดียว", () => {
    expect(normalizePerson("  พี่  ต้อม จ่าย ")).toBe("พี่ ต้อม");
  });

  it("ชื่อธรรมดาไม่ถูกแก้", () => {
    expect(normalizePerson("ขนม")).toBe("ขนม");
  });
});

describe("parseRemark", () => {
  it("อ่านรายการเดียวทิศทาง owed_to_me", () => {
    const result = parseRemark("ขนม: [50] ค่าอาหาร");
    expect(result.splits).toEqual([
      { person: "ขนม", amount: 50, label: "ค่าอาหาร", direction: "owed_to_me" },
    ]);
    expect(result.invalid).toBe(false);
    expect(result.freeText).toBe("");
  });

  it("ชื่อลงท้าย จ่าย เป็นทิศทาง i_owe", () => {
    const result = parseRemark("ขนมจ่าย: [200] ค่าคลีนซิ่ง");
    expect(result.splits).toEqual([
      { person: "ขนม", amount: 200, label: "ค่าคลีนซิ่ง", direction: "i_owe" },
    ]);
  });

  it("แยก block หลายอันด้วย +", () => {
    const result = parseRemark("ขนม: [100] ค่าอาหาร+ [50] ค่าเดินทาง");
    expect(result.splits).toEqual([
      { person: "ขนม", amount: 100, label: "ค่าอาหาร", direction: "owed_to_me" },
      { person: "ขนม", amount: 50, label: "ค่าเดินทาง", direction: "owed_to_me" },
    ]);
  });

  it("แยกหลายคนด้วย ;", () => {
    const result = parseRemark("ขนม: [50] ข้าว; ต้อมจ่าย: [80] แท็กซี่");
    expect(result.splits).toEqual([
      { person: "ขนม", amount: 50, label: "ข้าว", direction: "owed_to_me" },
      { person: "ต้อม", amount: 80, label: "แท็กซี่", direction: "i_owe" },
    ]);
  });

  it("แยกหลายคนด้วยขึ้นบรรทัดใหม่", () => {
    const result = parseRemark("ขนม: [50] ข้าว\nต้อม: [80] น้ำ");
    expect(result.splits).toHaveLength(2);
    expect(result.splits[1].person).toBe("ต้อม");
  });

  it("รับตัวเลขที่มี comma และทศนิยม", () => {
    const result = parseRemark("ขนม: [1,250.50] ค่าโรงแรม");
    expect(result.splits[0].amount).toBe(1250.5);
  });

  it("label ว่างได้", () => {
    const result = parseRemark("ขนม: [50]");
    expect(result.splits[0].label).toBe("");
  });

  it("remark ธรรมดาไม่มี pattern เก็บเป็น freeText", () => {
    const result = parseRemark("จ่ายค่าน้ำแล้ว");
    expect(result.splits).toEqual([]);
    expect(result.freeText).toBe("จ่ายค่าน้ำแล้ว");
    expect(result.invalid).toBe(false);
  });

  it("มีวงเล็บตัวเลขแต่ไม่มี colon ถือว่า invalid", () => {
    const result = parseRemark("ขนม [50]");
    expect(result.splits).toEqual([]);
    expect(result.invalid).toBe(true);
    expect(result.freeText).toBe("ขนม [50]");
  });

  it("remark ว่างคืนค่าเปล่า", () => {
    expect(parseRemark("")).toEqual({ splits: [], freeText: "", invalid: false });
  });

  it("จำนวนเงินเป็นศูนย์ถูกข้าม", () => {
    const result = parseRemark("ขนม: [0] ฟรี");
    expect(result.splits).toEqual([]);
    expect(result.invalid).toBe(true);
  });

  it("ชื่อที่เป็นคำว่า จ่าย ล้วนถือว่า invalid", () => {
    const result = parseRemark("จ่าย: [50] อะไรสักอย่าง");
    expect(result.splits).toEqual([]);
    expect(result.invalid).toBe(true);
  });
});
