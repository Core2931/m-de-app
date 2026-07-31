import type { NewSettlement, Settlement, SettlementDirection } from "@/types";
import { getSheetsClient, getSheetId, getSheetGid, findRowNumber } from "@/lib/sheetsClient";

const SHEET_NAME = "settlements";
const RANGE_ALL = `${SHEET_NAME}!A2:G`;

function toDirection(value: string | undefined): SettlementDirection {
  return value === "paid" ? "paid" : "received";
}

function rowToSettlement(row: string[]): Settlement {
  const [id, date, person, amount, direction, note, createdAt] = row;
  return {
    id,
    date,
    person,
    amount: Number(amount) || 0,
    direction: toDirection(direction),
    note: note ?? "",
    createdAt,
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

// The tab is created by hand; treat a missing tab as "no settlements yet"
// so the app still works before it exists.
function isMissingTab(err: unknown): boolean {
  return err instanceof Error && /Unable to parse range|not found/i.test(err.message);
}

export async function readAllSettlements(): Promise<Settlement[]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: RANGE_ALL,
    });
    const rows = (res.data.values ?? []) as string[][];
    return rows.filter((row) => row[0]).map(rowToSettlement);
  } catch (err) {
    if (isMissingTab(err)) {
      console.warn(`[settlements] sheet tab "${SHEET_NAME}" not found — returning empty list`);
      return [];
    }
    throw err;
  }
}

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
