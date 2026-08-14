import { NextResponse } from "next/server";
import { readAllBudgets, upsertBudget } from "@/lib/budgetSheets";
import { isMissingTab } from "@/lib/sheetsClient";
import { validateBudgetInput } from "@/lib/validation";

export async function GET() {
  const budgets = await readAllBudgets();
  return NextResponse.json({ budgets });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateBudgetInput(body);
  if (!input) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    // Clearing writes 0 rather than deleting the row, so the month keeps its
    // history entry. findBudgetForMonth already reads 0 as "not set".
    const budget = await upsertBudget(input.month, input.amount ?? 0);
    return NextResponse.json({ budget });
  } catch (err) {
    // The read tolerates a missing tab and reports "no budget yet"; a write
    // must not silently no-op, so this says exactly what to go and do.
    if (isMissingTab(err)) {
      return NextResponse.json(
        { error: "ยังไม่มีชีต budgets — สร้างแท็บชื่อ budgets ในไฟล์ก่อน" },
        { status: 503 }
      );
    }
    throw err;
  }
}
