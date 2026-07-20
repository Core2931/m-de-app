import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readAllExpenses, appendExpense } from "@/lib/sheets";
import { validateExpenseInput } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const expenses = await readAllExpenses();
  const filtered = expenses.filter((expense) => {
    if (from && expense.date < from) return false;
    if (to && expense.date > to) return false;
    return true;
  });

  return NextResponse.json({ expenses: filtered });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateExpenseInput(body);
  if (!input) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const expense = await appendExpense(input);
  return NextResponse.json({ expense }, { status: 201 });
}
