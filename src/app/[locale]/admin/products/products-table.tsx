"use client";

// Plan 02-13b Task 13b.2 — products list client island.
//
// Mirrors manufacturers-table.tsx (plan 02-10) with two product-specific
// extras:
//
//   1. <TranslationDots/> in the "Translations" column (D-04 / ADMIN-10).
//      Pure presentational — receives per-product completeness from the RSC
//      via the `completenessByProduct` prop.
//
//   2. Five row actions (Edit / Duplicate / Publish | Unpublish / Delete).
//      Each lifecycle button calls its dedicated Server Action — Publish/
//      Unpublish are mutually exclusive based on the row's current status.
//      Delete uses window.confirm gating consistent with the other Wave-2/3
//      list pages (sonner is not yet wired in the admin layout; the
//      ConfirmDialog primitive is reserved for the editor's destructive
//      flows in Task 13b.3).
//
// Lifecycle wiring summary (W7 boundary):
//   - The list NEVER calls saveProduct. Every status transition flows
//     through publishProduct / unpublishProduct (D-09 / T-02-13b-02).
//   - duplicateProduct returns the clone's id; we router.refresh() so the
//     new draft row appears at the top (orderBy desc(updatedAt)).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/admin/data-table";
import { TranslationDots } from "@/components/admin/translation-completeness";
import { Button } from "@/components/ui/button";

import {
  duplicateProduct,
  publishProduct,
  unpublishProduct,
  deleteProduct,
} from "@/actions/products";
import type { CompletenessByLocale } from "@/lib/translation-completeness";

export interface ProductRow {
  id: string;
  status: "draft" | "published";
  /** ISO timestamp; null when never published. */
  publishedAt: string | null;
  /** Name in the current request locale; falls back to '(untranslated)'. */
  name: string;
  /** Canonical uz slug (sitemap source-of-truth per Phase-1 guardrail). */
  slugUz: string;
  /** ISO timestamp of last update — already serialised by the RSC. */
  updatedAt: string;
}

interface ProductsTableProps {
  locale: string;
  data: ProductRow[];
  rowCount: number;
  completenessByProduct: Record<string, CompletenessByLocale>;
}

export function ProductsTable({
  locale,
  data,
  rowCount,
  completenessByProduct,
}: ProductsTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const handleDuplicate = React.useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await duplicateProduct({ sourceId: id });
        setPendingId(null);
        if (result.ok) {
          router.refresh();
        } else {
          window.alert(
            result.error === "validation"
              ? "Could not duplicate: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not duplicate this product.",
          );
        }
      });
    },
    [router],
  );

  const handlePublish = React.useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await publishProduct({ id });
        setPendingId(null);
        if (result.ok) {
          router.refresh();
        } else {
          window.alert(
            result.error === "validation"
              ? "Could not publish: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not publish this product.",
          );
        }
      });
    },
    [router],
  );

  const handleUnpublish = React.useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await unpublishProduct({ id });
        setPendingId(null);
        if (result.ok) {
          router.refresh();
        } else {
          window.alert(
            result.error === "validation"
              ? "Could not unpublish: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not unpublish this product.",
          );
        }
      });
    },
    [router],
  );

  const handleDelete = React.useCallback(
    (id: string, name: string) => {
      if (
        !window.confirm(
          `Delete product "${name}"? This cannot be undone.`,
        )
      ) {
        return;
      }
      setPendingId(id);
      startTransition(async () => {
        const result = await deleteProduct({ id });
        setPendingId(null);
        if (result.ok) {
          router.refresh();
        } else {
          window.alert(
            result.error === "validation"
              ? "Could not delete: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not delete this product.",
          );
        }
      });
    },
    [router],
  );

  const columns = React.useMemo<ColumnDef<ProductRow, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/${locale}/admin/products/${row.original.id}/edit`}
            className="font-medium hover:underline"
            data-testid={`edit-${row.original.id}`}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={
              row.original.status === "published"
                ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900"
                : "rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            }
          >
            {row.original.status}
          </span>
        ),
      },
      {
        id: "translations",
        header: "Translations",
        cell: ({ row }) => (
          <TranslationDots
            completeness={
              completenessByProduct[row.original.id] ?? {
                uz: 0,
                ru: 0,
                en: 0,
              }
            }
          />
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
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.updatedAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const isPending = pendingId === row.original.id;
          const r = row.original;
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={`/${locale}/admin/products/${r.id}/edit`}
                  >
                    Edit
                  </Link>
                }
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                data-testid={`duplicate-${r.id}`}
                onClick={() => handleDuplicate(r.id)}
              >
                {isPending ? "…" : "Duplicate"}
              </Button>
              {r.status === "published" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  data-testid={`unpublish-${r.id}`}
                  onClick={() => handleUnpublish(r.id)}
                >
                  {isPending ? "…" : "Unpublish"}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  disabled={isPending}
                  data-testid={`publish-${r.id}`}
                  onClick={() => handlePublish(r.id)}
                >
                  {isPending ? "…" : "Publish"}
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                data-testid={`delete-${r.id}`}
                onClick={() => handleDelete(r.id, r.name)}
              >
                {isPending ? "…" : "Delete"}
              </Button>
            </div>
          );
        },
      },
    ],
    [
      locale,
      pendingId,
      completenessByProduct,
      handleDuplicate,
      handlePublish,
      handleUnpublish,
      handleDelete,
    ],
  );

  return (
    <DataTable<ProductRow>
      columns={columns}
      data={data}
      rowCount={rowCount}
      searchPlaceholder="Search products…"
    />
  );
}
