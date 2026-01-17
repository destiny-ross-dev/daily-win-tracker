import { format, parse } from "date-fns";

export function isoDateLocal(d = new Date()) {
  // YYYY-MM-DD in local time (good for date columns)
  return format(d, "yyyy-MM-dd");
}

export function parseIsoDateLocal(dateString: string) {
  // Parse a YYYY-MM-DD date string in local time.
  return parse(dateString, "yyyy-MM-dd", new Date());
}

export function displayDateWeekdayMonthDayYear(date = new Date()) {
  return format(date, "E, MMM dd yyyy");
}
