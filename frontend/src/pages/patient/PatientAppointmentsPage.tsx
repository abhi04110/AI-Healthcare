import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus, XCircle } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { publicService } from '@/services/publicService';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { PatientAppointmentItem } from '@/types/api';

export function PatientAppointmentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');

  const apptsQuery = useQuery({
    queryKey: ['patient-my-appts'],
    queryFn: () => publicService.getMyAppointments(),
  });
  const doctorsQuery = useQuery({
    queryKey: ['public-doctors'],
    queryFn: () => publicService.getDoctors(),
  });
  const slotsQuery = useQuery({
    queryKey: ['public-availability', doctorId, day],
    queryFn: () => publicService.getAvailability(Number(doctorId), day),
    enabled: Boolean(doctorId && day),
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      publicService.bookExisting({
        doctor_user_id: Number(doctorId),
        appointment_date: slot,
        reason,
      }),
    onSuccess: () => {
      toast.success('Appointment booked successfully');
      setBookOpen(false);
      setSlot('');
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['patient-my-appts'] });
    },
    onError: (err) => toast.error('Booking failed', extractApiError(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => publicService.cancelMyAppointment(id),
    onSuccess: () => {
      toast.success('Appointment cancelled');
      void queryClient.invalidateQueries({ queryKey: ['patient-my-appts'] });
    },
    onError: (err) => toast.error('Cancellation failed', extractApiError(err)),
  });

  const columns: ColumnDef<PatientAppointmentItem>[] = [
    {
      key: 'doc',
      header: 'Doctor',
      render: (a) => (
        <div>
          <p className="font-semibold text-slate-900">Dr. {a.doctor_name}</p>
          <p className="text-xs text-slate-500">{a.doctor_email || ''}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Scheduled Slot & Reason',
      render: (a) => (
        <div>
          <p className="font-medium text-slate-800">{formatDateTime(a.appointment_date)}</p>
          <p className="text-xs text-slate-500">{a.reason || 'Consultation'}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'action',
      header: 'Actions',
      render: (a) =>
        a.status === 'scheduled' ? (
          <button
            type="button"
            onClick={() => cancelMutation.mutate(a.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
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
          title="My Hospital Appointments"
          subtitle="Track upcoming visits or book a new consultation with a doctor."
          action={
            <button
              type="button"
              onClick={() => setBookOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              <Plus className="h-4 w-4" />
              Book New Visit
            </button>
          }
        />
        <CardBody>
          <DataTable
            data={apptsQuery.data?.appointments ?? []}
            columns={columns}
            rowKey={(a) => a.id}
            isLoading={apptsQuery.isLoading}
            searchPlaceholder="Search doctor, reason, or status..."
            searchFn={(a, q) =>
              `${a.doctor_name} ${a.reason ?? ''} ${a.status}`.toLowerCase().includes(q)
            }
            toolbarExtra={<CalendarClock className="h-4 w-4 text-clinical-600" />}
          />
        </CardBody>
      </Card>

      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title="Book Doctor Appointment"
        subtitle="Select a doctor and date to view live 30-minute open slots."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            bookMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700">Doctor</label>
            <select
              required
              value={doctorId}
              onChange={(e) => {
                setDoctorId(e.target.value);
                setSlot('');
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Choose a doctor...</option>
              {(doctorsQuery.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.name} — {d.department} ({d.specialty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Preferred Date</label>
            <input
              type="date"
              required
              min={new Date().toISOString().slice(0, 10)}
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setSlot('');
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          {doctorId && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Available Time Slots ({slotsQuery.data?.slots?.length ?? 0})
              </label>
              {slotsQuery.isLoading ? (
                <p className="mt-1 text-xs text-slate-500">Checking availability...</p>
              ) : (slotsQuery.data?.slots ?? []).length === 0 ? (
                <p className="mt-1 text-xs text-rose-600">
                  No open slots available for this doctor on {day}.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {slotsQuery.data?.slots.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSlot(s.value)}
                      className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                        slot === s.value
                          ? 'border-clinical-600 bg-clinical-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">Reason for Visit</label>
            <input
              required
              placeholder="e.g. Routine checkup, elevated blood pressure follow-up"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBookOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!slot || bookMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-50"
            >
              {bookMutation.isPending ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

