"use client";

// Plan 02-15 Task 15.3 — submissions inbox client island.
//
// DataTable<SubmissionRow> with:
//   - per-row read/unread Switch wired to markSubmissionRead.
//   - toolbar slot containing date-range inputs + "Unread only" Switch +
//     "Export CSV" button. The Export button calls exportSubmissionsCsv
//     and triggers a browser download via URL.createObjectURL (Pitfall #9
//     — the BOM lands in the file as the first 3 bytes, Excel renders
//     Cyrillic + Uzbek Latin oʻ correctly).
//   - filters live in the URL (?unread=1&from=…&to=…) so the admin-shared
//     inbox views stay shareable; updates trigger router.refresh() so the
//     RSC re-runs the query.
//
// Mirrors src/app/[locale]/admin/products/products-table.tsx but with the
// inbox-specific columns. Same useTransition + sonner toast pattern as the
// other Wave-2/3/4 list pages.

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  markSubmissionRead,
  exportSubmissionsCsv,
} from "@/actions/submissions";

export interface SubmissionRow {
  /** bigserial id stringified at the RSC boundary. */
  id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  sourcePage: string;
  /** ISO timestamp of submitted_at (RSC serialised). */
  submittedAt: string;
  /** ISO timestamp of read_at; null when unread. */
  readAt: string | null;
}

interface SubmissionsTableProps {
  locale: string;
  data: SubmissionRow[];
  rowCount: number;
  unreadOnly: boolean;
  from: string;
  to: string;
}

const MESSAGE_TRUNCATE = 80;

export function SubmissionsTable({
  data,
  rowCount,
  unreadOnly,
  from,
  to,
}: SubmissionsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const [exporting, setExporting] = React.useState(false);

  /**
   * Build a new URL preserving every existing query param then applying
   * the patch. Falsy values delete the key. We use this for the
   * date-range + unread-toggle controls so DataTable's URL state
   * (page/pageSize/q/sort) stays untouched.
   */
  const patchQuery = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      for (const [k, v] of Object.entries(patch)) {
        if (!v) next.delete(k);
        else next.set(k, v);
      }
      // Reset page when filters change — otherwise we'd land on page 5
      // of a freshly-filtered, smaller result set.
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const handleToggleRead = React.useCallback(
    (id: string, nextRead: boolean) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await markSubmissionRead({ id, isRead: nextRead });
        setPendingId(null);
        if (result.ok) {
          toast.success(nextRead ? "Marked as read" : "Marked as unread");
          router.refresh();
        } else {
          toast.error(
            result.error === "validation"
              ? "Could not update: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not update this submission.",
          );
        }
      });
    },
    [router],
  );

  const handleExport = React.useCallback(async () => {
    setExporting(true);
    try {
      // Re-emit the same filter values currently active in the URL so the
      // CSV matches what the admin sees on screen. The Server Action's
      // Zod allowlist (T-02-15-03) ignores anything not in exportSchema.
      const result = await exportSubmissionsCsv({
        from: from || undefined,
        to: to || undefined,
        ...(unreadOnly ? { isRead: false } : {}),
      });
      if (!result.ok) {
        toast.error(
          result.error === "unauthorized"
            ? "Your session expired. Please sign in again."
            : "Could not export submissions.",
        );
        return;
      }
      const { filename, csv } = result.data;
      // Blob with charset=utf-8 so the leading U+FEFF in `csv` is encoded
      // as the canonical 0xEF 0xBB 0xBF BOM bytes — Excel reads the BOM
      // and renders Cyrillic + Uzbek Latin oʻ correctly (Pitfall #9).
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filename}`);
    } finally {
      setExporting(false);
    }
  }, [from, to, unreadOnly]);

  const columns = React.useMemo<ColumnDef<SubmissionRow, unknown>[]>(
    () => [
      {
        id: "submittedAt",
        accessorKey: "submittedAt",
        header: "Received",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.submittedAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.name || "(unnamed)"}
          </span>
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.email || "—"}</span>
        ),
      },
      {
        id: "sourcePage",
        accessorKey: "sourcePage",
        header: "Source",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.sourcePage || "—"}
          </span>
        ),
      },
      {
        id: "message",
        accessorKey: "message",
        header: "Message",
        cell: ({ row }) => {
          const m = row.original.message;
          const truncated =
            m.length > MESSAGE_TRUNCATE
              ? `${m.slice(0, MESSAGE_TRUNCATE)}…`
              : m;
          return (
            <span className="text-sm" title={m}>
              {truncated}
            </span>
          );
        },
      },
      {
        id: "isRead",
        header: "Read",
        cell: ({ row }) => {
          const r = row.original;
          const isPending = pendingId === r.id;
          const isRead = r.readAt !== null;
          return (
            <Switch
              checked={isRead}
              disabled={isPending}
              onCheckedChange={(next) =>
                handleToggleRead(r.id, Boolean(next))
              }
              data-testid={`read-${r.id}`}
              aria-label={isRead ? "Mark unread" : "Mark read"}
            />
          );
        },
      },
    ],
    [pendingId, handleToggleRead],
  );

  // Toolbar: date-range + unread toggle + export. DataTable's
  // toolbarSlot prop renders this next to the search input.
  const toolbar = (
    <div className="flex flex-wrap items-end gap-2">
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
      <div className="flex items-center gap-2 pb-1">
        <Switch
          id="unread-only"
          checked={unreadOnly}
          onCheckedChange={(next) =>
            patchQuery({ unread: next ? "1" : null })
          }
          data-testid="unread-only"
        />
        <Label htmlFor="unread-only" className="text-sm">
          Unread only
        </Label>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={exporting}
        onClick={handleExport}
        data-testid="export-csv"
      >
        {exporting ? "Exporting…" : "Export CSV"}
      </Button>
    </div>
  );

  return (
    <DataTable<SubmissionRow>
      columns={columns}
      data={data}
      rowCount={rowCount}
      searchPlaceholder="Search submissions…"
      toolbarSlot={toolbar}
    />
  );
}
