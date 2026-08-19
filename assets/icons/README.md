# Icons

| ไฟล์ | สถานะ |
|---|---|
| `../../app/icon.svg` | **ใช้งานอยู่** — Graph Ink `#131C26` + Ember `#F26419` |
| `apple-icon.svg` | source ของ `app/apple-icon.png` (มุมเหลี่ยม — iOS มาสก์เอง) |
| `icon-ledger-paper.svg` | สำรอง ยังไม่ได้ใช้ — Ledger Paper `#EDE8DE` + Ember `#C2410C` |
| `legacy/` | ของเดิมก่อนเปลี่ยน เก็บไว้เผื่อย้อนกลับ |

Spec: canvas 24×24 · live area 20×20 · แท่งกว้าง 4 ช่องไฟ 4 · radius 2 (pill)
· ความสูง 8/13/20 · มุมตัด 45° · container radius 5.4/24 = 22.5% · mark inset
scale 0.74 · พื้นกริดทุก 2 หน่วย opacity 7.5%

สร้าง PNG ใหม่: `npm run gen-icons`

## กลับไปใช้ของเดิม

```
git mv assets/icons/legacy/favicon.ico app/favicon.ico
git mv assets/icons/legacy/apple-touch-icon.png public/apple-touch-icon.png
git rm app/icon.svg app/apple-icon.png
```
แล้วเอา `icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" }` กลับเข้า `app/layout.tsx`
