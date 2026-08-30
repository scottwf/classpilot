/** Escapes one CSV field per RFC 4180 -- quote and double-up embedded quotes
 * whenever the value contains a comma, quote, or newline. */
export function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/** Renders a header row + data rows as CSV text (CRLF line endings, per
 * RFC 4180) -- shared by every export route so they escape consistently. */
export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
}
