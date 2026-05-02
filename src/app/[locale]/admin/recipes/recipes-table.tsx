"use client";

// Plan 04-07 Task 7.3 — recipes list client island (CONT-01 / ADMIN-04).
//
// Mirrors src/app/[locale]/admin/products/products-table.tsx structure with
// recipe-specific row actions:
//   - Edit (link to /admin/recipes/[id]/edit)
//   - Duplicate (route to /admin/recipes/new?duplicate=<id> — v1 client-side
//     prefill simplification per RESEARCH §Open Questions §1; no server-side
//     duplicate Server Action needed for v1)
//   - Publish | Unpublish (mutually exclusive based on row.status)
//   - Delete (window.confirm-gated)
//
// Uses sonner toast for success/error feedback (v1 simple posture; the
// product-table uses window.alert — we go with sonner here since it's
// already wired into the admin layout via @/components/ui/sonner).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/admin/data-table";
import { TranslationDots } from "@/components/admin/translation-completeness";
import { Button } from "@/components/ui/button";

import {
  publishRecipe,
  unpublishRecipe,
  deleteRecipe,
} from "@/actions/recipes";

export type CompletenessByLocale = {
  uz: number;
  ru: number;
  en: number;
};

export interface RecipeRow {
  id: string;
  status: "draft" | "published";
  /** ISO timestamp; null when never published. */
  publishedAt: string | null;
  /** Title in the current request locale; falls back to '(untranslated)'. */
  title: string;
  /** Canonical uz slug (sitemap source-of-truth per Phase-1 guardrail). */
  slugUz: string;
  /** ISO timestamp of last update — already serialised by the RSC. */
  updatedAt: string;
}

interface RecipesTableProps {
  locale: string;
  data: RecipeRow[];
  rowCount: number;
  completenessByRecipe: Record<string, CompletenessByLocale>;
}

export function RecipesTable({
  locale,
  data,
  rowCount,
  completenessByRecipe,
}: RecipesTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const handlePublish = React.useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await publishRecipe({ id });
        setPendingId(null);
        if (result.ok) {
          toast.success("Recipe published.");
          router.refresh();
        } else {
          toast.error(
            result.error === "validation"
              ? "Could not publish: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not publish this recipe.",
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
        const result = await unpublishRecipe({ id });
        setPendingId(null);
        if (result.ok) {
          toast.success("Recipe unpublished.");
          router.refresh();
        } else {
          toast.error(
            result.error === "validation"
              ? "Could not unpublish: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not unpublish this recipe.",
          );
        }
      });
    },
    [router],
  );

  const handleDelete = React.useCallback(
    (id: string, title: string) => {
      if (
        !window.confirm(
          `Delete recipe "${title}"? This cannot be undone.`,
        )
      ) {
        return;
      }
      setPendingId(id);
      startTransition(async () => {
        const result = await deleteRecipe({ id });
        setPendingId(null);
        if (result.ok) {
          toast.success("Recipe deleted.");
          router.refresh();
        } else {
          toast.error(
            result.error === "validation"
              ? "Could not delete: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not delete this recipe.",
          );
        }
      });
    },
    [router],
  );

  const columns = React.useMemo<ColumnDef<RecipeRow, unknown>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Link
            href={`/${locale}/admin/recipes/${row.original.id}/edit`}
            className="font-medium hover:underline"
            data-testid={`edit-${row.original.id}`}
          >
            {row.original.title}
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
              completenessByRecipe[row.original.id] ?? {
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
                    href={`/${locale}/admin/recipes/${r.id}/edit`}
                  >
                    Edit
                  </Link>
                }
              />
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
                onClick={() => handleDelete(r.id, r.title)}
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
      completenessByRecipe,
      handlePublish,
      handleUnpublish,
      handleDelete,
    ],
  );

  return (
    <DataTable<RecipeRow>
      columns={columns}
      data={data}
      rowCount={rowCount}
      searchPlaceholder="Search recipes…"
    />
  );
}
