export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Levenshtein distance, capped — callers only ever care about "within N edits". */
export function editDistance(a: string, b: string, cap: number): number {
  // Thai is entirely in the BMP, so UTF-16 units are code points here.
  // Combining vowels and tone marks count separately, which slightly inflates
  // distances between marked syllables.
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      row.push(value);
      if (value < best) best = value;
    }
    if (best > cap) return cap + 1; // cannot come back down
    prev = row;
  }
  return prev[b.length];
}
