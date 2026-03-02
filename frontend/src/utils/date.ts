/** Shared date utilities used across components. */

/**
 * Returns the current month as a YYYY-MM string (e.g. "2026-02").
 * Uses the local clock (getFullYear/getMonth) rather than toISOString(), which
 * returns UTC and would yield the wrong month for users in timezones ahead of
 * UTC late in the evening on the last day of a month.
 */
export function currentMonthKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

/** Returns the YYYY-MM key for the month adjacent to the given YYYY-MM string. */
export function getMonthKey(
  month: string,
  direction: "next" | "previous",
): string {
  const [year, monthNum] = month.split("-").map(Number);
  if (direction === "previous") {
    if (monthNum === 1) return `${year - 1}-12`;
    return `${year}-${String(monthNum - 1).padStart(2, "0")}`;
  }
  if (monthNum === 12) return `${year + 1}-01`;
  return `${year}-${String(monthNum + 1).padStart(2, "0")}`;
}

/** Formats a YYYY-MM string as a human-readable month (e.g. "February 2026"). */
export function formatMonth(month: string): string {
  const [year, monthPart] = month.split("-");
  return new Date(
    parseInt(year),
    parseInt(monthPart) - 1,
    1,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
