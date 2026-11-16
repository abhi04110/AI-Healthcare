import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, FilePlus2, FileText } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { usePreferences } from '@/context/PreferencesContext';
import { hmsService } from '@/services/hmsService';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PatientEhrDrawer } from '@/components/shared/PatientEhrDrawer';
import type { Appointment } from '@/types/api';

export function DoctorAppointmentsPage() {
  const toast = useToast();
  const { prefs } = usePreferences();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [consultModalAppt, setConsultModalAppt] = useState<Appointment | null>(null);
  const [drawerPatientId, setDrawerPatientId] = useState<number | null>(null);
  const [consultForm, setConsultForm] = useState({
    symptoms: '',
    diagnosis: '',
    treatment_plan: '',
    follow_up_date: '',
    notes: '',
  });

  const apptsQuery = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => hmsService.getMyDoctorAppointments(),
    refetchInterval: prefs.autoRefreshSeconds > 0 ? prefs.autoRefreshSeconds * 1000 : false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      hmsService.updateAppointmentStatus(id, { status }),
    onSuccess: () => {
      toast.success('Appointment status updated');
      void queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (err) => toast.error('Status update failed', extractApiError(err)),
  });

  const createConsultMutation = useMutation({
    mutationFn: () =>
      hmsService.createConsultation({
        appointment_id: consultModalAppt!.id,
        symptoms: consultForm.symptoms || undefined,
        diagnosis: consultForm.diagnosis || undefined,
        treatment_plan: consultForm.treatment_plan || undefined,
        follow_up_date: consultForm.follow_up_date ? `${consultForm.follow_up_date}T09:00:00` : null,
        notes: consultForm.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Consultation recorded');
      setConsultModalAppt(null);
      setConsultForm({ symptoms: '', diagnosis: '', treatment_plan: '', follow_up_date: '', notes: '' });
      void queryClient.invalidateQueries({ queryKey: ['doctor-consultations'] });
      void queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (err) => toast.error('Consultation creation failed', extractApiError(err)),
  });

  const filtered = (apptsQuery.data ?? []).filter((a) =>
    statusFilter === 'all' ? true : a.status === statusFilter,
  );

  const columns: ColumnDef<Appointment>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (a) => (
        <div>
          <p className="font-semibold text-slate-900">{a.patient_name || `Patient ID ${a.patient_id}`}</p>
          <p className="text-xs text-slate-500">Appointment {a.id} • Patient ID {a.patient_id}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Scheduled Time & Reason',
      render: (a) => (
        <div>
          <p className="font-medium text-slate-800">{formatDateTime(a.appointment_date)}</p>
          <p className="text-xs text-slate-500">{a.reason || 'Consultation'}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'actions',
      header: 'Clinical Workflow',
      render: (a) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDrawerPatientId(a.patient_id)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5" />
            EHR
          </button>
          <button
            type="button"
            onClick={() => setConsultModalAppt(a)}
            className="inline-flex items-center gap-1 rounded-lg bg-clinical-50 px-2.5 py-1 text-xs font-semibold text-clinical-700 hover:bg-clinical-100"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Write Consultation
          </button>
          <select
            value={a.status}
            onChange={(e) => updateStatusMutation.mutate({ id: a.id, status: e.target.value })}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="My Patient Appointments Queue"
          subtitle="Update appointment status, open patient health records, and record consultation notes."
          action={<CalendarClock className="h-5 w-5 text-clinical-600" />}
        />
        <CardBody>
          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(a) => a.id}
            isLoading={apptsQuery.isLoading}
            searchPlaceholder="Search patient name or reason..."
            searchFn={(a, q) =>
              `${a.patient_name ?? ''} ${a.patient_id} ${a.reason ?? ''} ${a.status}`
                .toLowerCase()
                .includes(q)
            }
            toolbarExtra={
              <div className="flex flex-wrap gap-1.5">
                {['all', 'scheduled', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize ${
                      statusFilter === status
                        ? 'bg-clinical-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            }
          />
        </CardBody>
      </Card>

      <Modal
        open={consultModalAppt !== null}
        onClose={() => setConsultModalAppt(null)}
        title={`Document Consultation — Appointment ${consultModalAppt?.id ?? ''}`}
        subtitle={`Patient ID ${consultModalAppt?.patient_id ?? ''} • Record symptoms, diagnosis, and care plan`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createConsultMutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700">Presenting Symptoms</label>
            <textarea
              required
              rows={2}
              value={consultForm.symptoms}
              onChange={(e) => setConsultForm({ ...consultForm, symptoms: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Clinical Diagnosis</label>
            <input
              required
              value={consultForm.diagnosis}
              onChange={(e) => setConsultForm({ ...consultForm, diagnosis: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Treatment Plan</label>
            <textarea
              required
              rows={2}
              value={consultForm.treatment_plan}
              onChange={(e) => setConsultForm({ ...consultForm, treatment_plan: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Follow-up Date</label>
              <input
                type="date"
                value={consultForm.follow_up_date}
                onChange={(e) => setConsultForm({ ...consultForm, follow_up_date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Clinical Notes</label>
              <input
                value={consultForm.notes}
                onChange={(e) => setConsultForm({ ...consultForm, notes: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConsultModalAppt(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createConsultMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-60"
            >
              {createConsultMutation.isPending ? 'Saving...' : 'Save Consultation'}
            </button>
          </div>
        </form>
      </Modal>

      <PatientEhrDrawer
        patientId={drawerPatientId}
        open={drawerPatientId !== null}
        onClose={() => setDrawerPatientId(null)}
        canRunMlPrediction={true}
      />
    </div>
  );
}

