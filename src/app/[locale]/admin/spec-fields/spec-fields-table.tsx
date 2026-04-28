"use client";

// Plan 02-11 Task 11.4 — spec-fields list client island (ADMIN-05).
//
// Reuses the generic DataTable from plan 02-06 with `manualPagination={false}`
// (Open Q §3 — ~80 rows project-wide, client-side pagination keeps the editor
// snappy without the server-pagination wiring overhead).
//
// Action column wires three confirm dialogs:
//   - Edit (link to /[locale]/admin/spec-fields/[id]/edit)
//   - Rename (D-06): ConfirmDialog with type-the-new-key input + impact
//     copy. Confirm calls renameSpecField with { id, oldKey, newKey }.
//   - Soft-delete (D-07): ConfirmDialog (no typed-confirm) with destructive
//     variant. Confirm calls softDeleteSpecField.
//   - Hard-delete (D-07): ConfirmDialog with type-the-key input + destructive
//     variant. Confirm calls deleteSpecField.
//
// The entire row is dimmed when deletedAt != null so admins see at-a-glance
// which fields are soft-deleted; clicking "Restore" (a future plan) would
// clear deleted_at.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  renameSpecField,
  softDeleteSpecField,
  deleteSpecField,
} from "@/actions/spec-fields";

export interface SpecFieldRow {
  id: string;
  key: string;
  label: string;
  dataType: string;
  unit: string | null;
  required: boolean;
  filterKind: string | null;
  filterGroupKey: string | null;
  categoryId: string;
  categoryName: string;
  groupId: string | null;
  groupLabel: string | null;
  /** ISO timestamp; null when not soft-deleted. */
  deletedAt: string | null;
}

interface Props {
  locale: string;
  data: SpecFieldRow[];
}

export function SpecFieldsTable({ locale, data }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const handleSoftDelete = React.useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await softDeleteSpecField({ id });
        setPendingId(null);
        if (result.ok) router.refresh();
        else
          window.alert(
            result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not soft-delete this spec field.",
          );
      });
    },
    [router],
  );

  const handleHardDelete = React.useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await deleteSpecField({ id });
        setPendingId(null);
        if (result.ok) router.refresh();
        else
          window.alert(
            result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not hard-delete this spec field.",
          );
      });
    },
    [router],
  );

  const handleRename = React.useCallback(
    (id: string, oldKey: string, newKey: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await renameSpecField({ id, oldKey, newKey });
        setPendingId(null);
        if (result.ok) router.refresh();
        else
          window.alert(
            result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not rename this spec field. The form may be stale — reload and try again.",
          );
      });
    },
    [router],
  );

  const columns = React.useMemo<ColumnDef<SpecFieldRow, unknown>[]>(
    () => [
      {
        id: "key",
        accessorKey: "key",
        header: "Key",
        cell: ({ row }) => (
          <code className="font-mono text-sm">{row.original.key}</code>
        ),
      },
      {
        id: "label",
        accessorKey: "label",
        header: "Label",
        cell: ({ row }) => (
          <Link
            href={`/${locale}/admin/spec-fields/${row.original.id}/edit`}
            className="font-medium hover:underline"
          >
            {row.original.label}
          </Link>
        ),
      },
      {
        id: "categoryName",
        accessorKey: "categoryName",
        header: "Category",
      },
      {
        id: "dataType",
        accessorKey: "dataType",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.dataType}</Badge>
        ),
      },
      {
        id: "unit",
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.unit ?? "—"}
          </span>
        ),
      },
      {
        id: "required",
        accessorKey: "required",
        header: "Required",
        cell: ({ row }) => (row.original.required ? "Yes" : "—"),
      },
      {
        id: "groupLabel",
        accessorKey: "groupLabel",
        header: "Group",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.groupLabel ?? "—"}
          </span>
        ),
      },
      {
        id: "deletedAt",
        accessorKey: "deletedAt",
        header: "Status",
        cell: ({ row }) =>
          row.original.deletedAt ? (
            <Badge variant="destructive">Soft-deleted</Badge>
          ) : (
            <Badge variant="outline">Active</Badge>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const r = row.original;
          const isPending = pendingId === r.id;
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href={`/${locale}/admin/spec-fields/${r.id}/edit`}>
                    Edit
                  </Link>
                }
              />
              <RenameButton
                disabled={isPending || r.deletedAt !== null}
                row={r}
                onConfirm={(newKey) => handleRename(r.id, r.key, newKey)}
              />
              {r.deletedAt ? null : (
                <ConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" disabled={isPending}>
                      Soft-delete
                    </Button>
                  }
                  title={`Soft-delete "${r.key}"?`}
                  description={
                    <>
                      The field will be hidden from new products but existing{" "}
                      <code className="font-mono">product_spec_values</code>{" "}
                      rows keep rendering until cleaned up.
                    </>
                  }
                  confirmLabel="Soft-delete"
                  destructive
                  onConfirm={() => handleSoftDelete(r.id)}
                />
              )}
              <ConfirmDialog
                trigger={
                  <Button variant="destructive" size="sm" disabled={isPending}>
                    Hard delete
                  </Button>
                }
                title={`Hard-delete "${r.key}"?`}
                description={
                  <>
                    This permanently drops the spec field. Any{" "}
                    <code className="font-mono">product_spec_values</code>{" "}
                    rows referencing it will have their{" "}
                    <code className="font-mono">spec_field_id</code> set to{" "}
                    <code className="font-mono">NULL</code>. Type the key to
                    confirm.
                  </>
                }
                confirmLabel="Permanently delete"
                destructive
                confirmInput={{ expected: r.key, placeholder: r.key }}
                onConfirm={() => handleHardDelete(r.id)}
              />
            </div>
          );
        },
      },
    ],
    [locale, pendingId, handleRename, handleSoftDelete, handleHardDelete],
  );

  return (
    <DataTable<SpecFieldRow>
      columns={columns}
      data={data}
      rowCount={data.length}
      searchPlaceholder="Search spec fields…"
      manualPagination={false}
    />
  );
}

/**
 * Inline rename trigger — wraps ConfirmDialog with state for the
 * "type the new key" gate. Lives in its own component so React state
 * (the typed-newKey input) is scoped per-row.
 */
function RenameButton({
  row,
  disabled,
  onConfirm,
}: {
  row: SpecFieldRow;
  disabled?: boolean;
  onConfirm: (newKey: string) => void;
}) {
  const [newKey, setNewKey] = React.useState("");
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm" disabled={disabled}>
          Rename
        </Button>
      }
      title={`Rename "${row.key}"`}
      description={
        <div className="grid gap-2">
          <p>
            This updates <code className="font-mono">spec_field.key</code> and
            cascade-renames matching{" "}
            <code className="font-mono">product_spec_values.extra_key</code>{" "}
            rows.
          </p>
          <p className="text-xs">
            New key (lowercase, digits, underscore):
          </p>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="new_key"
            data-testid="rename-newkey-input"
          />
        </div>
      }
      confirmLabel="Rename"
      confirmInput={{ expected: newKey, placeholder: newKey || "type new key" }}
      onConfirm={() => {
        if (!newKey || !/^[a-z0-9_]+$/.test(newKey)) return;
        onConfirm(newKey);
        setNewKey("");
      }}
    />
  );
}
