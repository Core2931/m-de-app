import type { Expense, ExpenseSplitSummary, ParsedRemark, Split, SplitDirection } from "@/types";

// One "[amount] label" chunk. The label runs until the next "[" so a single
// person can carry several chunks joined by "+".
const BLOCK_RE = /\[\s*([\d,]+(?:\.\d+)?)\s*\]([^[]*)/g;
const HAS_BLOCK_RE = /\[\s*[\d,]+(?:\.\d+)?\s*\]/;
const PAYER_SUFFIX_RE = /จ่าย$/;

/** "ขนมจ่าย" / " ขนม จ่าย " → "ขนม" — the suffix only marks direction. */
export function normalizePerson(name: string): string {
  return name.trim().replace(PAYER_SUFFIX_RE, "").trim().replace(/\s+/g, " ");
}

interface Block {
  amount: number;
  label: string;
}

function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  for (const match of body.matchAll(BLOCK_RE)) {
    const amount = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const label = match[2].replace(/^\s*\+?\s*/, "").replace(/\+\s*$/, "").trim();
    blocks.push({ amount, label });
  }
  return blocks;
}

export function parseRemark(remark: string): ParsedRemark {
  const splits: Split[] = [];
  const leftovers: string[] = [];
  let invalid = false;

  for (const segment of (remark ?? "").split(/[\n;]+/)) {
    const text = segment.trim();
    if (!text) continue;

    const colon = text.indexOf(":");
    const rawName = colon === -1 ? "" : text.slice(0, colon).trim();
    const blocks = colon === -1 ? [] : parseBlocks(text.slice(colon + 1));
    const person = normalizePerson(rawName);

    if (!person || blocks.length === 0) {
      // A segment that looks like the pattern but did not parse is a typo,
      // not free text — flag it so the UI can warn.
      if (HAS_BLOCK_RE.test(text)) invalid = true;
      leftovers.push(text);
      continue;
    }

    const direction: SplitDirection = PAYER_SUFFIX_RE.test(rawName) ? "i_owe" : "owed_to_me";
    for (const block of blocks) {
      splits.push({ person, amount: block.amount, label: block.label, direction });
    }
  }

  return { splits, freeText: leftovers.join("; "), invalid };
}

export function summarizeExpense(expense: Expense): ExpenseSplitSummary {
  const parsed = parseRemark(expense.remark);
  let lentOut = 0;
  let borrowed = 0;
  for (const split of parsed.splits) {
    if (split.direction === "owed_to_me") lentOut += split.amount;
    else borrowed += split.amount;
  }
  return {
    ...parsed,
    lentOut,
    borrowed,
    myShare: expense.amount - lentOut,
    cashOut: expense.amount - borrowed,
    overAllocated: lentOut + borrowed > expense.amount,
  };
}
