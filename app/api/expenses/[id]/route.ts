import { NextResponse } from "next/server";
import { updateExpense, deleteExpense } from "@/lib/sheets";
import { validateExpenseInput } from "@/lib/validation";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const input = validateExpenseInput(body);
  if (!input) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const expense = await updateExpense(id, input);
  if (!expense) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  }
  return NextResponse.json({ expense });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteExpense(id);
  if (!deleted) {
    return NextResponse.json({ error: "ไม่พบรายการ" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
