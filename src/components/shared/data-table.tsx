"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T, index: number) => string;
  empty?: React.ReactNode;
  className?: string;
  pageSize?: number;
};

export function DataTable<T extends object>({
  columns,
  data,
  getRowId,
  empty,
  className,
  pageSize = 8,
}: DataTableProps<T>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  useEffect(() => {
    setPagination((current) => ({
      ...current,
      pageIndex: 0,
      pageSize,
    }));
  }, [data.length, pageSize]);

  const tableColumns: ColumnDef<T>[] = columns.map((column) => ({
    id: String(column.key),
    header: () => column.header,
    cell: ({ row }) =>
      column.cell
        ? column.cell(row.original)
        : String(
            (row.original as Record<string, unknown>)[String(column.key)] ?? "",
          ),
    meta: {
      className: column.className,
    },
  }));

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId,
  });
  const hasRows = table.getRowModel().rows.length > 0;
  const totalRows = data.length;
  const pageCount = table.getPageCount();
  const currentPage = pagination.pageIndex + 1;

  return (
    <div
      className={cn(
        "dashboard-table overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-5 py-4 font-semibold",
                      header.column.columnDef.meta?.className,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {hasRows ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-surface-muted"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-5 py-4",
                        cell.column.columnDef.meta?.className,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  {empty ?? "No records found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalRows > pageSize ? (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {pagination.pageIndex * pagination.pageSize + 1}-
            {Math.min(
              (pagination.pageIndex + 1) * pagination.pageSize,
              totalRows,
            )}{" "}
            of {totalRows}
          </p>
          <div className="flex items-center gap-2">
            <span>
              Page {currentPage} of {pageCount}
            </span>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
