"use client";

// Plan 02-10 Task 10.3 — manufacturers list client island.
//
// Mirrors src/app/[locale]/admin/categories/categories-table.tsx (plan 02-09).
// Differences:
//   - Logo thumb column (CldImage of logoPublicId, falls back to a dash).
//   - No parent column (manufacturers are flat).
//   - Same inline delete via deleteManufacturer Server Action +
//     React.useTransition + window.confirm gate.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CldImage } from "next-cloudinary";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";

import { deleteManufacturer } from "@/actions/manufacturers";

export interface ManufacturerRow {
  id: string;
  /** Cloudinary public_id; null when the admin hasn't uploaded a logo yet. */
  logoPublicId: string | null;
  /** Name in the current request locale; falls back to '(untranslated)'. */
  name: string;
  /** Canonical uz slug (sitemap source-of-truth per Phase-1 guardrail). */
  slugUz: string;
  /** ISO timestamp of last update — already serialised by the RSC. */
  updatedAt: string;
}

interface ManufacturersTableProps {
  locale: string;
  data: ManufacturerRow[];
  rowCount: number;
}

export function ManufacturersTable({
  locale,
  data,
  rowCount,
}: ManufacturersTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const handleDelete = React.useCallback(
    (id: string, name: string) => {
      if (
        !window.confirm(
          `Delete manufacturer "${name}"? This cannot be undone.`,
        )
      ) {
        return;
      }
      setPendingId(id);
      startTransition(async () => {
        const result = await deleteManufacturer({ id });
        setPendingId(null);
        if (result.ok) {
          router.refresh();
        } else {
          window.alert(
            result.error === "validation"
              ? "Could not delete: invalid request."
              : result.error === "unauthorized"
                ? "Your session expired. Please sign in again."
                : "Could not delete this manufacturer. Products may still reference it.",
          );
        }
      });
    },
    [router],
  );

  const columns = React.useMemo<ColumnDef<ManufacturerRow, unknown>[]>(
    () => [
      {
        id: "logo",
        accessorKey: "logoPublicId",
        header: "Logo",
        cell: ({ row }) =>
          row.original.logoPublicId ? (
            <CldImage
              src={row.original.logoPublicId}
              width="40"
              height="40"
              alt=""
              className="rounded border"
            />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/${locale}/admin/manufacturers/${row.original.id}/edit`}
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
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={`/${locale}/admin/manufacturers/${row.original.id}/edit`}
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
    <DataTable<ManufacturerRow>
      columns={columns}
      data={data}
      rowCount={rowCount}
      searchPlaceholder="Search manufacturers…"
    />
  );
}
