import type { Expense, NewExpense } from "@/types";
import { expenseToCoreRow, expenseToRow, rowToExpense } from "@/lib/expenseRows";
import { getSheetsClient, getSheetId, getSheetGid, findRowNumber } from "@/lib/sheetsClient";

const SHEET_NAME = "expenses";
const RANGE_ALL = `${SHEET_NAME}!A2:H`;

export async function readAllExpenses(): Promise<Expense[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: RANGE_ALL,
  });
  const rows = (res.data.values ?? []) as string[][];
  return rows.filter((row) => row[0]).map(rowToExpense);
}

export async function appendExpense(input: NewExpense): Promise<Expense> {
  const sheets = getSheetsClient();
  const expense: Expense = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: RANGE_ALL,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [expenseToRow(expense)] },
  });
  return expense;
}

export async function updateExpense(id: string, input: NewExpense): Promise<Expense | null> {
  const rowNumber = await findRowNumber(SHEET_NAME, id);
  if (rowNumber === null) return null;
  const sheets = getSheetsClient();
  // F = createdAt, H = payee. Both belong to the row, not to the edit, so they
  // are read back and carried over rather than taken from the request.
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!F${rowNumber}:H${rowNumber}`,
  });
  const stored = (existing.data.values?.[0] ?? []) as string[];
  const createdAt = stored[0] ?? new Date().toISOString();
  const payee = stored[2];
  const expense: Expense = {
    id,
    createdAt,
    date: input.date,
    item: input.item,
    amount: input.amount,
    remark: input.remark,
    category: input.category,
    ...(payee ? { payee } : {}),
  };
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!A${rowNumber}:G${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [expenseToCoreRow(expense)] },
  });
  return expense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const rowNumber = await findRowNumber(SHEET_NAME, id);
  if (rowNumber === null) return false;
  const sheets = getSheetsClient();
  const sheetId = await getSheetGid(SHEET_NAME);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });
  return true;
}
