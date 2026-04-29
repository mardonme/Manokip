// Plan 02-15 Task 15.1 — hand-rolled CSV writer (ADMIN-12 + Pitfall #9).
//
// W8 — BOM emission style: this module emits the UTF-8 BOM via the JS
// escape `﻿` (a single U+FEFF code unit in the source string). When
// the runtime writes the result as UTF-8 (Server Action returning a
// string, browser Blob with type='text/csv;charset=utf-8'), the on-disk
// bytes are 0xEF 0xBB 0xBF — the canonical UTF-8 BOM that Microsoft
// Excel uses to detect the encoding. Without the BOM, Excel on Windows
// defaults to the OS code page (CP-1251 on Russian systems, CP-1254 on
// Turkish, etc.) and double-encodes Cyrillic + Uzbek Latin oʻ/gʻ
// (U+02BB modifier letter turned comma) into mojibake.
//
// Alternative considered: write the literal 3-byte UTF-8 BOM via a
// Buffer. Rejected because (a) the on-disk output is identical, and
// (b) the JS escape reads cleaner in plain TS source. Both styles
// satisfy the plan's W8 acceptance criterion.
//
// Quoting rule (RFC 4180 + Excel formula-injection guard):
//   - Any field containing `,`, `"`, or `\n` MUST be wrapped in `"..."`
//     with internal `"` doubled (RFC 4180 §2.6).
//   - Any field starting with `=` is ALSO wrapped in quotes — Excel
//     treats `=...` as a formula otherwise (T-02-15-01: an attacker
//     injecting `=cmd|' /C calc'!A1` into a contact form would execute
//     a shell command on the admin's machine when the CSV is opened).
//     The wrap doesn't disarm the formula, but it makes the cell render
//     as text in modern Excel + LibreOffice.
//   - Any field with leading/trailing whitespace is wrapped to prevent
//     Excel/LibreOffice from trimming visible spaces.
//
// Open Q §6 (Phase 2 posture): buffered (in-memory) CSV. The whole
// string is built and returned to the caller; the Server Action passes
// it back to the client as a Blob. Streaming via ReadableStream is
// deferred to Phase 5 once submission volume exceeds the 10k row cap.

const NEEDS_QUOTE = /[",\n=]/;

function field(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (NEEDS_QUOTE.test(s) || s.startsWith(" ") || s.endsWith(" ")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serialise an array of rows into an RFC-4180-compliant CSV string with
 * a UTF-8 BOM prefix.
 *
 * @param rows  Plain JS objects whose values can be String()'d.
 * @param cols  Column keys to emit, in order. Keys MUST exist on every
 *              row's type (TypeScript enforces this via the generic
 *              `keyof T & string` constraint); missing values are
 *              serialised as empty strings.
 * @returns     `﻿` + header + CRLF + body. When the caller writes
 *              the result as UTF-8, the leading code unit becomes the
 *              0xEF 0xBB 0xBF byte sequence Excel uses for encoding
 *              detection.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  cols: (keyof T & string)[],
): string {
  const head = cols.map(field).join(",");
  const body = rows
    .map((r) => cols.map((c) => field(r[c])).join(","))
    .join("\r\n");
  return "﻿" + head + "\r\n" + body;
}
