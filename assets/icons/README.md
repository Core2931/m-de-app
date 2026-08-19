# Icons

| ไฟล์ | สถานะ |
|---|---|
| `../../app/icon.svg` | **ต้นทางหลัก + ใช้งานอยู่** — Graph Ink `#131C26` + Ember `#F26419` |
| `../../app/icon.png` | สร้างจาก `icon.svg` — fallback ให้เบราว์เซอร์ที่ไม่รองรับ SVG favicon |
| `../../app/favicon.ico` | สร้างจาก `icon.svg` (16+32) — ปิดกรณีที่ยิงหา `/favicon.ico` ตรงๆ |
| `../../app/apple-icon.png` | สร้างจาก `apple-icon.svg` — 180×180 home screen iOS |
| `apple-icon.svg` | source มุมเหลี่ยม (iOS มาสก์ squircle เอง โค้งมาก่อนจะซ้อนกัน) |
| `icon-ledger-paper.svg` | **สำรอง ยังไม่ได้ใช้** — Ledger Paper `#EDE8DE` + Ember `#C2410C` |
| `legacy/` | ของเดิมก่อนเปลี่ยน เก็บไว้เผื่อย้อนกลับ |

แก้ SVG แล้วรัน `npm run gen-icons` เพื่อสร้างไฟล์ raster ใหม่ทั้งหมด

Spec: canvas 24×24 · live area 20×20 · แท่งกว้าง 4 ช่องไฟ 4 · radius 2 (pill)
· ความสูง 8/13/20 · มุมตัด 45° · container radius 5.4/24 = 22.5% · mark inset
scale 0.74 · พื้นกริดทุก 2 หน่วย opacity 7.5%

## สลับไปใช้ Ledger Paper

```
cp assets/icons/icon-ledger-paper.svg app/icon.svg
```
แล้วแก้ `assets/icons/apple-icon.svg` ให้เป็นสีชุด Ledger Paper (ตัด `rx` ออกเหมือนเดิม)
จากนั้น `npm run gen-icons`

## กลับไปใช้ icon เดิม

```
git rm app/icon.svg app/icon.png app/favicon.ico app/apple-icon.png
git mv assets/icons/legacy/favicon.ico app/favicon.ico
git mv assets/icons/legacy/apple-touch-icon.png public/apple-touch-icon.png
```
แล้วเอา `icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" }` กลับเข้า `app/layout.tsx`
