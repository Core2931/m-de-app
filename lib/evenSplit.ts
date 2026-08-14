import { appendPersonBlock } from "@/lib/remarkEdit";

/**
 * Stands in for a name the app cannot know. Safe as a sentinel because
 * normalizePerson("?") returns "?" — non-empty, no จ่าย suffix — so it parses
 * as a person and stays visible until replaced.
 *
 * A friendlier placeholder like "ชื่อ" or "เพื่อน1" would be strictly worse:
 * it looks legitimate, and if it ever reached the sheet it would become a
 * permanent phantom person in the /people balances.
 */
export const PLACEHOLDER_PERSON = "?";

export interface EvenSplit {
  /** Each other person's share, in satang. */
  shareSatang: number;
  /** The same share in baht, safe to render. */
  share: number;
  /** How many blocks to emit — one per person who is not us. */
  others: number;
  /** What we are left carrying, including any remainder. */
  myShare: number;
}

export const MIN_WAYS = 2;
export const MAX_WAYS = 10;

/**
 * Splits a bill N ways INCLUDING us, so N - 1 blocks get written — the remark
 * records what other people owe, and myShare is the residual.
 *
 * All arithmetic runs in integer satang. Dividing in the float domain produces
 * errors of a satang or two which then get written into the sheet as text and
 * can never be reconciled: 0.1 * 100 is 10.000000000000002, and
 * Math.floor(1.005 * 100) is 100.
 *
 * Shares are floored and the remainder falls to us. That is not a courtesy —
 * it guarantees lentOut can never exceed the bill, so summarizeExpense's
 * overAllocated can never false-fire and myShare can never go negative.
 * Rounding up, or distributing the remainder to the largest shares, breaks
 * both.
 *
 * Returns null when the split is not expressible, including when each share
 * would round to zero. Emitting "[0]" blocks would be worse than useless:
 * parseBlocks drops non-positive amounts while HAS_BLOCK_RE still matches, so
 * parseRemark would set invalid and the user would be told "อ่าน format ไม่ออก"
 * about text the app wrote itself.
 */
export function splitEvenly(amount: number, ways: number): EvenSplit | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!Number.isInteger(ways) || ways < MIN_WAYS || ways > MAX_WAYS) return null;

  const totalSatang = Math.round(amount * 100);
  const shareSatang = Math.floor(totalSatang / ways);
  if (shareSatang <= 0) return null;

  const others = ways - 1;
  const mySatang = totalSatang - shareSatang * others;

  return {
    shareSatang,
    share: shareSatang / 100,
    others,
    myShare: mySatang / 100,
  };
}

/**
 * Appends one placeholder block per other person, already carrying the share.
 * Existing text is never rewritten — names and amounts already in the remark
 * are data. If that pushes the total over the bill, SplitPreview's existing
 * over-allocation warning fires, which is the correct feedback.
 */
export function buildEvenSplitRemark(remark: string, split: EvenSplit): string {
  let text = remark;
  for (let i = 0; i < split.others; i++) {
    const appended = appendPersonBlock(text, PLACEHOLDER_PERSON);
    // appendPersonBlock leaves its caret inside "[]" — drop the share there.
    text =
      appended.text.slice(0, appended.caret) +
      String(split.share) +
      appended.text.slice(appended.caret);
  }
  return text;
}

// A "?" inside a label is ordinary text ("ขนม: [50] ค่าอะไร?") and must not
// count. Only a "?" in the NAME position — start of a segment, before the
// colon — is an unfilled placeholder.
const PLACEHOLDER_SEGMENT = /(^|[\n;])(\s*)(\?)(\s*):/;

/** True while a generated split still has a name the user has not filled in. */
export function hasPlaceholderPerson(remark: string): boolean {
  return PLACEHOLDER_SEGMENT.test(remark ?? "");
}

/**
 * Where the first unfilled "?" sits, so the caller can select it and let the
 * user type straight over it. Null when there is none.
 */
export function firstPlaceholderRange(
  remark: string
): { start: number; end: number } | null {
  const match = PLACEHOLDER_SEGMENT.exec(remark ?? "");
  if (!match || match.index === undefined) return null;
  // index + leading separator + whitespace lands exactly on the "?".
  const start = match.index + match[1].length + match[2].length;
  return { start, end: start + 1 };
}
