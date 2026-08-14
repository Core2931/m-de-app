import type { Budget } from "@/types";
import { getSheetsClient, getSheetId, findRowNumber, isMissingTab } from "@/lib/sheetsClient";
import { parseBudgetAmount } from "@/lib/budgets";

const SHEET_NAME = "budgets";
const RANGE_ALL = `${SHEET_NAME}!A2:D`;

// Row per month rather than a single key/value setting, so raising the budget
// in September does not retroactively change whether August was over.
function rowToBudget(row: unknown[]): Budget {
  const [id, month, amount, createdAt] = row;
  return {
    id: String(id ?? ""),
    month: String(month ?? ""),
    // 0 stands for "unusable", which findBudgetForMonth also reads as null.
    // Parsing lives in lib/budgets.ts so the reader and the selector cannot
    // disagree about what "10,000" in a text cell means.
    amount: parseBudgetAmount(amount) ?? 0,
    createdAt: String(createdAt ?? ""),
  };
}

function budgetToRow(budget: Budget): string[] {
  return [budget.id, budget.month, String(budget.amount), budget.createdAt];
}

export async function readAllBudgets(): Promise<Budget[]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: RANGE_ALL,
      // Same reasoning as the settlements tab: this one is created by hand, so
      // column C will pick up a thousands separator sooner or later.
      // FORMATTED_VALUE would return "10,000", Number() reads that as NaN, and
      // the budget would silently disappear. FORMATTED_STRING keeps column B
      // readable — USER_ENTERED writes "2026-08" as text but a date-formatted
      // cell would otherwise come back as a serial.
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });
    const rows = (res.data.values ?? []) as unknown[][];
    return rows.filter((row) => row[0]).map(rowToBudget);
  } catch (err) {
    if (isMissingTab(err)) {
      console.warn(`[budgets] sheet tab "${SHEET_NAME}" not found — returning empty list`);
      return [];
    }
    throw err;
  }
}

/**
 * One row per month, replaced in place when the month already has one.
 *
 * Read-then-write is not atomic. This is a single-user app, so two concurrent
 * budget edits are not a scenario worth locking against.
 *
 * Writes deliberately do NOT swallow a missing tab the way the read does — the
 * route turns that specific failure into an actionable message rather than
 * letting a save silently no-op.
 */
export async function upsertBudget(month: string, amount: number): Promise<Budget> {
  const sheets = getSheetsClient();
  const existing = (await readAllBudgets()).find((b) => b.month === month);

  const budget: Budget = {
    id: existing?.id ?? crypto.randomUUID(),
    month,
    amount,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  const rowNumber = existing ? await findRowNumber(SHEET_NAME, budget.id) : null;

  if (rowNumber !== null) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: `${SHEET_NAME}!A${rowNumber}:D${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [budgetToRow(budget)] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSheetId(),
      range: RANGE_ALL,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [budgetToRow(budget)] },
    });
  }

  return budget;
}
