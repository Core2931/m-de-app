// Pulls the few fields we care about out of raw OCR text from a Thai payment
// slip. Only K+ scan-to-pay and เป๋าตัง layouts have been seen; everything
// else falls through to the generic rules.
//
// The rule throughout: a field that cannot be read with confidence comes back
// null. An empty field makes the user look; a wrong but believable one gets
// saved.

export interface SlipRead {
  amount: number | null;
  /** The amount sat next to a "จำนวนเงินที่ชำระ" label rather than being
   *  picked by position — the stronger of the two kinds of evidence. */
  amountLabeled: boolean;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
  payee: string | null;
}

// Month abbreviations with the dots removed, which is how OCR often returns
// them anyway ("ต.ค." comes back as "ตค" about as often as not).
const MONTHS: Record<string, number> = {
  มค: 1,
  กพ: 2,
  มีค: 3,
  เมย: 4,
  พค: 5,
  มิย: 6,
  กค: 7,
  สค: 8,
  กย: 9,
  ตค: 10,
  พย: 11,
  ธค: 12,
};

// Vowels and tone marks that sit above/below a consonant — the characters
// OCR invents or drops most ("ต.ุค.").
const COMBINING = /[ัิ-ฺ็-๎]/g;
const THAI_CONSONANT = /[ก-ฮ]/g;

const stripMarks = (text: string) => text.replace(COMBINING, "");

// Compared with the marks stripped from both sides, so a dropped tone mark in
// the label does not send us to the positional rule and the wrong number.
const PAID_LABEL = stripMarks("จำนวนเงินที่ชำระ");

// Field labels that follow the payee block. Reaching one means the shop name
// was not where we expected it; taking the label instead would give every
// such slip the same "shop". Also compared with marks stripped.
const FIELD_LABELS = ["จำนวน", "ค่าธรรมเนียม", "เลขที่รายการ", "รหัสอ้างอิง", "ค่าสินค้า"].map(stripMarks);

// How many non-empty lines below the payer block may hold the shop name. The
// slips seen so far need two (a stray logo token, then the name).
const PAYEE_LOOKAHEAD = 3;

function toNumber(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function findAmount(text: string): Pick<SlipRead, "amount" | "amountLabeled"> {
  // เป๋าตัง lists price, subsidy and amount paid; only the last left the wallet.
  const paid = stripMarks(text).match(new RegExp(`${PAID_LABEL}\\s*([\\d,]+(?:\\.\\d{1,2})?)`));
  if (paid) {
    const amount = toNumber(paid[1]);
    if (amount !== null) return { amount, amountLabeled: true };
  }

  // K+ prints the amount before the fee, both with two decimals. Taking the
  // first one does not depend on the "จำนวน" label surviving OCR.
  const decimal = text.match(/(\d[\d,]*\.\d{2})(?!\d)/);
  if (decimal) return { amount: toNumber(decimal[1]), amountLabeled: false };

  const baht = text.match(/(\d[\d,]*)\s*บาท/);
  return { amount: baht ? toNumber(baht[1]) : null, amountLabeled: false };
}

function findMonth(token: string): number | null {
  const plain = token.replace(/\./g, "");
  if (MONTHS[plain]) return MONTHS[plain];
  // Second chance with the marks stripped. มี.ค. and ม.ค. collide here and
  // resolve to January — acceptable for a fallback, the row is reviewed anyway.
  const bare = stripMarks(plain);
  for (const [key, month] of Object.entries(MONTHS)) {
    if (stripMarks(key) === bare) return month;
  }
  return null;
}

/** A slip is for a payment already made, and recently: not in the future, not
 *  more than a year back, and an actual calendar day. One misread digit in the
 *  year otherwise files the expense decades away, where nothing shows it. */
function isPlausibleDate(iso: string, today: string): boolean {
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) return false;
  if (iso > today) return false;
  const floor = new Date(`${today}T00:00:00.000Z`);
  floor.setUTCFullYear(floor.getUTCFullYear() - 1);
  return iso >= floor.toISOString().slice(0, 10);
}

interface DateTimeRead {
  date: string | null;
  time: string | null;
  /** Where the date-time text sits, when something date-shaped was found —
   *  even if the date itself was then rejected as implausible. */
  span: [number, number] | null;
}

function findDateTime(text: string, today: string): DateTimeRead {
  const none: DateTimeRead = { date: null, time: null, span: null };
  // Deliberately loose around the edges: the trailing "น." is misread too
  // often to anchor on, and the year can run straight into the time
  // ("25691258"). findMonth below is what keeps this from matching noise.
  const match = text.match(
    /(\d{1,2})\s*([ก-๎.]{2,7})\s*(\d{4}|\d{2})\s*(\d{1,2})[:.]?(\d{2})(?!\d)/
  );
  if (!match || match.index === undefined) return none;

  const day = Number(match[1]);
  const month = findMonth(match[2]);
  // Slips print Buddhist years, either "2569" or just "69".
  const buddhistYear = match[3].length === 2 ? 2500 + Number(match[3]) : Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (!month || day < 1 || day > 31 || hour > 23 || minute > 59) return none;

  const span: [number, number] = [match.index, match.index + match[0].length];
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${buddhistYear - 543}-${pad(month)}-${pad(day)}`;
  if (!isPlausibleDate(date, today)) return { date: null, time: null, span };

  return { date, time: `${pad(hour)}:${pad(minute)}`, span };
}

function isFieldLabel(line: string): boolean {
  const bare = stripMarks(line);
  return line.trim().endsWith(":") || FIELD_LABELS.some((label) => bare.includes(label));
}

function findPayee(text: string): string | null {
  const lines = text.split(/\r?\n/);
  // The payer block sits right above the payee: a masked account on K+
  // ("xxx-x-x1234-x", the x sometimes read as %), a wallet id and a masked
  // name ("U***") on เป๋าตัง. The LAST such line is the one to start from —
  // เป๋าตัง has two, and the wallet id line would otherwise pass as a name.
  let anchor = -1;
  lines.forEach((line, index) => {
    if (/[x%]{2,4}-[x%]-[x%]{1,2}\d{4}/i.test(line) || /G.?Wallet/i.test(line) || /\*{3}/.test(line)) {
      anchor = index;
    }
  });
  if (anchor === -1) return null;

  const thaiCount = (s: string) => (s.match(THAI_CONSONANT) ?? []).length;

  let looked = 0;
  for (const line of lines.slice(anchor + 1)) {
    if (line.trim() === "") continue;
    looked += 1;
    if (looked > PAYEE_LOOKAHEAD) break;
    // Past the payee block already (a transfer slip, or a shop name in Latin
    // letters we do not read): better no shop than a label for one.
    if (isFieldLabel(line)) return null;

    // The logo and the arrow come back as a stray token set apart by a wide
    // gap; the name itself only has single spaces. Keep the wordiest chunk.
    const name = line
      .split(/\s{2,}/)
      .reduce((best, part) => (thaiCount(part) > thaiCount(best) ? part : best), "");
    if (thaiCount(name) < 3) continue;
    return name.replace(/^[^ก-ฮเ-ไ]+/, "").trim();
  }
  return null;
}

/** `today` (YYYY-MM-DD) bounds what counts as a believable slip date. */
export function parseSlipText(text: string, today: string): SlipRead {
  // Tesseract returns sara am as two characters (nikhahit + sara aa).
  const normalized = text.replace(/ํา/g, "ำ");

  const { date, time, span } = findDateTime(normalized, today);
  // The time of day reads as a price once OCR turns its colon into a dot
  // ("12.57"), and it comes before the amount — so it is taken out first.
  const withoutDate = span
    ? `${normalized.slice(0, span[0])} ${normalized.slice(span[1])}`
    : normalized;

  return {
    ...findAmount(withoutDate),
    date,
    time,
    payee: findPayee(normalized),
  };
}

/** Field by field, the first read wins and the second fills the gaps — except
 *  that an amount found beside its label beats one picked by position. */
export function mergeSlipReads(first: SlipRead, second: SlipRead): SlipRead {
  const amountFromSecond =
    first.amount === null || (!first.amountLabeled && second.amountLabeled && second.amount !== null);
  return {
    amount: amountFromSecond ? second.amount : first.amount,
    amountLabeled: amountFromSecond ? second.amountLabeled : first.amountLabeled,
    date: first.date ?? second.date,
    time: first.time ?? second.time,
    payee: first.payee ?? second.payee,
  };
}
