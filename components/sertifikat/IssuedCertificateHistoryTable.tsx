'use client';

import React from 'react';
import { getIssuedCertificatesList } from '@/lib/actions/certificate-template';
import { IssuedCertificate } from '@/types/certificate';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { formatDateIndo } from '@/lib/utils/date';
import {
  Award,
  CheckCircle2,
  FileDown,
  Printer,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react';

interface IssuedCertificateHistoryTableProps {
  onPrintCertificate?: (cert: IssuedCertificate) => void;
}

export function IssuedCertificateHistoryTable({
  onPrintCertificate,
}: IssuedCertificateHistoryTableProps) {
  const [history, setHistory] = React.useState<IssuedCertificate[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const list = await getIssuedCertificatesList();
      setHistory(list);
    } catch (err) {
      console.error('Error loading certificate history:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadHistory();
  }, []);

  const columns: ColumnDef<IssuedCertificate>[] = [
    {
      accessorKey: 'certificate_number',
      header: 'Nomor Sertifikat',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-[#007a87] flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5" />
          <span>{row.original.certificate_number}</span>
        </span>
      ),
    },
    {
      accessorKey: 'metadata.student_name',
      header: 'Nama Siswa',
      sortingFn: 'text',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-[var(--text-primary)]">
            {row.original.metadata?.student_name || 'Siswa'}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] font-mono">
            {row.original.metadata?.student_code}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'issued_at',
      header: 'Tanggal Terbit',
      sortingFn: 'datetime',
      cell: ({ row }) => (
        <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>{row.original.issued_at ? formatDateIndo(row.original.issued_at.slice(0, 10)) : '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'metadata.instructor_name',
      header: 'Instruktur',
      sortingFn: 'text',
      cell: ({ row }) => (
        <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>{row.original.metadata?.instructor_name || 'Syawal Putra'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span className="capitalize">{row.original.status || 'Valid'}</span>
        </span>
      ),
    },
  ];

  if (loading) {
    return <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <div className="card-container">
        <DataTable columns={columns} data={history} initialPageSize={10} />
      </div>
    </div>
  );
}
