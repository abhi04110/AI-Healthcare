import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlaskConical, Printer } from 'lucide-react';
import { publicService } from '@/services/publicService';
import { formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PrintableDocumentModal } from '@/components/shared/PrintableDocument';
import type { PatientLabEntry } from '@/types/api';

export function PatientLabsPage() {
  const [selectedLab, setSelectedLab] = useState<PatientLabEntry | null>(null);

  const labsQuery = useQuery({
    queryKey: ['patient-my-labs'],
    queryFn: () => publicService.getMyLabs(),
  });

  const columns: ColumnDef<PatientLabEntry>[] = [
    {
      key: 'test',
      header: 'Diagnostic Test',
      render: (l) => (
        <div>
          <p className="font-semibold text-slate-900">{l.test_name}</p>
          <p className="text-xs text-slate-500">
            Order ID {l.order_id} • Ordered by Dr. {l.doctor_name || 'Hospital'}
          </p>
        </div>
      ),
    },
    { key: 'status', header: 'Lab Status', render: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'result',
      header: 'Result Summary',
      render: (l) =>
        l.result ? (
          <div className="text-xs">
            <p className="font-semibold text-slate-900">
              {l.result.result_value} {l.result.unit || ''}
            </p>
            <Badge variant={l.result.result_status === 'normal' ? 'emerald' : 'rose'}>
              {l.result.result_status}
            </Badge>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Pending publication</span>
        ),
    },
    { key: 'date', header: 'Ordered', render: (l) => formatDateTime(l.ordered_at) },
    {
      key: 'print',
      header: 'Download',
      render: (l) =>
        l.result ? (
          <button
            type="button"
            onClick={() => setSelectedLab(l)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Download Report
          </button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="My Laboratory Orders & Reports"
          subtitle="Track ongoing lab tests and download completed reports."
          action={<FlaskConical className="h-5 w-5 text-clinical-600" />}
        />
        <CardBody>
          <DataTable
            data={labsQuery.data ?? []}
            columns={columns}
            rowKey={(l) => l.order_id}
            isLoading={labsQuery.isLoading}
            searchPlaceholder="Search test name or doctor..."
            searchFn={(l, q) =>
              `${l.test_name} ${l.doctor_name ?? ''} ${l.status}`.toLowerCase().includes(q)
            }
          />
        </CardBody>
      </Card>

      {selectedLab?.result && (
        <PrintableDocumentModal
          open={true}
          onClose={() => setSelectedLab(null)}
          title={`Lab Report — ${selectedLab.test_name}`}
          filename={`lab-report-${selectedLab.order_id}.txt`}
          plainTextSummary={[
            `MedCore AI Hospital — Diagnostic Lab Report`,
            `Order ID: ${selectedLab.order_id} | Test: ${selectedLab.test_name}`,
            `Value: ${selectedLab.result.result_value} ${selectedLab.result.unit || ''}`,
            `Reference Range: ${selectedLab.result.reference_range || '—'}`,
            `Flag: ${selectedLab.result.result_status}`,
            `Interpretation: ${selectedLab.result.interpretation || '—'}`,
            `Completed: ${formatDateTime(selectedLab.result.completed_at)}`,
          ].join('\n')}
        >
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-bold text-slate-900">{selectedLab.test_name}</h4>
                <p className="text-xs text-slate-500">Order ID {selectedLab.order_id}</p>
              </div>
              <Badge variant={selectedLab.result.result_status === 'normal' ? 'emerald' : 'rose'}>
                {selectedLab.result.result_status}
              </Badge>
            </div>
            <p className="font-bold text-slate-900">
              {selectedLab.result.result_value} {selectedLab.result.unit || ''}
            </p>
            <p className="text-xs text-slate-600">
              Reference Range: {selectedLab.result.reference_range || '—'}
            </p>
            <p className="text-xs text-slate-600">
              Interpretation: {selectedLab.result.interpretation || '—'}
            </p>
          </div>
        </PrintableDocumentModal>
      )}
    </div>
  );
}

