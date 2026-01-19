import { format } from "date-fns";
import { parseIsoDateLocal } from "@/lib/dates";

export function capitalizeFirstLetter(string: string) {
  if (!string) return ""; // Handles empty or invalid input
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function displayDateWeekdayMonthDayYearLong(dateString: string) {
  return format(parseIsoDateLocal(dateString), "EEEE, MMMM do, yyyy");
}
