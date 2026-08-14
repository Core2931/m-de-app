// All string surgery on the remark field lives here rather than inside a
// component, because lib/ is the only directory the test harness runs — a
// caret calculation buried in JSX is a caret calculation nobody can verify.
//
// parseRemark splits segments on /[\n;]+/, so this module has to agree with
// that exact set or a chip-inserted block would land inside the previous
// person's segment and silently be read as part of their label.
const SEGMENT_SEPARATORS = /[\n;]/;

export interface RemarkEdit {
  text: string;
  /** Where to put the cursor afterwards — inside the new brackets. */
  caret: number;
}

/** The bounds of the segment the caret sits in. */
export function segmentBoundsAtCaret(
  remark: string,
  caret: number
): { start: number; end: number } {
  const position = Math.max(0, Math.min(caret, remark.length));

  let start = position;
  while (start > 0 && !SEGMENT_SEPARATORS.test(remark[start - 1])) start--;

  let end = position;
  while (end < remark.length && !SEGMENT_SEPARATORS.test(remark[end])) end++;

  return { start, end };
}

/**
 * The partial person name being typed at the caret, or null when the caret is
 * not in a name position (past the colon, or inside a bracket).
 */
export function nameFragmentAtCaret(remark: string, caret: number): string | null {
  const { start, end } = segmentBoundsAtCaret(remark, caret);
  const segment = remark.slice(start, end);
  const offset = Math.max(0, Math.min(caret, remark.length)) - start;

  const colon = segment.indexOf(":");
  // Past the colon the caret is in amounts and labels, not a name.
  if (colon !== -1 && offset > colon) return null;

  const fragment = segment.slice(0, colon === -1 ? offset : colon).trim();
  return fragment.length > 0 ? fragment : null;
}

/**
 * Appends "ชื่อ: [] " and returns the caret position between the brackets.
 * Never rewrites what is already there — existing names and amounts are data.
 */
export function appendPersonBlock(remark: string, person: string): RemarkEdit {
  const base = remark.replace(/\s+$/, "");

  let prefix: string;
  if (base.length === 0) prefix = "";
  // Already ends in ";" or a newline — adding another would produce an empty
  // segment, which parseRemark drops but which looks broken while typing.
  else if (SEGMENT_SEPARATORS.test(base[base.length - 1])) prefix = `${base} `;
  else prefix = `${base}; `;

  const text = `${prefix}${person}: [] `;
  // text ends with "[] ": index length-3 is "[", length-2 is "]", so
  // length-2 puts the cursor between them.
  return { text, caret: text.length - 2 };
}

/** Replaces the partial name at the caret with a known one, keeping the rest. */
export function replaceNameAtCaret(
  remark: string,
  caret: number,
  person: string
): RemarkEdit {
  const { start, end } = segmentBoundsAtCaret(remark, caret);
  const segment = remark.slice(start, end);
  const colon = segment.indexOf(":");

  // No colon yet means the whole segment is the name being typed.
  const rest = colon === -1 ? "" : segment.slice(colon);
  const leadingWhitespace = segment.match(/^\s*/)?.[0] ?? "";
  const replacement = `${leadingWhitespace}${person}${rest}`;

  return {
    text: remark.slice(0, start) + replacement + remark.slice(end),
    caret: start + leadingWhitespace.length + person.length,
  };
}
