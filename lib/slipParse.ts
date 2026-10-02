// TRIAL CODE (spike/slip-ocr-preview): pulls the few fields we care about out
// of raw OCR text from a Thai payment slip. Only K+ scan-to-pay and เป๋าตัง
// layouts have been seen; everything else falls through to the generic rules.

export interface SlipRead {
  amount: number | null;
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

function toNumber(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function findAmount(text: string): number | null {
  // เป๋าตัง lists price, subsidy and amount paid; only the last left the wallet.
  const paid = text.match(/จำนวนเงินที่ชำระ\s*([\d,]+(?:\.\d{1,2})?)/);
  if (paid) return toNumber(paid[1]);

  // K+ prints the amount before the fee, both with two decimals. Taking the
  // first one does not depend on the "จำนวน" label surviving OCR.
  const decimal = text.match(/(\d[\d,]*\.\d{2})(?!\d)/);
  if (decimal) return toNumber(decimal[1]);

  const baht = text.match(/(\d[\d,]*)\s*บาท/);
  return baht ? toNumber(baht[1]) : null;
}

function findMonth(token: string): number | null {
  const plain = token.replace(/\./g, "");
  if (MONTHS[plain]) return MONTHS[plain];
  // Second chance with the marks stripped. มี.ค. and ม.ค. collide here and
  // resolve to January — acceptable for a fallback, the row is reviewed anyway.
  const bare = plain.replace(COMBINING, "");
  for (const [key, month] of Object.entries(MONTHS)) {
    if (key.replace(COMBINING, "") === bare) return month;
  }
  return null;
}

function findDateTime(text: string): Pick<SlipRead, "date" | "time"> {
  const none = { date: null, time: null };
  // Deliberately loose around the edges: the trailing "น." is misread too
  // often to anchor on, and the year can run straight into the time
  // ("25691258"). findMonth below is what keeps this from matching noise.
  const match = text.match(
    /(\d{1,2})\s*([ก-๎.]{2,7})\s*(\d{4}|\d{2})\s*(\d{1,2})[:.]?(\d{2})(?!\d)/
  );
  if (!match) return none;

  const day = Number(match[1]);
  const month = findMonth(match[2]);
  // Slips print Buddhist years, either "2569" or just "69".
  const buddhistYear = match[3].length === 2 ? 2500 + Number(match[3]) : Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (!month || day < 1 || day > 31 || hour > 23 || minute > 59) return none;

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${buddhistYear - 543}-${pad(month)}-${pad(day)}`,
    time: `${pad(hour)}:${pad(minute)}`,
  };
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

  for (const line of lines.slice(anchor + 1)) {
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

export function parseSlipText(text: string): SlipRead {
  // Tesseract returns sara am as two characters (nikhahit + sara aa).
  const normalized = text.replace(/ํา/g, "ำ");
  return {
    amount: findAmount(normalized),
    ...findDateTime(normalized),
    payee: findPayee(normalized),
  };
}

/** Field by field, the first read wins and the second fills the gaps. */
export function mergeSlipReads(first: SlipRead, second: SlipRead): SlipRead {
  return {
    amount: first.amount ?? second.amount,
    date: first.date ?? second.date,
    time: first.time ?? second.time,
    payee: first.payee ?? second.payee,
  };
}
