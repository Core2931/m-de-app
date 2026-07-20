import { google, sheets_v4 } from "googleapis";
import type { Expense, NewExpense } from "@/types";

const SHEET_NAME = "expenses";
const RANGE_ALL = `${SHEET_NAME}!A2:F`;

let _sheets: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (!_sheets) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawKey = process.env.GOOGLE_PRIVATE_KEY;
    if (!email || !rawKey) {
      throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env var");
    }
    const auth = new google.auth.JWT({
      email,
      key: rawKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    _sheets = google.sheets({ version: "v4", auth });
  }
  return _sheets;
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEET_ID env var");
  return id;
}

function rowToExpense(row: string[]): Expense {
  const [id, date, item, amount, remark, createdAt] = row;
  return { id, date, item, amount: Number(amount) || 0, remark: remark ?? "", createdAt };
}

function expenseToRow(expense: Expense): string[] {
  return [expense.id, expense.date, expense.item, String(expense.amount), expense.remark ?? "", expense.createdAt];
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

// Row numbers are 1-based and include the header row, so a match at
// array index N sits at sheet row N + 2.
async function findRowNumber(id: string): Promise<number | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEET_NAME}!A2:A`,
  });
  const rows = (res.data.values ?? []) as string[][];
  const index = rows.findIndex((row) => row[0] === id);
  return index === -1 ? null : index + 2;
}

export async function updateExpense(id: string, input: NewExpense): Promise<Expense | null> {
  const rowNumber = await findRowNumber(id);
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
    range: `${SHEET_NAME}!A${rowNumber}:F${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [expenseToRow(expense)] },
  });
  return expense;
}

async function getSheetGid(): Promise<number> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: getSheetId() });
  const sheet = res.data.sheets?.find((s) => s.properties?.title === SHEET_NAME);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId == null) throw new Error(`Sheet tab "${SHEET_NAME}" not found`);
  return sheetId;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const rowNumber = await findRowNumber(id);
  if (rowNumber === null) return false;
  const sheets = getSheetsClient();
  const sheetId = await getSheetGid();
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
