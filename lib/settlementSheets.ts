import type { NewSettlement, Settlement, SettlementDirection } from "@/types";
import {
  getSheetsClient,
  getSheetId,
  getSheetGid,
  findRowNumber,
  isMissingTab,
} from "@/lib/sheetsClient";

const SHEET_NAME = "settlements";
const RANGE_ALL = `${SHEET_NAME}!A2:G`;

function toDirection(value: unknown): SettlementDirection {
  return value === "paid" ? "paid" : "received";
}

// Cells arrive unformatted (see readAllSettlements), so numbers come back as
// numbers rather than display strings — hence unknown[] instead of string[].
function rowToSettlement(row: unknown[]): Settlement {
  const [id, date, person, amount, direction, note, createdAt] = row;
  return {
    id: String(id ?? ""),
    date: String(date ?? ""),
    person: String(person ?? ""),
    amount: Number(amount) || 0,
    direction: toDirection(direction),
    note: note == null ? "" : String(note),
    createdAt: String(createdAt ?? ""),
  };
}

function settlementToRow(settlement: Settlement): string[] {
  return [
    settlement.id,
    settlement.date,
    settlement.person,
    String(settlement.amount),
    settlement.direction,
    settlement.note ?? "",
    settlement.createdAt,
  ];
}

// Moved to lib/sheetsClient.ts once the budgets tab needed the same guard.
// Re-exported here so lib/settlementSheets.test.ts — which pins the regex
// down — keeps working unchanged.
export { isMissingTab } from "@/lib/sheetsClient";

export async function readAllSettlements(): Promise<Settlement[]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: RANGE_ALL,
      // This tab is created by hand, so column D can easily pick up a
      // thousands-separator number format; FORMATTED_VALUE would then hand us
      // "1,250.50", which Number() reads as NaN and rowToSettlement silently
      // turns into 0 — a repayment that vanishes. dateTimeRenderOption keeps
      // column B readable: USER_ENTERED writes store dates as serial numbers,
      // and UNFORMATTED_VALUE alone would return 46226 instead of "2026-07-20".
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });
    const rows = (res.data.values ?? []) as unknown[][];
    return rows.filter((row) => row[0]).map(rowToSettlement);
  } catch (err) {
    if (isMissingTab(err)) {
      console.warn(`[settlements] sheet tab "${SHEET_NAME}" not found — returning empty list`);
      return [];
    }
    throw err;
  }
}

// Note: writes deliberately do NOT tolerate a missing tab like readAllSettlements
// does — a failed append/delete should fail loudly rather than silently no-op.
export async function appendSettlement(input: NewSettlement): Promise<Settlement> {
  const sheets = getSheetsClient();
  const settlement: Settlement = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: RANGE_ALL,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [settlementToRow(settlement)] },
  });
  return settlement;
}

export async function deleteSettlement(id: string): Promise<boolean> {
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
            range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
          },
        },
      ],
    },
  });
  return true;
}
