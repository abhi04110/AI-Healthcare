import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ambulance, ArrowRight, CalendarClock, FileText, Plus, Stethoscope, UserPlus, Users } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { usePreferences } from '@/context/PreferencesContext';
import { hmsService } from '@/services/hmsService';
import { patientService } from '@/services/patientService';
import { publicService } from '@/services/publicService';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PatientEhrDrawer } from '@/components/shared/PatientEhrDrawer';
import type { Appointment, PatientResponse } from '@/types/api';

export function ReceptionDashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const { prefs } = usePreferences();
  const queryClient = useQueryClient();

  const [ptModal, setPtModal] = useState(false);
  const [apptModal, setApptModal] = useState(false);
  const [erModal, setErModal] = useState(false);
  const [drawerPatientId, setDrawerPatientId] = useState<number | null>(null);

  const [createWithPortal, setCreateWithPortal] = useState(false);
  const [ptForm, setPtForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: '',
    medical_history: '',
    email: '',
    password: '',
  });
  const [apptForm, setApptForm] = useState({
    patient_id: '',
    doctor_user_id: '',
    appointment_date: '',
    reason: '',
    notes: '',
  });
  const [erForm, setErForm] = useState({
    patient_id: '',
    priority: 'urgent',
    symptoms: '',
    vitals: '',
    admission_required: false,
  });

  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: () => patientService.listPatients() });
  const doctorsQuery = useQuery({ queryKey: ['public-doctors'], queryFn: () => publicService.getDoctors() });
  const apptsQuery = useQuery({
    queryKey: ['hms-appointments'],
    queryFn: () => hmsService.listAppointments(),
    refetchInterval: prefs.autoRefreshSeconds > 0 ? prefs.autoRefreshSeconds * 1000 : false,
  });
  const erQuery = useQuery({
    queryKey: ['hms-er'],
    queryFn: () => hmsService.listEmergencyCases(),
  });

  const createPatientMutation = useMutation({
    mutationFn: () =>
      patientService.createPatient({
        name: ptForm.name.trim(),
        age: Number(ptForm.age),
        gender: ptForm.gender,
        phone: ptForm.phone.trim() || undefined,
        address: ptForm.address.trim() || undefined,
        medical_history: ptForm.medical_history.trim() || undefined,
        email: createWithPortal && ptForm.email.trim() ? ptForm.email.trim().toLowerCase() : undefined,
        password: createWithPortal && ptForm.password.trim() ? ptForm.password.trim() : undefined,
      }),
    onSuccess: (created) => {
      toast.success(
        'Patient registered',
        `${created.name} (${created.patient_code})${createWithPortal ? ' with portal credentials' : ''}`,
      );
      setPtModal(false);
      setCreateWithPortal(false);
      setPtForm({
        name: '',
        age: '',
        gender: 'Male',
        phone: '',
        address: '',
        medical_history: '',
        email: '',
        password: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err) => toast.error('Registration failed', extractApiError(err)),
  });

  const createApptMutation = useMutation({
    mutationFn: () =>
      hmsService.createAppointment({
        patient_id: Number(apptForm.patient_id),
        doctor_user_id: Number(apptForm.doctor_user_id),
        appointment_date: apptForm.appointment_date,
        reason: apptForm.reason || undefined,
        notes: apptForm.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Appointment booked');
      setApptModal(false);
      setApptForm({ patient_id: '', doctor_user_id: '', appointment_date: '', reason: '', notes: '' });
      void queryClient.invalidateQueries({ queryKey: ['hms-appointments'] });
    },
    onError: (err) => toast.error('Booking failed', extractApiError(err)),
  });

  const updateApptStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      hmsService.updateAppointmentStatus(id, { status }),
    onSuccess: () => {
      toast.success('Appointment status updated');
      void queryClient.invalidateQueries({ queryKey: ['hms-appointments'] });
    },
    onError: (err) => toast.error('Update failed', extractApiError(err)),
  });

  const createErMutation = useMutation({
    mutationFn: () =>
      hmsService.createEmergencyCase({
        patient_id: Number(erForm.patient_id),
        priority: erForm.priority,
        symptoms: erForm.symptoms || undefined,
        vitals: erForm.vitals || undefined,
        admission_required: erForm.admission_required,
      }),
    onSuccess: () => {
      toast.success('Emergency triage case created');
      setErModal(false);
      setErForm({ patient_id: '', priority: 'urgent', symptoms: '', vitals: '', admission_required: false });
      void queryClient.invalidateQueries({ queryKey: ['hms-er'] });
    },
    onError: (err) => toast.error('ER intake failed', extractApiError(err)),
  });

  const apptColumns: ColumnDef<Appointment>[] = [
    {
      key: 'id',
      header: 'Visit',
      render: (a) => (
        <div>
          <p className="font-semibold text-slate-900">
            Appt {a.id} • {a.patient_name || `Patient ID ${a.patient_id}`}
          </p>
          <p className="text-xs text-slate-500">
            Doctor {a.doctor_user_id} • {a.reason || 'Consultation'}
          </p>
        </div>
      ),
    },
    { key: 'when', header: 'Date & Time', render: (a) => formatDateTime(a.appointment_date) },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'upd',
      header: 'Check-In Status',
      render: (a) => (
        <select
          value={a.status}
          onChange={(e) => updateApptStatusMutation.mutate({ id: a.id, status: e.target.value })}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        >
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      ),
    },
  ];

  const ptColumns: ColumnDef<PatientResponse>[] = [
    {
      key: 'name',
      header: 'Patient',
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.name}</p>
          <p className="text-xs text-slate-500">
            {p.patient_code} • ID {p.id}
          </p>
        </div>
      ),
    },
    { key: 'demo', header: 'Age & Gender', render: (p) => `${p.age} yrs • ${p.gender}` },
    { key: 'phone', header: 'Phone', render: (p) => p.phone || '—' },
    {
      key: 'ehr',
      header: 'Intake EHR',
      render: (p) => (
        <button
          type="button"
          onClick={() => setDrawerPatientId(p.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <FileText className="h-3.5 w-3.5" />
          Records
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Hospital Front Desk & Triage Intake</h2>
          <p className="text-xs text-slate-500">
            Register walk-in patients, schedule appointments with available doctors, or log ER arrivals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/reception/patients')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Users className="h-4 w-4 text-sky-600" />
            Patient Directory
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateWithPortal(false);
              setPtModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
          >
            <UserPlus className="h-4 w-4" />
            Register Patient
          </button>
          <button
            type="button"
            onClick={() => setApptModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Book Appointment
          </button>
          <button
            type="button"
            onClick={() => setErModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
          >
            <Ambulance className="h-4 w-4" />
            Emergency Intake
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Accessible Patients"
          value={patientsQuery.data?.length ?? 0}
          icon={UserPlus}
          tone="blue"
        />
        <StatCard
          label="Total Appointments"
          value={apptsQuery.data?.length ?? 0}
          icon={CalendarClock}
          tone="teal"
        />
        <StatCard label="ER Queue" value={erQuery.data?.length ?? 0} icon={Ambulance} tone="rose" />
      </div>

      <Card>
        <CardHeader
          title="On-Duty OPD Doctors"
          subtitle="Real-time shift schedule for quick appointment allocation and triage"
        />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(doctorsQuery.data ?? []).map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
              >
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">Dr. {doc.name}</p>
                  <p className="text-[11px] text-slate-600 truncate">{doc.department}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Shift: {doc.shift_start} – {doc.shift_end}
                  </p>
                </div>
              </div>
            ))}
            {(doctorsQuery.data ?? []).length === 0 && (
              <p className="col-span-full text-xs text-slate-500 text-center py-2">
                No active doctor profiles found.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Appointments Queue" subtitle="Scheduled visits and front-desk check-in status" />
        <CardBody>
          <DataTable
            data={apptsQuery.data ?? []}
            columns={apptColumns}
            rowKey={(a) => a.id}
            isLoading={apptsQuery.isLoading}
            searchPlaceholder="Search appointment ID, patient, or reason..."
            searchFn={(a, q) =>
              `${a.id} ${a.patient_name ?? ''} ${a.patient_id} ${a.reason ?? ''}`
                .toLowerCase()
                .includes(q)
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Registered Intake Patients"
          subtitle="Patients registered for hospital care"
          action={
            <button
              type="button"
              onClick={() => navigate('/reception/patients')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-clinical-600 hover:text-clinical-700"
            >
              Open Full Directory
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        />
        <CardBody>
          <DataTable
            data={patientsQuery.data ?? []}
            columns={ptColumns}
            rowKey={(p) => p.id}
            isLoading={patientsQuery.isLoading}
            searchPlaceholder="Search patient name, code, or phone..."
            searchFn={(p, q) => `${p.name} ${p.patient_code} ${p.phone ?? ''}`.toLowerCase().includes(q)}
          />
        </CardBody>
      </Card>

      <Modal open={ptModal} onClose={() => setPtModal(false)} title="Register Walk-In Patient">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPatientMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Full Name *"
              value={ptForm.name}
              onChange={(e) => setPtForm({ ...ptForm, name: e.target.value })}
              className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              required
              min={0}
              max={130}
              placeholder="Age *"
              value={ptForm.age}
              onChange={(e) => setPtForm({ ...ptForm, age: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={ptForm.gender}
              onChange={(e) => setPtForm({ ...ptForm, gender: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <input
              placeholder="Phone Number"
              value={ptForm.phone}
              onChange={(e) => setPtForm({ ...ptForm, phone: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              placeholder="Residential Address"
              value={ptForm.address}
              onChange={(e) => setPtForm({ ...ptForm, address: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              placeholder="Medical History / Notes (optional)"
              value={ptForm.medical_history}
              onChange={(e) => setPtForm({ ...ptForm, medical_history: e.target.value })}
              className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={createWithPortal}
                onChange={(e) => setCreateWithPortal(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-clinical-600 focus:ring-clinical-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">
                  Create Online Patient Portal Login
                </span>
                <p className="text-[11px] text-slate-500">
                  Enables patient to log into Patient Portal to view lab reports, e-prescriptions & bills online.
                </p>
              </div>
            </label>

            {createWithPortal && (
              <div className="grid gap-3 pt-2 sm:grid-cols-2 border-t border-slate-200">
                <input
                  type="email"
                  required={createWithPortal}
                  placeholder="Portal Login Email *"
                  value={ptForm.email}
                  onChange={(e) => setPtForm({ ...ptForm, email: e.target.value })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  required={createWithPortal}
                  placeholder="Temporary Password *"
                  value={ptForm.password}
                  onChange={(e) => setPtForm({ ...ptForm, password: e.target.value })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPtModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPatientMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-50"
            >
              {createPatientMutation.isPending ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={apptModal} onClose={() => setApptModal(false)} title="Book Doctor Appointment">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createApptMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            required
            value={apptForm.patient_id}
            onChange={(e) => setApptForm({ ...apptForm, patient_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select Patient...</option>
            {(patientsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.patient_code})
              </option>
            ))}
          </select>
          <select
            required
            value={apptForm.doctor_user_id}
            onChange={(e) => setApptForm({ ...apptForm, doctor_user_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select Doctor...</option>
            {(doctorsQuery.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.name} — {d.department} ({d.shift_start}–{d.shift_end})
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            required
            value={apptForm.appointment_date}
            onChange={(e) => setApptForm({ ...apptForm, appointment_date: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Reason for visit"
            value={apptForm.reason}
            onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
              Confirm Booking
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={erModal} onClose={() => setErModal(false)} title="Emergency Department Intake">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createErMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            required
            value={erForm.patient_id}
            onChange={(e) => setErForm({ ...erForm, patient_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select Patient...</option>
            {(patientsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.patient_code})
              </option>
            ))}
          </select>
          <select
            value={erForm.priority}
            onChange={(e) => setErForm({ ...erForm, priority: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="critical">Critical</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
          <input
            placeholder="Presenting symptoms"
            value={erForm.symptoms}
            onChange={(e) => setErForm({ ...erForm, symptoms: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Initial triage vitals"
            value={erForm.vitals}
            onChange={(e) => setErForm({ ...erForm, vitals: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
              Log Emergency Case
            </button>
          </div>
        </form>
      </Modal>

      <PatientEhrDrawer
        patientId={drawerPatientId}
        open={drawerPatientId !== null}
        onClose={() => setDrawerPatientId(null)}
        canRunMlPrediction={false}
      />
    </div>
  );
}

