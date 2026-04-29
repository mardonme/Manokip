// Plan 02-15 Task 15.1 — CSV writer unit tests (TDD RED).
//
// Locks the contract for `toCsv(rows, cols)`:
//   - Prepends UTF-8 BOM (U+FEFF) so Excel renders Cyrillic + Uzbek Latin
//     oʻ/gʻ correctly when the file lands on a Windows machine. Pitfall #9.
//   - RFC 4180 quoting: any field containing `,`, `"`, `\n`, or starting
//     with `=` (Excel formula injection — T-02-15-01 mitigation) gets
//     wrapped in double-quotes with internal `"` doubled.
//   - CRLF line endings between rows.
//
// Closest analog: tests/unit/slug.test.ts (pure-string utility shape) —
// purely synchronous, no DB, no mocks.

import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("prepends UTF-8 BOM (U+FEFF)", () => {
    const out = toCsv([{ a: 1 }], ["a"]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it("RFC 4180 quotes commas, quotes, newlines, and =leading", () => {
    const rows = [
      {
        a: "hello, world",
        b: 'she said "hi"',
        c: "line\nbreak",
        d: "=SUM(A1:A2)",
      },
    ];
    const out = toCsv(rows, ["a", "b", "c", "d"]);
    expect(out).toContain('"hello, world"');
    expect(out).toContain('"she said ""hi"""');
    expect(out).toContain('"line\nbreak"');
    expect(out).toContain('"=SUM(A1:A2)"');
  });

  it("preserves Uzbek Latin oʻ/gʻ and Cyrillic", () => {
    const rows = [
      { name: "Manometr — oʻta yaxshi" },
      { name: "Манометр" },
      { name: "Bogʻlam" },
    ];
    const out = toCsv(rows, ["name"]);
    expect(out).toContain("Manometr — oʻta yaxshi");
    expect(out).toContain("Манометр");
    expect(out).toContain("Bogʻlam");
  });

  it("uses CRLF line endings between rows", () => {
    const out = toCsv([{ a: 1 }, { a: 2 }], ["a"]);
    expect(out).toContain("\r\n");
    // BOM + header + 2 data rows joined by CRLF -> 3 segments.
    expect(out.split("\r\n")).toHaveLength(3);
  });
});
