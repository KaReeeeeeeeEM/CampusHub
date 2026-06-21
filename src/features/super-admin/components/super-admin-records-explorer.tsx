"use client";

import { useEffect, useMemo, useState } from "react";
import { FiDatabase, FiGrid, FiList } from "react-icons/fi";

import {
  CampusDataTable,
  CampusSearch,
  CampusViewToggle,
  Empty,
} from "@/components/campushub";
import type { DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";

export type SuperAdminTableColumn = {
  key: string;
  header: string;
};

export type SuperAdminTableRow = {
  id: string;
  cells: Record<string, string>;
};

export type SuperAdminRecordsExplorerData = {
  title: string;
  description: string;
  columns: SuperAdminTableColumn[];
  rows: SuperAdminTableRow[];
  emptyTitle: string;
  emptyDescription: string;
};

type ViewMode = "table" | "cards";

const viewOptions = [
  { value: "table", label: "Table view", icon: FiList },
  { value: "cards", label: "Card view", icon: FiGrid },
] as const;

const pageSize = 8;

function rowSearchText(row: SuperAdminTableRow) {
  return Object.values(row.cells).join(" ").toLowerCase();
}

function CardsView({
  columns,
  rows,
}: {
  columns: SuperAdminTableColumn[];
  rows: SuperAdminTableRow[];
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  useEffect(() => {
    setPageIndex(0);
  }, [rows.length]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleRows.map((row) => {
          const [primaryColumn, ...detailColumns] = columns;
          const primary = primaryColumn
            ? row.cells[primaryColumn.key] ?? "Not set"
            : "Record";

          return (
            <article
              key={row.id}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <p className="text-sm font-semibold text-foreground">{primary}</p>
              <dl className="mt-4 space-y-3">
                {detailColumns.slice(0, 5).map((column) => (
                  <div key={column.key}>
                    <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                      {column.header}
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {row.cells[column.key] ?? "Not set"}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {pageIndex * pageSize + 1}-
            {Math.min((pageIndex + 1) * pageSize, rows.length)} of {rows.length}
          </p>
          <div className="flex items-center gap-2">
            <span>
              Page {pageIndex + 1} of {pageCount}
            </span>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              disabled={pageIndex === 0}
              onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              disabled={pageIndex >= pageCount - 1}
              onClick={() =>
                setPageIndex((current) => Math.min(pageCount - 1, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SuperAdminRecordsExplorer({
  data,
}: {
  data: SuperAdminRecordsExplorerData;
}) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data.rows;

    return data.rows.filter((row) => rowSearchText(row).includes(normalized));
  }, [data.rows, query]);
  const columns: DataTableColumn<SuperAdminTableRow>[] = data.columns.map(
    (column) => ({
      key: column.key,
      header: column.header,
      cell: (row) => row.cells[column.key] ?? "Not set",
    }),
  );
  const empty = (
    <Empty
      icon={FiDatabase}
      title={query ? `No records found for "${query}"` : data.emptyTitle}
      description={
        query
          ? "Try another search term or clear the search field."
          : data.emptyDescription
      }
      className="min-h-40 border-0 bg-transparent"
    />
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{data.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {data.description}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CampusSearch
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
            wrapperClassName="w-full sm:w-80"
          />
          <CampusViewToggle
            value={viewMode}
            options={viewOptions}
            onValueChange={setViewMode}
          />
        </div>
      </div>

      {viewMode === "table" ? (
        <CampusDataTable
          columns={columns}
          data={filteredRows}
          getRowId={(row) => row.id}
          empty={empty}
          pageSize={pageSize}
        />
      ) : filteredRows.length > 0 ? (
        <CardsView columns={data.columns} rows={filteredRows} />
      ) : (
        empty
      )}
    </section>
  );
}
