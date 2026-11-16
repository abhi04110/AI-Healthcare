import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pill, Printer } from 'lucide-react';
import { publicService } from '@/services/publicService';
import { formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { PrintableDocumentModal } from '@/components/shared/PrintableDocument';
import type { PatientPrescriptionItem } from '@/types/api';

export function PatientPrescriptionsPage() {
  const [selectedRx, setSelectedRx] = useState<PatientPrescriptionItem | null>(null);

  const rxQuery = useQuery({
    queryKey: ['patient-my-rx'],
    queryFn: () => publicService.getMyPrescriptions(),
  });

  const columns: ColumnDef<PatientPrescriptionItem>[] = [
    {
      key: 'med',
      header: 'Medication',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.medicine_name}</p>
          <p className="text-xs text-slate-500">Prescribed by Dr. {r.doctor_name}</p>
        </div>
      ),
    },
    {
      key: 'regimen',
      header: 'Dosage & Schedule',
      render: (r) => (
        <div className="text-xs">
          <Badge variant="blue">
            {r.dosage} • {r.frequency}
          </Badge>
          <p className="mt-1 text-slate-500">Duration: {r.duration}</p>
        </div>
      ),
    },
    { key: 'inst', header: 'Instructions', render: (r) => r.instructions || 'Take as directed' },
    { key: 'date', header: 'Issued', render: (r) => formatDateTime(r.created_at) },
    {
      key: 'print',
      header: 'Download',
      render: (r) => (
        <button
          type="button"
          onClick={() => setSelectedRx(r)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Printer className="h-3.5 w-3.5" />
          Print / TXT
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="My E-Prescriptions"
          subtitle="View active medications and dosage instructions prescribed by your doctors."
          action={<Pill className="h-5 w-5 text-emerald-600" />}
        />
        <CardBody>
          <DataTable
            data={rxQuery.data ?? []}
            columns={columns}
            rowKey={(r) => r.id}
            isLoading={rxQuery.isLoading}
            searchPlaceholder="Search medicine or doctor..."
            searchFn={(r, q) =>
              `${r.medicine_name} ${r.doctor_name} ${r.instructions ?? ''}`.toLowerCase().includes(q)
            }
          />
        </CardBody>
      </Card>

      {selectedRx && (
        <PrintableDocumentModal
          open={true}
          onClose={() => setSelectedRx(null)}
          title={`Prescription ${selectedRx.id}`}
          filename={`prescription-${selectedRx.id}.txt`}
          plainTextSummary={[
            `MedCore AI Hospital — Patient E-Prescription ${selectedRx.id}`,
            `Doctor: Dr. ${selectedRx.doctor_name}`,
            `Date: ${formatDateTime(selectedRx.created_at)}`,
            `Medicine: ${selectedRx.medicine_name}`,
            `Dosage: ${selectedRx.dosage} | Frequency: ${selectedRx.frequency} | Duration: ${selectedRx.duration}`,
            `Instructions: ${selectedRx.instructions || 'Take as directed'}`,
          ].join('\n')}
        >
          <div className="space-y-3 text-sm">
            <h4 className="font-bold text-slate-900">MedCore AI Hospital — Prescription {selectedRx.id}</h4>
            <p className="text-xs text-slate-500">
              Prescribed by Dr. {selectedRx.doctor_name} • {formatDateTime(selectedRx.created_at)}
            </p>
            <div className="rounded-xl bg-slate-50 p-4 text-xs space-y-1">
              <p className="text-base font-bold text-slate-900">{selectedRx.medicine_name}</p>
              <p>
                {selectedRx.dosage} • {selectedRx.frequency} • {selectedRx.duration}
              </p>
              <p className="pt-2 text-slate-600">
                Instructions: {selectedRx.instructions || 'Take as directed.'}
              </p>
            </div>
          </div>
        </PrintableDocumentModal>
      )}
    </div>
  );
}

