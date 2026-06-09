import { cn } from "@/lib/utils";

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
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  getRowId,
  empty,
  className
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-surface", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead className="bg-background text-left text-xs uppercase tracking-normal text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className={cn("px-4 py-3 font-medium", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length > 0 ? (
              data.map((row, index) => (
                <tr key={getRowId(row, index)} className="hover:bg-background/70">
                  {columns.map((column) => (
                    <td key={String(column.key)} className={cn("px-4 py-3", column.className)}>
                      {column.cell ? column.cell(row) : String(row[column.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                  {empty ?? "No records found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
