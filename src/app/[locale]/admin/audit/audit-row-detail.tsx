// Plan 02-16 Task 16.1 — audit row detail (read-only).
//
// Renders before_json + after_json side-by-side for an expanded audit
// row. Phase-2 ships a plain <pre> block per side (JSON.stringify with
// 2-space indent); a syntax-highlighted JSON viewer (e.g. react-json-view)
// is deferred to Phase 5 launch polish — adding a transitive dep for
// admin-only diff inspection isn't worth the bundle weight in v1.
//
// Pure presentational component (no Server Actions, no "use client" —
// renders identically on the server). The audit_log is append-only so
// "view" is the only operation this surface needs to support.

interface AuditRowDetailProps {
  before: unknown;
  after: unknown;
}

export function AuditRowDetail({ before, after }: AuditRowDetailProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <JsonPanel title="Before" payload={before} testId="audit-before-json" />
      <JsonPanel title="After" payload={after} testId="audit-after-json" />
    </div>
  );
}

interface JsonPanelProps {
  title: string;
  payload: unknown;
  testId: string;
}

function JsonPanel({ title, payload, testId }: JsonPanelProps) {
  // null on `create` (no `before`) and on hard delete (no `after`) per
  // src/lib/audit.ts:49-54 contract. Render a friendly placeholder
  // rather than the literal "null" so admins can tell at-a-glance
  // whether they're looking at a create / delete / update row.
  const isEmpty = payload === null || payload === undefined;
  return (
    <div className="rounded-md border bg-muted/30">
      <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <pre
        data-testid={testId}
        className="overflow-x-auto p-3 text-xs leading-relaxed"
      >
        {isEmpty ? "(none)" : safeStringify(payload)}
      </pre>
    </div>
  );
}

/**
 * Drizzle's jsonb mapper hands us already-parsed JS values, but a future
 * audit row could hypothetically contain a BigInt projected by a
 * mis-serialised mutation handler (the bigint→string projection pattern
 * in src/actions/submissions.ts:serialiseSubmission is the v1 mitigation).
 * Wrap JSON.stringify so a stray BigInt at read time degrades to a
 * readable error string rather than 500-ing the page.
 */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return `(unserialisable: ${err instanceof Error ? err.message : String(err)})`;
  }
}
