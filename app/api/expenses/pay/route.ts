import { NextResponse } from "next/server";
import { setPayMethods } from "@/lib/sheets";
import { validatePayChanges } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const changes = validatePayChanges(body);
  if (!changes) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const done = await setPayMethods(changes);
  if (!done) {
    return NextResponse.json(
      { error: "ไม่พบบางรายการ โหลดหน้าใหม่แล้วลองอีกครั้ง" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
