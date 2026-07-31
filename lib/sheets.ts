import type { Expense, NewExpense } from "@/types";
import { toCategory } from "@/lib/categories";
import { getSheetsClient, getSheetId, getSheetGid, findRowNumber } from "@/lib/sheetsClient";

const SHEET_NAME = "expenses";
const RANGE_ALL = `${SHEET_NAME}!A2:G`;

function rowToExpense(row: string[]): Expense {
  // Legacy rows written before the category column exist without column G.
  const [id, date, item, amount, remark, createdAt, category] = row;
  return {
    id,
    date,
    item,
    amount: Number(amount) || 0,
    remark: remark ?? "",
    createdAt,
    category: toCategory(category),
  };
}

function expenseToRow(expense: Expense): string[] {
  return [
    expense.id,
    expense.date,
    expense.item,
    String(expense.amount),
    expense.remark ?? "",
    expense.createdAt,
    expense.category,
  ];
}

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
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!F${rowNumber}`,
  });
  const createdAt = (existing.data.values?.[0]?.[0] as string | undefined) ?? new Date().toISOString();
  const expense: Expense = { id, createdAt, ...input };
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!A${rowNumber}:G${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [expenseToRow(expense)] },
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
