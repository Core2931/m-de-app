import type { Expense, NewExpense, PayChange } from "@/types";
import {
  expenseToCoreRow,
  expenseToPayCells,
  expenseToRow,
  readPayState,
  rowToExpense,
} from "@/lib/expenseRows";
import { mergePay } from "@/lib/payMethods";
import { getSheetsClient, getSheetId, getSheetGid, findRowNumber } from "@/lib/sheetsClient";

const SHEET_NAME = "expenses";
const RANGE_ALL = `${SHEET_NAME}!A2:J`;

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
  // are read back and carried over rather than taken from the request. I:J are
  // read too: what the request leaves out must survive.
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!F${rowNumber}:J${rowNumber}`,
  });
  const stored = (existing.data.values?.[0] ?? []) as string[];
  const createdAt = stored[0] ?? new Date().toISOString();
  const payee = stored[2];
  const payState = mergePay(input, readPayState(stored[3], stored[4]));
  const expense: Expense = {
    id,
    createdAt,
    date: input.date,
    item: input.item,
    amount: input.amount,
    remark: input.remark,
    category: input.category,
    ...(payee ? { payee } : {}),
    ...payState,
  };
  // One request for both ranges so it cannot half-succeed. H is never written.
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `${SHEET_NAME}!A${rowNumber}:G${rowNumber}`,
          values: [expenseToCoreRow(expense)],
        },
        {
          range: `${SHEET_NAME}!I${rowNumber}:J${rowNumber}`,
          values: [expenseToRow(expense).slice(8)],
        },
      ],
    },
  });
  return expense;
}

/**
 * Changes the pay columns of many rows in one request, so a batch cannot end up
 * half applied. False means some id is gone and nothing was written.
 */
export async function setPayMethods(changes: PayChange[]): Promise<boolean> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!A2:A`,
  });
  const ids = (res.data.values ?? []) as string[][];
  // Row numbers are 1-based and include the header row.
  const rowById = new Map(ids.map((row, index) => [row[0], index + 2]));

  const data: { range: string; values: string[][] }[] = [];
  for (const change of changes) {
    const rowNumber = rowById.get(change.id);
    if (rowNumber === undefined) return false;
    data.push({
      range: `${SHEET_NAME}!I${rowNumber}:J${rowNumber}`,
      values: [expenseToPayCells(change)],
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: getSheetId(),
    // RAW keeps the date as text without the apostrophe an append needs.
    requestBody: { valueInputOption: "RAW", data },
  });
  return true;
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
