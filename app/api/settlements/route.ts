import { NextResponse } from "next/server";
import { readAllExpenses } from "@/lib/sheets";
import { readAllSettlements, appendSettlement } from "@/lib/settlementSheets";
import { buildPersonBalances } from "@/lib/balances";
import { validateSettlementInput } from "@/lib/validation";
import { EPSILON } from "@/lib/splits";

export async function GET() {
  const settlements = await readAllSettlements();
  return NextResponse.json({ settlements });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input = validateSettlementInput(body);
  if (!input) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const [expenses, settlements] = await Promise.all([readAllExpenses(), readAllSettlements()]);
  const balance = buildPersonBalances(expenses, settlements).find(
    (b) => b.person === input.person
  );
  if (!balance) {
    return NextResponse.json({ error: "ไม่มียอดค้างของคนนี้" }, { status: 400 });
  }

  const expectedDirection = balance.balance > 0 ? "received" : "paid";
  if (input.direction !== expectedDirection) {
    return NextResponse.json({ error: "ทิศทางการเคลียร์ไม่ตรงกับยอดค้าง" }, { status: 400 });
  }
  if (input.amount > Math.abs(balance.balance) + EPSILON) {
    return NextResponse.json({ error: "จำนวนเงินเกินยอดค้าง" }, { status: 400 });
  }

  const settlement = await appendSettlement(input);
  return NextResponse.json({ settlement }, { status: 201 });
}
