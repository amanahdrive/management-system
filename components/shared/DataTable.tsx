'use client';

import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ArrowUpDown, Search } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  renderMobileCard?: (row: TData) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  renderMobileCard,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="w-full space-y-3">
      {/* Search Bar (Only rendered if searchKey is provided and not handled externally) */}
      {searchKey && (
        <div className="flex items-center justify-between pb-1">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Cari data ${searchKey}...`}
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] w-full focus:outline-none focus:border-[var(--brand-primary)] shadow-xs transition-colors"
            />
          </div>
        </div>
      )}

      {/* Desktop Table View (>= 768px) with Clean Minimalist Border */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)]">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-[var(--text-primary)]">
            <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 eyebrow-label text-[10px]">
                      {header.isPlaceholder ? null : (
                        <div
                          className={
                            header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center gap-1.5 hover:text-[var(--brand-primary)] transition-colors'
                              : ''
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--bg-subtle)]/70 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 font-medium tabular-num">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-[var(--text-muted)] font-medium">
                    Tidak ada data yang sesuai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (< 768px) */}
      <div className="block md:hidden space-y-2.5">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <React.Fragment key={row.id}>
              {renderMobileCard ? (
                renderMobileCard(row.original)
              ) : (
                <div className="card-container p-3.5 space-y-1.5 text-xs">
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="flex justify-between border-b border-[var(--border)] pb-1 last:border-0 last:pb-0">
                      <span className="eyebrow-label text-[9.5px]">
                        {String(cell.column.columnDef.header || cell.column.id)}:
                      </span>
                      <span className="text-[var(--text-primary)] font-semibold tabular-num text-right">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))
        ) : (
          <div className="card-container text-center text-xs text-[var(--text-muted)] py-6 font-medium">
            Tidak ada data yang sesuai.
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1 px-1">
        <div className="eyebrow-label text-[10px]">
          Halaman <span className="text-[var(--text-primary)] font-bold">{table.getState().pagination.pageIndex + 1}</span> dari{' '}
          <span className="text-[var(--text-primary)] font-bold">{table.getPageCount() || 1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Halaman Sebelumnya"
            className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed shadow-xs transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Halaman Berikutnya"
            className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:cursor-not-allowed shadow-xs transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </button>
        </div>
      </div>
    </div>
  );
}
