import { google, sheets_v4 } from "googleapis";

let _sheets: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
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

export function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEET_ID env var");
  return id;
}

// Hand-created tabs (settlements, budgets) should degrade to "nothing here
// yet" so the app still works before they exist. Only match the range-parse
// error Sheets throws for an unknown tab name — a generic "not found" also
// covers an invalid/revoked spreadsheet ID, which must surface as a real error
// instead of being silently reported as an empty list.
//
// Pinned down by lib/settlementSheets.test.ts: this regex is the whole
// difference between "tab not created yet" and "GOOGLE_SHEET_ID is wrong", and
// widening it would silently turn config errors into empty lists. Lives here
// rather than in one tab module so the two cannot drift apart.
export function isMissingTab(err: unknown): boolean {
  return err instanceof Error && /Unable to parse range/i.test(err.message);
}

export async function getSheetGid(sheetName: string): Promise<number> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId: getSheetId() });
  const sheet = res.data.sheets?.find((s) => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId == null) throw new Error(`Sheet tab "${sheetName}" not found`);
  return sheetId;
}

// Row numbers are 1-based and include the header row, so a match at
// array index N sits at sheet row N + 2.
export async function findRowNumber(sheetName: string, id: string): Promise<number | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${sheetName}!A2:A`,
  });
  const rows = (res.data.values ?? []) as string[][];
  const index = rows.findIndex((row) => row[0] === id);
  return index === -1 ? null : index + 2;
}
