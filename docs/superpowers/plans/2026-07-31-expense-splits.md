# Expense Splits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้แอปอ่าน pattern คนติดเงินใน `remark` ออก แล้วสรุปยอด "ต้องกันไว้ / จะได้คืน" รายคน พร้อมเคลียร์หนี้ได้

**Architecture:** Parse `remark` ตอนอ่านทุกครั้ง (ไม่เก็บผล parse ลง Sheet) — `lib/splits.ts` แปลง string → `Split[]`, `lib/balances.ts` รวม expenses + settlements → ยอดคงค้างรายคน ทั้งสองไฟล์เป็น pure function ไม่รู้จัก React/Google Sheet เลย ทดสอบด้วย vitest ได้ตรงๆ ส่วนการเคลียร์หนี้เก็บใน Google Sheet tab ใหม่ชื่อ `settlements` โดยไม่แก้ `remark` เดิม

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Zustand + googleapis (Service Account JWT) + vitest (เพิ่มใหม่)

**Spec:** `docs/superpowers/specs/2026-07-31-expense-splits-design.md`

## Global Constraints

- **ห้ามแก้ schema ของ tab `expenses`** — คอลัมน์ A–G คงเดิม, `types/index.ts` interface `Expense` ห้ามเพิ่ม/ลบ field
- **ห้ามแก้ค่าใน `remark`** จากโค้ดส่วนของ feature นี้ (การเคลียร์หนี้เขียนลง tab `settlements` เท่านั้น)
- ทุกข้อความที่ผู้ใช้เห็นเป็นภาษาไทย, ชื่อตัวแปร/comment เป็นภาษาอังกฤษ
- ไฟล์ใน `lib/splits.ts` และ `lib/balances.ts` ต้องไม่ import อะไรจาก `react`, `next`, หรือ `googleapis`
- สีที่ใช้ต้องมาจาก token ที่มีอยู่แล้วใน `app/globals.css`: `text-expense` (ส้ม = ต้องกันไว้), `text-accent` (เขียว = จะได้คืน), `text-sub`, `text-text`, `bg-card`, `border-border` — ห้ามฮาร์ดโค้ด hex ใหม่
- โปรเจกต์ไม่มี `tailwind-merge` — ส่ง padding/radius ผ่าน `className` ที่ use-site ตามแบบ `Card`
- Node ≥ 20.11 (ใช้ `import.meta.dirname` ไม่ได้ในบาง runtime → ใช้ `fileURLToPath`)
- ตัวคั่นระหว่างคนใน remark คือ newline หรือ `;` เท่านั้น (ห้ามใช้ `,`)
- Commit ทุก task ตาม step สุดท้ายของแต่ละ task (branch แยก ไม่ commit ลง main โดยตรง)

---

## File Structure

**สร้างใหม่:**

| ไฟล์ | หน้าที่ |
|---|---|
| `vitest.config.ts` | config test runner + alias `@` |
| `lib/splits.ts` | `normalizePerson`, `parseRemark`, `summarizeExpense` — pure |
| `lib/splits.test.ts` | test ของ parser + สูตรต่อรายการ |
| `lib/balances.ts` | `buildPersonBalances`, `summarizeBalances` — pure |
| `lib/balances.test.ts` | test ของ netting + settlement |
| `lib/sheetsClient.ts` | Google Sheets client ที่ใช้ร่วมกัน (ย้ายมาจาก `lib/sheets.ts`) |
| `lib/settlementSheets.ts` | อ่าน/เขียน/ลบ tab `settlements` |
| `app/api/settlements/route.ts` | GET / POST |
| `app/api/settlements/[id]/route.ts` | DELETE |
| `store/settlementStore.ts` | state ของ settlements |
| `components/ui/SplitPreview.tsx` | chip preview ใต้ช่องหมายเหตุ |
| `components/people/PersonRow.tsx` | 1 แถวคน + กางรายการที่มา |
| `components/people/SettleDialog.tsx` | modal เคลียร์หนี้ |
| `app/people/page.tsx` | หน้าสรุปยอดคงค้าง |

**แก้:**

| ไฟล์ | สิ่งที่แก้ |
|---|---|
| `package.json` | เพิ่ม devDeps vitest + script `test` |
| `types/index.ts` | เพิ่ม type ใหม่ (ไม่แตะ `Expense`) |
| `lib/sheets.ts` | import client จาก `lib/sheetsClient.ts` แทนสร้างเอง |
| `lib/validation.ts` | เพิ่ม `validateSettlementInput` |
| `app/expenses/new/page.tsx` | ใส่ `SplitPreview` |
| `app/expenses/[id]/page.tsx` | ใส่ `SplitPreview` + แสดงยอดแยก |
| `app/expenses/page.tsx` | badge บนรายการที่มี split |
| `app/page.tsx` | บรรทัด "ของฉัน" + การ์ด "ค้างอยู่" |

---

## Task 1: Test runner + parser พื้นฐาน

**Files:**
- Create: `vitest.config.ts`, `lib/splits.ts`, `lib/splits.test.ts`
- Modify: `package.json`, `types/index.ts`

**Interfaces:**
- Consumes: `Expense` จาก `@/types` (มีอยู่แล้ว)
- Produces:
  - `normalizePerson(name: string): string`
  - `parseRemark(remark: string): ParsedRemark`
  - type `Split`, `SplitDirection`, `ParsedRemark` ใน `@/types`

- [ ] **Step 1: ติดตั้ง vitest**

```bash
npm install -D vitest@^3
```

- [ ] **Step 2: เพิ่ม script `test` ใน `package.json`**

ในบล็อก `"scripts"` เพิ่มบรรทัดต่อจาก `"lint": "eslint",`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: สร้าง `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
```

- [ ] **Step 4: เพิ่ม type ใหม่ใน `types/index.ts`**

ต่อท้ายไฟล์ (ห้ามแก้ interface `Expense` ที่มีอยู่):

```ts
export type SplitDirection = "owed_to_me" | "i_owe";

export interface Split {
  person: string; // normalized
  amount: number;
  label: string;
  direction: SplitDirection;
}

export interface ParsedRemark {
  splits: Split[];
  freeText: string;
  invalid: boolean;
}
```

- [ ] **Step 5: เขียน test ที่ยังไม่ผ่าน — `lib/splits.test.ts`**

```ts
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
```

- [ ] **Step 6: รัน test ให้เห็นว่าไม่ผ่าน**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/splits'`

- [ ] **Step 7: เขียน `lib/splits.ts`**

```ts
import type { ParsedRemark, Split, SplitDirection } from "@/types";

// One "[amount] label" chunk. The label runs until the next "[" so a single
// person can carry several chunks joined by "+".
const BLOCK_RE = /\[\s*([\d,]+(?:\.\d+)?)\s*\]([^[]*)/g;
const HAS_BLOCK_RE = /\[\s*[\d,]+(?:\.\d+)?\s*\]/;
const PAYER_SUFFIX_RE = /จ่าย$/;

/** "ขนมจ่าย" / " ขนม จ่าย " → "ขนม" — the suffix only marks direction. */
export function normalizePerson(name: string): string {
  return name.trim().replace(PAYER_SUFFIX_RE, "").trim().replace(/\s+/g, " ");
}

interface Block {
  amount: number;
  label: string;
}

function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  for (const match of body.matchAll(BLOCK_RE)) {
    const amount = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const label = match[2].replace(/^\s*\+?\s*/, "").replace(/\+\s*$/, "").trim();
    blocks.push({ amount, label });
  }
  return blocks;
}

export function parseRemark(remark: string): ParsedRemark {
  const splits: Split[] = [];
  const leftovers: string[] = [];
  let invalid = false;

  for (const segment of (remark ?? "").split(/[\n;]+/)) {
    const text = segment.trim();
    if (!text) continue;

    const colon = text.indexOf(":");
    const rawName = colon === -1 ? "" : text.slice(0, colon).trim();
    const blocks = colon === -1 ? [] : parseBlocks(text.slice(colon + 1));
    const person = normalizePerson(rawName);

    if (!person || blocks.length === 0) {
      // A segment that looks like the pattern but did not parse is a typo,
      // not free text — flag it so the UI can warn.
      if (HAS_BLOCK_RE.test(text)) invalid = true;
      leftovers.push(text);
      continue;
    }

    const direction: SplitDirection = PAYER_SUFFIX_RE.test(rawName) ? "i_owe" : "owed_to_me";
    for (const block of blocks) {
      splits.push({ person, amount: block.amount, label: block.label, direction });
    }
  }

  return { splits, freeText: leftovers.join("; "), invalid };
}
```

- [ ] **Step 8: รัน test ให้ผ่าน**

Run: `npm test`
Expected: PASS ทุกเคสใน `lib/splits.test.ts`

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts types/index.ts lib/splits.ts lib/splits.test.ts
git commit -m "feat: parse split entries from expense remark"
```

---

## Task 2: สูตรต่อรายการ (myShare / cashOut)

**Files:**
- Modify: `lib/splits.ts`, `lib/splits.test.ts`, `types/index.ts`

**Interfaces:**
- Consumes: `parseRemark` จาก Task 1, `Expense` จาก `@/types`
- Produces: `summarizeExpense(expense: Expense): ExpenseSplitSummary` และ type `ExpenseSplitSummary`

- [ ] **Step 1: เพิ่ม type ใน `types/index.ts`**

ต่อจาก `ParsedRemark`:

```ts
export interface ExpenseSplitSummary extends ParsedRemark {
  lentOut: number; // เราออกให้คนอื่น
  borrowed: number; // คนอื่นออกให้เรา
  myShare: number; // ค่าใช้จ่ายของฉันจริง = amount - lentOut
  cashOut: number; // เงินออกจากกระเป๋าจริง = amount - borrowed
  overAllocated: boolean; // lentOut + borrowed > amount
}
```

- [ ] **Step 2: เขียน test ที่ยังไม่ผ่าน — ต่อท้าย `lib/splits.test.ts`**

เพิ่ม import ที่บรรทัดบนสุดของไฟล์ให้เป็น:

```ts
import { normalizePerson, parseRemark, summarizeExpense } from "@/lib/splits";
import type { Expense } from "@/types";
```

แล้วต่อท้ายไฟล์:

```ts
function makeExpense(amount: number, remark: string): Expense {
  return {
    id: "e1",
    date: "2026-07-31",
    item: "ข้าวเที่ยง",
    amount,
    remark,
    category: "food",
    createdAt: "2026-07-31T05:00:00.000Z",
  };
}

describe("summarizeExpense", () => {
  it("ไม่มี split ยอดของฉันเท่ายอดบิล", () => {
    const s = summarizeExpense(makeExpense(150, "อร่อยดี"));
    expect(s.lentOut).toBe(0);
    expect(s.borrowed).toBe(0);
    expect(s.myShare).toBe(150);
    expect(s.cashOut).toBe(150);
    expect(s.overAllocated).toBe(false);
  });

  it("เราออกให้คนอื่น ลด myShare แต่ cashOut เท่าเดิม", () => {
    const s = summarizeExpense(makeExpense(150, "ขนม: [50] ค่าอาหาร"));
    expect(s.lentOut).toBe(50);
    expect(s.myShare).toBe(100);
    expect(s.cashOut).toBe(150);
  });

  it("คนอื่นออกให้เรา ลด cashOut แต่ myShare เท่าเดิม", () => {
    const s = summarizeExpense(makeExpense(150, "ขนมจ่าย: [50] ค่าอาหาร"));
    expect(s.borrowed).toBe(50);
    expect(s.myShare).toBe(150);
    expect(s.cashOut).toBe(100);
  });

  it("split รวมเกินยอดบิลติดธง overAllocated", () => {
    const s = summarizeExpense(makeExpense(100, "ขนม: [80] ก; ต้อมจ่าย: [50] ข"));
    expect(s.overAllocated).toBe(true);
    expect(s.myShare).toBe(20);
    expect(s.cashOut).toBe(50);
  });
});
```

- [ ] **Step 3: รัน test ให้เห็นว่าไม่ผ่าน**

Run: `npm test`
Expected: FAIL — `summarizeExpense is not a function`

- [ ] **Step 4: เพิ่ม `summarizeExpense` ใน `lib/splits.ts`**

แก้ import บรรทัดบนสุดเป็น:

```ts
import type { Expense, ExpenseSplitSummary, ParsedRemark, Split, SplitDirection } from "@/types";
```

ต่อท้ายไฟล์:

```ts
export function summarizeExpense(expense: Expense): ExpenseSplitSummary {
  const parsed = parseRemark(expense.remark);
  let lentOut = 0;
  let borrowed = 0;
  for (const split of parsed.splits) {
    if (split.direction === "owed_to_me") lentOut += split.amount;
    else borrowed += split.amount;
  }
  return {
    ...parsed,
    lentOut,
    borrowed,
    myShare: expense.amount - lentOut,
    cashOut: expense.amount - borrowed,
    overAllocated: lentOut + borrowed > expense.amount,
  };
}
```

- [ ] **Step 5: รัน test ให้ผ่าน**

Run: `npm test`
Expected: PASS ทุกเคส

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/splits.ts lib/splits.test.ts
git commit -m "feat: compute my-share and cash-out per expense"
```

---

## Task 3: ยอดคงค้างรายคน

**Files:**
- Create: `lib/balances.ts`, `lib/balances.test.ts`
- Modify: `types/index.ts`

**Interfaces:**
- Consumes: `summarizeExpense` จาก Task 2, `Expense` จาก `@/types`
- Produces:
  - `buildPersonBalances(expenses: Expense[], settlements: Settlement[]): PersonBalance[]`
  - `summarizeBalances(balances: PersonBalance[]): BalanceTotals`
  - type `Settlement`, `NewSettlement`, `SettlementDirection`, `SplitEntry`, `PersonBalance`, `BalanceTotals`

- [ ] **Step 1: เพิ่ม type ใน `types/index.ts`**

ต่อท้ายไฟล์:

```ts
export type SettlementDirection = "received" | "paid";

export interface Settlement {
  id: string;
  date: string; // YYYY-MM-DD
  person: string; // normalized
  amount: number;
  direction: SettlementDirection;
  note: string;
  createdAt: string; // ISO timestamp
}

export type NewSettlement = Omit<Settlement, "id" | "createdAt">;

export interface SplitEntry {
  expenseId: string;
  date: string;
  item: string;
  split: Split;
}

export interface PersonBalance {
  person: string;
  balance: number; // > 0 เขาติดเรา, < 0 เราติดเขา
  lentOut: number;
  borrowed: number;
  settledNet: number;
  entries: SplitEntry[];
}

export interface BalanceTotals {
  reserved: number; // ต้องกันไว้
  receivable: number; // จะได้คืน
}
```

- [ ] **Step 2: เขียน test ที่ยังไม่ผ่าน — `lib/balances.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildPersonBalances, summarizeBalances } from "@/lib/balances";
import type { Expense, Settlement } from "@/types";

function expense(id: string, amount: number, remark: string, date = "2026-07-10"): Expense {
  return {
    id,
    date,
    item: "รายการ " + id,
    amount,
    remark,
    category: "food",
    createdAt: date + "T05:00:00.000Z",
  };
}

function settlement(person: string, amount: number, direction: Settlement["direction"]): Settlement {
  return {
    id: "s-" + person + "-" + amount,
    date: "2026-07-20",
    person,
    amount,
    direction,
    note: "",
    createdAt: "2026-07-20T05:00:00.000Z",
  };
}

describe("buildPersonBalances", () => {
  it("รวมยอดที่คนอื่นติดเราเป็นบวก", () => {
    const [b] = buildPersonBalances([expense("e1", 150, "ขนม: [50] ข้าว")], []);
    expect(b.person).toBe("ขนม");
    expect(b.lentOut).toBe(50);
    expect(b.borrowed).toBe(0);
    expect(b.balance).toBe(50);
  });

  it("รวมยอดที่เราติดคนอื่นเป็นลบ", () => {
    const [b] = buildPersonBalances([expense("e1", 200, "ขนมจ่าย: [200] คลีนซิ่ง")], []);
    expect(b.balance).toBe(-200);
  });

  it("net สองทิศทางของคนเดียวกันเหลือยอดเดียว", () => {
    const balances = buildPersonBalances(
      [expense("e1", 50, "ขนม: [50] ข้าว"), expense("e2", 200, "ขนมจ่าย: [200] คลีนซิ่ง")],
      []
    );
    expect(balances).toHaveLength(1);
    expect(balances[0].balance).toBe(-150);
    expect(balances[0].entries).toHaveLength(2);
  });

  it("settlement บางส่วนหักยอดออก", () => {
    const [b] = buildPersonBalances(
      [expense("e1", 150, "ขนม: [100] ข้าว")],
      [settlement("ขนม", 40, "received")]
    );
    expect(b.settledNet).toBe(40);
    expect(b.balance).toBe(60);
  });

  it("settlement เต็มยอดทำให้คนนั้นหายจากรายการ", () => {
    const balances = buildPersonBalances(
      [expense("e1", 150, "ขนม: [100] ข้าว")],
      [settlement("ขนม", 100, "received")]
    );
    expect(balances).toEqual([]);
  });

  it("เราคืนเงินเขาแล้วยอดที่ติดหายไป", () => {
    const balances = buildPersonBalances(
      [expense("e1", 200, "ขนมจ่าย: [200] คลีนซิ่ง")],
      [settlement("ขนม", 200, "paid")]
    );
    expect(balances).toEqual([]);
  });

  it("เรียงตามยอดคงค้างมากไปน้อย", () => {
    const balances = buildPersonBalances(
      [expense("e1", 500, "ขนม: [50] ก; ต้อมจ่าย: [300] ข")],
      []
    );
    expect(balances.map((b) => b.person)).toEqual(["ต้อม", "ขนม"]);
  });

  it("รายการที่ไม่มี split ไม่สร้างคน", () => {
    expect(buildPersonBalances([expense("e1", 100, "ข้าวเที่ยง")], [])).toEqual([]);
  });
});

describe("summarizeBalances", () => {
  it("แยกยอดต้องกันไว้กับยอดจะได้คืน", () => {
    const balances = buildPersonBalances(
      [expense("e1", 500, "ขนม: [120] ก; ต้อมจ่าย: [350] ข")],
      []
    );
    expect(summarizeBalances(balances)).toEqual({ reserved: 350, receivable: 120 });
  });

  it("ไม่มีหนี้คืนศูนย์ทั้งคู่", () => {
    expect(summarizeBalances([])).toEqual({ reserved: 0, receivable: 0 });
  });
});
```

- [ ] **Step 3: รัน test ให้เห็นว่าไม่ผ่าน**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/balances'`

- [ ] **Step 4: เขียน `lib/balances.ts`**

```ts
import { summarizeExpense } from "@/lib/splits";
import type {
  BalanceTotals,
  Expense,
  PersonBalance,
  Settlement,
  SplitEntry,
} from "@/types";

// Balances below this are treated as settled — guards against float drift
// from decimal amounts (e.g. 0.1 + 0.2).
const EPSILON = 0.005;

export function buildPersonBalances(
  expenses: Expense[],
  settlements: Settlement[]
): PersonBalance[] {
  const byPerson = new Map<string, PersonBalance>();

  function ensure(person: string): PersonBalance {
    let entry = byPerson.get(person);
    if (!entry) {
      entry = { person, balance: 0, lentOut: 0, borrowed: 0, settledNet: 0, entries: [] };
      byPerson.set(person, entry);
    }
    return entry;
  }

  for (const expense of expenses) {
    const summary = summarizeExpense(expense);
    for (const split of summary.splits) {
      const person = ensure(split.person);
      if (split.direction === "owed_to_me") person.lentOut += split.amount;
      else person.borrowed += split.amount;
      const entry: SplitEntry = {
        expenseId: expense.id,
        date: expense.date,
        item: expense.item,
        split,
      };
      person.entries.push(entry);
    }
  }

  for (const settlement of settlements) {
    const person = ensure(settlement.person);
    person.settledNet +=
      settlement.direction === "received" ? settlement.amount : -settlement.amount;
  }

  const result: PersonBalance[] = [];
  for (const person of byPerson.values()) {
    person.balance = person.lentOut - person.borrowed - person.settledNet;
    if (Math.abs(person.balance) < EPSILON) continue;
    person.entries.sort((a, b) => b.date.localeCompare(a.date));
    result.push(person);
  }

  return result.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

export function summarizeBalances(balances: PersonBalance[]): BalanceTotals {
  let reserved = 0;
  let receivable = 0;
  for (const { balance } of balances) {
    if (balance < 0) reserved += -balance;
    else receivable += balance;
  }
  return { reserved, receivable };
}
```

- [ ] **Step 5: รัน test ให้ผ่าน**

Run: `npm test`
Expected: PASS ทุกเคสทั้ง `splits.test.ts` และ `balances.test.ts`

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/balances.ts lib/balances.test.ts
git commit -m "feat: aggregate per-person outstanding balances"
```

---

## Task 4: Sheets client ร่วม + tab `settlements`

**Files:**
- Create: `lib/sheetsClient.ts`, `lib/settlementSheets.ts`
- Modify: `lib/sheets.ts:1-31`, `lib/sheets.ts:117-124`

**Interfaces:**
- Consumes: type `Settlement`, `NewSettlement` จาก Task 3
- Produces:
  - `getSheetsClient(): sheets_v4.Sheets`, `getSheetId(): string`, `getSheetGid(sheetName: string): Promise<number>` จาก `@/lib/sheetsClient`
  - `readAllSettlements(): Promise<Settlement[]>`, `appendSettlement(input: NewSettlement): Promise<Settlement>`, `deleteSettlement(id: string): Promise<boolean>` จาก `@/lib/settlementSheets`

**หมายเหตุก่อนเริ่ม:** ต้องสร้าง tab ชื่อ `settlements` ใน Google Sheet ด้วยมือ พร้อม header แถวแรก:
`id | date | person | amount | direction | note | createdAt`
ถ้ายังไม่สร้าง โค้ดจะคืน `[]` และ log warning (ไม่ crash)

- [ ] **Step 1: สร้าง `lib/sheetsClient.ts`**

```ts
import { google, sheets_v4 } from "googleapis";

let _sheets: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (!_sheets) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    if (!email || !rawKey) {
      throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env var");
    }
    const auth = new google.auth.JWT({
      email,
      key: rawKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    _sheets = google.sheets({ version: "v4", auth });
  }
  return _sheets;
}

export function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEET_ID env var");
  return id;
}

export async function getSheetGid(sheetName: string): Promise<number> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: getSheetId() });
  const sheet = res.data.sheets?.find((s) => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId == null) throw new Error(`Sheet tab "${sheetName}" not found`);
  return sheetId;
}
```

- [ ] **Step 2: แก้ `lib/sheets.ts` ให้ใช้ client ร่วม**

ลบบรรทัด 1 และบรรทัด 8–31 (ตัวแปร `_sheets`, ฟังก์ชัน `getSheetsClient`, `getSheetId`) แล้วให้หัวไฟล์เป็น:

```ts
import type { Expense, NewExpense } from "@/types";
import { toCategory } from "@/lib/categories";
import { getSheetsClient, getSheetId, getSheetGid } from "@/lib/sheetsClient";

const SHEET_NAME = "expenses";
const RANGE_ALL = `${SHEET_NAME}!A2:G`;
```

ลบฟังก์ชัน `getSheetGid()` เดิม (บรรทัด 117–124) ทิ้ง แล้วแก้บรรทัดที่เรียกใช้ใน `deleteExpense` จาก:

```ts
  const sheetId = await getSheetGid();
```

เป็น:

```ts
  const sheetId = await getSheetGid(SHEET_NAME);
```

- [ ] **Step 3: ตรวจว่ายัง build ผ่าน**

Run: `npx tsc --noEmit`
Expected: ไม่มี error

- [ ] **Step 4: สร้าง `lib/settlementSheets.ts`**

```ts
import type { NewSettlement, Settlement, SettlementDirection } from "@/types";
import { getSheetsClient, getSheetId, getSheetGid } from "@/lib/sheetsClient";

const SHEET_NAME = "settlements";
const RANGE_ALL = `${SHEET_NAME}!A2:G`;

function toDirection(value: string | undefined): SettlementDirection {
  return value === "paid" ? "paid" : "received";
}

function rowToSettlement(row: string[]): Settlement {
  const [id, date, person, amount, direction, note, createdAt] = row;
  return {
    id,
    date,
    person,
    amount: Number(amount) || 0,
    direction: toDirection(direction),
    note: note ?? "",
    createdAt,
  };
}

function settlementToRow(settlement: Settlement): string[] {
  return [
    settlement.id,
    settlement.date,
    settlement.person,
    String(settlement.amount),
    settlement.direction,
    settlement.note ?? "",
    settlement.createdAt,
  ];
}

// The tab is created by hand; treat a missing tab as "no settlements yet"
// so the app still works before it exists.
function isMissingTab(err: unknown): boolean {
  return err instanceof Error && /Unable to parse range|not found/i.test(err.message);
}

export async function readAllSettlements(): Promise<Settlement[]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: RANGE_ALL,
    });
    const rows = (res.data.values ?? []) as string[][];
    return rows.filter((row) => row[0]).map(rowToSettlement);
  } catch (err) {
    if (isMissingTab(err)) {
      console.warn(`[settlements] sheet tab "${SHEET_NAME}" not found — returning empty list`);
      return [];
    }
    throw err;
  }
}

export async function appendSettlement(input: NewSettlement): Promise<Settlement> {
  const sheets = getSheetsClient();
  const settlement: Settlement = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: RANGE_ALL,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [settlementToRow(settlement)] },
  });
  return settlement;
}

// Row numbers are 1-based and include the header row, so a match at
// array index N sits at sheet row N + 2.
async function findRowNumber(id: string): Promise<number | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!A2:A`,
  });
  const rows = (res.data.values ?? []) as string[][];
  const index = rows.findIndex((row) => row[0] === id);
  return index === -1 ? null : index + 2;
}

export async function deleteSettlement(id: string): Promise<boolean> {
  const rowNumber = await findRowNumber(id);
  if (rowNumber === null) return false;
  const sheets = getSheetsClient();
  const sheetId = await getSheetGid(SHEET_NAME);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
          },
        },
      ],
    },
  });
  return true;
}
```

- [ ] **Step 5: ตรวจ type**

Run: `npx tsc --noEmit`
Expected: ไม่มี error

- [ ] **Step 6: Commit**

```bash
git add lib/sheetsClient.ts lib/settlementSheets.ts lib/sheets.ts
git commit -m "feat: read and write settlements sheet tab"
```

---

## Task 5: API endpoints ของ settlements

**Files:**
- Create: `app/api/settlements/route.ts`, `app/api/settlements/[id]/route.ts`
- Modify: `lib/validation.ts`

**Interfaces:**
- Consumes: `readAllSettlements`, `appendSettlement`, `deleteSettlement` จาก Task 4; `readAllExpenses` จาก `@/lib/sheets`; `buildPersonBalances` จาก Task 3; `normalizePerson` จาก Task 1
- Produces:
  - `GET /api/settlements` → `{ settlements: Settlement[] }`
  - `POST /api/settlements` → `{ settlement: Settlement }` (201) หรือ `{ error: string }` (400)
  - `DELETE /api/settlements/:id` → `{ ok: true }` หรือ `{ error: string }` (404)
  - `validateSettlementInput(body: unknown): NewSettlement | null` จาก `@/lib/validation`

- [ ] **Step 1: เพิ่ม `validateSettlementInput` ใน `lib/validation.ts`**

แก้ import บรรทัดแรกเป็น:

```ts
import type { NewExpense, NewSettlement } from "@/types";
import { toCategory } from "@/lib/categories";
import { normalizePerson } from "@/lib/splits";
```

ต่อท้ายไฟล์:

```ts
export function validateSettlementInput(body: unknown): NewSettlement | null {
  if (typeof body !== "object" || body === null) return null;
  const { date, person, amount, direction, note } = body as Record<string, unknown>;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (typeof person !== "string") return null;
  const normalized = normalizePerson(person);
  if (normalized === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  if (direction !== "received" && direction !== "paid") return null;

  return {
    date,
    person: normalized,
    amount,
    direction,
    note: typeof note === "string" ? note.trim() : "",
  };
}
```

- [ ] **Step 2: สร้าง `app/api/settlements/route.ts`**

```ts
import { NextResponse } from "next/server";
import { readAllExpenses } from "@/lib/sheets";
import { readAllSettlements, appendSettlement } from "@/lib/settlementSheets";
import { buildPersonBalances } from "@/lib/balances";
import { validateSettlementInput } from "@/lib/validation";

export async function GET() {
  const settlements = await readAllSettlements();
  return NextResponse.json({ settlements });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateSettlementInput(body);
  if (!input) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const [expenses, settlements] = await Promise.all([readAllExpenses(), readAllSettlements()]);
  const balance = buildPersonBalances(expenses, settlements).find(
    (b) => b.person === input.person
  );
  if (!balance) {
    return NextResponse.json({ error: "ไม่มียอดค้างของคนนี้" }, { status: 400 });
  }

  const expectedDirection = balance.balance > 0 ? "received" : "paid";
  if (input.direction !== expectedDirection) {
    return NextResponse.json({ error: "ทิศทางการเคลียร์ไม่ตรงกับยอดค้าง" }, { status: 400 });
  }
  if (input.amount > Math.abs(balance.balance) + 0.005) {
    return NextResponse.json({ error: "จำนวนเงินเกินยอดค้าง" }, { status: 400 });
  }

  const settlement = await appendSettlement(input);
  return NextResponse.json({ settlement }, { status: 201 });
}
```

- [ ] **Step 3: สร้าง `app/api/settlements/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { deleteSettlement } from "@/lib/settlementSheets";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteSettlement(id);
  if (!deleted) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: ตรวจ type + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: ไม่มี error

- [ ] **Step 5: ทดสอบด้วยมือ**

สร้าง tab `settlements` ใน Google Sheet ก่อน (header ตาม Task 4) แล้ว:

```bash
npm run dev
```

login แล้วเปิด DevTools console รัน:

```js
await (await fetch("/api/settlements")).json()
```

Expected: `{ settlements: [] }`

- [ ] **Step 6: Commit**

```bash
git add lib/validation.ts app/api/settlements
git commit -m "feat: add settlements API endpoints"
```

---

## Task 6: Settlement store

**Files:**
- Create: `store/settlementStore.ts`

**Interfaces:**
- Consumes: endpoints จาก Task 5, type `Settlement`, `NewSettlement` จาก Task 3
- Produces: `useSettlementStore` ที่มี `{ settlements, isLoaded, isLoading, error, load, add, remove }`

- [ ] **Step 1: สร้าง `store/settlementStore.ts`**

โครงตาม `store/expenseStore.ts` เพื่อให้ pattern ตรงกัน:

```ts
import { create } from "zustand";
import type { NewSettlement, Settlement } from "@/types";

interface SettlementState {
  settlements: Settlement[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  add: (input: NewSettlement) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useSettlementStore = create<SettlementState>((set, get) => ({
  settlements: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/settlements");
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const data = await res.json();
      set({ settlements: data.settlements, isLoaded: true, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด", isLoading: false });
    }
  },

  add: async (input) => {
    const res = await fetch("/api/settlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "บันทึกไม่สำเร็จ");
    }
    const data = await res.json();
    set({ settlements: [...get().settlements, data.settlement] });
  },

  remove: async (id) => {
    const res = await fetch(`/api/settlements/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("ลบไม่สำเร็จ");
    set({ settlements: get().settlements.filter((s) => s.id !== id) });
  },
}));
```

- [ ] **Step 2: ตรวจ type**

Run: `npx tsc --noEmit`
Expected: ไม่มี error

- [ ] **Step 3: Commit**

```bash
git add store/settlementStore.ts
git commit -m "feat: add settlement store"
```

---

## Task 7: Live preview ใต้ช่องหมายเหตุ

**Files:**
- Create: `components/ui/SplitPreview.tsx`
- Modify: `app/expenses/new/page.tsx:79`, `app/expenses/[id]/page.tsx:119`

**Interfaces:**
- Consumes: `parseRemark` จาก Task 1, `formatCurrency` จาก `@/lib/formatters`
- Produces: `<SplitPreview remark={string} />`

- [ ] **Step 1: สร้าง `components/ui/SplitPreview.tsx`**

```tsx
"use client";

import { parseRemark } from "@/lib/splits";
import { formatCurrency } from "@/lib/formatters";

interface SplitPreviewProps {
  remark: string;
}

export default function SplitPreview({ remark }: SplitPreviewProps) {
  const { splits, invalid } = parseRemark(remark);
  if (splits.length === 0 && !invalid) return null;

  return (
    <div className="flex flex-col gap-2">
      {splits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {splits.map((split, i) => (
            <span
              key={`${split.person}-${i}`}
              className={
                split.direction === "owed_to_me"
                  ? "rounded-full border border-accent px-2.5 py-1 text-[12px] font-medium text-accent"
                  : "rounded-full border border-expense px-2.5 py-1 text-[12px] font-medium text-expense"
              }
            >
              {split.direction === "owed_to_me"
                ? `${split.person} ติดเรา ${formatCurrency(split.amount)}`
                : `เราติด${split.person} ${formatCurrency(split.amount)}`}
            </span>
          ))}
        </div>
      )}
      {invalid && (
        <p className="text-[12px] text-expense">
          ⚠ อ่าน format ไม่ออก — ใช้แบบ <span className="font-medium">ขนม: [50] ค่าอาหาร</span>{" "}
          (ถ้าเขาออกให้เรา ใส่ <span className="font-medium">ขนมจ่าย:</span>) คั่นหลายคนด้วย ;
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: ใส่ใน `app/expenses/new/page.tsx`**

เพิ่ม import ต่อจาก import ของ `CategoryPicker`:

```tsx
import SplitPreview from "@/components/ui/SplitPreview";
```

แทนที่บรรทัดช่องหมายเหตุ (บรรทัด 79):

```tsx
          <Input label="หมายเหตุ" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="(ถ้ามี)" />
```

ด้วย:

```tsx
          <div className="flex flex-col gap-2">
            <Input
              label="หมายเหตุ"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="(ถ้ามี) เช่น ขนม: [50] ค่าอาหาร"
            />
            <SplitPreview remark={remark} />
          </div>
```

- [ ] **Step 3: ใส่ใน `app/expenses/[id]/page.tsx`**

เพิ่ม import เดียวกัน แล้วแทนที่บรรทัด 119:

```tsx
            <Input label="หมายเหตุ" value={remark} onChange={(e) => setRemark(e.target.value)} />
```

ด้วย:

```tsx
            <div className="flex flex-col gap-2">
              <Input label="หมายเหตุ" value={remark} onChange={(e) => setRemark(e.target.value)} />
              <SplitPreview remark={remark} />
            </div>
```

- [ ] **Step 4: ตรวจด้วยตา**

Run: `npm run dev` แล้วเปิด `/expenses/new`
พิมพ์ในช่องหมายเหตุ: `ขนม: [50] ค่าอาหาร; ต้อมจ่าย: [80] แท็กซี่`
Expected: เห็น chip เขียว "ขนม ติดเรา ฿50" และ chip ส้ม "เราติดต้อม ฿80"
แล้วพิมพ์ `ขนม [50]` (ไม่มี colon)
Expected: เห็นข้อความเตือน ⚠

- [ ] **Step 5: Commit**

```bash
git add components/ui/SplitPreview.tsx app/expenses/new/page.tsx "app/expenses/[id]/page.tsx"
git commit -m "feat: preview parsed splits while typing remark"
```

---

## Task 8: หน้า `/people` + เคลียร์หนี้

**Files:**
- Create: `app/people/page.tsx`, `components/people/PersonRow.tsx`, `components/people/SettleDialog.tsx`

**Interfaces:**
- Consumes: `useExpenseStore` (`@/store/expenseStore`), `useSettlementStore` จาก Task 6, `buildPersonBalances` + `summarizeBalances` จาก Task 3, `formatCurrency` + `formatDateShort` + `todayISO` จาก `@/lib/formatters`
- Produces: route `/people`

- [ ] **Step 1: สร้าง `components/people/SettleDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import { formatCurrency, todayISO } from "@/lib/formatters";
import { useSettlementStore } from "@/store/settlementStore";
import type { PersonBalance } from "@/types";

interface SettleDialogProps {
  target: PersonBalance;
  onClose: () => void;
}

export default function SettleDialog({ target, onClose }: SettleDialogProps) {
  const add = useSettlementStore((s) => s.add);
  const outstanding = Math.abs(target.balance);
  const direction = target.balance > 0 ? "received" : "paid";

  const [amount, setAmount] = useState(String(outstanding));
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("จำนวนเงินไม่ถูกต้อง");
      return;
    }
    if (amountNum > outstanding + 0.005) {
      setError(`เกินยอดค้าง (${formatCurrency(outstanding)})`);
      return;
    }
    setSaving(true);
    try {
      await add({ date, person: target.person, amount: amountNum, direction, note: note.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-5 pb-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[22px] bg-card p-[22px] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-[20px] font-bold text-text">
          {direction === "received" ? `รับคืนจาก${target.person}` : `จ่ายคืน${target.person}`}
        </h2>
        <p className="mb-4 text-[13px] text-sub">ยอดค้าง {formatCurrency(outstanding)}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="จำนวนเงิน"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
          <DateField label="วันที่" value={date} onChange={setDate} required />
          <Input
            label="หมายเหตุ"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="(ถ้ามี)"
          />
          {error && <p className="text-sm text-expense">{error}</p>}
          <div className="mt-1.5 flex gap-3">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "กำลังบันทึก..." : "เคลียร์"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: สร้าง `components/people/PersonRow.tsx`**

```tsx
"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import type { PersonBalance } from "@/types";

interface PersonRowProps {
  balance: PersonBalance;
  onSettle: (balance: PersonBalance) => void;
}

export default function PersonRow({ balance, onSettle }: PersonRowProps) {
  const [expanded, setExpanded] = useState(false);
  const theyOweMe = balance.balance > 0;

  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="flex-1 truncate text-[15px] font-medium text-text">
            {balance.person}
          </span>
          <span
            className={
              theyOweMe
                ? "text-[15px] font-semibold text-accent"
                : "text-[15px] font-semibold text-expense"
            }
          >
            {theyOweMe ? "+" : "-"}
            {formatCurrency(Math.abs(balance.balance))}
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          className="px-3 py-1.5 text-[13px]"
          onClick={() => onSettle(balance)}
        >
          เคลียร์
        </Button>
      </div>

      {expanded && (
        <ul className="mt-2 flex flex-col gap-1.5 pl-1">
          {balance.entries.map((entry, i) => (
            <li key={`${entry.expenseId}-${i}`} className="flex items-center gap-2 text-[13px]">
              <span className="text-sub">{formatDateShort(entry.date)}</span>
              <span className="flex-1 truncate text-text/80">
                {entry.split.label || entry.item}
              </span>
              <span className={entry.split.direction === "owed_to_me" ? "text-accent" : "text-expense"}>
                {formatCurrency(entry.split.amount)}
              </span>
            </li>
          ))}
          {balance.settledNet !== 0 && (
            <li className="text-[13px] text-sub">
              เคลียร์ไปแล้ว {formatCurrency(Math.abs(balance.settledNet))}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: สร้าง `app/people/page.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Screen from "@/components/layout/Screen";
import PersonRow from "@/components/people/PersonRow";
import SettleDialog from "@/components/people/SettleDialog";
import { useExpenseStore } from "@/store/expenseStore";
import { useSettlementStore } from "@/store/settlementStore";
import { buildPersonBalances, summarizeBalances } from "@/lib/balances";
import { formatCurrency, formatDateShort } from "@/lib/formatters";
import type { PersonBalance } from "@/types";

export default function PeoplePage() {
  const { expenses, isLoaded: expensesLoaded, load: loadExpenses } = useExpenseStore();
  const {
    settlements,
    isLoaded: settlementsLoaded,
    isLoading,
    error,
    load: loadSettlements,
    remove: removeSettlement,
  } = useSettlementStore();
  const [target, setTarget] = useState<PersonBalance | null>(null);

  useEffect(() => {
    if (!expensesLoaded) loadExpenses();
  }, [expensesLoaded, loadExpenses]);

  useEffect(() => {
    if (!settlementsLoaded) loadSettlements();
  }, [settlementsLoaded, loadSettlements]);

  const balances = useMemo(
    () => buildPersonBalances(expenses, settlements),
    [expenses, settlements]
  );
  const totals = useMemo(() => summarizeBalances(balances), [balances]);

  const recentSettlements = useMemo(
    () => [...settlements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [settlements]
  );

  return (
    <Screen>
      <h1 className="mb-5 text-[26px] font-bold leading-tight text-text">ค้างอยู่</h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="rounded-[20px] p-[18px_20px]">
          <p className="mb-2 text-[13px] font-medium text-sub">ต้องกันไว้</p>
          <p className="text-[24px] font-bold text-expense">{formatCurrency(totals.reserved)}</p>
        </Card>
        <Card className="rounded-[20px] p-[18px_20px]">
          <p className="mb-2 text-[13px] font-medium text-sub">จะได้คืน</p>
          <p className="text-[24px] font-bold text-accent">{formatCurrency(totals.receivable)}</p>
        </Card>
      </div>

      {isLoading && <p className="text-sm text-sub">กำลังโหลด...</p>}
      {error && <p className="text-sm text-expense">{error}</p>}

      {balances.length === 0 && !isLoading ? (
        <p className="mt-6 text-center text-sm text-sub">ไม่มียอดค้างกับใคร</p>
      ) : (
        <Card className="mb-4 rounded-[22px] px-5 py-1">
          {balances.map((balance) => (
            <PersonRow key={balance.person} balance={balance} onSettle={setTarget} />
          ))}
        </Card>
      )}

      {recentSettlements.length > 0 && (
        <Card className="rounded-[22px] p-[20px_22px]">
          <p className="mb-3 text-[13px] font-medium text-sub">เคลียร์ล่าสุด</p>
          {recentSettlements.map((settlement) => (
            <div key={settlement.id} className="flex items-center gap-2 py-1.5 text-[13px]">
              <span className="text-sub">{formatDateShort(settlement.date)}</span>
              <span className="flex-1 truncate text-text/80">
                {settlement.direction === "received"
                  ? `รับคืนจาก${settlement.person}`
                  : `จ่ายคืน${settlement.person}`}
              </span>
              <span className="text-text">{formatCurrency(settlement.amount)}</span>
              <Button
                type="button"
                variant="ghost"
                className="px-2 py-1 text-[12px]"
                onClick={() => removeSettlement(settlement.id)}
              >
                ยกเลิก
              </Button>
            </div>
          ))}
        </Card>
      )}

      {target && <SettleDialog target={target} onClose={() => setTarget(null)} />}
    </Screen>
  );
}
```

- [ ] **Step 4: ตรวจ type + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: ไม่มี error

- [ ] **Step 5: ทดสอบด้วยมือ**

Run: `npm run dev` แล้วเปิด `http://localhost:3000/people`
- เพิ่มรายจ่ายทดสอบที่มี remark `ขนม: [50] ค่าอาหาร` และ `ต้อมจ่าย: [200] ค่าคลีนซิ่ง` ก่อน
- Expected: หน้า `/people` แสดง ต้องกันไว้ ฿200 / จะได้คืน ฿50, มี 2 แถว
- กดชื่อ → กางรายการที่มา
- กด "เคลียร์" ที่ต้อม → ใส่ 200 → บันทึก → ต้อมหายจากรายการ, ต้องกันไว้เหลือ ฿0
- กด "ยกเลิก" ใน "เคลียร์ล่าสุด" → ต้อมกลับมา

- [ ] **Step 6: Commit**

```bash
git add app/people components/people
git commit -m "feat: add people page with balances and settle flow"
```

---

## Task 9: Home — บรรทัด "ของฉัน" + การ์ด "ค้างอยู่"

**Files:**
- Modify: `app/page.tsx`, `store/expenseStore.ts`

**Interfaces:**
- Consumes: `summarizeExpense` จาก Task 2, `buildPersonBalances` + `summarizeBalances` จาก Task 3, `useSettlementStore` จาก Task 6
- Produces:
  - `selectMyShareForDate(expenses: Expense[], dateISO: string): number`
  - `selectMyShareForMonth(expenses: Expense[], monthISO: string): number`

- [ ] **Step 1: เพิ่ม selector ใน `store/expenseStore.ts`**

แก้ import บรรทัดที่ 3 ให้เพิ่มบรรทัดใหม่ต่อจากนั้น:

```ts
import { summarizeExpense } from "@/lib/splits";
```

ต่อท้ายไฟล์:

```ts
export function selectMyShareForDate(expenses: Expense[], dateISO: string): number {
  return expenses
    .filter((e) => e.date === dateISO)
    .reduce((sum, e) => sum + summarizeExpense(e).myShare, 0);
}

export function selectMyShareForMonth(expenses: Expense[], monthISO: string): number {
  return expenses
    .filter((e) => e.date.startsWith(monthISO))
    .reduce((sum, e) => sum + summarizeExpense(e).myShare, 0);
}
```

- [ ] **Step 2: แก้ `app/page.tsx` — import และ state**

แก้บล็อก import ของ store/formatters ให้เป็น:

```tsx
import {
  useExpenseStore,
  selectTotalForDate,
  selectTotalForMonth,
  selectMyShareForDate,
  selectMyShareForMonth,
  selectWeek,
} from "@/store/expenseStore";
import { useSettlementStore } from "@/store/settlementStore";
import { buildPersonBalances, summarizeBalances } from "@/lib/balances";
import { formatCurrency, todayISO, currentMonthISO } from "@/lib/formatters";
```

ใน component หลังบรรทัด `const { expenses, isLoaded, isLoading, error, load } = useExpenseStore();` เพิ่ม:

```tsx
  const {
    settlements,
    isLoaded: settlementsLoaded,
    load: loadSettlements,
  } = useSettlementStore();

  useEffect(() => {
    if (!settlementsLoaded) loadSettlements();
  }, [settlementsLoaded, loadSettlements]);
```

หลังบรรทัด `const week = selectWeek(expenses);` เพิ่ม:

```tsx
  const todayMyShare = selectMyShareForDate(expenses, today);
  const monthMyShare = selectMyShareForMonth(expenses, month);
  const totals = summarizeBalances(buildPersonBalances(expenses, settlements));
  const hasOutstanding = totals.reserved > 0 || totals.receivable > 0;
```

- [ ] **Step 3: แก้การ์ดสรุปให้มีบรรทัด "ของฉัน"**

แทนที่บล็อก `<div className="mb-4 grid grid-cols-2 gap-3">…</div>` ทั้งก้อนด้วย:

```tsx
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="rounded-[20px] p-[18px_20px]">
          <p className="mb-2 text-[13px] font-medium text-sub">วันนี้</p>
          <p className="text-[26px] font-bold text-expense">{formatCurrency(todayTotal)}</p>
          {todayMyShare !== todayTotal && (
            <p className="mt-1 text-[12px] text-sub">ของฉัน {formatCurrency(todayMyShare)}</p>
          )}
        </Card>
        <Card className="rounded-[20px] p-[18px_20px]">
          <p className="mb-2 text-[13px] font-medium text-sub">เดือนนี้</p>
          <p className="text-[26px] font-bold text-expense">{formatCurrency(monthTotal)}</p>
          {monthMyShare !== monthTotal && (
            <p className="mt-1 text-[12px] text-sub">ของฉัน {formatCurrency(monthMyShare)}</p>
          )}
        </Card>
      </div>
```

- [ ] **Step 4: เพิ่มการ์ด "ค้างอยู่"**

แทรกต่อจาก `</div>` ของ grid ด้านบน ก่อน `<Card className="mb-4 rounded-[22px] p-[20px_22px]">` (การ์ดสัปดาห์นี้):

```tsx
      {hasOutstanding && (
        <Link href="/people" className="mb-4 block transition-transform active:scale-[0.98]">
          <Card className="rounded-[22px] p-[18px_22px]">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-sub">ค้างอยู่</p>
              <span className="text-[13px] font-semibold text-accent">ดูทั้งหมด →</span>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-[12px] text-sub">ต้องกันไว้</p>
                <p className="text-[20px] font-bold text-expense">
                  {formatCurrency(totals.reserved)}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-sub">จะได้คืน</p>
                <p className="text-[20px] font-bold text-accent">
                  {formatCurrency(totals.receivable)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      )}
```

- [ ] **Step 5: ตรวจ type + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: ไม่มี error

- [ ] **Step 6: ทดสอบด้วยมือ**

Run: `npm run dev` แล้วเปิด `http://localhost:3000/`
- Expected: การ์ด "วันนี้" ที่มีรายการ split ขึ้นบรรทัด "ของฉัน ฿X" ที่น้อยกว่ายอดรวม
- Expected: การ์ด "ค้างอยู่" โผล่ กดแล้วไป `/people`
- ลบรายการ split ทั้งหมด → การ์ด "ค้างอยู่" หายไป

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx store/expenseStore.ts
git commit -m "feat: show my-share and outstanding card on home"
```

---

## Task 10: Badge ในหน้ารายการ + ยอดแยกในหน้าแก้ไข

**Files:**
- Modify: `app/expenses/page.tsx`, `app/expenses/[id]/page.tsx`

**Interfaces:**
- Consumes: `summarizeExpense` จาก Task 2, `formatCurrency` จาก `@/lib/formatters`
- Produces: ไม่มี export ใหม่

- [ ] **Step 1: เพิ่ม badge ใน `app/expenses/page.tsx`**

เพิ่ม import ต่อจาก import ของ formatters:

```tsx
import { summarizeExpense } from "@/lib/splits";
```

แทนที่บล็อก `{day.items.map(...)}` ทั้งก้อนด้วย:

```tsx
              {day.items.map((item) => {
                const summary = summarizeExpense(item);
                const hasSplit = summary.splits.length > 0;
                return (
                  <Link
                    key={item.id}
                    href={`/expenses/${item.id}`}
                    className="flex items-center gap-3 py-3 transition-transform active:scale-[0.98]"
                  >
                    <Avatar category={item.category} size={34} />
                    <span className="flex-1 truncate text-[15px] font-medium text-text">
                      {item.item}
                    </span>
                    {summary.invalid && <span className="text-[13px] text-expense">⚠</span>}
                    {hasSplit && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                        ของฉัน {formatCurrency(summary.myShare)}
                      </span>
                    )}
                    <span className="text-[15px] font-semibold text-expense">
                      {formatCurrency(item.amount)}
                    </span>
                  </Link>
                );
              })}
```

- [ ] **Step 2: แสดงยอดแยกในหน้าแก้ไข `app/expenses/[id]/page.tsx`**

เพิ่ม import ต่อจาก import ของ `SplitPreview`:

```tsx
import { summarizeExpense } from "@/lib/splits";
import { formatCurrency } from "@/lib/formatters";
```

หลังบรรทัด `const expense = expenses.find((e) => e.id === params.id);` เพิ่ม:

```tsx
  const summary = expense ? summarizeExpense(expense) : null;
```

แทรกก่อน `<div className="mt-1.5 flex gap-3">` (แถวปุ่มบันทึก/ลบ):

```tsx
            {expense && summary && summary.splits.length > 0 && (
              <div className="rounded-[14px] border border-border p-3 text-[13px]">
                <div className="flex justify-between py-0.5">
                  <span className="text-sub">ยอดบิล</span>
                  <span className="text-text">{formatCurrency(expense.amount)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-sub">ค่าใช้จ่ายของฉัน</span>
                  <span className="font-semibold text-text">{formatCurrency(summary.myShare)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-sub">เงินออกจริง</span>
                  <span className="text-text">{formatCurrency(summary.cashOut)}</span>
                </div>
                {summary.overAllocated && (
                  <p className="mt-1 text-[12px] text-expense">
                    ⚠ ยอดที่แบ่งรวมกันเกินยอดบิล
                  </p>
                )}
              </div>
            )}
```

- [ ] **Step 3: ตรวจ type + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: ไม่มี error

- [ ] **Step 4: ทดสอบด้วยมือ**

Run: `npm run dev`
- เปิด `/expenses` → รายการที่มี split ขึ้น badge "ของฉัน ฿X"
- กดเข้ารายการนั้น → เห็นกล่อง ยอดบิล / ค่าใช้จ่ายของฉัน / เงินออกจริง
- แก้ remark ให้ split รวมเกินยอดบิล → เห็นคำเตือน ⚠

- [ ] **Step 5: รัน test ทั้งหมดปิดท้าย**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: PASS ทั้งหมด, build สำเร็จ

- [ ] **Step 6: Commit**

```bash
git add app/expenses/page.tsx "app/expenses/[id]/page.tsx"
git commit -m "feat: show split badge and per-expense breakdown"
```

---

## Post-implementation

- [ ] อัปเดต `README.md` ส่วน "Google Sheet — เตรียมชีต" เพิ่มขั้นตอนสร้าง tab `settlements` พร้อม header `id | date | person | amount | direction | note | createdAt`
- [ ] อัปเดต `ARCHITECTURE_FE.md` ตาราง "สรุปสั้นๆ เวลาจะเขียนโค้ดใหม่" เพิ่มบรรทัดว่า test ของ pure function อยู่ที่ `lib/*.test.ts` รันด้วย `npm test`

## Rollback

```bash
git rm -r app/people components/people app/api/settlements
git rm components/ui/SplitPreview.tsx lib/splits.ts lib/splits.test.ts lib/balances.ts lib/balances.test.ts
git rm lib/settlementSheets.ts store/settlementStore.ts vitest.config.ts
git checkout main -- app/page.tsx app/expenses lib/sheets.ts lib/validation.ts store/expenseStore.ts types/index.ts package.json
```

`lib/sheetsClient.ts` เก็บไว้ได้ (ไม่มีผลข้างเคียง) หรือย้ายโค้ดกลับเข้า `lib/sheets.ts` ตาม diff ของ Task 4
ข้อมูลใน tab `expenses` ไม่เคยถูกแก้จาก feature นี้ — ลบ tab `settlements` ทิ้งได้ถ้าต้องการ
