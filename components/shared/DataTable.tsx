'use client';

import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  PaginationState,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  renderMobileCard?: (row: TData) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50, 100],
  renderMobileCard,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
  });

  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalPages = table.getPageCount() || 1;
  const totalRows = table.getFilteredRowModel().rows.length;

  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  // Helper to generate smart pagination numbers with ellipsis
  const getPaginationItems = () => {
    const items: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) {
        items.push(i);
      }
    } else {
      if (pageIndex <= 3) {
        for (let i = 0; i < 5; i++) {
          items.push(i);
        }
        items.push('ellipsis');
        items.push(totalPages - 1);
      } else if (pageIndex >= totalPages - 4) {
        items.push(0);
        items.push('ellipsis');
        for (let i = totalPages - 5; i < totalPages; i++) {
          items.push(i);
        }
      } else {
        items.push(0);
        items.push('ellipsis');
        items.push(pageIndex - 1);
        items.push(pageIndex);
        items.push(pageIndex + 1);
        items.push('ellipsis');
        items.push(totalPages - 1);
      }
    }
    return items;
  };

  return (
    <div className="w-full space-y-3">
      {/* Search Bar (Only rendered if searchKey is provided) */}
      {searchKey && (
        <div className="flex items-center justify-between pb-1">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Cari data ${searchKey}...`}
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 pr-4 py-2 text-xs rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] w-full focus:outline-none focus:border-[var(--brand-primary)] shadow-xs transition-all"
            />
          </div>
        </div>
      )}

      {/* Desktop Table View (>= 768px) with Clean Minimalist Border */}
      <div className="hidden md:block overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--bg)] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-[var(--text-primary)]">
            <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isSorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-3 eyebrow-label text-[10px] ${
                          canSort ? 'cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors' : ''
                        }`}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center gap-1.5">
                            <span className={isSorted ? 'text-[var(--brand-primary)] font-bold' : ''}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                            {canSort && (
                              <span className="inline-flex items-center">
                                {isSorted === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                                ) : isSorted === 'desc' ? (
                                  <ArrowDown className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-[var(--text-muted)] opacity-40 hover:opacity-100 transition-opacity" />
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
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

      {/* Enterprise Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)] pt-2 px-1 border-t border-[var(--border)]/60">
        {/* Left: Summary Info & Page Size Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-[11px] font-medium">
            Menampilkan <span className="font-bold text-[var(--text-primary)] tabular-num">{startRow}</span>–
            <span className="font-bold text-[var(--text-primary)] tabular-num">{endRow}</span> dari{' '}
            <span className="font-bold text-[var(--text-primary)] tabular-num">{totalRows}</span> data
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[var(--text-muted)]">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--brand-primary)] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} baris
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Page Navigation Numbers & Controls */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* First Page */}
          <button
            type="button"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Halaman Pertama"
            title="Halaman Pertama"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-2xs"
          >
            <ChevronsLeft className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Halaman Sebelumnya"
            title="Halaman Sebelumnya"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-2xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1 px-1">
            {getPaginationItems().map((item, idx) => {
              if (item === 'ellipsis') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-[var(--text-muted)] select-none">
                    ...
                  </span>
                );
              }

              const isCurrent = item === pageIndex;
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => table.setPageIndex(item)}
                  className={`min-w-[28px] h-7 px-2 text-xs rounded-lg font-bold transition-all ${
                    isCurrent
                      ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                      : 'border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                  }`}
                >
                  {item + 1}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Halaman Berikutnya"
            title="Halaman Berikutnya"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-2xs"
          >
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Halaman Terakhir"
            title="Halaman Terakhir"
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-25 disabled:cursor-not-allowed transition-all shadow-2xs"
          >
            <ChevronsRight className="w-3.5 h-3.5 text-[var(--text-primary)]" />
          </button>
        </div>
      </div>
    </div>
  );
}
