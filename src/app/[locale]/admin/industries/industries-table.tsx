"use client";

// Plan 04-08 Task 8.2 — industries list client island (CONT-02 / ADMIN-04).
//
// Verbatim mirror of src/app/[locale]/admin/recipes/recipes-table.tsx with the
// entity swap (recipes → industries). Same row actions (Edit / Publish |
// Unpublish / Delete), same sonner toast feedback, same window.confirm-gated
// destructive action.
//
// Duplicate row action — same v1 deferral as recipes-table (see plan 04-07
// SUMMARY decisions). The route plumbing supports a future ?duplicate=<id>
// prefill but no inert button is rendered yet.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/admin/data-table";
import { TranslationDots } from "@/components/admin/translation-completeness";
import { Button } from "@/components/ui/button";

import {
  publishIndustry,
  unpublishIndustry,
  deleteIndustry,
} from "@/actions/industries";

export type CompletenessByLocale = {
  uz: number;
  ru: number;
  en: number;
};

export interface IndustryRow {
  id: string;
  status: "draft" | "published";
  publishedAt: string | null;
  title: string;
  slugUz: string;
  updatedAt: string;
}

interface IndustriesTableProps {
  locale: string;
  data: IndustryRow[];
  rowCount: number;
  completenessByIndustry: Record<string, CompletenessByLocale>;
}

export function IndustriesTable({
  locale,
  data,
  rowCount,
  completenessByIndustry,
}: IndustriesTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const handlePublish = React.useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await publishIndustry({ id });
        setPendingId(null);
        if (result.ok) {
          toast.success("Industry published.");
          router.refresh();
        } else {
          toast.error(
            result.error === "validation"
              ? "Could not publish: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not publish this industry.",
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
        const result = await unpublishIndustry({ id });
        setPendingId(null);
        if (result.ok) {
          toast.success("Industry unpublished.");
          router.refresh();
        } else {
          toast.error(
            result.error === "validation"
              ? "Could not unpublish: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not unpublish this industry.",
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
          `Delete industry "${title}"? This cannot be undone.`,
        )
      ) {
        return;
      }
      setPendingId(id);
      startTransition(async () => {
        const result = await deleteIndustry({ id });
        setPendingId(null);
        if (result.ok) {
          toast.success("Industry deleted.");
          router.refresh();
        } else {
          toast.error(
            result.error === "validation"
              ? "Could not delete: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not delete this industry.",
          );
        }
      });
    },
    [router],
  );

  const columns = React.useMemo<ColumnDef<IndustryRow, unknown>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <Link
            href={`/${locale}/admin/industries/${row.original.id}/edit`}
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
              completenessByIndustry[row.original.id] ?? {
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
                    href={`/${locale}/admin/industries/${r.id}/edit`}
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
      completenessByIndustry,
      handlePublish,
      handleUnpublish,
      handleDelete,
    ],
  );

  return (
    <DataTable<IndustryRow>
      columns={columns}
      data={data}
      rowCount={rowCount}
      searchPlaceholder="Search industries…"
    />
  );
}
