# Expense Splits — ติดตามเงินที่ออกให้ก่อน / คนอื่นออกให้

วันที่: 2026-07-31
สถานะ: design (รออนุมัติ)

## ปัญหา

แอปจดรายจ่ายปัจจุบันเก็บ `amount` เป็นยอดบิลทั้งใบ ไม่ว่าใครเป็นคนจ่ายจริง

ในชีวิตจริง:
- บางครั้ง Mark ออกเงินให้คนอื่นไปก่อน → เงินก้อนนั้นจะได้คืน แต่แอปนับเป็นรายจ่ายของ Mark เต็มจำนวน
- บางครั้งคนอื่นออกให้ Mark ไปก่อน แล้วยังไม่มาเรียกเก็บ → **Mark ไม่รู้ว่ามีภาระค้างอยู่ เลยเผลอใช้เงินก้อนที่ต้องจ่ายคืนไปแล้ว**

ข้อที่สองคือ pain point หลัก เป้าหมายของ feature นี้คือทำให้เห็น **"เงินที่ต้องกันไว้"** ชัดเจน

ปัจจุบัน Mark จดข้อมูลนี้ไว้ใน `remark` เป็น free text อยู่แล้ว ตาม pattern:

```
ขนม: [50] ค่าอาหาร
ขนมจ่าย: [200] ค่าคลีนซิ่ง
ขนม: [100] ค่าอาหาร+ [50] ค่าเดินทาง
```

feature นี้คือทำให้ระบบ "อ่านออก" แล้วสรุปให้

## ขอบเขต

**ทำ:**
- parse `remark` เป็นรายการหนี้ต่อคน
- แสดง "ค่าใช้จ่ายของฉันจริง" แยกจากยอดบิล
- หน้าสรุปยอดคงค้างรายคน + ปุ่มเคลียร์หนี้
- preview ตอนกรอกว่าระบบอ่าน remark ได้ถูกไหม

**ไม่ทำ (YAGNI):**
- multi-user / แชร์ลิงก์ให้คนที่ติดเงินเห็น
- แจ้งเตือน / reminder
- แยกสกุลเงิน
- ประวัติการแก้ไข

## ข้อตกลงจากการ brainstorm

| หัวข้อ | ข้อสรุป |
|---|---|
| ความหมาย `amount` | ยอดบิลทั้งใบเสมอ (รวมส่วนคนอื่น และรวมส่วนที่คนอื่นออกให้เรา) |
| วิธีกรอก | พิมพ์ใน `remark` ตาม pattern เดิม + มี live preview |
| แยกทิศทาง | ชื่อลงท้าย `จ่าย` = เขาออกให้เรา, ไม่ลงท้าย = เราออกให้เขา |
| ที่เก็บผล parse | ไม่เก็บ — parse ตอนอ่านทุกครั้ง (approach A) |
| เคลียร์หนี้ | ปุ่มในหน้าสรุป เขียนลง tab `settlements` ใหม่ — `remark` เดิมไม่ถูกแก้ |
| ระดับการเคลียร์ | ระดับคน ใส่จำนวนเท่าไหร่ก็ได้ (จ่ายบางส่วนได้) |
| การ์ด Home | คงยอดรวมเดิม + เพิ่มบรรทัดเล็ก "ของฉัน" |
| เข้าหน้าสรุป | กดการ์ด "ค้างอยู่" ในหน้า Home (ไม่เพิ่ม tab ใน BottomNav) |

### ทำไมเลือก approach A (parse ตอนอ่าน)

เทียบกับการเก็บผล parse ลงคอลัมน์ใหม่:
- ไม่ต้อง migrate ข้อมูลเก่า — remark เดิมใช้ได้ทันที
- `remark` เป็น source of truth เดียว ไม่มีปัญหา desync ถ้า Mark ไปแก้ตรง Google Sheet
- rollback = ลบไฟล์ที่เพิ่มทิ้ง ข้อมูลใน Sheet ไม่เสียหาย
- ต้นทุน parse ต่ำมาก (regex บนข้อมูลไม่กี่ร้อยแถว ซึ่งอ่านมาทั้งชีตอยู่แล้ว)

แลกกับ: พิมพ์ pattern ผิดแล้วยอดหาย → แก้ด้วย live preview ตอนกรอก + badge เตือนในหน้ารายการ

## Grammar

```
remark := entry (SEP entry)*
SEP    := newline | ";"
entry  := name ":" block ("+" block)*
block  := "[" number "]" label?
```

- `name` — ข้อความก่อน `:` ถ้าลงท้ายด้วย `จ่าย` → ทิศทาง `i_owe` มิฉะนั้น `owed_to_me`
- `number` — จำนวนเต็มหรือทศนิยม, มี `,` คั่นหลักพันได้
- `label` — ข้อความหลัง `]` จนถึง `+` หรือ SEP ตัวถัดไป (ตัดช่องว่างหัวท้าย) ว่างได้
- ข้อความส่วนที่ไม่เข้า pattern → เก็บเป็น `freeText`

ไม่ใช้ `,` เป็นตัวคั่นระหว่างคน เพราะ `,` มักปรากฏในคำอธิบาย

### Normalize ชื่อคน

1. trim
2. ตัดคำ `จ่าย` ท้ายสุดออก (ถ้ามี) — ใช้ตัดสินทิศทางไปแล้ว
3. trim ซ้ำ + ยุบช่องว่างซ้อนเป็นช่องเดียว

ผลลัพธ์: `ขนม` = `ขนมจ่าย` = `ขนม จ่าย ` → ทั้งหมดคือคน `ขนม`

### ตัวอย่าง

| remark | ผลลัพธ์ |
|---|---|
| `ขนม: [50] ค่าอาหาร` | ขนม / 50 / `owed_to_me` / "ค่าอาหาร" |
| `ขนมจ่าย: [200] ค่าคลีนซิ่ง` | ขนม / 200 / `i_owe` / "ค่าคลีนซิ่ง" |
| `ขนม: [100] ค่าอาหาร+ [50] ค่าเดินทาง` | ขนม / 100 / `owed_to_me` / "ค่าอาหาร"<br>ขนม / 50 / `owed_to_me` / "ค่าเดินทาง" |
| `ขนม: [50] ข้าว; ต้อมจ่าย: [80] แท็กซี่` | ขนม / 50 / `owed_to_me`<br>ต้อม / 80 / `i_owe` |
| `จ่ายค่าน้ำแล้ว` | `splits: []`, `freeText: "จ่ายค่าน้ำแล้ว"` |
| `ขนม [50]` (ไม่มี `:`) | `splits: []`, `freeText: "ขนม [50]"`, `invalid: true` |

`invalid: true` เมื่อพบเค้าโครงคล้าย pattern (มี `[ตัวเลข]`) แต่ parse ไม่สำเร็จ — ใช้ขึ้น badge เตือน

## Data model

### Type ใหม่ (ไม่แก้ `Expense`)

```ts
// types/index.ts
export type SplitDirection = "owed_to_me" | "i_owe";

export interface Split {
  person: string;        // normalized
  amount: number;
  label: string;
  direction: SplitDirection;
}

export interface ParsedRemark {
  splits: Split[];
  freeText: string;
  invalid: boolean;
}

export type SettlementDirection = "received" | "paid";

export interface Settlement {
  id: string;
  date: string;          // YYYY-MM-DD
  person: string;        // normalized
  amount: number;
  direction: SettlementDirection;
  note: string;
  createdAt: string;     // ISO
}

export type NewSettlement = Omit<Settlement, "id" | "createdAt">;

export interface PersonBalance {
  person: string;
  balance: number;       // > 0 เขาติดเรา, < 0 เราติดเขา
  lentOut: number;
  borrowed: number;
  settledNet: number;
  entries: SplitEntry[]; // รายการที่มา สำหรับกางดู
}

export interface SplitEntry {
  expenseId: string;
  date: string;
  item: string;
  split: Split;
}
```

### Google Sheet

`expenses` tab — **ไม่เปลี่ยน** (A–G เหมือนเดิม)

`settlements` tab — สร้างใหม่ header:

```
id | date | person | amount | direction | note | createdAt
```

## การคำนวณ

### ต่อรายการ

| ค่า | สูตร |
|---|---|
| `lentOut` | Σ splits ที่ `owed_to_me` |
| `borrowed` | Σ splits ที่ `i_owe` |
| `myShare` | `amount - lentOut` |
| `cashOut` | `amount - borrowed` |

ถ้า `lentOut + borrowed > amount` → ข้อมูลไม่สมเหตุสมผล แสดง badge เตือนในหน้ารายการ แต่ยังคำนวณต่อตามสูตร (ไม่ block การบันทึก)

### ต่อคน

```
settledNet(p) = Σ settlements(p, "received") - Σ settlements(p, "paid")
balance(p)    = lentOut(p) - borrowed(p) - settledNet(p)
```

net ระดับคน — ถ้าขนมติดเรา 50 และเราติดขนม 200 → แสดงยอดเดียว "เราติดขนม 150"

คนที่ `balance` ปัดเป็น 0 (|balance| < 0.005) → ไม่แสดงในรายการ

### ยอดรวม

```
ต้องกันไว้ = Σ |balance(p)| ที่ balance(p) < 0
จะได้คืน  = Σ  balance(p)  ที่ balance(p) > 0
```

ยอดรวมคำนวณจากข้อมูลทั้งหมดที่โหลดมา ไม่จำกัดช่วงวันที่ (หนี้ไม่หมดอายุตามเดือน)

## UI

### หน้า Home (`app/page.tsx`)

การ์ด "วันนี้ / เดือนนี้" — ตัวเลขหลักคงเป็นยอดรวมเดิม (`Σ amount`) เพิ่มบรรทัดเล็กใต้ตัวเลขว่า `ของฉัน ฿X` โดย `X = Σ myShare` ของรายการในช่วงเดียวกัน แสดงเฉพาะเมื่อ `X ≠ ยอดรวม`

กราฟสัปดาห์ยังใช้ยอดรวมเดิม ไม่เปลี่ยน

การ์ดใหม่ "ค้างอยู่" วางใต้การ์ดสรุป:
- แสดง 2 ตัวเลข: ต้องกันไว้ (โทนเตือน) / จะได้คืน (โทนบวก)
- กดแล้วไป `/people`
- ซ่อนทั้งใบเมื่อไม่มียอดค้างทั้งสองฝั่ง

### หน้าใหม่ `/people`

- หัวหน้า: ยอดรวม 2 ก้อน (ต้องกันไว้ / จะได้คืน)
- รายการคน เรียงตาม `|balance|` มากไปน้อย แสดงชื่อ + ยอด + ปุ่ม "เคลียร์"
- กดชื่อคน → กางรายการที่มา (วันที่ + รายการ + จำนวน) จาก `entries`
- ปุ่มเคลียร์ → modal ใส่จำนวน (default = เต็มยอด) + วันที่ (default = วันนี้) + note → POST `/api/settlements`
  - ทิศทางกำหนดอัตโนมัติจากเครื่องหมายของ balance: `balance > 0` → `received`, `balance < 0` → `paid`
  - จำนวนต้อง > 0 และ ≤ `|balance|`
- ส่วนล่าง: ประวัติการเคลียร์ล่าสุด ลบได้ (undo)

### หน้า new / edit (`app/expenses/new`, `app/expenses/[id]`)

ใต้ช่องหมายเหตุ แสดง chip จากผล parse แบบ live:
- `owed_to_me` → `ขนม ติดเรา ฿50`
- `i_owe` → `เราติดขนม ฿200`
- `invalid` → `⚠ อ่าน format ไม่ออก` พร้อมตัวอย่าง pattern ที่ถูก
- ไม่มี split → ไม่แสดงอะไร

preview เป็นการแสดงผลอย่างเดียว ไม่ block การบันทึก

### หน้ารายการ / รายละเอียด

- รายการที่มี split → จุด/badge เล็กท้ายชื่อรายการ
- หน้ารายละเอียด → แสดง `amount`, `myShare`, `cashOut` และรายการ split ทั้งหมด

## โครงสร้างไฟล์

**เพิ่ม:**

| ไฟล์ | หน้าที่ |
|---|---|
| `lib/splits.ts` | `parseRemark()`, `normalizePerson()`, สูตรต่อรายการ — pure functions |
| `lib/balances.ts` | รวม expenses + settlements → `PersonBalance[]` และยอดรวม — pure functions |
| `lib/settlementSheets.ts` | อ่าน/เขียน/ลบ tab `settlements` |
| `app/api/settlements/route.ts` | GET (ทั้งหมด), POST (เพิ่ม) |
| `app/api/settlements/[id]/route.ts` | DELETE (undo) |
| `app/people/page.tsx` | หน้าสรุปยอดคงค้าง |
| `components/people/PersonRow.tsx` | 1 แถวคน + กางรายการที่มา |
| `components/people/SettleDialog.tsx` | modal เคลียร์หนี้ |
| `components/ui/SplitPreview.tsx` | chip preview ใต้ช่องหมายเหตุ |
| `store/settlementStore.ts` | state ของ settlements |

**แก้:**

| ไฟล์ | สิ่งที่แก้ |
|---|---|
| `types/index.ts` | เพิ่ม type ใหม่ (ไม่แตะ `Expense`) |
| `app/page.tsx` | บรรทัด "ของฉัน" + การ์ด "ค้างอยู่" |
| `app/expenses/new/page.tsx` | ใส่ `SplitPreview` |
| `app/expenses/[id]/page.tsx` | ใส่ `SplitPreview` + แสดงยอดแยก |
| `app/expenses/page.tsx` | badge บนรายการที่มี split |

การแบ่งไฟล์: `lib/splits.ts` รู้จักแค่ string → `Split[]` ไม่รู้จัก Google Sheet หรือ React; `lib/balances.ts` รับ array เข้า คืน array ออก ทั้งสองไฟล์ test ได้โดยไม่ต้อง mock อะไร

## Error handling

| กรณี | พฤติกรรม |
|---|---|
| remark parse ไม่ได้ | `splits: []` + `invalid: true` → badge เตือน ไม่ throw |
| `settlements` tab ไม่มีใน Sheet | API คืน `[]` + log warning; หน้า `/people` ทำงานได้แต่ balance ไม่หัก settlement |
| POST settlement เกิน `\|balance\|` | API ตอบ 400 พร้อมข้อความ |
| Sheets API ล้ม | โยนต่อเป็น error message เหมือน endpoint เดิม |
| ตัวเลขใน `[...]` เป็น 0 หรือติดลบ | ข้าม block นั้น ไม่นับเป็น split |

## Testing

โปรเจกต์ยังไม่มี test runner — ติดตั้ง `vitest` เฉพาะสำหรับ pure functions

| ไฟล์ | เคสที่ต้องครอบ |
|---|---|
| `lib/splits.test.ts` | ทุกแถวในตารางตัวอย่าง + ชื่อมีช่องว่าง + ตัวเลขมี comma + block หลายอัน + remark ว่าง |
| `lib/balances.test.ts` | netting 2 ทิศทางในคนเดียว, settlement บางส่วน, settlement เต็ม (คนหาย), balance ปัดเป็น 0 |

UI ทดสอบด้วยมือ

## Rollback

1. ลบไฟล์ที่เพิ่มทั้งหมด
2. revert 5 ไฟล์ที่แก้
3. ลบ tab `settlements` (ถ้าอยากลบ — ไม่ลบก็ไม่กระทบอะไร)

ข้อมูลใน `expenses` ไม่เคยถูกแก้จาก feature นี้
