// The number shown part-way through a count-up from `from` to `to`.
//
// `progress` is elapsed time as a fraction, 0 to 1. The curve is ease-out
// cubic: quick off the mark, settling gently, so the last digits are readable
// as they land. Values on the way are whole baht — satang flickering past
// would only be noise — and the final value is `to` exactly, satang included.
export function countUpValue(from: number, to: number, progress: number): number {
  // Anything that is not a usable fraction ends the animation rather than
  // leaving a half-counted figure on screen.
  if (!(progress < 1)) return to;
  if (progress <= 0) return from;
  const eased = 1 - (1 - progress) ** 3;
  return Math.round(from + (to - from) * eased);
}
