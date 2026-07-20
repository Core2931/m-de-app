# รายจ่ายรายวัน (m-de-app)

เว็บจดรายจ่ายรายวัน ใช้แทน Google Sheet เดิม — กรอกง่ายบนมือถือ, สรุปยอดอัตโนมัติ, แต่ข้อมูลจริงยังเก็บอยู่ใน Google Sheet (ผ่าน Service Account)

## Setup

### 1. Google Cloud — สร้าง Service Account

1. เปิด [Google Cloud Console](https://console.cloud.google.com/) → สร้าง project ใหม่ (หรือใช้ของเดิม)
2. เปิดใช้งาน **Google Sheets API**: APIs & Services → Library → ค้นหา "Google Sheets API" → Enable
3. สร้าง Service Account: APIs & Services → Credentials → Create Credentials → Service Account
   - ตั้งชื่ออะไรก็ได้ เช่น `m-de-sheets`
   - ไม่ต้องให้สิทธิ์ project role ใดๆ (ไม่จำเป็น)
4. เข้าไปที่ Service Account ที่สร้าง → tab **Keys** → Add Key → Create new key → เลือก **JSON** → ดาวน์โหลดไฟล์ JSON
5. เปิดไฟล์ JSON เอาค่า `client_email` และ `private_key` มาใส่ `.env.local` (ดูขั้นตอน 3)

### 2. Google Sheet — เตรียมชีต

1. สร้าง Google Sheet ใหม่ (หรือใช้ของเดิม แต่แนะนำสร้างแยก เพื่อไม่ปนกับ sheet เดิม)
2. สร้าง tab ชื่อ **`expenses`** (ตัวสะกดต้องตรงเป๊ะ) ใส่ header แถวแรก:
   ```
   id | date | item | amount | remark | createdAt
   ```
3. แชร์ sheet ให้ service account email (จากขั้นตอน 1) เป็น **Editor** (Share → ใส่ email `xxx@yyy.iam.gserviceaccount.com`)
4. คัดลอก Sheet ID จาก URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`

### 3. Env vars

```bash
cp .env.local.example .env.local
```

แก้ `.env.local`:

| ตัวแปร | ที่มา |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` จากไฟล์ JSON |
| `GOOGLE_PRIVATE_KEY` | `private_key` จากไฟล์ JSON (มี `\n` ในนั้น เก็บเป็น string เดียวได้เลย ไม่ต้องแปลง) |
| `GOOGLE_SHEET_ID` | จาก URL ของ sheet |
| `APP_PASSWORD_HASH` | รัน `npm run hash-password -- "your-password"` แล้วก็อปทั้งบรรทัดที่ print ออกมาไปวางใน `.env.local` ได้เลย (escape `$` ให้แล้ว — จำเป็นเพราะ .env parser ของ Next.js ตีความ `$` เป็น variable interpolation) |
| `AUTH_SECRET` | random string ยาวๆ เช่น `openssl rand -base64 32` |

### 4. รัน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 → ถูก redirect ไป `/login` → login ด้วย password ที่ตั้งไว้

## Deploy (Vercel)

1. Push ขึ้น GitHub repo (แยกจาก `m-iae-app`)
2. Import project ใน Vercel
3. ใส่ env vars ทั้งหมดด้านบนใน Vercel project settings (ระวัง `GOOGLE_PRIVATE_KEY` ต้องมี `\n` literal ครบตอน paste)
4. Deploy

## Tech Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS + Zustand + Google Sheets API (`googleapis`, Service Account JWT)

Auth เป็น custom cookie session (HMAC-signed, ไม่ใช้ NextAuth) เพราะ single-user ไม่จำเป็นต้องมี provider abstraction — ดู `lib/auth.ts` + `proxy.ts`

## Note: Google Sheet เป็น DB

- ไม่มี index/query จริง — อ่านทั้งชีตทุกครั้งที่ query, แก้/ลบ 1 แถวต้องหาแถวก่อน
- Rate limit Google Sheets API ~60 read/นาที/user — ใช้งานคนเดียวปริมาณน้อยสบายมาก
- ถ้าจะขยายเป็น multi-user หรือข้อมูลเยอะขึ้น พิจารณาย้ายไป Supabase (ดู `m-iae-app` เป็นตัวอย่าง)
