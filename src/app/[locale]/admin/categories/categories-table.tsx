"use client";

// Plan 02-09 Task 9.3 — categories list client island.
//
// Wraps the generic DataTable<TData> from plan 02-06 with category-shaped
// columns + an inline delete action that calls deleteCategory Server
// Action. Uses React.useTransition rather than useActionState for the
// delete button — the action returns a discriminated AdminActionResult,
// not FormData, so the (state, formData) reducer shape adds friction.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";

import { deleteCategory } from "@/actions/categories";

export interface CategoryRow {
  id: string;
  parentId: string | null;
  sortOrder: number;
  /** Name in the current request locale; falls back to '(untranslated)'. */
  name: string;
  /** Canonical uz slug (sitemap source-of-truth per Phase-1 guardrail). */
  slugUz: string;
  /** Parent name in the current request locale; null at the tree root. */
  parentName: string | null;
}

interface CategoriesTableProps {
  locale: string;
  data: CategoryRow[];
  rowCount: number;
}

export function CategoriesTable({
  locale,
  data,
  rowCount,
}: CategoriesTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const handleDelete = React.useCallback(
    (id: string, name: string) => {
      // Confirm before deleting — the FK is ON DELETE RESTRICT for parents
      // (children would cascade their translations, but a category that
      // owns products will fail at the DB level — surface a toast / alert).
      if (!window.confirm(`Delete category "${name}"? This cannot be undone.`)) {
        return;
      }
      setPendingId(id);
      startTransition(async () => {
        const result = await deleteCategory({ id });
        setPendingId(null);
        if (result.ok) {
          router.refresh();
        } else {
          window.alert(
            result.error === "validation"
              ? "Could not delete: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not delete this category. It may have children or products attached.",
          );
        }
      });
    },
    [router],
  );

  const columns = React.useMemo<ColumnDef<CategoryRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/${locale}/admin/categories/${row.original.id}/edit`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "slugUz",
        accessorKey: "slugUz",
        header: "Slug (uz)",
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">
            {row.original.slugUz || "—"}
          </span>
        ),
      },
      {
        id: "parentName",
        accessorKey: "parentName",
        header: "Parent",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.parentName ?? "—"}
          </span>
        ),
      },
      {
        id: "sortOrder",
        accessorKey: "sortOrder",
        header: "Sort",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.sortOrder}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const isPending = pendingId === row.original.id;
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={`/${locale}/admin/categories/${row.original.id}/edit`}
                  >
                    Edit
                  </Link>
                }
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  handleDelete(row.original.id, row.original.name)
                }
              >
                {isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          );
        },
      },
    ],
    [locale, pendingId, handleDelete],
  );

  return (
    <DataTable<CategoryRow>
      columns={columns}
      data={data}
      rowCount={rowCount}
      searchPlaceholder="Search categories…"
    />
  );
}
