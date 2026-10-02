# Slip Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** หน้า `/expenses/import` ที่รับสลิปหลายใบ อ่านในเบราว์เซอร์ แสดงเป็น list ที่แก้ได้ แล้วบันทึกทั้งหมดลง Sheet พร้อมจำร้านเพื่อเติม รายการ + หมวด ให้ครั้งถัดไป

**Architecture:** ตรรกะทั้งหมดอยู่ในไฟล์ล้วนใน `lib/` (จับคู่ร้าน, สร้างแถว, หาแถวซ้ำ, บันทึกตามลำดับ) หน้าเว็บแค่ถือ state แล้วเรียกฟังก์ชันพวกนี้ ชื่อร้านเก็บเป็น column H `payee` ของ tab `expenses` และ mapping ร้าน → รายการ คำนวณจากประวัติทุกครั้ง ไม่มีที่เก็บแยก ตัวอ่านสลิป (`lib/slipOcr.ts`, `lib/slipParse.ts`) มีอยู่แล้วจาก branch ทดลอง

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Zustand + googleapis + tesseract.js 7 + Vitest

**Spec:** `docs/superpowers/specs/2026-10-02-slip-import-design.md`

## Global Constraints

- Branch: `feat/slip-import` ห้าม commit ลง `master` โดยตรง ห้าม push จนกว่า Mark จะสั่ง
- Commit ท้ายทุก task ด้วย `git add <ไฟล์ที่ระบุ>` เท่านั้น **ห้าม `git add -A` / `git add .`** — working tree มีไฟล์ที่ไม่เกี่ยว (`app/globals.css`, `components/ui/ThemeToggle.tsx`, ไฟล์ draft `.html`) ที่ต้องไม่ติดไปด้วย
- ข้อความที่ผู้ใช้เห็นเป็นภาษาไทย ชื่อตัวแปรและ comment เป็นภาษาอังกฤษ ชื่อ test เป็นภาษาไทยตามไฟล์ test เดิม
- ไฟล์ `lib/payees.ts`, `lib/slipImport.ts`, `lib/expenseRows.ts` ห้าม import จาก `react`, `next`, `googleapis`
- `remark` ของรายการที่ import เป็น `""` เสมอ
- การแก้รายการ (PUT) ห้ามเขียน column H — `payee` ของแถวต้องคงอยู่
- บันทึกหลายแถวทีละแถวตามลำดับ ห้ามยิงพร้อมกัน
- `payee` ยาวไม่เกิน 100 ตัวอักษร
- เกณฑ์จับคู่ร้าน: edit distance ≤ 20% ของความยาวชื่อที่ยาวกว่าในคู่นั้น (ปัดลง, ขั้นต่ำ 1), ชื่อหลัง normalize สั้นกว่า 3 ตัวอักษรไม่จับคู่
- สีมาจาก token ใน `app/globals.css` เท่านั้น โปรเจกต์ไม่มี `tailwind-merge` — ส่ง padding/radius ผ่าน `className` ที่ use-site ตามแบบ `Card`
- ก่อนเขียนโค้ดที่แตะ routing อ่าน `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` ตามที่ `AGENTS.md` กำหนด
- ห้ามอ่านหรือแก้ `.env*`

## Review Focus

1. **สลิปใบเดียวกันถูกเลือกสองครั้งในรอบเดียว** — ทั้งสองแถวต้องขึ้น "อาจซ้ำ" (test ใน Task 6)
2. **ไฟล์ที่ถอดรหัสไม่ได้ (HEIC, ไฟล์ที่ไม่ใช่รูป)** — ได้แถว "อ่านไม่ได้" ที่กรอกเองหรือลบได้ ใบอื่นอ่านต่อ (test ใน Task 6 + try/catch ใน Task 7)
3. **ยอดที่พิมพ์แก้เป็นค่าว่าง / 0 / ติดลบ / ตัวหนังสือ** — ต้องบล็อกการบันทึก ไม่มี `NaN` ลง Sheet (test ใน Task 6)
4. **บันทึกล้มกลางคัน (เน็ตหลุด, Sheets quota)** — แถวที่สำเร็จหายจาก list แถวที่เหลือค้างไว้ กดซ้ำแล้วไม่บันทึกแถวเดิมซ้ำ (test ใน Task 6)
5. **ยอดที่มี comma คั่นหลักพัน ("1,250.00")** — ต้องอ่านเป็น 1250 ไม่ใช่ 1 หรือ 250 (test ใน Task 1)

---

## File Structure

**สร้างใหม่:**
- `lib/payees.ts` + `lib/payees.test.ts` — ชื่อร้านจากสลิป → `{ item, category }` จากประวัติ
- `lib/expenseRows.ts` + `lib/expenseRows.test.ts` — แปลงแถว Sheet ↔ `Expense` (ย้ายออกจาก `lib/sheets.ts` เพื่อให้ test ได้โดยไม่โหลด googleapis)
- `lib/slipImport.ts` + `lib/slipImport.test.ts` — สร้างแถว, ตรวจพร้อมบันทึก, หาแถวซ้ำ, บันทึกตามลำดับ
- `components/expenses/SlipRow.tsx` — แถวที่แก้ได้ 1 แถว
- `app/expenses/import/page.tsx` — หน้า import

**แก้:**
- `lib/utils.ts`, `lib/people.ts` — ย้าย `editDistance` ไป `utils.ts`
- `types/index.ts` — `payee?: string`
- `lib/validation.ts` + test — รับ `payee`
- `lib/sheets.ts` — column H
- `lib/nav.ts` + test — tab ของ `/expenses/import`
- `lib/slipOcr.ts`, `lib/slipParse.ts` — เอาหัวไฟล์ "TRIAL CODE" ออก
- `lib/slipParse.test.ts` — เพิ่ม test
- `app/expenses/new/page.tsx` — ลิงก์ "เพิ่มจากสลิป"
- `README.md` — column `payee`

**ลบ:**
- `app/slip-test/page.tsx`

---

### Task 1: เก็บกวาดโค้ดทดลอง

**Files:**
- Delete: `app/slip-test/page.tsx`
- Modify: `lib/slipOcr.ts:1-2`, `lib/slipParse.ts:1-3`
- Test: `lib/slipParse.test.ts`

**Interfaces:**
- Consumes: ไม่มี
- Produces (มีอยู่แล้ว ไม่เปลี่ยน signature):
  - `parseSlipText(text: string): SlipRead` และ `mergeSlipReads(first: SlipRead, second: SlipRead): SlipRead` จาก `@/lib/slipParse`
  - `interface SlipRead { amount: number | null; date: string | null; time: string | null; payee: string | null }`
  - `loadSlipReader(): Promise<Worker>` และ `readSlip(file: File): Promise<SlipResult>` จาก `@/lib/slipOcr` โดย `SlipResult.read` เป็น `SlipRead`

- [ ] **Step 1: เพิ่ม test ที่ตรึงพฤติกรรมของ parser**

เพิ่มใน `lib/slipParse.test.ts` ภายใน `describe("parseSlipText", ...)` ต่อจาก test สุดท้าย:

```ts
  it("ยอดที่มี comma คั่นหลักพันอ่านเป็นตัวเลขเต็ม", () => {
    const slip = parseSlipText("จำนวน:\n1,250.00 บาท\nค่าธรรมเนียม:\n0.00 บาท");
    expect(slip.amount).toBe(1250);
  });

  it("มี.ค. คือมีนาคม ไม่ใช่มกราคม", () => {
    expect(parseSlipText("5 มี.ค. 69 09:05 น.").date).toBe("2026-03-05");
    expect(parseSlipText("5 ม.ค. 69 09:05 น.").date).toBe("2026-01-05");
  });
```

- [ ] **Step 2: รัน test**

Run: `npx vitest run lib/slipParse.test.ts`
Expected: PASS ทั้ง 14 ข้อ — สองข้อใหม่ตรึงพฤติกรรมที่มีอยู่แล้ว ถ้าข้อใดไม่ผ่าน ให้แก้ `lib/slipParse.ts` จนผ่าน (ห้ามแก้ test)

- [ ] **Step 3: ลบหน้าทดลอง และเอาหัวไฟล์ทดลองออก**

```bash
git rm app/slip-test/page.tsx
```

`lib/slipParse.ts` — แทนที่ 3 บรรทัดแรก:

```ts
// Pulls the few fields we care about out of raw OCR text from a Thai payment
// slip. Only K+ scan-to-pay and เป๋าตัง layouts have been seen; everything
// else falls through to the generic rules.
```

`lib/slipOcr.ts` — แทนที่ 2 บรรทัดแรก:

```ts
// Browser only: reads a slip image with tesseract.js, entirely on the device —
// the image is never uploaded.
```

- [ ] **Step 4: ตรวจว่าไม่มีอะไรพัง**

Run: `npm test && npx tsc --noEmit && npx eslint lib/slipOcr.ts lib/slipParse.ts lib/slipParse.test.ts`
Expected: test ผ่านทั้งหมด, tsc และ eslint ไม่มี output

- [ ] **Step 5: Commit**

```bash
git add lib/slipOcr.ts lib/slipParse.ts lib/slipParse.test.ts
git commit -m "chore(slip): drop the trial page, keep the reader"
```

---

### Task 2: จับคู่ร้าน (`lib/payees.ts`)

**Files:**
- Modify: `types/index.ts:3-11`, `lib/utils.ts`, `lib/people.ts:50-70`
- Create: `lib/payees.ts`
- Test: `lib/payees.test.ts`

**Interfaces:**
- Consumes: `Expense` จาก `@/types`, `Category` จาก `@/lib/categories`
- Produces:
  - `payee?: string` ใน `interface Expense` (และใน `NewExpense` ซึ่ง derive จาก `Expense`) — task นี้เป็นผู้เพิ่ม Task 3, 4, 6 ใช้ต่อ
  - `editDistance(a: string, b: string, cap: number): number` จาก `@/lib/utils`
  - `normalizePayee(name: string): string` จาก `@/lib/payees`
  - `suggestFromPayee(payee: string, expenses: Expense[]): PayeeSuggestion | null` จาก `@/lib/payees`
  - `interface PayeeSuggestion { item: string; category: Category }`

- [ ] **Step 1: เพิ่ม field `payee` ใน `Expense`**

`types/index.ts` — ใน `interface Expense` ต่อจาก `category: Category;`:

```ts
  createdAt: string; // ISO timestamp
  /** Shop name read from a slip. Absent on hand-typed and legacy rows. */
  payee?: string;
```

(บรรทัด `createdAt` มีอยู่แล้ว — เพิ่มแค่สองบรรทัดล่าง)

- [ ] **Step 2: ย้าย `editDistance` ไป `lib/utils.ts`**

`lib/utils.ts` — เพิ่มต่อท้ายไฟล์:

```ts

/** Levenshtein distance, capped — callers only ever care about "within N edits". */
export function editDistance(a: string, b: string, cap: number): number {
  // Thai is entirely in the BMP, so UTF-16 units are code points here.
  // Combining vowels and tone marks count separately, which slightly inflates
  // distances between marked syllables.
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      row.push(value);
      if (value < best) best = value;
    }
    if (best > cap) return cap + 1; // cannot come back down
    prev = row;
  }
  return prev[b.length];
}
```

`lib/people.ts` — ลบฟังก์ชัน `editDistance` ทั้งก้อน (ตั้งแต่ comment `/** Levenshtein distance, capped ...` ถึง `}` ปิดฟังก์ชัน) แล้วแก้ import บนสุดเป็น:

```ts
import { normalizePerson, parseRemark } from "@/lib/splits";
import { editDistance } from "@/lib/utils";
import type { Expense } from "@/types";
```

Run: `npx vitest run lib/people.test.ts`
Expected: PASS ทุกข้อ (refactor ล้วน พฤติกรรมเดิม)

- [ ] **Step 3: เขียน test ที่ยังไม่ผ่าน**

สร้าง `lib/payees.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizePayee, suggestFromPayee } from "@/lib/payees";
import type { Category } from "@/lib/categories";
import type { Expense } from "@/types";

let seq = 0;
function expense(
  payee: string | undefined,
  item: string,
  date = "2026-10-01",
  category: Category = "food",
  createdAt = date + "T05:00:00.000Z"
): Expense {
  seq += 1;
  return {
    id: "e" + seq,
    date,
    item,
    amount: 50,
    remark: "",
    category,
    createdAt,
    ...(payee === undefined ? {} : { payee }),
  };
}

describe("normalizePayee", () => {
  it("ตัดช่องว่าง ตัวเลข เครื่องหมาย และสระบน/วรรณยุกต์ออก", () => {
    expect(normalizePayee("ลอว์สัน-P3821-โอเอไอ ทาวเวอร์")).toBe("ลอวสนpโอเอไอทาวเวอร");
  });

  it("เลขไทยถูกตัดเหมือนเลขอารบิก", () => {
    expect(normalizePayee("ทองใบรก๐๐")).toBe("ทองใบรก");
  });
});

describe("suggestFromPayee", () => {
  it("ไม่มีประวัติเลย คืน null", () => {
    expect(suggestFromPayee("คาเฟ่อเมซอน", [])).toBeNull();
  });

  it("ชื่อตรงกัน คืนรายการกับหมวดของร้านนั้น", () => {
    const history = [expense("คาเฟ่อเมซอน อาคารไทยซัมมิท", "กาแฟ", "2026-10-01", "food")];
    expect(suggestFromPayee("คาเฟ่อเมซอน อาคารไทยซัมมิท", history)).toEqual({
      item: "กาแฟ",
      category: "food",
    });
  });

  it("OCR ทำวรรณยุกต์หาย ยังจับคู่ได้", () => {
    const history = [expense("คาเฟ่อเมซอน อาคารไทยซัมมิท", "กาแฟ")];
    expect(suggestFromPayee("คาเฟอเมซอน อาคารไทยซัมมิท", history)?.item).toBe("กาแฟ");
  });

  it("OCR อ่านตัวอักษรในรหัสสาขาเพี้ยน ยังจับคู่ได้", () => {
    const history = [expense("ลอว์สัน-P3821-โอเอไอ ทาวเวอร์", "ขนม", "2026-10-01", "goods")];
    expect(suggestFromPayee("ลอว์สัน-23821-โอเอไอ ทาวเวอร์", history)).toEqual({
      item: "ขนม",
      category: "goods",
    });
  });

  it("ร้านที่ไม่เกี่ยวกัน คืน null", () => {
    const history = [expense("คาเฟ่อเมซอน อาคารไทยซัมมิท", "กาแฟ")];
    expect(suggestFromPayee("ชานานาชาติ ชามารวย", history)).toBeNull();
  });

  it("ชื่อสั้นกว่า 3 ตัวอักษรไม่จับคู่ แม้จะตรงกันเป๊ะ", () => {
    const history = [expense("กข", "ของ")];
    expect(suggestFromPayee("กข", history)).toBeNull();
  });

  it("ใกล้เคียงสองร้านเท่ากัน ไม่เดา", () => {
    const history = [expense("กขคงจช", "ร้านหนึ่ง"), expense("กขคงจซ", "ร้านสอง")];
    expect(suggestFromPayee("กขคงจฉ", history)).toBeNull();
  });

  it("ร้านเดียวหลายรายการ ใช้ของวันล่าสุด", () => {
    const history = [
      expense("ทองใบshop", "ข้าวเที่ยง", "2026-09-28", "food"),
      expense("ทองใบshop", "ข้าวเย็น", "2026-10-01", "food"),
      expense("ทองใบshop", "ข้าวเช้า", "2026-09-30", "food"),
    ];
    expect(suggestFromPayee("ทองใบshop", history)?.item).toBe("ข้าวเย็น");
  });

  it("วันเดียวกัน ใช้ของที่บันทึกทีหลัง", () => {
    const history = [
      expense("ทองใบshop", "รอบเช้า", "2026-10-01", "food", "2026-10-01T02:00:00.000Z"),
      expense("ทองใบshop", "รอบค่ำ", "2026-10-01", "food", "2026-10-01T12:00:00.000Z"),
    ];
    expect(suggestFromPayee("ทองใบshop", history)?.item).toBe("รอบค่ำ");
  });

  it("รายการที่ไม่มี payee ไม่ถูกนำมาจับคู่", () => {
    const history = [expense(undefined, "ทองใบshop"), expense("", "ทองใบshop")];
    expect(suggestFromPayee("ทองใบshop", history)).toBeNull();
  });

  it("ชื่อร้านว่าง คืน null", () => {
    expect(suggestFromPayee("   ", [expense("ทองใบshop", "ข้าว")])).toBeNull();
  });
});
```

- [ ] **Step 4: รัน test ให้เห็นว่าไม่ผ่าน**

Run: `npx vitest run lib/payees.test.ts`
Expected: FAIL — `Cannot find module '@/lib/payees'`

- [ ] **Step 5: เขียน implementation**

สร้าง `lib/payees.ts`:

```ts
import type { Category } from "@/lib/categories";
import { editDistance } from "@/lib/utils";
import type { Expense } from "@/types";

// Below this a "name" is OCR debris, and one edit would match anything.
const MIN_LENGTH = 3;
// Share of the longer name that may differ. Wide enough for the OCR slips we
// have seen (a dropped tone mark is already normalized away; a misread branch
// code costs an edit or two), narrow enough that two shops stay two shops.
const TOLERANCE = 0.2;

export interface PayeeSuggestion {
  item: string;
  category: Category;
}

/**
 * Reduces a shop name to the letters OCR gets right most of the time. What it
 * drops is exactly what it gets wrong: marks above and below the line
 * ("คาเฟ่" read as "คาเฟ"), digits ("P3821" read as "23821"), spacing and
 * punctuation.
 */
export function normalizePayee(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ัิ-ฺ็-๎]/g, "")
    .replace(/[^a-zก-ะาำเ-ๆ]/g, "");
}

function isNewer(a: Expense, b: Expense): boolean {
  return a.date !== b.date ? a.date > b.date : a.createdAt > b.createdAt;
}

/**
 * What this shop was filed as last time, or null when we cannot tell.
 *
 * Derived from the expenses themselves rather than a stored mapping, so there
 * is nothing to keep in sync: correcting the latest expense of a shop corrects
 * the next suggestion.
 */
export function suggestFromPayee(payee: string, expenses: Expense[]): PayeeSuggestion | null {
  const target = normalizePayee(payee);
  if (target.length < MIN_LENGTH) return null;

  // Latest expense per shop, keyed on the normalized name.
  const latest = new Map<string, Expense>();
  for (const expense of expenses) {
    if (!expense.payee) continue;
    const key = normalizePayee(expense.payee);
    if (key.length < MIN_LENGTH) continue;
    const current = latest.get(key);
    if (!current || isNewer(expense, current)) latest.set(key, expense);
  }

  let best: Expense | null = null;
  let bestDistance = Infinity;
  let tied = false;

  for (const [key, expense] of latest) {
    const allowed = Math.max(1, Math.floor(Math.max(key.length, target.length) * TOLERANCE));
    const distance = editDistance(target, key, allowed);
    if (distance > allowed) continue;

    if (distance < bestDistance) {
      best = expense;
      bestDistance = distance;
      tied = false;
    } else if (distance === bestDistance) {
      tied = true;
    }
  }

  // Two equally-near shops means we do not know which one this is; a wrong
  // prefill is worse than an empty field.
  if (!best || tied) return null;
  return { item: best.item, category: best.category };
}
```

- [ ] **Step 6: รัน test ให้ผ่าน**

Run: `npx vitest run lib/payees.test.ts lib/people.test.ts`
Expected: PASS ทุกข้อ

- [ ] **Step 7: Commit**

```bash
git add types/index.ts lib/utils.ts lib/people.ts lib/payees.ts lib/payees.test.ts
git commit -m "feat(slip): match a slip's payee to how it was filed before"
```

---

### Task 3: รับ `payee` ใน validation

**Files:**
- Modify: `lib/validation.ts:7-27`
- Test: `lib/validation.test.ts`

**Interfaces:**
- Consumes: `NewExpense` จาก `@/types` (มี `payee?: string` จาก Task 2)
- Produces: `validateExpenseInput(body: unknown): NewExpense | null` — คืน key `payee` เฉพาะเมื่อมีค่า (ไม่มี key เลยเมื่อว่าง)

- [ ] **Step 1: เขียน test ที่ยังไม่ผ่าน**

เพิ่มใน `lib/validation.test.ts` ภายใน `describe("validateExpenseInput", ...)` ต่อจาก test `"หมวดที่ไม่รู้จักตกกลับเป็นค่าเริ่มต้น"`:

```ts
  it("รับ payee และ trim", () => {
    expect(validateExpenseInput({ ...valid, payee: "  ทองใบshop  " })?.payee).toBe("ทองใบshop");
  });

  it("payee ว่างหรือไม่ใช่ string ไม่มี key payee ในผลลัพธ์", () => {
    expect(validateExpenseInput({ ...valid, payee: "   " })).not.toHaveProperty("payee");
    expect(validateExpenseInput({ ...valid, payee: 123 })).not.toHaveProperty("payee");
    expect(validateExpenseInput(valid)).not.toHaveProperty("payee");
  });

  it("payee ยาวเกิน 100 ตัวอักษรถูกตัด", () => {
    expect(validateExpenseInput({ ...valid, payee: "ก".repeat(150) })?.payee).toHaveLength(100);
  });

  it("payee ที่ขึ้นต้นด้วยเครื่องหมายสูตรถูกตัดหัวออก", () => {
    // ชีตเขียนด้วย USER_ENTERED — ข้อความที่ขึ้นต้นด้วย = หรือ + จะกลายเป็นสูตร
    expect(validateExpenseInput({ ...valid, payee: "=ทองใบshop" })?.payee).toBe("ทองใบshop");
    expect(validateExpenseInput({ ...valid, payee: " +-@ ร้านกาแฟ" })?.payee).toBe("ร้านกาแฟ");
    expect(validateExpenseInput({ ...valid, payee: "=+-@" })).not.toHaveProperty("payee");
  });
```

- [ ] **Step 2: รัน test ให้เห็นว่าไม่ผ่าน**

Run: `npx vitest run lib/validation.test.ts`
Expected: FAIL 3 ข้อ (`รับ payee และ trim`, `payee ยาวเกิน...`, `payee ที่ขึ้นต้นด้วยเครื่องหมายสูตร...`) เพราะผลลัพธ์ยังไม่มี `payee` ส่วนข้อ `payee ว่างหรือไม่ใช่ string...` ผ่านอยู่แล้วและจะมีความหมายเมื่อ implementation เข้ามา

- [ ] **Step 3: เขียน implementation**

`lib/validation.ts` — เพิ่มค่าคงที่ใต้ import:

```ts
const MAX_PAYEE_LENGTH = 100;
```

แทนที่ฟังก์ชัน `validateExpenseInput` ทั้งก้อน:

```ts
export function validateExpenseInput(body: unknown): NewExpense | null {
  if (typeof body !== "object" || body === null) return null;
  const { date, item, amount, remark, category, payee } = body as Record<string, unknown>;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof item !== "string" || item.trim() === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  // The forms already block this, but a "?" reaching the sheet would become a
  // permanent phantom person in the /people balances. Making it an invariant
  // here means a stale tab or a direct POST cannot get past it either.
  if (typeof remark === "string" && hasPlaceholderPerson(remark)) return null;

  // Payee is OCR output, so it gets cleaned rather than rejected: a slip with
  // a garbled shop name is still a real expense. The leading-character strip
  // matters because rows are written USER_ENTERED — "=..." would be a formula.
  const cleanPayee =
    typeof payee === "string"
      ? payee.replace(/^[=+\-@\s]+/, "").trim().slice(0, MAX_PAYEE_LENGTH)
      : "";

  return {
    date,
    item: item.trim(),
    amount,
    remark: typeof remark === "string" ? remark.trim() : "",
    // Unknown/legacy payloads fall back to the default category.
    category: toCategory(category),
    // Key left off entirely when absent, so hand-typed rows stay payee-less.
    ...(cleanPayee ? { payee: cleanPayee } : {}),
  };
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run lib/validation.test.ts`
Expected: PASS ทุกข้อ รวม test เดิม `"รับข้อมูลที่ถูกต้อง และ trim item กับ remark"` ที่ใช้ `toEqual` (ผ่านได้เพราะไม่มี key `payee` เมื่อไม่ได้ส่งมา)

- [ ] **Step 5: Commit**

```bash
git add lib/validation.ts lib/validation.test.ts
git commit -m "feat(slip): accept an optional payee on new expenses"
```

---

### Task 4: column H ใน Sheet

**Files:**
- Create: `lib/expenseRows.ts`
- Test: `lib/expenseRows.test.ts`
- Modify: `lib/sheets.ts`, `README.md:20-23`

**Interfaces:**
- Consumes: `Expense`, `NewExpense` จาก `@/types`, `toCategory` จาก `@/lib/categories`
- Produces:
  - `rowToExpense(row: string[]): Expense` — อ่าน A..H, ไม่มี key `payee` เมื่อ H ว่าง
  - `expenseToRow(expense: Expense): string[]` — 8 ช่อง (A..H) สำหรับ append
  - `expenseToCoreRow(expense: Expense): string[]` — 7 ช่อง (A..G) สำหรับ update
  - `readAllExpenses`, `appendExpense`, `updateExpense`, `deleteExpense` จาก `@/lib/sheets` — signature เดิม

- [ ] **Step 1: เขียน test ที่ยังไม่ผ่าน**

สร้าง `lib/expenseRows.test.ts`:

```ts
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
```

- [ ] **Step 2: รัน test ให้เห็นว่าไม่ผ่าน**

Run: `npx vitest run lib/expenseRows.test.ts`
Expected: FAIL — `Cannot find module '@/lib/expenseRows'`

- [ ] **Step 3: เขียน `lib/expenseRows.ts`**

```ts
import { toCategory } from "@/lib/categories";
import type { Expense } from "@/types";

// Column order of the `expenses` tab:
//   A id | B date | C item | D amount | E remark | F createdAt | G category | H payee
// Kept apart from lib/sheets.ts so the mapping can be tested without loading
// the Google client.

export function rowToExpense(row: string[]): Expense {
  // Legacy rows stop at F (no category) or G (no payee).
  const [id, date, item, amount, remark, createdAt, category, payee] = row;
  return {
    id,
    date,
    item,
    amount: Number(amount) || 0,
    remark: remark ?? "",
    createdAt,
    category: toCategory(category),
    ...(payee ? { payee } : {}),
  };
}

/** Columns A:G — what an edit rewrites. H is left out on purpose: the edit
 *  form does not know about the payee, and writing a blank over it would
 *  erase what the slip taught us about that shop. */
export function expenseToCoreRow(expense: Expense): string[] {
  return [
    expense.id,
    expense.date,
    expense.item,
    String(expense.amount),
    expense.remark ?? "",
    expense.createdAt,
    expense.category,
  ];
}

/** Columns A:H — a brand-new row. */
export function expenseToRow(expense: Expense): string[] {
  return [...expenseToCoreRow(expense), expense.payee ?? ""];
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run lib/expenseRows.test.ts`
Expected: PASS ทั้ง 8 ข้อ

- [ ] **Step 5: ให้ `lib/sheets.ts` ใช้ mapper ใหม่และ column H**

แทนที่ส่วนบนของ `lib/sheets.ts` ตั้งแต่บรรทัดแรกจนถึงก่อน `export async function readAllExpenses` (คือ import, ค่าคงที่, `rowToExpense`, `expenseToRow`) ด้วย:

```ts
import type { Expense, NewExpense } from "@/types";
import { expenseToCoreRow, expenseToRow, rowToExpense } from "@/lib/expenseRows";
import { getSheetsClient, getSheetId, getSheetGid, findRowNumber } from "@/lib/sheetsClient";

const SHEET_NAME = "expenses";
const RANGE_ALL = `${SHEET_NAME}!A2:H`;
```

แทนที่ฟังก์ชัน `updateExpense` ทั้งก้อน:

```ts
export async function updateExpense(id: string, input: NewExpense): Promise<Expense | null> {
  const rowNumber = await findRowNumber(SHEET_NAME, id);
  if (rowNumber === null) return null;
  const sheets = getSheetsClient();
  // F = createdAt, H = payee. Both belong to the row, not to the edit, so they
  // are read back and carried over rather than taken from the request.
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!F${rowNumber}:H${rowNumber}`,
  });
  const stored = (existing.data.values?.[0] ?? []) as string[];
  const createdAt = stored[0] ?? new Date().toISOString();
  const payee = stored[2];
  const expense: Expense = {
    id,
    createdAt,
    date: input.date,
    item: input.item,
    amount: input.amount,
    remark: input.remark,
    category: input.category,
    ...(payee ? { payee } : {}),
  };
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!A${rowNumber}:G${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [expenseToCoreRow(expense)] },
  });
  return expense;
}
```

`readAllExpenses`, `appendExpense`, `deleteExpense` ไม่ต้องแก้ — ใช้ `RANGE_ALL`, `rowToExpense`, `expenseToRow` ชื่อเดิมอยู่แล้ว และ `appendExpense` กระจาย `...input` ซึ่งพา `payee` มาด้วย

- [ ] **Step 6: อัปเดต README**

`README.md` — ในหัวข้อ "2. Google Sheet — เตรียมชีต" แทนที่ code block header ของ tab `expenses`:

```
   id | date | item | amount | remark | createdAt | category | payee
```

แล้วเพิ่มย่อหน้าใต้ code block นั้น (ก่อนข้อ 3):

```markdown
   column `payee` (H) เก็บชื่อร้านที่อ่านได้จากสลิป ใช้เติม รายการ + หมวด ให้สลิปร้านเดิมครั้งถัดไป แถวที่กรอกมือจะว่าง Sheet เดิมที่ยังไม่มี header ช่องนี้ใช้งานได้ตามปกติ — เพิ่ม `payee` ใน H1 เพื่อให้อ่านง่ายเท่านั้น
```

- [ ] **Step 7: ตรวจรวม**

Run: `npm test && npx tsc --noEmit && npx eslint lib/sheets.ts lib/expenseRows.ts lib/expenseRows.test.ts`
Expected: test ผ่านทั้งหมด, tsc และ eslint ไม่มี output

- [ ] **Step 8: Commit**

```bash
git add lib/expenseRows.ts lib/expenseRows.test.ts lib/sheets.ts README.md
git commit -m "feat(slip): store the payee in column H of the expenses tab"
```

---

### Task 5: tab ของ `/expenses/import`

**Files:**
- Modify: `lib/nav.ts:15-31`
- Test: `lib/nav.test.ts`

**Interfaces:**
- Consumes: ไม่มี
- Produces: `isTabActive(href: string, pathname: string): boolean` — signature เดิม, `/expenses/import` เป็นของ tab `/expenses/new`

- [ ] **Step 1: เขียน test ที่ยังไม่ผ่าน**

`lib/nav.test.ts` — แก้ `APP_ROUTES` ให้มี route ใหม่:

```ts
const APP_ROUTES = [
  "/",
  "/expenses",
  "/expenses/new",
  "/expenses/import",
  "/expenses/abc-123",
  "/people",
];
```

เพิ่ม test ต่อจาก `"หน้าเพิ่มมีแท็บของตัวเอง ไม่ใช่ของรายการ"`:

```ts
  it("หน้าเพิ่มจากสลิปเป็นของแท็บเพิ่ม ไม่ใช่ของรายการ", () => {
    // It is another way to add, reached from the Add screen — lighting up the
    // List tab would say the user had left the flow they are in.
    expect(activeLabels("/expenses/import")).toEqual(["เพิ่ม"]);
  });
```

- [ ] **Step 2: รัน test ให้เห็นว่าไม่ผ่าน**

Run: `npx vitest run lib/nav.test.ts`
Expected: FAIL 1 ข้อ — `หน้าเพิ่มจากสลิป...` ได้ `["รายการ"]` แทน `["เพิ่ม"]`

- [ ] **Step 3: แก้กฎ**

`lib/nav.ts` — แทนที่ตั้งแต่ doc comment ของ `isTabActive` จนจบไฟล์:

```ts
// Both ways of adding an expense light up the Add tab.
const ADD_ROUTES = ["/expenses/new", "/expenses/import"];

/**
 * Which tab owns a given pathname.
 *
 * Every tab except the List and Add matches exactly. The List deliberately
 * owns the whole /expenses subtree (including the edit route /expenses/<id>)
 * minus the Add routes, which belong to the Add tab. Those rules have to be
 * decided before the prefix rule, or /expenses/new would light up two tabs.
 *
 * Callers pass `usePathname()`, which excludes the query string — so
 * /expenses/new?from=<id> still resolves to the Add tab.
 */
export function isTabActive(href: string, pathname: string): boolean {
  if (href === "/expenses/new") {
    return ADD_ROUTES.includes(pathname);
  }
  if (href === "/expenses") {
    return pathname.startsWith("/expenses") && !ADD_ROUTES.includes(pathname);
  }
  return pathname === href;
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run lib/nav.test.ts`
Expected: PASS ทุกข้อ รวม `"ทุกหน้าในแอปแอคทีฟได้แท็บเดียว"` และ `"query string ต้องไม่หลุดเข้ามา"`

- [ ] **Step 5: Commit**

```bash
git add lib/nav.ts lib/nav.test.ts
git commit -m "feat(nav): the slip import route belongs to the Add tab"
```

---

### Task 6: ตรรกะของ list (`lib/slipImport.ts`)

**Files:**
- Create: `lib/slipImport.ts`
- Test: `lib/slipImport.test.ts`

**Interfaces:**
- Consumes:
  - `SlipRead` จาก `@/lib/slipParse`: `{ amount: number | null; date: string | null; time: string | null; payee: string | null }`
  - `suggestFromPayee(payee: string, expenses: Expense[]): { item: string; category: Category } | null` จาก `@/lib/payees`
  - `DEFAULT_CATEGORY`, `Category` จาก `@/lib/categories`
  - `Expense`, `NewExpense` จาก `@/types`
- Produces:
  - `interface SlipRow { id: string; fileName: string; date: string; amount: string; item: string; category: Category; payee: string; dateGuessed: boolean; readError: boolean }`
  - `buildSlipRow(id: string, fileName: string, read: SlipRead | null, expenses: Expense[], today: string): SlipRow`
  - `isRowReady(row: SlipRow): boolean`
  - `findDuplicateIds(rows: SlipRow[], expenses: Expense[]): Set<string>`
  - `rowToNewExpense(row: SlipRow): NewExpense`
  - `saveRows(rows: SlipRow[], add: (input: NewExpense) => Promise<void>): Promise<SaveOutcome>`
  - `interface SaveOutcome { savedIds: string[]; error: string | null }`

- [ ] **Step 1: เขียน test ที่ยังไม่ผ่าน**

สร้าง `lib/slipImport.test.ts`:

```ts
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
```

- [ ] **Step 2: รัน test ให้เห็นว่าไม่ผ่าน**

Run: `npx vitest run lib/slipImport.test.ts`
Expected: FAIL — `Cannot find module '@/lib/slipImport'`

- [ ] **Step 3: เขียน implementation**

สร้าง `lib/slipImport.ts`:

```ts
import { DEFAULT_CATEGORY, type Category } from "@/lib/categories";
import { suggestFromPayee } from "@/lib/payees";
import type { SlipRead } from "@/lib/slipParse";
import type { Expense, NewExpense } from "@/types";

/** One slip on the review list. `amount` stays text because it is bound to an
 *  input the user may be halfway through editing. */
export interface SlipRow {
  id: string;
  fileName: string;
  date: string; // YYYY-MM-DD
  amount: string;
  item: string;
  category: Category;
  payee: string; // "" when the slip gave no shop name
  /** The slip's date could not be read, so today was filled in. */
  dateGuessed: boolean;
  /** The file could not be read at all; every field is the user's to fill. */
  readError: boolean;
}

export interface SaveOutcome {
  savedIds: string[];
  error: string | null;
}

/**
 * Turns what OCR found (or null when the file could not be read) into an
 * editable row, prefilled from how that shop was filed before.
 */
export function buildSlipRow(
  id: string,
  fileName: string,
  read: SlipRead | null,
  expenses: Expense[],
  today: string
): SlipRow {
  const payee = read?.payee ?? "";
  const suggestion = payee ? suggestFromPayee(payee, expenses) : null;
  return {
    id,
    fileName,
    date: read?.date ?? today,
    amount: read?.amount != null ? String(read.amount) : "",
    item: suggestion?.item ?? "",
    category: suggestion?.category ?? DEFAULT_CATEGORY,
    payee,
    // An unreadable file gets its own, louder label instead of this one.
    dateGuessed: read !== null && read.date === null,
    readError: read === null,
  };
}

function parseAmount(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Mirrors what validateExpenseInput will accept, so nothing reaches the API
 *  only to be rejected halfway through a batch. */
export function isRowReady(row: SlipRow): boolean {
  return (
    row.item.trim() !== "" &&
    parseAmount(row.amount) !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date)
  );
}

/**
 * Rows that look like something already recorded: same date and amount as a
 * saved expense, or as another row in this batch (the same slip picked twice).
 * A warning, never a block — two ฿60 lunches on one day are real.
 */
export function findDuplicateIds(rows: SlipRow[], expenses: Expense[]): Set<string> {
  const keyOf = (date: string, amount: number) => `${date}|${amount}`;
  const recorded = new Set(expenses.map((e) => keyOf(e.date, e.amount)));

  const keyByRow = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const row of rows) {
    const amount = parseAmount(row.amount);
    if (amount === null) continue;
    const key = keyOf(row.date, amount);
    keyByRow.set(row.id, key);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  const duplicates = new Set<string>();
  for (const [id, key] of keyByRow) {
    if (recorded.has(key) || (seen.get(key) ?? 0) > 1) duplicates.add(id);
  }
  return duplicates;
}

export function rowToNewExpense(row: SlipRow): NewExpense {
  const payee = row.payee.trim();
  return {
    date: row.date,
    item: row.item.trim(),
    amount: Number(row.amount),
    // Splits are not entered here; a row that needs one is edited afterwards.
    remark: "",
    category: row.category,
    ...(payee ? { payee } : {}),
  };
}

/**
 * Saves rows one after another and stops at the first failure.
 *
 * Sequential on purpose: overlapping appends to a sheet can land on the same
 * row. Reporting exactly which ids made it lets the caller drop those and
 * keep the rest, so pressing save again never files a row twice.
 */
export async function saveRows(
  rows: SlipRow[],
  add: (input: NewExpense) => Promise<void>
): Promise<SaveOutcome> {
  const savedIds: string[] = [];
  for (const row of rows) {
    try {
      await add(rowToNewExpense(row));
      savedIds.push(row.id);
    } catch (err) {
      return { savedIds, error: err instanceof Error ? err.message : "บันทึกไม่สำเร็จ" };
    }
  }
  return { savedIds, error: null };
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `npx vitest run lib/slipImport.test.ts`
Expected: PASS ทั้ง 23 ข้อ

- [ ] **Step 5: Commit**

```bash
git add lib/slipImport.ts lib/slipImport.test.ts
git commit -m "feat(slip): review-list logic for imported slips"
```

---

### Task 7: หน้า import

**Files:**
- Create: `components/expenses/SlipRow.tsx`, `app/expenses/import/page.tsx`
- Modify: `app/expenses/new/page.tsx:13-28`

**Interfaces:**
- Consumes:
  - `SlipRow`, `buildSlipRow`, `findDuplicateIds`, `isRowReady`, `saveRows` จาก `@/lib/slipImport` (Task 6)
  - `loadSlipReader(): Promise<Worker>`, `readSlip(file: File): Promise<{ read: SlipRead; ... }>` จาก `@/lib/slipOcr`
  - `useExpenseStore()` → `{ expenses, isLoaded, error, add, load }` จาก `@/store/expenseStore`
  - `todayISO()` จาก `@/lib/formatters`
  - component เดิม: `Card` (`children`, `className`), `Button` (`variant`, `disabled`, `onClick`), `Input` (`label`, `id`, + input props), `DateField` (`value`, `onChange`, `label`, `id`), `CategoryPicker` (`value`, `onChange`), `Screen` (`children`)
- Produces: route `/expenses/import`

- [ ] **Step 1: อ่าน doc ของ Next ตามที่ `AGENTS.md` กำหนด**

อ่าน `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` และ `04-linking-and-navigating.md` ยืนยันว่า: โฟลเดอร์ static (`import`) ชนะ dynamic segment (`[id]`) ใน `app/expenses/`, และ `<Link>` จาก `next/link` ใช้ใน server component ได้ ถ้า doc บอกต่างจากนี้ ให้หยุดและรายงาน

- [ ] **Step 2: เขียน `components/expenses/SlipRow.tsx`**

```tsx
"use client";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import CategoryPicker from "@/components/ui/CategoryPicker";
import { cn } from "@/lib/utils";
import { isRowReady, type SlipRow as SlipRowData } from "@/lib/slipImport";

interface SlipRowProps {
  row: SlipRowData;
  /** Same date and amount as something already recorded or on this list. */
  duplicate: boolean;
  onChange: (patch: Partial<SlipRowData>) => void;
  onRemove: () => void;
}

const BADGE = "rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent";

/** One slip on the review list — every field the slip filled in can be
 *  corrected here before anything is written to the sheet. */
export default function SlipRow({ row, duplicate, onChange, onRemove }: SlipRowProps) {
  const ready = isRowReady(row);

  return (
    <Card
      className={cn(
        "mt-4 rounded-[22px] p-[20px_22px]",
        // The save button is blocked while any row looks like this, so the
        // row that is blocking it has to be findable at a glance.
        !ready && "ring-1 ring-expense"
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-sub">
            {row.payee || row.fileName}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {row.readError && <span className={BADGE}>อ่านไม่ได้ กรอกเอง</span>}
            {row.dateGuessed && <span className={BADGE}>ใช้วันนี้</span>}
            {duplicate && <span className={BADGE}>อาจซ้ำ</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`ลบแถว ${row.payee || row.fileName}`}
          className="shrink-0 rounded-lg px-2 py-1 text-[13px] text-sub transition-transform active:scale-95"
        >
          ลบ
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <DateField
            id={`${row.id}-date`}
            label="วันที่"
            value={row.date}
            // Once the user picks a date it is no longer a guess.
            onChange={(date) => onChange({ date, dateGuessed: false })}
          />
          <Input
            id={`${row.id}-amount`}
            label="จำนวนเงิน"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0"
            value={row.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
          />
        </div>
        <Input
          id={`${row.id}-item`}
          label="รายการ"
          placeholder="เช่น ข้าวเที่ยง"
          value={row.item}
          onChange={(e) => onChange({ item: e.target.value })}
        />
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-sub">หมวดหมู่</span>
          <CategoryPicker value={row.category} onChange={(category) => onChange({ category })} />
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: เขียน `app/expenses/import/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Screen from "@/components/layout/Screen";
import SlipRow from "@/components/expenses/SlipRow";
import { useExpenseStore } from "@/store/expenseStore";
import { todayISO } from "@/lib/formatters";
import { loadSlipReader, readSlip } from "@/lib/slipOcr";
import type { SlipRead } from "@/lib/slipParse";
import {
  buildSlipRow,
  findDuplicateIds,
  isRowReady,
  saveRows,
  type SlipRow as SlipRowData,
} from "@/lib/slipImport";

export default function ImportSlipsPage() {
  const { expenses, isLoaded, error: storeError, add, load } = useExpenseStore();
  const [rows, setRows] = useState<SlipRowData[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // The store drives both the shop suggestions and the "อาจซ้ำ" check, so
  // slips are not accepted until it has loaded.
  useEffect(() => {
    if (!isLoaded) load();
  }, [isLoaded, load]);

  const duplicates = useMemo(() => findDuplicateIds(rows, expenses), [rows, expenses]);
  const notReady = rows.filter((row) => !isRowReady(row)).length;

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset so picking the same slips again still fires onChange.
    event.target.value = "";
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    setSavedCount(null);

    try {
      setStatus("กำลังโหลดตัวอ่าน (ครั้งแรกจะนานหน่อย)...");
      await loadSlipReader();
    } catch {
      setError("โหลดตัวอ่านไม่สำเร็จ — เลือกรูปอีกครั้งเพื่อลองใหม่");
      setStatus(null);
      setBusy(false);
      return;
    }

    for (const [index, file] of files.entries()) {
      setStatus(`กำลังอ่านใบที่ ${index + 1} จาก ${files.length}...`);
      let read: SlipRead | null = null;
      try {
        read = (await readSlip(file)).read;
      } catch {
        // An undecodable file (HEIC, not an image) still becomes a row — an
        // empty one the user can fill in or remove — and the rest carry on.
      }
      const row = buildSlipRow(crypto.randomUUID(), file.name, read, expenses, todayISO());
      setRows((current) => [...current, row]);
    }

    setStatus(null);
    setBusy(false);
  }

  function updateRow(id: string, patch: Partial<SlipRowData>) {
    // The saved notice describes the previous batch; editing means a new one.
    setSavedCount(null);
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSavedCount(null);

    const outcome = await saveRows(rows, add);
    const left = rows.length - outcome.savedIds.length;
    // Saved rows leave the list whether or not the batch finished, so a
    // second press can never file them again.
    setRows((current) => current.filter((row) => !outcome.savedIds.includes(row.id)));
    if (outcome.savedIds.length > 0) setSavedCount(outcome.savedIds.length);
    if (outcome.error) {
      setError(`${outcome.error} — เหลือ ${left} แถวยังไม่ได้บันทึก กดบันทึกอีกครั้งได้`);
    }
    setBusy(false);
  }

  return (
    <Screen>
      <h1 className="mb-2 text-[26px] font-bold leading-tight text-text">เพิ่มจากสลิป</h1>
      <p className="mb-5 text-[13px] text-sub">
        รูปถูกอ่านในเครื่องนี้ ไม่ถูกส่งออกและไม่ถูกเก็บ ·{" "}
        <Link href="/expenses/new" className="font-semibold text-accent">
          กรอกเอง
        </Link>
      </p>

      <Card className="rounded-[22px] p-[22px]">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-sub">เลือกรูปสลิป (หลายใบได้)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy || !isLoaded}
            onChange={handleFiles}
            className="text-[14px] text-text"
          />
        </label>
        {!isLoaded && !storeError && <p className="mt-3 text-sm text-sub">กำลังโหลดข้อมูล...</p>}
        {storeError && <p className="mt-3 text-sm text-accent">{storeError}</p>}
        {status && <p className="mt-3 text-sm text-sub">{status}</p>}
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        {savedCount !== null && (
          <p className="mt-3 text-sm text-accent">✓ บันทึกแล้ว {savedCount} รายการ</p>
        )}
      </Card>

      {rows.map((row) => (
        <SlipRow
          key={row.id}
          row={row}
          duplicate={duplicates.has(row.id)}
          onChange={(patch) => updateRow(row.id, patch)}
          onRemove={() => removeRow(row.id)}
        />
      ))}

      {rows.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          {notReady > 0 && (
            <p className="text-sm text-expense">แก้ {notReady} แถวก่อนบันทึก (กรอบสีส้ม)</p>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={busy || notReady > 0}
            className="w-full"
          >
            {busy ? "กำลังบันทึก..." : `บันทึกทั้งหมด (${rows.length})`}
          </Button>
        </div>
      )}
    </Screen>
  );
}
```

- [ ] **Step 4: เพิ่มลิงก์ในหน้าเพิ่มรายจ่าย**

`app/expenses/new/page.tsx` — เพิ่ม import ใต้ `import { Suspense } from "react";`:

```tsx
import Link from "next/link";
```

แทนที่บรรทัด `<h1 ...>เพิ่มรายจ่าย</h1>`:

```tsx
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-[26px] font-bold leading-tight text-text">เพิ่มรายจ่าย</h1>
        <Link href="/expenses/import" className="shrink-0 text-[14px] font-semibold text-accent">
          เพิ่มจากสลิป
        </Link>
      </div>
```

- [ ] **Step 5: ตรวจอัตโนมัติ**

Run: `npm test && npx tsc --noEmit && npx eslint app/expenses components/expenses/SlipRow.tsx && npm run build`
Expected:
- test ผ่านทั้งหมด
- tsc และ eslint ไม่มี output
- build สำเร็จ ตาราง route มี `○ /expenses/import` และ **ไม่มี** `/slip-test`

- [ ] **Step 6: Commit**

```bash
git add components/expenses/SlipRow.tsx app/expenses/import/page.tsx app/expenses/new/page.tsx
git commit -m "feat(slip): import expenses from slip images"
```

- [ ] **Step 7: รายการตรวจด้วยมือบน Vercel preview (หลัง Mark สั่ง push)**

ต้องใช้ข้อมูลจริงและมือถือ ไม่มี test อัตโนมัติสำหรับส่วนนี้ รายงานผลแต่ละข้อว่าผ่าน/ไม่ผ่าน:

1. หน้า "เพิ่ม" มีลิงก์ "เพิ่มจากสลิป" กดแล้วไป `/expenses/import` และ tab "เพิ่ม" ยัง active
2. เลือกสลิป 4 ใบตัวอย่าง → ได้ 4 แถว ยอดและวันที่ถูกทุกใบ
3. แถวที่รายการว่างมีกรอบสีส้ม ปุ่มบันทึกกดไม่ได้ และมีข้อความ "แก้ N แถวก่อนบันทึก"
4. กรอกรายการครบ → บันทึก → ข้อความ "✓ บันทึกแล้ว 4 รายการ" และ list ว่าง
5. เปิด Google Sheet → 4 แถวใหม่มีชื่อร้านใน column H และ `remark` ว่าง
6. เลือกสลิปใบเดิมซ้ำ → รายการ + หมวดถูกเติมให้ และขึ้นป้าย "อาจซ้ำ"
7. เปิดรายการที่ import มาในหน้าแก้ไข แก้ยอดแล้วบันทึก → column H ของแถวนั้นใน Sheet ยังอยู่
8. เลือกไฟล์ที่ไม่ใช่รูปสลิป (เช่น รูปถ่ายทั่วไป) → ได้แถวที่ยอดว่าง ลบแถวได้
