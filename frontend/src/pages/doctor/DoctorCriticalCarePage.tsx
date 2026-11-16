import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ambulance, BedDouble, Scissors } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { hmsService } from '@/services/hmsService';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import type { EmergencyCase, ICUAdmission, OperationTheatreCase } from '@/types/api';

export function DoctorCriticalCarePage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const erQuery = useQuery({ queryKey: ['doctor-er'], queryFn: () => hmsService.listEmergencyCases() });
  const icuQuery = useQuery({ queryKey: ['doctor-icu'], queryFn: () => hmsService.listIcuAdmissions() });
  const otQuery = useQuery({ queryKey: ['doctor-ot'], queryFn: () => hmsService.listOtCases() });

  const erMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      hmsService.updateEmergencyStatus(id, { status }),
    onSuccess: () => {
      toast.success('ER case status updated');
      void queryClient.invalidateQueries({ queryKey: ['doctor-er'] });
    },
    onError: (err) => toast.error('ER update failed', extractApiError(err)),
  });

  const icuMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      hmsService.updateIcuStatus(id, { status }),
    onSuccess: () => {
      toast.success('ICU status updated');
      void queryClient.invalidateQueries({ queryKey: ['doctor-icu'] });
    },
    onError: (err) => toast.error('ICU update failed', extractApiError(err)),
  });

  const otMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      hmsService.updateOtStatus(id, { status }),
    onSuccess: () => {
      toast.success('OT surgery status updated');
      void queryClient.invalidateQueries({ queryKey: ['doctor-ot'] });
    },
    onError: (err) => toast.error('OT update failed', extractApiError(err)),
  });

  const erColumns: ColumnDef<EmergencyCase>[] = [
    { key: 'id', header: 'Case', render: (c) => `Case ${c.id} • Patient ${c.patient_id}` },
    { key: 'priority', header: 'Priority', render: (c) => <StatusBadge status={c.priority} /> },
    {
      key: 'notes',
      header: 'Symptoms & Vitals',
      render: (c) => (
        <div className="text-xs">
          <p>{c.symptoms || '—'}</p>
          <p className="text-slate-500">{c.vitals || 'No vitals logged'}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'upd',
      header: 'Update',
      render: (c) => (
        <select
          value={c.status}
          onChange={(e) => erMutation.mutate({ id: c.id, status: e.target.value })}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        >
          <option value="waiting">Waiting</option>
          <option value="in_treatment">In Treatment</option>
          <option value="admitted">Admitted</option>
          <option value="discharged">Discharged</option>
          <option value="cancelled">Cancelled</option>
        </select>
      ),
    },
  ];

  const icuColumns: ColumnDef<ICUAdmission>[] = [
    { key: 'bed', header: 'Bed & Patient', render: (c) => `Bed ${c.bed_number} • Patient ${c.patient_id}` },
    { key: 'reason', header: 'Reason', render: (c) => c.admission_reason },
    { key: 'vitals', header: 'Vitals', render: (c) => c.vitals || '—' },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'upd',
      header: 'Update',
      render: (c) => (
        <select
          value={c.status}
          onChange={(e) => icuMutation.mutate({ id: c.id, status: e.target.value })}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        >
          <option value="admitted">Admitted</option>
          <option value="critical">Critical</option>
          <option value="stable">Stable</option>
          <option value="discharged">Discharged</option>
        </select>
      ),
    },
  ];

  const otColumns: ColumnDef<OperationTheatreCase>[] = [
    {
      key: 'op',
      header: 'Procedure',
      render: (c) => (
        <div>
          <p className="font-semibold text-slate-900">{c.operation_name}</p>
          <p className="text-xs text-slate-500">
            {c.theatre_number} • Patient {c.patient_id} • {formatDateTime(c.scheduled_at)}
          </p>
        </div>
      ),
    },
    { key: 'diag', header: 'Diagnosis', render: (c) => c.diagnosis || '—' },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'upd',
      header: 'Update',
      render: (c) => (
        <select
          value={c.status}
          onChange={(e) => otMutation.mutate({ id: c.id, status: e.target.value })}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        >
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Assigned Emergency Cases"
          action={<Ambulance className="h-5 w-5 text-rose-600" />}
        />
        <CardBody>
          <DataTable data={erQuery.data ?? []} columns={erColumns} rowKey={(c) => c.id} isLoading={erQuery.isLoading} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Assigned ICU Admissions"
          action={<BedDouble className="h-5 w-5 text-clinical-600" />}
        />
        <CardBody>
          <DataTable data={icuQuery.data ?? []} columns={icuColumns} rowKey={(c) => c.id} isLoading={icuQuery.isLoading} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Assigned Operation Theatre Cases"
          action={<Scissors className="h-5 w-5 text-violet-600" />}
        />
        <CardBody>
          <DataTable data={otQuery.data ?? []} columns={otColumns} rowKey={(c) => c.id} isLoading={otQuery.isLoading} />
        </CardBody>
      </Card>
    </div>
  );
}

