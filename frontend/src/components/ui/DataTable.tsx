import React, { useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { extractApiError } from '@/lib/formatters';
import { EmptyState } from './EmptyState';
import { TableSkeleton } from './Skeleton';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  isLoading,
  error,
  searchPlaceholder = 'Search records...',
  searchFn,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records matching your current filter.',
  toolbarExtra,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  error?: unknown;
  searchPlaceholder?: string;
  searchFn?: (row: T, query: string) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbarExtra?: React.ReactNode;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !searchFn) return data;
    return data.filter((row) => searchFn(row, q));
  }, [data, search, searchFn]);

  if (isLoading) {
    return <TableSkeleton rows={6} />;
  }

  return (
    <div className="space-y-4">
      {(searchFn || toolbarExtra) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {searchFn ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-clinical-500 focus:outline-none focus:ring-2 focus:ring-clinical-500/20"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbarExtra && <div className="flex flex-wrap items-center gap-2">{toolbarExtra}</div>}
        </div>
      )}

      {Boolean(error) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Unable to load records</p>
            <p className="text-xs text-rose-700">{extractApiError(error)}</p>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`whitespace-nowrap px-4 py-3 ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-slate-50/70">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 align-top text-slate-700 ${col.className || ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

