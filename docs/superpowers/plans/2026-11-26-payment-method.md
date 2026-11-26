# Payment Method + Untransferred Card Total — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record how each expense was paid, and show on Home how much card spending has not yet been moved into the card-bill account.

**Architecture:** Two new sheet columns (I `pay`, J `paidAt`) on the `expenses` tab. All rules live in pure functions under `lib/` with vitest tests; UI components only call them. One new batch endpoint changes the status of many rows at once for "โอนแล้ว" and "ยกเลิก".

**Tech Stack:** Next.js 16.4.5 (App Router), React 19.2.9, TypeScript, Tailwind v4, zustand, googleapis, vitest

**Spec:** `docs/superpowers/specs/2026-11-26-payment-method-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` before writing the new route (`AGENTS.md`).
- Branch `feat/payment-method` from `master` (`6e356ea`). No push or merge without asking Mark.
- Never stage `AGENTS.md`, `m-de-app-draft2.html`, `m-de-app-plan2.md`, `public/m-de-draft3.png`, `tally-*.html`. Stage files by name only.
- Run `git diff --cached --stat` before every commit; a whole-file line count means line endings changed, so fix that first.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Baseline: `npm test` 374 passing, `npx tsc --noEmit` clean.
- Pay values: `card_due` ต้องโอน · `card_later` สิ้นเดือน · `card_paid` โอนแล้ว · `cash` เงินสด · `bank` โอนจ่าย · blank = unspecified.
- `paidAt` is `YYYY-MM-DD`, only on `card_paid`, and always comes from the client (`todayISO()`), never server time.
- Updates must never write column H (`payee`).
- Colours come from existing tokens. No new animation. Pay picker buttons are 44px tall with no overflow at 360px width.
- Budget, `myShare`, `cashSpent` and person balances do not change.
- UI copy is Thai; code and comments are English; existing test descriptions are Thai, so new ones are too.

## Review Focus

1. Paying the last pending bucket hides the card: the "ยกเลิก" bar must stay on screen for its 8 seconds (Task 6 browser check).
2. Google Sheets turning `paidAt` into a date cell that reads back as another format: it must be written as text (Task 1 and Task 4).
3. An old tab saving an edit without `pay`: stored `pay` and `paidAt` must survive (Task 1 `mergePay`).
4. A name typed with extra spaces, or an empty name: spaces are ignored, empty gives `card_due` (Task 3).
5. A friend paid the whole expense, or more than it: it adds nothing to the card total and is not listed (Task 3).

---

### Task 1: Pay model and sheet columns

**Files:**
- Create: `lib/payMethods.ts`, `lib/payMethods.test.ts`
- Modify: `types/index.ts`, `lib/expenseRows.ts`, `lib/expenseRows.test.ts`, `lib/sheets.ts`

**Interfaces — Produces:**
- `types/index.ts`: `type PayMethod = "card_due" | "card_later" | "card_paid" | "cash" | "bank"`; `Expense.pay?: PayMethod`; `Expense.paidAt?: string`; `interface PayState { pay?: PayMethod; paidAt?: string }`; `interface PayChange { id: string; pay: PayMethod; paidAt?: string }`
- `lib/payMethods.ts`:
  - `PAY_METHODS: PayMethod[]` (order above), `CARD_PAYS: PayMethod[]` (first three)
  - `PAY_LABEL: Record<PayMethod, string>`
  - `isPayMethod(value: unknown): value is PayMethod`
  - `isCardPay(pay: PayMethod | undefined): boolean`
  - `payTag(pay: PayMethod): string`
  - `mergePay(input: PayState, stored: PayState): PayState`
  - `applyPayChanges(expenses: Expense[], changes: PayChange[]): Expense[]`
- `lib/expenseRows.ts`: `expenseToPayCells(state: PayState): [string, string]` (raw values for I:J)

- [ ] **Step 1: Write failing tests**

`lib/payMethods.test.ts`:

```ts
it("payTag บอกว่าเป็นบัตรเฉพาะค่าบัตร", () => {
  expect(payTag("card_due")).toBe("บัตร · ต้องโอน");
  expect(payTag("card_later")).toBe("บัตร · สิ้นเดือน");
  expect(payTag("card_paid")).toBe("บัตร · โอนแล้ว");
  expect(payTag("cash")).toBe("เงินสด");
  expect(payTag("bank")).toBe("โอนจ่าย");
});

describe("mergePay", () => {
  const paid = { pay: "card_paid", paidAt: "2026-11-20" } as const;
  it("request ไม่ส่ง pay คงค่าเดิมทั้งคู่", () => {
    expect(mergePay({}, paid)).toEqual(paid);
    expect(mergePay({}, {})).toEqual({});
  });
  it("โอนแล้วอยู่เดิม คงวันที่โอนเดิม", () => {
    expect(mergePay({ pay: "card_paid", paidAt: "2026-11-26" }, paid)).toEqual(paid);
  });
  it("เพิ่งเปลี่ยนเป็นโอนแล้ว ใช้วันที่ที่ส่งมา", () => {
    expect(mergePay({ pay: "card_paid", paidAt: "2026-11-26" }, { pay: "card_due" }))
      .toEqual({ pay: "card_paid", paidAt: "2026-11-26" });
  });
  it("เปลี่ยนเป็นค่าอื่น ล้างวันที่โอน", () => {
    expect(mergePay({ pay: "cash" }, paid)).toEqual({ pay: "cash" });
  });
});

it("applyPayChanges แก้เฉพาะ id ที่ระบุ และลบ paidAt เมื่อไม่ใช่โอนแล้ว", () => {
  const list = [
    { ...base, id: "a", pay: "card_paid", paidAt: "2026-11-26" },
    { ...base, id: "b", pay: "card_due" },
  ] as Expense[];
  const next = applyPayChanges(list, [{ id: "a", pay: "card_later" }]);
  expect(next[0].pay).toBe("card_later");
  expect(next[0]).not.toHaveProperty("paidAt");
  expect(next[1]).toBe(list[1]);
});
```

`lib/expenseRows.test.ts` (reuse its `base`; row prefix `core` = the seven A:G strings). Change the two existing 8-cell assertions to 10 cells, with I and J empty for `base`. Add:

```ts
it("แถวเก่า 8 ช่อง ไม่มี key pay และ paidAt", () => {
  expect(rowToExpense([...core, ""])).not.toHaveProperty("pay");
  expect(rowToExpense([...core, ""])).not.toHaveProperty("paidAt");
});
it("อ่าน I และ J", () => {
  expect(rowToExpense([...core, "", "card_paid", "2026-11-26"]))
    .toMatchObject({ pay: "card_paid", paidAt: "2026-11-26" });
});
it("ค่า pay ที่ไม่รู้จักถือว่าว่าง และ paidAt ถูกทิ้ง", () => {
  const read = rowToExpense([...core, "", "visa", "2026-11-26"]);
  expect(read).not.toHaveProperty("pay");
  expect(read).not.toHaveProperty("paidAt");
});
it("paidAt ที่ไม่ใช่ YYYY-MM-DD หรือไม่ใช่โอนแล้ว ถูกทิ้ง", () => {
  expect(rowToExpense([...core, "", "card_paid", "26/11/2026"])).not.toHaveProperty("paidAt");
  expect(rowToExpense([...core, "", "cash", "2026-11-26"])).not.toHaveProperty("paidAt");
});
it("แถวใหม่เขียน paidAt เป็นข้อความ ไม่ให้ Sheets แปลงเป็นวันที่", () => {
  const row = expenseToRow({ ...base, pay: "card_paid", paidAt: "2026-11-26" });
  expect(row.slice(8)).toEqual(["card_paid", "'2026-11-26"]);
});
it("expenseToPayCells สำหรับเขียนแบบ RAW ไม่มี apostrophe", () => {
  expect(expenseToPayCells({ pay: "card_paid", paidAt: "2026-11-26" })).toEqual(["card_paid", "2026-11-26"]);
  expect(expenseToPayCells({})).toEqual(["", ""]);
});
```

Change the "อ่านกลับได้ค่าเดิม" test only if needed; it uses no `paidAt`.

- [ ] **Step 2:** Run `npm test` — the new tests FAIL (module and export missing).
- [ ] **Step 3: Implement** the interfaces above. `rowToExpense` validates `paidAt` with `isISODate` from `lib/isoDays`. Absent values leave the key off, like `payee`.
- [ ] **Step 4: Update `lib/sheets.ts`:** `RANGE_ALL` becomes `A2:J`. `updateExpense` reads `F:J` and builds the returned expense from `mergePay(input, storedPayState)` (the stored state goes through the same validation as `rowToExpense`; a stored `card_paid` with no `paidAt` takes the incoming one). It writes with one `values.batchUpdate`, `valueInputOption: "USER_ENTERED"`, two ranges: `A:G` = `expenseToCoreRow(expense)` and `I:J` = `expenseToRow(expense).slice(8)`. One request, so it cannot half-succeed, and `H` is never written.
- [ ] **Step 5:** `npm test && npx tsc --noEmit` — all pass.
- [ ] **Step 6: Commit** `feat: add pay method columns to expense rows`

---

### Task 2: Input validation

**Files:** Modify `lib/validation.ts`, `lib/validation.test.ts`

**Interfaces:**
- Consumes: `isPayMethod`, `isCardPay`, `PayChange`
- Produces: `validateExpenseInput` returns `pay`/`paidAt` when given; `validatePayChanges(body: unknown): PayChange[] | null` for body `{ changes: PayChange[] }`

- [ ] **Step 1: Write failing tests** (reuse the existing `valid` object)

```ts
it("ไม่ส่ง pay หรือส่งค่าที่ไม่รู้จัก ไม่มี key pay", () => {
  expect(validateExpenseInput(valid)).not.toHaveProperty("pay");
  expect(validateExpenseInput({ ...valid, pay: "visa" })).not.toHaveProperty("pay");
});
it("โอนแล้วต้องมี paidAt ที่เป็นวันจริง", () => {
  expect(validateExpenseInput({ ...valid, pay: "card_paid" })).toBeNull();
  expect(validateExpenseInput({ ...valid, pay: "card_paid", paidAt: "2026-02-30" })).toBeNull();
  expect(validateExpenseInput({ ...valid, pay: "card_paid", paidAt: "2026-11-26" }))
    .toMatchObject({ pay: "card_paid", paidAt: "2026-11-26" });
});
it("pay อื่นทิ้ง paidAt", () => {
  expect(validateExpenseInput({ ...valid, pay: "cash", paidAt: "2026-11-26" })).not.toHaveProperty("paidAt");
});

describe("validatePayChanges", () => {
  const ok = { id: "a", pay: "card_paid", paidAt: "2026-11-26" };
  it("รับรายการที่ถูกต้อง", () => {
    expect(validatePayChanges({ changes: [ok, { id: "b", pay: "card_later" }] }))
      .toEqual([ok, { id: "b", pay: "card_later" }]);
  });
  it("ปฏิเสธทั้งชุดเมื่อมีตัวเดียวผิด", () => {
    for (const bad of [
      { id: "b", pay: "cash" },
      { id: "b", pay: "card_paid" },
      { id: "", pay: "card_due" },
      { id: "a", pay: "card_due" }, // duplicate id
      null,
    ]) {
      expect(validatePayChanges({ changes: [ok, bad] })).toBeNull();
    }
  });
  it("ปฏิเสธชุดว่าง ชุดเกิน 500 และ body ที่ไม่ใช่ object", () => {
    expect(validatePayChanges({ changes: [] })).toBeNull();
    expect(validatePayChanges({ changes: Array.from({ length: 501 }, (_, i) => ({ id: `x${i}`, pay: "card_due" })) })).toBeNull();
    expect(validatePayChanges(null)).toBeNull();
  });
});
```

- [ ] **Step 2:** `npm test` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** `npm test && npx tsc --noEmit` — pass.
- [ ] **Step 5: Commit** `feat: validate pay method input`

---

### Task 3: Remember rule and pending buckets

**Files:** Create `lib/payMemory.ts`, `lib/payMemory.test.ts`, `lib/cardPending.ts`, `lib/cardPending.test.ts`

**Interfaces:**
- Consumes: `summarizeExpense` (`lib/splits`), `PayMethod`, `PayChange`
- Produces:
  - `rememberedPay(expenses: Expense[], item: string): PayMethod`
  - `interface CardEntry { expense: Expense; amount: number }`
  - `interface CardBucket { entries: CardEntry[]; total: number }`
  - `summarizeCardPending(expenses: Expense[]): { due: CardBucket; later: CardBucket; total: number }`
  - `markPaidChanges(bucket: CardBucket, today: string): PayChange[]`
  - `restoreChanges(bucket: CardBucket): PayChange[]` (each entry's current `pay`)

- [ ] **Step 1: Write failing tests.** Build rows with a helper `row(id, item, pay, date, extra?)`.

`payMemory`:
- ชื่อใหม่ → `card_due`
- ล่าสุดเป็น `card_later` / `cash` / `bank` → ค่านั้น
- ล่าสุดเป็น `card_paid` → `card_due`
- "ล่าสุด" ดูวันที่ก่อน แล้ว `createdAt` (ใส่ array สลับลำดับ)
- ข้ามแถวที่ไม่มี `pay` ไปใช้แถวก่อนหน้าที่มี
- `"  MRT  "` ตรงกับ `"MRT "`; `"MRT สายสีม่วง"` ไม่ตรง
- ชื่อว่างหรือมีแต่ช่องว่าง → `card_due` แม้มีแถวชื่อว่างใน sheet

`cardPending`:
- `card_due` เข้า `due`, `card_later` เข้า `later`; `card_paid`, `cash`, `bank`, ไม่ระบุ ไม่นับ
- นับทุกวันที่ รวมรายการเก่าหลายเดือน
- เรียงใหม่สุดก่อน
- ยอด 300 ที่ remark `"ขนมจ่าย: [100] ข้าว"` นับ 200; ที่ remark `"ขนม: [100] ข้าว"` นับ 300
- เพื่อนออกเต็มยอดหรือเกินยอด → ไม่อยู่ใน entries
- ผลรวม 0.1 + 0.2 ได้ 0.3 พอดี (ใช้ `snapZero` และปัด 2 ตำแหน่ง)
- `markPaidChanges` ได้ `{id, pay: "card_paid", paidAt: today}` ครบทุก entry; `restoreChanges` ได้ `{id, pay}` เดิมโดยไม่มี `paidAt`

- [ ] **Step 2:** `npm test` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** `npm test && npx tsc --noEmit` — pass.
- [ ] **Step 5: Commit** `feat: add pay memory and pending card rules`

---

### Task 4: Batch status endpoint and store action

**Files:**
- Create: `app/api/expenses/pay/route.ts`
- Modify: `lib/sheets.ts`, `store/expenseStore.ts`

**Interfaces:**
- Consumes: `validatePayChanges`, `expenseToPayCells`, `applyPayChanges`
- Produces:
  - `setPayMethods(changes: PayChange[]): Promise<boolean>` in `lib/sheets.ts`; `false` = some id not found, nothing written
  - `POST /api/expenses/pay` → 200 `{ ok: true }` · 400 `{ error: "ข้อมูลไม่ถูกต้อง" }` · 404 `{ error: "ไม่พบบางรายการ โหลดหน้าใหม่แล้วลองอีกครั้ง" }`
  - `setPay(changes: PayChange[]): Promise<void>` on `useExpenseStore`; throws `Error` with the server's `error`, else `"บันทึกไม่สำเร็จ"`

- [ ] **Step 1:** Read the route handler guide named in Global Constraints.
- [ ] **Step 2: Implement `setPayMethods`:** read `A2:A` once, map id → row number (index + 2), return `false` if any id is missing, then one `values.batchUpdate` with `valueInputOption: "RAW"` and one `expenses!I{n}:J{n}` range per change.
- [ ] **Step 3: Implement the route and the store action.** The store applies `applyPayChanges` only after a 200. A network failure also surfaces as `"บันทึกไม่สำเร็จ"`, never the browser's English message.
- [ ] **Step 4:** `npm test && npx tsc --noEmit && npm run build` — pass, and the build lists `/api/expenses/pay`.
- [ ] **Step 5: Commit** `feat: add batch pay status endpoint`

---

### Task 5: Pay picker on add and edit, slip import default

**Files:**
- Create: `components/ui/PayPicker.tsx`
- Modify: `app/expenses/new/NewExpenseForm.tsx`, `app/expenses/[id]/page.tsx`, `lib/slipImport.ts`, `lib/slipImport.test.ts`

**Interfaces:**
- Consumes: `CARD_PAYS`, `PAY_LABEL`, `rememberedPay`
- Produces: `PayPicker({ value: PayMethod | null; onChange: (pay: PayMethod) => void; hint?: string })`

- [ ] **Step 1: Failing test** in `lib/slipImport.test.ts`: `rowToNewExpense` result has `pay: "bank"`. Update existing exact-equality expectations to include it. Run, FAIL, then add `pay: "bank"` in `rowToNewExpense`. Run, PASS.
- [ ] **Step 2: `PayPicker`.** Label `จ่ายด้วย`. Two captioned boxes side by side: `บัตรเครดิต` (three card values, `flex: 3 1 auto`) and `แบบอื่น` (cash, bank, `flex: 2 1 auto`). One `role="radiogroup"` around both; buttons are `type="button"`, `role="radio"`, `aria-checked`, `min-h-11`, 12.5px, `whitespace-nowrap`. Selected: `bg-accent-soft`, inset ring in `--action`, `text-text` semibold; unselected `text-sub`. `value={null}` selects nothing. `hint` renders under it in 12px `text-sub`.
- [ ] **Step 3: Add form.** Derive, do not sync with effects:

```ts
const [pickedPay, setPickedPay] = useState<PayMethod | null>(null);
const pay = pickedPay ?? rememberedPay(expenses, item);
```

  Place the picker between `รายการ` and `หมายเหตุ`, wrapped in `edit(...)` so the success banner clears. `applyQuickItem`, the `?from=` seed block and a successful save all call `setPickedPay(null)`. Submit sends `pay`, plus `paidAt: todayISO()` when `card_paid`. Hint, only when `pickedPay === null` and `pay` is `card_later`, `cash` or `bank`: `เลือกให้ตามครั้งก่อนของ “{item.trim()}”`.
- [ ] **Step 4: Edit page.** State `pay: PayMethod | null`, seeded from `expense.pay ?? null`; no remember rule here. Same position. Submit: omit both keys when `null`; for `card_paid` send `paidAt` = the stored one if the expense was already paid and has it, else `todayISO()`. When the stored expense is `card_paid` and `pay` still is: hint `โอนเมื่อ {formatDateShort(paidAt)}` (omit if no `paidAt`), and if the typed amount differs from the stored one add `text-expense` line `ยอดเปลี่ยน — ส่วนต่างต้องโอนเอง`.
- [ ] **Step 5:** `npm test && npx tsc --noEmit && npm run lint` — pass; lint adds no new findings over `master`.
- [ ] **Step 6: Commit** `feat: pick how an expense was paid`

---

### Task 6: Home card

**Files:**
- Create: `components/home/CardPending.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `summarizeCardPending`, `markPaidChanges`, `restoreChanges`, `setPay`, `load`
- Produces: `CardPending({ expenses, onChange, onReload }: { expenses: Expense[]; onChange: (changes: PayChange[]) => Promise<void>; onReload: () => void })`

- [ ] **Step 1: Implement.** In `app/page.tsx` render it right after the hero block, only when `isLoaded`.
  - The component stays mounted when nothing is pending: it hides the card but keeps the undo bar.
  - Card: `rounded-[22px] p-[18px_22px] mb-4`. Header `บัตรเครดิต · ยังไม่ได้โอน` + total. One row per bucket: amount, then `ต้องโอนเลย · N รายการ ▾` or `รอโอนสิ้นเดือน · N รายการ ▾` as an `aria-expanded` button; expanded lines show short date, item, entry amount, each linking to `/expenses/{id}`.
  - Row button `โอนแล้ว`, at least 44px; `ต้องโอนเลย` uses the primary `Button`, the other `ghost`. Give each an `aria-label` naming its bucket and amount. Disabled when the bucket is empty or any save is running.
  - Take `restoreChanges(bucket)` and the total **before** awaiting `onChange(markPaidChanges(bucket, todayISO()))`.
  - Success: fixed bar above the bottom nav (`bottom: 92px`, inside the 448px column), `role="status"`, `บันทึกว่าโอนแล้ว {amount}` + `ยกเลิก`, gone after 8000 ms. A new payment replaces it and restarts the timer; clear the timer on unmount.
  - `ยกเลิก` calls `onChange(restore)`. While it runs the bar stays and cannot be pressed twice.
  - Any failure: show the error message in `text-danger` (in the bar if the card is hidden) and call `onReload()`. A failed undo keeps the bar so it can be retried.
- [ ] **Step 2: Browser check** with Playwright (Python, `channel="chrome"`, 360px viewport) against `npm run dev`, with `/api/**` mocked by a closure (not a default-argument handler) and a session cookie valid for a dummy local secret — see `lib/auth.ts` for the env names. Put the script in `.superpowers/pay-method/`. Assert:
  - totals match the mock data
  - paying one bucket then the other hides the card, and the `ยกเลิก` bar is **still visible**
  - `ยกเลิก` brings the bucket back with the same amount
  - a mocked 404 leaves totals unchanged and shows the server message
  - no horizontal scroll, no page errors
- [ ] **Step 3:** Screenshot Home and the add form to `.superpowers/pay-method/real-*.png` and look at them.
- [ ] **Step 4:** `npm test && npx tsc --noEmit` — pass.
- [ ] **Step 5: Commit** `feat: show untransferred card total on home`

---

### Task 7: List filter and row tags

**Files:**
- Create: `components/expenses/PayFilterChips.tsx`
- Modify: `lib/payMethods.ts`, `lib/payMethods.test.ts`, `lib/scopeLabel.ts`, `lib/scopeLabel.test.ts`, `components/expenses/ExpenseRow.tsx`, `app/expenses/page.tsx`

**Interfaces — Produces:**
- `type PayFilter = "all" | "card" | "cash" | "bank"`; `PAY_FILTER_LABEL: Record<PayFilter, string>` = ทั้งหมด, บัตรเครดิต, เงินสด, โอนจ่าย
- `matchesPayFilter(pay: PayMethod | undefined, filter: PayFilter): boolean`
- `ScopeLabelInput.pay?: PayFilter`
- `PayFilterChips({ value: PayFilter; onChange: (next: PayFilter) => void })`

- [ ] **Step 1: Failing tests**
  - `matchesPayFilter`: `all` รับทุกค่ารวม `undefined`; `card` รับ 3 ค่าบัตรเท่านั้น; `cash`, `bank` รับตัวเองเท่านั้น; `undefined` ผ่านเฉพาะ `all`
  - `buildScopeLabel({ from: "", to: "", categories: [], query: "", pay: "cash" })` → `"ทั้งหมด · เงินสด"`; `pay: "all"` และไม่ส่ง → `"ทั้งหมด"`; ลำดับคือ ช่วงวันที่ · หมวด · วิธีจ่าย · ค้นหา
- [ ] **Step 2:** `npm test` — FAIL.
- [ ] **Step 3: Implement** the helpers, then:
  - Chips go in their own row under `CategoryFilter`, single select, `aria-pressed`, same chip styling as `CategoryFilter`.
  - Apply the filter inside the `matching` memo so the outstanding count follows it.
  - `judgeDays` requires `payFilter === "all"`; `trends` is `null` otherwise; pass `pay` to `buildScopeLabel`. Update both memo dependency lists.
  - `ExpenseRow` second line: `[note, expense.pay && payTag(expense.pay)]`, filtered and joined with ` · `; render nothing when empty.
- [ ] **Step 4:** `npm test && npx tsc --noEmit && npm run lint` — pass.
- [ ] **Step 5: Commit** `feat: filter expenses by pay method`

---

### Task 8: Whole-feature check

- [ ] **Step 1:** `npm test && npx tsc --noEmit && npm run build` — all pass.
- [ ] **Step 2:** Extend the Task 6 browser script, still at 360px: add `MRT` as `สิ้นเดือน`, then type `MRT` again and see it preselected with the hint; add after `โอนแล้ว` on a name and see `ต้องโอน` next time; edit a legacy row and save without choosing, and see no `pay` in the request body; filter `เงินสด` on the list; measure that no pay button is clipped.
- [ ] **Step 3:** `git status --short` shows only the files listed in Global Constraints as uncommitted; `git diff master --stat` touches only files named in this plan plus the spec and plan.
- [ ] **Step 4:** Commit the spec and plan: `docs: payment method design and plan`
- [ ] **Step 5:** Report to Mark and ask before pushing for a Vercel preview. Remind them: on the preview, add one card row, press `โอนแล้ว`, check columns I and J in the sheet read `card_paid` and a `YYYY-MM-DD` text date, then edit that row and check column H is intact. If preview shares the production sheet, delete the test rows afterwards.

---

## Changes made while executing

- Card buttons are ordered due, paid, later (spec and prototype); the plan had listed due, later, paid.
- `card_later_paid` added after the final review: paying the month-end bucket must not turn the next month-end item into `card_due`. New helpers in `lib/payMethods.ts`: `isPaidPay`, `pickerValue`, `choosePay`.
- `lib/sheets.test.ts` added: sheet writes are tested with a faked Google client.
