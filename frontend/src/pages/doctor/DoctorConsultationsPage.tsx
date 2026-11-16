import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pill, Plus, Printer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { hmsService } from '@/services/hmsService';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PrintableDocumentModal } from '@/components/shared/PrintableDocument';
import type { Consultation, Prescription } from '@/types/api';

export function DoctorConsultationsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [rxTargetConsult, setRxTargetConsult] = useState<Consultation | null>(null);
  const [printRx, setPrintRx] = useState<Prescription | null>(null);
  const [rxForm, setRxForm] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'Twice daily',
    duration: '5 days',
    instructions: '',
  });

  const consultationsQuery = useQuery({
    queryKey: ['doctor-consultations'],
    queryFn: () => hmsService.getMyConsultations(),
  });
  const prescriptionsQuery = useQuery({
    queryKey: ['doctor-prescriptions'],
    queryFn: () => hmsService.getMyPrescriptions(),
  });
  const medicinesQuery = useQuery({
    queryKey: ['hms-medicines'],
    queryFn: () => hmsService.listMedicines(),
  });

  const rxByConsultId = useMemo(() => {
    const map = new Map<number, Prescription>();
    for (const rx of prescriptionsQuery.data ?? []) {
      map.set(rx.consultation_id, rx);
    }
    return map;
  }, [prescriptionsQuery.data]);

  const createRxMutation = useMutation({
    mutationFn: () =>
      hmsService.createPrescription({
        consultation_id: rxTargetConsult!.id,
        medicine_name: rxForm.medicine_name,
        dosage: rxForm.dosage,
        frequency: rxForm.frequency,
        duration: rxForm.duration,
        instructions: rxForm.instructions || undefined,
      }),
    onSuccess: () => {
      toast.success('E-Prescription issued');
      setRxTargetConsult(null);
      setRxForm({ medicine_name: '', dosage: '', frequency: 'Twice daily', duration: '5 days', instructions: '' });
      void queryClient.invalidateQueries({ queryKey: ['doctor-prescriptions'] });
    },
    onError: (err) => toast.error('Prescription creation failed', extractApiError(err)),
  });

  const consultColumns: ColumnDef<Consultation>[] = [
    {
      key: 'id',
      header: 'Consultation',
      render: (c) => (
        <div>
          <p className="font-semibold text-slate-900">Consultation {c.id}</p>
          <p className="text-xs text-slate-500">
            Appointment {c.appointment_id} • Patient {c.patient_id}
          </p>
        </div>
      ),
    },
    {
      key: 'clinical',
      header: 'Diagnosis & Plan',
      render: (c) => (
        <div className="text-xs space-y-1">
          <p className="font-semibold text-slate-900">{c.diagnosis || 'No diagnosis'}</p>
          <p className="text-slate-600">{c.treatment_plan || '—'}</p>
          <p className="text-slate-400">Symptoms: {c.symptoms || '—'}</p>
        </div>
      ),
    },
    { key: 'created', header: 'Recorded', render: (c) => formatDateTime(c.created_at) },
    {
      key: 'rx',
      header: 'E-Prescription',
      render: (c) => {
        const existing = rxByConsultId.get(c.id);
        if (existing) {
          return (
            <button
              type="button"
              onClick={() => setPrintRx(existing)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Rx {existing.id}
            </button>
          );
        }
        return (
          <button
            type="button"
            onClick={() => setRxTargetConsult(c)}
            className="inline-flex items-center gap-1 rounded-lg bg-clinical-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-clinical-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Issue Rx
          </button>
        );
      },
    },
  ];

  const rxColumns: ColumnDef<Prescription>[] = [
    {
      key: 'med',
      header: 'Medication',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.medicine_name}</p>
          <p className="text-xs text-slate-500">
            Rx ID {r.id} • Consultation {r.consultation_id} • Patient {r.patient_id}
          </p>
        </div>
      ),
    },
    {
      key: 'regimen',
      header: 'Dosage & Duration',
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
    {
      key: 'print',
      header: 'Print / Export',
      render: (r) => (
        <button
          type="button"
          onClick={() => setPrintRx(r)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Printer className="h-3.5 w-3.5" />
          View / Print
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="My Consultations History"
          subtitle="Write an e-prescription from any consultation (backend supports one Rx record per consultation)."
          action={<FileText className="h-5 w-5 text-clinical-600" />}
        />
        <CardBody>
          <DataTable
            data={consultationsQuery.data ?? []}
            columns={consultColumns}
            rowKey={(c) => c.id}
            isLoading={consultationsQuery.isLoading}
            searchPlaceholder="Search diagnosis, symptoms, or patient ID..."
            searchFn={(c, q) =>
              `${c.diagnosis ?? ''} ${c.symptoms ?? ''} ${c.patient_id}`.toLowerCase().includes(q)
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Issued E-Prescriptions"
          subtitle="All prescriptions written during your consultations."
          action={<Pill className="h-5 w-5 text-emerald-600" />}
        />
        <CardBody>
          <DataTable
            data={prescriptionsQuery.data ?? []}
            columns={rxColumns}
            rowKey={(r) => r.id}
            isLoading={prescriptionsQuery.isLoading}
            searchPlaceholder="Search medicine or instructions..."
            searchFn={(r, q) =>
              `${r.medicine_name} ${r.instructions ?? ''} ${r.patient_id}`.toLowerCase().includes(q)
            }
          />
        </CardBody>
      </Card>

      <Modal
        open={rxTargetConsult !== null}
        onClose={() => setRxTargetConsult(null)}
        title={`Issue E-Prescription (Consultation ${rxTargetConsult?.id ?? ''})`}
        subtitle="Specify medicine, dosage, schedule, and patient instructions."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRxMutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700">Medicine Name</label>
            <input
              list="pharmacy-medicine-catalog"
              required
              value={rxForm.medicine_name}
              onChange={(e) => setRxForm({ ...rxForm, medicine_name: e.target.value })}
              placeholder="Select from pharmacy stock or enter medication..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <datalist id="pharmacy-medicine-catalog">
              {(medicinesQuery.data ?? []).map((m) => (
                <option key={m.id} value={m.medicine_name}>
                  {m.generic_name || m.category || ''} ({m.quantity} in stock)
                </option>
              ))}
            </datalist>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Dosage</label>
              <input
                required
                placeholder="e.g. 500mg"
                value={rxForm.dosage}
                onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Frequency</label>
              <input
                required
                value={rxForm.frequency}
                onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Duration</label>
              <input
                required
                value={rxForm.duration}
                onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Instructions</label>
            <textarea
              rows={2}
              value={rxForm.instructions}
              onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
              placeholder="Take after meals..."
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRxTargetConsult(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRxMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              {createRxMutation.isPending ? 'Issuing...' : 'Issue Prescription'}
            </button>
          </div>
        </form>
      </Modal>

      {printRx && (
        <PrintableDocumentModal
          open={true}
          onClose={() => setPrintRx(null)}
          title={`E-Prescription ${printRx.id}`}
          filename={`prescription-${printRx.id}.txt`}
          plainTextSummary={[
            'MedCore AI Hospital — E-Prescription',
            `Rx ID: ${printRx.id} | Consultation: ${printRx.consultation_id} | Patient: ${printRx.patient_id}`,
            `Prescribing Physician: Dr. ${user?.name ?? ''}`,
            `Date: ${formatDateTime(printRx.created_at)}`,
            '',
            `Medication: ${printRx.medicine_name}`,
            `Dosage: ${printRx.dosage}`,
            `Frequency: ${printRx.frequency}`,
            `Duration: ${printRx.duration}`,
            `Instructions: ${printRx.instructions || 'Take as directed'}`,
          ].join('\n')}
        >
          <div className="space-y-4 text-sm">
            <div className="border-b border-slate-200 pb-3">
              <h4 className="text-lg font-bold text-slate-900">MedCore AI Hospital — E-Prescription</h4>
              <p className="text-xs text-slate-500">
                Prescription {printRx.id} • Issued by Dr. {user?.name} • {formatDateTime(printRx.created_at)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Medication</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{printRx.medicine_name}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Regimen</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {printRx.dosage} • {printRx.frequency} ({printRx.duration})
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 text-xs">
              <p className="font-semibold text-slate-700">Clinical Instructions</p>
              <p className="mt-1 text-slate-600">{printRx.instructions || 'Take as directed.'}</p>
            </div>
          </div>
        </PrintableDocumentModal>
      )}
    </div>
  );
}

