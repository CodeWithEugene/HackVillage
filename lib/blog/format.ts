const dateFormat = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

/** "25 September 2026" */
export function formatPostDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T12:00:00+03:00`));
}
