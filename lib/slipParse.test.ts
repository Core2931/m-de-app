import { describe, expect, it } from "vitest";
import { mergeSlipReads, parseSlipText } from "@/lib/slipParse";

// Real tesseract.js output from the trial slips, mistakes included — the
// parser has to survive these, not a clean transcription. Names, account
// digits and reference numbers are altered.

const KPLUS_BW = `ชําระเงินสําเร็จ                   จ
2 ต.ุค. 69 12:57 น.
  นาย สมชาย บ
๊ เธ.กสิกรไทย
XXX-X-x1234-x
ม,
Sy  ทองใบรก๐๐
น.ส. ทองใบ รูตังติ
202610021441495
จํานวน:
60.00 บาท      ๓
ค่าธรรมเนียม:                  £7 Te
0.00 บาท   อโนสอร
เลขที่รายการ:                                       HATS
สแกน
01627512573280800000   ตรวจสอบสลิป`;

const KPLUS_BW_NOISY = `ชําระเงินสําเร็จ                   |
1ต.ค. 69 14:51 น.                    \\
  นาย สมชาย บ
๊ ลกสิกรไทย
%%%-%-%1234-%
คาเฟอเมซอน อาคารไทยซัมมิท
บจก. ซันสตาร์ คอฟฟี us
202610011904274
จ้านวน:
115.00 นาท โซไหต2[ซ
ค่าธรรมเนียม:                        รรี Bom,
0.00 บาท   เขต
เลขที่รายการ:                  [=I ญ่
016274145102BQRO0000 ดวจสอบสลิป`;

const PAOTANG_RAW = `๑ ทํารายการสําเร็จ
รหัสอ้างอิง 27e033fb3c4c448c9a125f3900000000
2 ตค 2569 1258 น.
3   สมชาย U***
G-Wallet ID: **** *xxxxxx 0000
w    ชานานาชาติ ชามารวย
WLU อาหาร ของหวาน เครื่องดื่ม
ค่าสินค้า/บริการ                     50 บาท
สิทธิมทยช่วยไทยพลัส                  -30 บาท
จํานวนเงินที่ชําระ                  20 บาท`;

const PAOTANG_BW = `ทํารายการสําเร็จ
2 ๓ ค 2569 1258 น
G    สมชาย U***
ชานานาชาต ชามารวย
ค่าสินค้า/บริการ                     50 บาท
สิทธิ์แทยช่วยโทยพลัส                         บาท
จํานวนเงินที่ชําระ                 20 un`;

describe("parseSlipText", () => {
  it("สลิป K+: อ่านยอด วันที่ เวลา และชื่อร้าน", () => {
    const slip = parseSlipText(KPLUS_BW);
    expect(slip.amount).toBe(60);
    expect(slip.date).toBe("2026-10-02");
    expect(slip.time).toBe("12:57");
    expect(slip.payee).toContain("ทองใบ");
  });

  it("สลิป K+: ยอดไม่ใช่ค่าธรรมเนียม 0.00", () => {
    expect(parseSlipText(KPLUS_BW).amount).not.toBe(0);
  });

  it("สลิป K+ ที่ OCR อ่านป้าย 'จำนวน' และเลขบัญชีเพี้ยน ยังได้ข้อมูลครบ", () => {
    const slip = parseSlipText(KPLUS_BW_NOISY);
    expect(slip.amount).toBe(115);
    expect(slip.date).toBe("2026-10-01");
    expect(slip.time).toBe("14:51");
    expect(slip.payee).toBe("คาเฟอเมซอน อาคารไทยซัมมิท");
  });

  it("สลิปเป๋าตัง: ยอดคือจำนวนเงินที่ชำระ ไม่ใช่ราคาเต็ม", () => {
    const slip = parseSlipText(PAOTANG_RAW);
    expect(slip.amount).toBe(20);
    expect(slip.date).toBe("2026-10-02");
    expect(slip.time).toBe("12:58");
    expect(slip.payee).toBe("ชานานาชาติ ชามารวย");
  });

  it("วันที่ที่อ่านไม่ออกคืน null ไม่เดา", () => {
    const slip = parseSlipText(PAOTANG_BW);
    expect(slip.date).toBeNull();
    expect(slip.time).toBeNull();
    expect(slip.amount).toBe(20);
  });

  it("ข้อความที่ไม่ใช่สลิปคืน null ทุกช่อง", () => {
    expect(parseSlipText("hello world")).toEqual({
      amount: null,
      date: null,
      time: null,
      payee: null,
    });
  });

  // The cases below come from the same slips read in Chrome, where the canvas
  // scaling produces different mistakes than the desktop trial did.

  it("เลขบัญชีที่มีขีดเกิน (x1234/-x) ยังใช้หาชื่อร้านได้", () => {
    const slip = parseSlipText(
      ["ธ.กสิกรไทย", "XXX-X-Xx1234/-x", "my ลอว์สัน-23821-โอเอไอ ทาวเวอร์", "บจก. สห ลอว์สัน"].join("\n")
    );
    expect(slip.payee).toBe("ลอว์สัน-23821-โอเอไอ ทาวเวอร์");
  });

  it("ตัว น. ท้ายเวลาอ่านเพี้ยน ยังได้วันที่", () => {
    const slip = parseSlipText("ะเงินสําเร็จ\n2 ต.ุค. 69 12:57 wu.\nนาย สมชาย บ");
    expect(slip.date).toBe("2026-10-02");
    expect(slip.time).toBe("12:57");
  });

  it("ปีกับเวลาติดกัน (25691258) ยังแยกได้", () => {
    const slip = parseSlipText("รหัสอ้างอิง 270033fb3c4c448c0a125f3900000000\n2 ตค 25691258 บ");
    expect(slip.date).toBe("2026-10-02");
    expect(slip.time).toBe("12:58");
  });

  it("เป๋าตังที่บรรทัด G-Wallet หาย ใช้บรรทัดชื่อผู้จ่าย (U***) เป็นหลักแทน", () => {
    const slip = parseSlipText(
      ["G   สมชาย U***", "_    ชานานาชาต ชามารวย", "ถุง .     อาหาร ของหวาน เครื่องคื่ม"].join("\n")
    );
    expect(slip.payee).toBe("ชานานาชาต ชามารวย");
  });

  it("เศษตัวอักษรจากโลโก้หน้าชื่อร้านถูกตัดทิ้ง", () => {
    const slip = parseSlipText(
      [
        "3    สมชาย u***",
        "G=Wallet ID: ***” จพระ 0000",
        "",
        "ว       ชานานาชาติ ชามารวย",
        "เน5",
      ].join("\n")
    );
    expect(slip.payee).toBe("ชานานาชาติ ชามารวย");
  });

  it("ยอดที่มี comma คั่นหลักพันอ่านเป็นตัวเลขเต็ม", () => {
    const slip = parseSlipText("จำนวน:\n1,250.00 บาท\nค่าธรรมเนียม:\n0.00 บาท");
    expect(slip.amount).toBe(1250);
  });

  it("มี.ค. คือมีนาคม ไม่ใช่มกราคม", () => {
    expect(parseSlipText("5 มี.ค. 69 09:05 น.").date).toBe("2026-03-05");
    expect(parseSlipText("5 ม.ค. 69 09:05 น.").date).toBe("2026-01-05");
  });
});

describe("mergeSlipReads", () => {
  it("ช่องที่รอบแรกอ่านไม่ได้ ใช้ค่าจากรอบสอง", () => {
    // Date and time are unreadable in the first read and come from the
    // second; the payee stays the first read's, typo and all — first wins.
    const merged = mergeSlipReads(parseSlipText(PAOTANG_BW), parseSlipText(PAOTANG_RAW));
    expect(merged).toEqual({
      amount: 20,
      date: "2026-10-02",
      time: "12:58",
      payee: "ชานานาชาต ชามารวย",
    });
  });
});
