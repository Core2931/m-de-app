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
