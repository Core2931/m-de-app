import { describe, expect, it } from "vitest";
import {
  appendPersonBlock,
  nameFragmentAtCaret,
  replaceNameAtCaret,
  segmentBoundsAtCaret,
} from "@/lib/remarkEdit";
import { parseRemark } from "@/lib/splits";

describe("appendPersonBlock", () => {
  it("ต่อบนหมายเหตุว่าง ไม่มีตัวคั่นนำหน้า", () => {
    const { text } = appendPersonBlock("", "ขนม");
    expect(text).toBe("ขนม: [] ");
  });

  it("ต่อบนหมายเหตุที่มีอยู่ คั่นด้วย ;", () => {
    const { text } = appendPersonBlock("ขนม: [50] ข้าว", "ต้อม");
    expect(text).toBe("ขนม: [50] ข้าว; ต้อม: [] ");
  });

  it("หมายเหตุที่ลงท้ายด้วย ; อยู่แล้วไม่คั่นซ้อน", () => {
    const { text } = appendPersonBlock("ขนม: [50] ข้าว;", "ต้อม");
    expect(text).toBe("ขนม: [50] ข้าว; ต้อม: [] ");
  });

  it("ช่องว่างท้ายไม่ทำให้เกิดตัวคั่นเกิน", () => {
    const { text } = appendPersonBlock("ขนม: [50] ข้าว;   ", "ต้อม");
    expect(text).toBe("ขนม: [50] ข้าว; ต้อม: [] ");
  });

  it("caret ที่คืนมาอยู่ในวงเล็บพอดี", () => {
    const { text, caret } = appendPersonBlock("", "ขนม");
    expect(text.slice(caret - 1, caret + 1)).toBe("[]");
  });

  it("ของเดิมไม่ถูกแก้ และ parse ได้ครบทั้งสองคน", () => {
    const { text } = appendPersonBlock("ขนม: [50] ข้าว", "ต้อม");
    // ยังไม่ได้ใส่ยอดให้ ต้อม จึง parse ได้แค่ ขนม — แต่ของเดิมต้องไม่หาย
    const parsed = parseRemark(text);
    expect(parsed.splits).toHaveLength(1);
    expect(parsed.splits[0]).toMatchObject({ person: "ขนม", amount: 50 });

    const filled = text.replace("[]", "[30]");
    expect(parseRemark(filled).splits.map((s) => s.person)).toEqual(["ขนม", "ต้อม"]);
  });

  it("หมายเหตุที่คั่นด้วยขึ้นบรรทัดใหม่ยัง parse ได้ครบ", () => {
    // parseRemark split ด้วย /[\n;]+/ โมดูลนี้ต้องเห็นตรงกัน
    // \n ท้ายสุดถูก trim ไปตั้งแต่แรก (มันคือ whitespace) แล้วต่อด้วย "; "
    // ตามปกติ — ผลลัพธ์เป็น separator ผสม ซึ่ง parseRemark รับได้ทั้งคู่
    const { text } = appendPersonBlock("ก: [10]\nข: [20]\n", "ต้อม");
    expect(text).toBe("ก: [10]\nข: [20]; ต้อม: [] ");
    expect(parseRemark(text.replace("[]", "[30]")).splits.map((s) => s.person)).toEqual([
      "ก",
      "ข",
      "ต้อม",
    ]);
  });
});

describe("segmentBoundsAtCaret", () => {
  it("หมายเหตุคนเดียวคือ segment เดียว", () => {
    expect(segmentBoundsAtCaret("ขนม: [50]", 2)).toEqual({ start: 0, end: 9 });
  });

  it("เลือก segment ที่ caret อยู่", () => {
    const remark = "ขนม: [50];ต้อม: [30]";
    const bounds = segmentBoundsAtCaret(remark, 12);
    expect(remark.slice(bounds.start, bounds.end)).toBe("ต้อม: [30]");
  });

  it("caret เกินความยาวถูกหนีบ", () => {
    expect(segmentBoundsAtCaret("ขนม", 999)).toEqual({ start: 0, end: 3 });
  });
});

describe("nameFragmentAtCaret", () => {
  it("caret กลางชื่อคืนชื่อที่พิมพ์ค้างอยู่", () => {
    expect(nameFragmentAtCaret("ขนม", 3)).toBe("ขนม");
  });

  it("caret หลัง colon ไม่ใช่ตำแหน่งชื่อ", () => {
    expect(nameFragmentAtCaret("ขนม: [50]", 7)).toBeNull();
  });

  it("caret ในวงเล็บไม่ใช่ตำแหน่งชื่อ", () => {
    expect(nameFragmentAtCaret("ขนม: [50]", 8)).toBeNull();
  });

  it("caret ต้น segment ที่ยังว่างคืน null", () => {
    expect(nameFragmentAtCaret("", 0)).toBeNull();
  });

  it("segment ที่สองอ่านชื่อของตัวเอง ไม่ใช่ของคนแรก", () => {
    const remark = "ขนม: [50];ต้อ";
    expect(nameFragmentAtCaret(remark, remark.length)).toBe("ต้อ");
  });
});

describe("replaceNameAtCaret", () => {
  it("แทนชื่อที่พิมพ์ค้างด้วยชื่อเต็ม", () => {
    const { text } = replaceNameAtCaret("ขน", 2, "ขนม");
    expect(text).toBe("ขนม");
  });

  it("เก็บส่วนหลัง colon ไว้ครบ", () => {
    const { text } = replaceNameAtCaret("ขน: [50] ข้าว", 2, "ขนม");
    expect(text).toBe("ขนม: [50] ข้าว");
  });

  it("ไม่แตะ segment อื่น", () => {
    const remark = "ขนม: [50];ต้อ: [30]";
    const { text } = replaceNameAtCaret(remark, 13, "ต้อม");
    expect(text).toBe("ขนม: [50];ต้อม: [30]");
  });

  it("caret ที่คืนมาอยู่ท้ายชื่อใหม่", () => {
    const { text, caret } = replaceNameAtCaret("ขน: [50]", 2, "ขนม");
    expect(text.slice(0, caret)).toBe("ขนม");
  });
});
