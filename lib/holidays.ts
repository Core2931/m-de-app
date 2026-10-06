// Bank holidays as announced each year by the Bank of Thailand ("วันหยุดตาม
// ประเพณีของสถาบันการเงิน"), including the extra days added by later notices.
// Salary is paid on a banking day, so these are what move a payday.
//
// Kept in code rather than in the sheet: the pay cycle has to be known the
// moment a page opens, without waiting on another load. The price is that a
// new year — or a special holiday announced mid-year — needs an edit here.
// Only a holiday falling on the 27th–29th can actually move a payday.
//
// Keyed by Gregorian year. Dates are ISO YYYY-MM-DD.
export const BANK_HOLIDAYS: Record<number, readonly string[]> = {
  // พ.ศ. 2569 — 20 days
  2026: [
    "2026-01-01", // วันขึ้นปีใหม่
    "2026-01-02", // วันหยุดทำการเพิ่มเป็นกรณีพิเศษ
    "2026-03-03", // วันมาฆบูชา
    "2026-04-06", // วันจักรี
    "2026-04-13", // วันสงกรานต์
    "2026-04-14", // วันสงกรานต์
    "2026-04-15", // วันสงกรานต์
    "2026-05-01", // วันแรงงานแห่งชาติ
    "2026-05-04", // วันฉัตรมงคล
    "2026-06-01", // ชดเชยวันวิสาขบูชา
    "2026-06-03", // วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี
    "2026-07-28", // วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว
    "2026-07-29", // วันอาสาฬหบูชา
    "2026-08-12", // วันแม่แห่งชาติ
    "2026-10-13", // วันนวมินทรมหาราช
    "2026-10-16", // วันหยุดทำการเพิ่มเป็นกรณีพิเศษ
    "2026-10-23", // วันปิยมหาราช
    "2026-12-07", // ชดเชยวันพ่อแห่งชาติ
    "2026-12-10", // วันรัฐธรรมนูญ
    "2026-12-31", // วันสิ้นปี
  ],
  // พ.ศ. 2570 — 18 days
  2027: [
    "2027-01-01", // วันขึ้นปีใหม่
    "2027-02-22", // ชดเชยวันมาฆบูชา
    "2027-04-06", // วันจักรี
    "2027-04-13", // วันสงกรานต์
    "2027-04-14", // วันสงกรานต์
    "2027-04-15", // วันสงกรานต์
    "2027-05-03", // ชดเชยวันแรงงานแห่งชาติ
    "2027-05-04", // วันฉัตรมงคล
    "2027-05-20", // วันวิสาขบูชา
    "2027-06-03", // วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี
    "2027-07-19", // ชดเชยวันอาสาฬหบูชา
    "2027-07-28", // วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว
    "2027-08-12", // วันแม่แห่งชาติ
    "2027-10-13", // วันนวมินทรมหาราช
    "2027-10-25", // ชดเชยวันปิยมหาราช
    "2027-12-06", // ชดเชยวันพ่อแห่งชาติ
    "2027-12-10", // วันรัฐธรรมนูญ
    "2027-12-31", // วันสิ้นปี
  ],
};

const ALL_HOLIDAYS = new Set(Object.values(BANK_HOLIDAYS).flat());

export function isBankHoliday(iso: string): boolean {
  return ALL_HOLIDAYS.has(iso);
}

/** False for a year whose list has not been added yet — paydays for it are
 *  then computed from weekends alone and may be a day or two off. */
export function hasHolidayData(year: number): boolean {
  return Object.hasOwn(BANK_HOLIDAYS, year);
}
