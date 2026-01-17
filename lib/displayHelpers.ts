export function capitalizeFirstLetter(string: string) {
  if (!string) return ""; // Handles empty or invalid input
  return string.charAt(0).toUpperCase() + string.slice(1);
}
