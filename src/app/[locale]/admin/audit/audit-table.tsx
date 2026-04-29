"use client";

// Plan 02-16 Task 16.1 — audit log viewer client island (D-17).
//
// DataTable<AuditRow> with:
//   - server-paginated rows (parent RSC owns the page slice; manualPagination
//     defaults to true on DataTable so TanStack will not reorder rows).
//   - URL-driven filters via patchQuery: actor (ILIKE), action (eq from
//     AUDIT_ACTIONS closed enum), entity_type (eq), from/to (date range).
//     Same pattern as submissions-table.tsx (plan 02-15).
//   - Row expansion on click — local React state map of row id -> bool.
//     Expanded rows render <AuditRowDetail/> with before_json + after_json
//     side-by-side as a full-span TableRow under the data row.
//
// NO Server Actions. The audit log is append-only by convention (T-02-16-02);
// this surface is read-only. The absence of mutation primitives is the
// boundary, not a runtime check.
//
// Mirrors src/app/[locale]/admin/submissions/submissions-table.tsx but
// with the audit-specific column set + row-expansion mechanism. The
// shared DataTable primitive doesn't expose TanStack's expansion API
// (most admin lists don't need it), so expansion is implemented at the
// column level via an Expand button + a sibling rendered row inside the
// expand-cell.

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { DataTable } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AUDIT_ACTIONS } from "@/lib/audit";
import { AuditRowDetail } from "./audit-row-detail";

export interface AuditRow {
  /** bigserial id stringified at the RSC boundary. */
  id: string;
  /** ISO timestamp of `at` (RSC serialised). */
  at: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  ip: string;
  userAgent: string;
  beforeJson: unknown;
  afterJson: unknown;
}

interface AuditTableProps {
  data: AuditRow[];
  rowCount: number;
  actor: string;
  action: string;
  entityType: string;
  from: string;
  to: string;
}

// Distinct entity_type values written across all Phase-2 mutation
// handlers (grepped from src/actions/**). Drives the entity-type filter
// dropdown options; kept here rather than centralised so the audit
// viewer evolves alongside the action surface without a cross-cutting
// shared module — same posture as how AUDIT_ACTIONS lives in
// src/lib/audit.ts close to logAudit.
const ENTITY_TYPES = [
  "category",
  "manufacturer",
  "spec_field",
  "spec_field_group",
  "product",
  "contact_submission",
  "contact_submission_export",
  "admin_user",
] as const;

export function AuditTable({
  data,
  rowCount,
  actor,
  action,
  entityType,
  from,
  to,
}: AuditTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Row expansion state — keyed by stringified bigserial id. Local-only
  // (not persisted in the URL) because bookmarking the expanded state
  // for an audit row is uninteresting + the row id changes meaning when
  // the underlying filter changes (different rows on different pages).
  const [expandedRows, setExpandedRows] = React.useState<
    Record<string, boolean>
  >({});

  const toggleRow = React.useCallback((id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Local-state mirror of the actor input so typing doesn't re-run the
  // RSC on every keystroke. The patch fires on Enter / blur — same
  // posture as a debounced search but explicit for the audit viewer
  // where a partial actor like "alic" is rarely meaningful.
  const [actorInput, setActorInput] = React.useState(actor);
  React.useEffect(() => {
    setActorInput(actor);
  }, [actor]);

  /**
   * Build a new URL preserving every existing query param then applying
   * the patch. Falsy values delete the key. Mirrors submissions-table
   * patchQuery — DataTable's URL state (page/pageSize/q/sort) stays
   * untouched, our domain filters live alongside.
   */
  const patchQuery = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [k, v] of Object.entries(patch)) {
        if (!v) next.delete(k);
        else next.set(k, v);
      }
      // Reset to page 1 on filter change so admins don't land on page 5
      // of a freshly-filtered, smaller result set.
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const columns = React.useMemo<ColumnDef<AuditRow, unknown>[]>(
    () => [
      {
        id: "expand",
        header: "",
        cell: ({ row }) => {
          const r = row.original;
          const isOpen = expandedRows[r.id] ?? false;
          return (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => toggleRow(r.id)}
              data-testid={`expand-${r.id}`}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Collapse row" : "Expand row"}
              className="h-8 w-8 p-0"
            >
              {isOpen ? (
                <ChevronDownIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </Button>
          );
        },
      },
      {
        id: "at",
        accessorKey: "at",
        header: "When",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(row.original.at).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actorEmail",
        accessorKey: "actorEmail",
        header: "Actor",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.actorEmail || "—"}
          </span>
        ),
      },
      {
        id: "action",
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
            {row.original.action || "—"}
          </span>
        ),
      },
      {
        id: "entityType",
        accessorKey: "entityType",
        header: "Entity",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.entityType || "—"}</span>
        ),
      },
      {
        id: "entityId",
        accessorKey: "entityId",
        header: "Entity ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.entityId || "—"}
          </span>
        ),
      },
      {
        id: "ip",
        accessorKey: "ip",
        header: "IP",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.ip || "—"}
          </span>
        ),
      },
    ],
    [expandedRows, toggleRow],
  );

  // Toolbar: actor input + action select + entityType select + date
  // range. Plain <select> elements rather than the base-ui Select
  // primitive — keeps the toolbar simple and the URL-state wiring
  // direct. The base-ui Select shines for in-form value control with
  // typed values; here the URL is the source of truth so an onChange
  // -> patchQuery is sufficient.
  const toolbar = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="actor-input" className="text-xs text-muted-foreground">
          Actor
        </Label>
        <Input
          id="actor-input"
          type="search"
          placeholder="email@…"
          value={actorInput}
          onChange={(e) => setActorInput(e.target.value)}
          onBlur={() => patchQuery({ actor: actorInput || null })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              patchQuery({ actor: actorInput || null });
            }
          }}
          className="h-8 w-[180px]"
          data-testid="actor-filter"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="action-select"
          className="text-xs text-muted-foreground"
        >
          Action
        </Label>
        <select
          id="action-select"
          value={action}
          onChange={(e) => patchQuery({ action: e.target.value || null })}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          data-testid="action-filter"
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label
          htmlFor="entity-type-select"
          className="text-xs text-muted-foreground"
        >
          Entity
        </Label>
        <select
          id="entity-type-select"
          value={entityType}
          onChange={(e) => patchQuery({ entityType: e.target.value || null })}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          data-testid="entity-type-filter"
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="from-date" className="text-xs text-muted-foreground">
          From
        </Label>
        <Input
          id="from-date"
          type="date"
          value={from ? from.slice(0, 10) : ""}
          onChange={(e) =>
            patchQuery({
              from: e.target.value
                ? new Date(`${e.target.value}T00:00:00Z`).toISOString()
                : null,
            })
          }
          className="h-8 w-[140px]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="to-date" className="text-xs text-muted-foreground">
          To
        </Label>
        <Input
          id="to-date"
          type="date"
          value={to ? to.slice(0, 10) : ""}
          onChange={(e) =>
            patchQuery({
              to: e.target.value
                ? new Date(`${e.target.value}T23:59:59Z`).toISOString()
                : null,
            })
          }
          className="h-8 w-[140px]"
        />
      </div>
    </div>
  );

  // The shared DataTable doesn't expose TanStack's row expansion API,
  // so we render a small "in-row detail" by injecting an extra cell at
  // the bottom of each expanded row. Easiest path: wrap DataTable with
  // a sibling list that overlays detail panels keyed by id. Since the
  // DataTable already renders rows we instead render an inline detail
  // panel BELOW the table, scoped to the rows currently visible on
  // this page. Single-row-at-a-time UX would feel too modal; allowing
  // multiple expansions matches typical audit-log viewers.
  const expandedDetails = data.filter((r) => expandedRows[r.id]);

  return (
    <div className="space-y-4">
      <DataTable<AuditRow>
        columns={columns}
        data={data}
        rowCount={rowCount}
        searchPlaceholder="Search audit log…"
        defaultPageSize={50}
        toolbarSlot={toolbar}
      />
      {expandedDetails.length > 0 && (
        <div className="space-y-4" data-testid="audit-row-details">
          {expandedDetails.map((r) => (
            <div
              key={r.id}
              className="rounded-md border bg-card p-4"
              data-testid={`audit-detail-${r.id}`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {r.action}
                  </span>
                  <span className="font-mono text-xs">{r.entityType}</span>
                  <span className="font-mono text-xs">#{r.entityId}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => toggleRow(r.id)}
                  data-testid={`collapse-${r.id}`}
                >
                  Close
                </Button>
              </div>
              <AuditRowDetail before={r.beforeJson} after={r.afterJson} />
              {r.userAgent && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="font-semibold">User-Agent: </span>
                  <span className="font-mono">{r.userAgent}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
