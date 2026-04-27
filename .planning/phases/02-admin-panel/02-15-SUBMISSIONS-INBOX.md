---

phase: 02-admin-panel

plan: 15

type: execute

wave: 4

depends_on: [04, 05, 06]

files_modified:

  - src/actions/submissions.ts

  - src/lib/csv.ts

  - src/lib/zod/submission.ts

  - src/app/[locale]/admin/submissions/page.tsx

  - src/app/[locale]/admin/submissions/submissions-table.tsx

  - tests/lib/csv.test.ts

  - tests/actions/submissions.test.ts

autonomous: true

requirements: [ADMIN-12, ADMIN-11]

must_haves:

  truths:

    - "Submissions inbox lists contact_submission rows in a DataTable with filters: date range, read state, search"

    - "Admin can mark a submission as read/unread (writes audit row with action='update')"

    - "Admin can export the filtered set as CSV via Server Action returning a Blob with Content-Disposition: attachment"

    - "CSV writer hand-rolled (RESEARCH §Don't Hand-Roll says hand-roll is preferred for single use site) with UTF-8 BOM + RFC 4180 quoting"

    - "Pitfall #9 mitigated: oʻ/gʻ/Cyrillic characters render correctly in Excel via the BOM"

    - "Open Q §6 — buffered (in-memory) CSV for Phase 2; streaming deferred to Phase 5"

  artifacts:

    - path: "src/lib/csv.ts"

      provides: "toCsv<T>(rows, cols) helper with UTF-8 BOM"

      contains: "'\\uFEFF'"

    - path: "src/actions/submissions.ts"

      provides: "markRead + exportSubmissionsCsv Server Actions"

      contains: "Content-Disposition"

    - path: "src/app/[locale]/admin/submissions/page.tsx"

      provides: "RSC list with DataTable + filters + export button"

      contains: "DataTable"

  key_links:

    - from: "src/actions/submissions.ts (exportSubmissionsCsv)"

      to: "src/lib/csv.ts (toCsv)"

      via: "function call"

      pattern: "toCsv\\("

---



<objective>

Land the contact-submissions inbox: DataTable list, mark-read mutation, and CSV export with UTF-8 BOM. Closes ADMIN-12 + adds another audit_log surface for ADMIN-11.



Purpose: ADMIN-12. Phase 5 launch polish revisits CSV streaming + retention.

Output: 1 CSV helper + 1 Server Action module + 1 Zod schema + 2 admin pages + 2 test files.

</objective>



<execution_context>

@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/workflows/execute-plan.md

@C:/Users/hp elitebook/OneDrive/Desktop/Manometr/.claude/get-shit-done/templates/summary.md

</execution_context>



<context>

@.planning/phases/02-admin-panel/02-CONTEXT.md

@.planning/phases/02-admin-panel/02-RESEARCH.md

@.planning/phases/02-admin-panel/02-PATTERNS.md

@CLAUDE.md

@src/db/schema/contact.ts

@src/lib/audit.ts

@src/lib/server-action.ts

@src/components/admin/data-table.tsx

@src/lib/slug.ts



<assumptions>

- **Open Q §6 (CSV export):** Buffered (in-memory) for Phase 2. The hand-rolled writer assembles the entire string; the Server Action returns a Blob URL or signed download. Streaming deferred to Phase 5.

- **contact_submission schema (Phase 1):** check `src/db/schema/contact.ts` for column names — likely `id, name, email, company?, message, sourcePage?, ip?, isRead, createdAt`.

</assumptions>

</context>



<tasks>



<task type="auto" tdd="true">

  <name>Task 15.1: CSV writer + unit tests</name>

  <files>src/lib/csv.ts, tests/lib/csv.test.ts</files>

  <read_first>

    - src/lib/slug.ts (closest analog — pure-string utility shape)

    - .planning/phases/02-admin-panel/02-PATTERNS.md §`src/lib/csv.ts (NEW — ADMIN-12)` — verbatim

    - .planning/phases/02-admin-panel/02-RESEARCH.md §Code Examples §"CSV writer (hand-rolled)"

    - .planning/phases/02-admin-panel/02-RESEARCH.md §Pitfall 9 (UTF-8 BOM for Excel)

  </read_first>

  <behavior>

    - `toCsv(rows, cols)` returns: BOM + header row (col names) + CRLF + data rows joined by CRLF.

    - Quote rule: any field containing `,`, `"`, `\n`, or starting with `=` (Excel formula injection) gets wrapped in `"..."` with internal `"` doubled.

    - Test: rows containing oʻ/gʻ/Cyrillic + commas + quotes serialize correctly.

  </behavior>

  <action>

    Create `src/lib/csv.ts`. **W8 — choose ONE BOM emission style and document it at the top of the file:** Option A (preferred — readable): use the literal 6-character ASCII source `\` + `u` + `F` + `E` + `F` + `F` (i.e. write the JavaScript escape `\uFEFF` in the source so the bundler emits the single U+FEFF character at runtime). Option B: literal UTF-8 BOM bytes (3 bytes: 0xEF 0xBB 0xBF written via a buffer). Both produce identical on-disk output; pick Option A for readability. Add a top-of-file comment recording the choice: `// CSV BOM emitted via the JS escape \uFEFF (W8: produces 0xEF 0xBB 0xBF on UTF-8 output).`


    ```typescript

    const NEEDS_QUOTE = /[",\n=]/;



    function field(v: unknown): string {

      const s = v == null ? "" : String(v);

      if (NEEDS_QUOTE.test(s) || s.startsWith(" ") || s.endsWith(" ")) {

        return `"${s.replace(/"/g, '""')}"`;

      }

      return s;

    }



    export function toCsv<T extends Record<string, unknown>>(

      rows: T[],

      cols: (keyof T & string)[],

    ): string {

      const head = cols.map(field).join(",");

      const body = rows.map((r) => cols.map((c) => field(r[c])).join(",")).join("\r\n");

      return "\uFEFF" + head + "\r\n" + body;

    }

    ```



    Create `tests/lib/csv.test.ts`:

    ```typescript

    import { describe, it, expect } from "vitest";

    import { toCsv } from "@/lib/csv";



    describe("toCsv", () => {

      it("prepends UTF-8 BOM", () => {

        const out = toCsv([{ a: 1 }], ["a"]);

        expect(out.charCodeAt(0)).toBe(0xfeff);

      });



      it("RFC 4180 quotes commas, quotes, newlines, and =leading", () => {

        const rows = [

          { a: "hello, world", b: 'she said "hi"', c: "line\nbreak", d: "=SUM(A1:A2)" },

        ];

        const out = toCsv(rows, ["a", "b", "c", "d"]);

        expect(out).toContain('"hello, world"');

        expect(out).toContain('"she said ""hi"""');

        expect(out).toContain('"line\nbreak"');

        expect(out).toContain('"=SUM(A1:A2)"');

      });



      it("preserves Uzbek Latin oʻ/gʻ and Cyrillic", () => {

        const rows = [{ name: "Manometr — oʻta yaxshi" }, { name: "Манометр" }];

        const out = toCsv(rows, ["name"]);

        expect(out).toContain("Manometr — oʻta yaxshi");

        expect(out).toContain("Манометр");

      });



      it("uses CRLF line endings", () => {

        const out = toCsv([{ a: 1 }, { a: 2 }], ["a"]);

        expect(out).toContain("\r\n");

        expect(out.split("\r\n")).toHaveLength(3); // header + 2 rows + (empty after final? no — joined)

      });

    });

    ```

  </action>

  <verify>

    <automated>pnpm vitest run tests/lib/csv.test.ts --reporter=basic</automated>

  </verify>

  <acceptance_criteria>

    - `grep -cP "\xef\xbb\xbf|\\uFEFF" src/lib/csv.ts` returns `>=1` (W8: matches either the literal UTF-8 BOM bytes 0xEF 0xBB 0xBF or the JS escape `\uFEFF` written in source)
    - `pnpm vitest run tests/lib/csv.test.ts` exits 0; 4/4 tests pass

  </acceptance_criteria>

  <done>CSV writer ships; UTF-8 BOM + RFC 4180 quoting tested.</done>

</task>



<task type="auto" tdd="true">

  <name>Task 15.2: Submissions Server Actions + integration test</name>

  <files>src/actions/submissions.ts, src/lib/zod/submission.ts, tests/actions/submissions.test.ts</files>

  <read_first>

    - src/db/schema/contact.ts (column shape — confirm `isRead` boolean column or whatever Phase 1 named it)

    - src/actions/categories.ts (action shape pattern)

    - src/lib/csv.ts (Task 15.1)

  </read_first>

  <behavior>

    - markSubmissionRead({ id, isRead }): tx { UPDATE contact_submission SET is_read=$ + audit action='update' }; revalidate not needed (admin-only surface).

    - exportSubmissionsCsv({ filter? }): read-only Server Action — fetches rows, calls toCsv, returns `{ filename, csv }` (string). The client then downloads as a Blob.

  </behavior>

  <action>

    Create `src/lib/zod/submission.ts`:

    ```typescript

    import { z } from "zod";

    export const markReadSchema = z.object({

      id: z.string().uuid(),

      isRead: z.boolean(),

    });

    export const exportSchema = z.object({

      from: z.string().datetime().optional(),

      to: z.string().datetime().optional(),

      isRead: z.boolean().optional(),

    });

    ```



    Create `src/actions/submissions.ts`:

    ```typescript

    "use server";

    import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

    import { dbTx } from "@/db/client-ws";

    import { db } from "@/db/client";

    import { contactSubmissions } from "@/db/schema";  // confirm export name in schema/index

    import { withAdminAction } from "@/lib/server-action";

    import { logAudit } from "@/lib/audit";

    import { markReadSchema, exportSchema } from "@/lib/zod/submission";

    import { toCsv } from "@/lib/csv";



    export const markSubmissionRead = withAdminAction(markReadSchema, async ({ id, isRead }, ctx) => {

      const before = (await dbTx.select().from(contactSubmissions).where(eq(contactSubmissions.id, id)).limit(1))[0] ?? null;

      if (!before) throw new Error("NOT_FOUND");



      const result = await dbTx.transaction(async (tx) => {

        const [row] = await tx.update(contactSubmissions).set({ isRead })

          .where(eq(contactSubmissions.id, id)).returning();

        await logAudit(tx, {

          actorEmail: ctx.actorEmail, action: "update",

          entityType: "contact_submission", entityId: id,

          before, after: row,

          ip: ctx.ip, userAgent: ctx.userAgent,

        });

        return row;

      });

      return result;

    });



    export const exportSubmissionsCsv = withAdminAction(exportSchema, async (filter, ctx) => {

      const conditions = [];

      if (filter.from) conditions.push(gte(contactSubmissions.createdAt, new Date(filter.from)));

      if (filter.to) conditions.push(lte(contactSubmissions.createdAt, new Date(filter.to)));

      if (filter.isRead !== undefined) conditions.push(eq(contactSubmissions.isRead, filter.isRead));



      const rows = await db.select().from(contactSubmissions)

        .where(conditions.length ? and(...conditions) : undefined)

        .orderBy(desc(contactSubmissions.createdAt))

        .limit(10000); // hard cap; Phase 5 adds streaming



      const csv = toCsv(

        rows.map((r) => ({

          createdAt: r.createdAt.toISOString(),

          name: r.name,

          email: r.email,

          company: r.company ?? "",

          message: r.message,

          sourcePage: r.sourcePage ?? "",

          isRead: r.isRead ? "yes" : "no",

        })),

        ["createdAt", "name", "email", "company", "message", "sourcePage", "isRead"],

      );



      // Audit the export (no row mutation, so log a single audit row)

      await dbTx.transaction(async (tx) => {

        await logAudit(tx, {

          actorEmail: ctx.actorEmail, action: "update",

          entityType: "contact_submission_export",

          entityId: "batch",

          before: null,

          after: { count: rows.length, filter },

          ip: ctx.ip, userAgent: ctx.userAgent,

        });

      });



      const filename = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;

      return { filename, csv };

    });

    ```



    Create `tests/actions/submissions.test.ts` with 3 tests:

    1. markSubmissionRead toggles isRead + audit row.

    2. exportSubmissionsCsv returns CSV with the right column header + row count for the seeded fixtures.

    3. exportSubmissionsCsv with `from`/`to` filters returns subset.



    Confirm `contactSubmissions` is the exported name in `src/db/schema/index.ts`; if it's `submissions` or different, adjust imports.

  </action>

  <verify>

    <automated>pnpm vitest run tests/actions/submissions.test.ts --reporter=basic</automated>

  </verify>

  <acceptance_criteria>

    - `grep -c 'export const markSubmissionRead' src/actions/submissions.ts` returns `1`

    - `grep -c 'export const exportSubmissionsCsv' src/actions/submissions.ts` returns `1`

    - `grep -c 'toCsv(' src/actions/submissions.ts` returns `1`

    - `pnpm vitest run tests/actions/submissions.test.ts` exits 0; 3/3 tests pass

  </acceptance_criteria>

  <done>Submissions Server Actions ship with audit + CSV export.</done>

</task>



<task type="auto">

  <name>Task 15.3: Submissions inbox admin page</name>

  <files>src/app/[locale]/admin/submissions/page.tsx, src/app/[locale]/admin/submissions/submissions-table.tsx</files>

  <read_first>

    - src/app/[locale]/admin/products/products-table.tsx (closest analog — DataTable with action buttons)

    - src/components/admin/data-table.tsx (toolbarSlot prop for filter chips)

  </read_first>

  <action>

    Create `src/app/[locale]/admin/submissions/page.tsx` (RSC):

    - `await requireAdmin()` + setRequestLocale.

    - Server-paginated query of contact_submissions ordered by createdAt desc with optional `q` filter on name/email/message.

    - Passes data + rowCount to `<SubmissionsTable>`.



    Create `src/app/[locale]/admin/submissions/submissions-table.tsx` (client):

    - DataTable columns: createdAt, name, email, sourcePage, message (truncated), isRead (Switch), actions.

    - The `isRead` Switch calls markSubmissionRead via useTransition; toast on success.

    - Toolbar slot: date-range pickers + "Unread only" toggle + "Export CSV" button.

    - Export button calls `exportSubmissionsCsv` and uses `URL.createObjectURL(new Blob([csv]))` to trigger download via a hidden `<a>`.

  </action>

  <verify>

    <automated>pnpm tsc --noEmit &amp;&amp; pnpm build</automated>

  </verify>

  <acceptance_criteria>

    - 2 files exist

    - `grep -c 'await requireAdmin()' src/app/[locale]/admin/submissions/page.tsx` returns `1`

    - `grep -c 'DataTable' src/app/[locale]/admin/submissions/submissions-table.tsx` returns `>=1`

    - `grep -c 'createObjectURL' src/app/[locale]/admin/submissions/submissions-table.tsx` returns `>=1`

    - `pnpm build` exits 0

  </acceptance_criteria>

  <done>Submissions inbox page renders with DataTable + filters + CSV download.</done>

</task>



</tasks>



<threat_model>

## Trust Boundaries

| Boundary | Description |

|----------|-------------|

| client form → markSubmissionRead | id + isRead |

| CSV file → admin's machine → Excel | UTF-8 BOM negotiation |



## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation |

|-----------|----------|-----------|-------------|-----------|

| T-02-15-01 | Tampering | Excel formula injection in CSV | mitigate | toCsv quotes any field starting with `=` |

| T-02-15-02 | Information Disclosure | submissions contain PII | mitigate | Admin-only behind requireAdmin; export downloads to admin's machine; logged in audit_log |

| T-02-15-03 | EoP | mass assignment via filter | mitigate | Zod exportSchema enumerates from/to/isRead |

| T-02-15-04 | DoS | export of huge result set | mitigate | LIMIT 10000 hard cap; Phase 5 adds streaming |

| T-02-15-05 | Repudiation | admin denies export | mitigate | Audit row with entityType='contact_submission_export', after.count + after.filter |

</threat_model>



<verification>

- `pnpm tsc --noEmit` exits 0

- `pnpm vitest run tests/lib/csv.test.ts tests/actions/submissions.test.ts` exits 0

- `pnpm build` exits 0

</verification>



<success_criteria>

1. CSV writer with BOM + RFC 4180 quoting + 4 unit tests.

2. markSubmissionRead + exportSubmissionsCsv Server Actions with audit rows.

3. Submissions inbox page renders DataTable + CSV download.

</success_criteria>



<output>

Create `.planning/phases/02-admin-panel/02-15-SUMMARY.md` documenting CSV API, the buffered-export decision (Open Q §6), and Phase 5 follow-ups.

</output>

