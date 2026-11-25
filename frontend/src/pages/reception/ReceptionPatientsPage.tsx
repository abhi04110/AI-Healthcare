import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Edit2,
  FileText,
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { patientService } from '@/services/patientService';
import { hmsService } from '@/services/hmsService';
import { publicService } from '@/services/publicService';
import { extractApiError } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { PatientEhrDrawer } from '@/components/shared/PatientEhrDrawer';
import type { PatientResponse } from '@/types/api';

export function ReceptionPatientsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Drawers & Modals
  const [drawerPatientId, setDrawerPatientId] = useState<number | null>(null);
  const [registerModal, setRegisterModal] = useState(false);
  const [portalModalPatient, setPortalModalPatient] = useState<PatientResponse | null>(null);
  const [editModalPatient, setEditModalPatient] = useState<PatientResponse | null>(null);
  const [apptModalPatient, setApptModalPatient] = useState<PatientResponse | null>(null);

  // Registration Form
  const [createWithPortal, setCreateWithPortal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: '',
    medical_history: '',
    email: '',
    password: '',
  });

  // Portal Account Form (for existing walk-in patients)
  const [portalForm, setPortalForm] = useState({
    email: '',
    password: '',
  });

  // Edit Demographics Form
  const [editForm, setEditForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: '',
    medical_history: '',
  });

  // Appointment Form
  const [apptForm, setApptForm] = useState({
    doctor_user_id: '',
    appointment_date: '',
    reason: '',
    notes: '',
  });

  // Queries
  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.listPatients(),
  });

  const doctorsQuery = useQuery({
    queryKey: ['public-doctors'],
    queryFn: () => publicService.getDoctors(),
  });

  // Mutations
  const registerMutation = useMutation({
    mutationFn: () =>
      patientService.createPatient({
        name: regForm.name.trim(),
        age: Number(regForm.age),
        gender: regForm.gender,
        phone: regForm.phone.trim() || undefined,
        address: regForm.address.trim() || undefined,
        medical_history: regForm.medical_history.trim() || undefined,
        email: createWithPortal && regForm.email.trim() ? regForm.email.trim().toLowerCase() : undefined,
        password: createWithPortal && regForm.password.trim() ? regForm.password.trim() : undefined,
      }),
    onSuccess: (created) => {
      toast.success(
        'Patient registered',
        `${created.name} (${created.patient_code})${createWithPortal ? ' with portal credentials' : ''}`,
      );
      setRegisterModal(false);
      setCreateWithPortal(false);
      setRegForm({
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

  const portalAccountMutation = useMutation({
    mutationFn: () => {
      if (!portalModalPatient) throw new Error('No patient selected');
      return patientService.createPortalAccount(portalModalPatient.id, {
        email: portalForm.email.trim().toLowerCase(),
        password: portalForm.password.trim(),
      });
    },
    onSuccess: (res) => {
      toast.success('Portal Account Created', res.message);
      setPortalModalPatient(null);
      setPortalForm({ email: '', password: '' });
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err) => toast.error('Failed to create portal login', extractApiError(err)),
  });

  const editPatientMutation = useMutation({
    mutationFn: () => {
      if (!editModalPatient) throw new Error('No patient selected');
      return patientService.updatePatient(editModalPatient.id, {
        name: editForm.name.trim(),
        age: Number(editForm.age),
        gender: editForm.gender,
        phone: editForm.phone.trim() || undefined,
        address: editForm.address.trim() || undefined,
        medical_history: editForm.medical_history.trim() || undefined,
      });
    },
    onSuccess: (updated) => {
      toast.success('Demographics updated', updated.name);
      setEditModalPatient(null);
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err) => toast.error('Update failed', extractApiError(err)),
  });

  const bookApptMutation = useMutation({
    mutationFn: () => {
      if (!apptModalPatient) throw new Error('No patient selected');
      return hmsService.createAppointment({
        patient_id: apptModalPatient.id,
        doctor_user_id: Number(apptForm.doctor_user_id),
        appointment_date: apptForm.appointment_date,
        reason: apptForm.reason.trim() || undefined,
        notes: apptForm.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Appointment booked', 'Doctor assigned and visit scheduled');
      setApptModalPatient(null);
      setApptForm({ doctor_user_id: '', appointment_date: '', reason: '', notes: '' });
      void queryClient.invalidateQueries({ queryKey: ['hms-appointments'] });
    },
    onError: (err) => toast.error('Appointment booking failed', extractApiError(err)),
  });

  const patients = patientsQuery.data ?? [];
  const portalActiveCount = patients.filter((p) => p.user_id !== null).length;
  const walkInOnlyCount = patients.length - portalActiveCount;

  const openEditModal = (p: PatientResponse) => {
    setEditModalPatient(p);
    setEditForm({
      name: p.name,
      age: String(p.age),
      gender: p.gender,
      phone: p.phone || '',
      address: p.address || '',
      medical_history: p.medical_history || '',
    });
  };

  const openApptModal = (p: PatientResponse) => {
    setApptModalPatient(p);
    setApptForm({
      doctor_user_id: '',
      appointment_date: '',
      reason: 'General Consultation',
      notes: '',
    });
  };

  const columns: ColumnDef<PatientResponse>[] = [
    {
      key: 'name',
      header: 'Patient Details',
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.name}</p>
          <p className="text-xs text-slate-500 font-mono">
            {p.patient_code} • ID #{p.id}
          </p>
        </div>
      ),
    },
    {
      key: 'demographics',
      header: 'Age & Gender',
      render: (p) => (
        <span className="text-xs text-slate-700">
          {p.age} yrs • {p.gender}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Contact / City',
      render: (p) => (
        <div className="text-xs text-slate-600">
          <p>{p.phone || 'No phone'}</p>
          {p.address && <p className="text-slate-400 truncate max-w-[150px]">{p.address}</p>}
        </div>
      ),
    },
    {
      key: 'portal_status',
      header: 'Portal Access',
      render: (p) =>
        p.user_id ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Active Portal
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPortalModalPatient(p);
              setPortalForm({ email: '', password: '' });
            }}
            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Grant Login
          </button>
        ),
    },
    {
      key: 'actions',
      header: 'Front Desk Actions',
      render: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => openApptModal(p)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            title="Book Doctor Appointment"
          >
            <CalendarClock className="h-3.5 w-3.5 text-sky-600" />
            Appt
          </button>
          <button
            type="button"
            onClick={() => navigate('/reception/billing')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            title="Create or Manage Bills"
          >
            <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
            Bill
          </button>
          <button
            type="button"
            onClick={() => setDrawerPatientId(p.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            title="View Patient Records & Timeline"
          >
            <FileText className="h-3.5 w-3.5 text-indigo-600" />
            EHR
          </button>
          <button
            type="button"
            onClick={() => openEditModal(p)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
            title="Edit Demographics"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Patient Directory & Front-Desk Intake</h2>
            <span className="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
              Reception Desk
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Register hospital walk-ins, activate patient portal accounts, schedule doctor visits, and manage billing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateWithPortal(false);
            setRegForm({
              name: '',
              age: '',
              gender: 'Male',
              phone: '',
              address: '',
              medical_history: '',
              email: '',
              password: '',
            });
            setRegisterModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-clinical-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-clinical-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Register Walk-In Patient
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Hospital Patients"
          value={patients.length}
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Online Portal Users"
          value={portalActiveCount}
          icon={ShieldCheck}
          tone="teal"
        />
        <StatCard
          label="Walk-In Only Records"
          value={walkInOnlyCount}
          icon={UserCheck}
          tone="amber"
        />
      </div>

      {/* Main Patient Directory Table */}
      <Card>
        <CardHeader
          title="Hospital Patients Directory"
          subtitle="All registered patients across hospital departments with instant front desk actions"
        />
        <CardBody>
          <DataTable
            data={patients}
            columns={columns}
            rowKey={(p) => p.id}
            isLoading={patientsQuery.isLoading}
            searchPlaceholder="Search by patient name, code PAT-..., or phone..."
            searchFn={(p, q) =>
              `${p.name} ${p.patient_code} ${p.phone ?? ''} ${p.gender} ${p.address ?? ''}`
                .toLowerCase()
                .includes(q)
            }
          />
        </CardBody>
      </Card>

      {/* Modal 1: Register Walk-In Patient */}
      <Modal
        open={registerModal}
        onClose={() => setRegisterModal(false)}
        title="Register Walk-In Patient"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            registerMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
              <input
                required
                placeholder="e.g. Ramesh Kumar"
                value={regForm.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Age *</label>
              <input
                type="number"
                required
                min={0}
                max={130}
                placeholder="Years"
                value={regForm.age}
                onChange={(e) => setRegForm({ ...regForm, age: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Gender *</label>
              <select
                value={regForm.gender}
                onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                placeholder="+91 98765 43210"
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Address / City</label>
              <input
                placeholder="Residential Address"
                value={regForm.address}
                onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Medical History / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Known allergies, existing conditions, or notes..."
                value={regForm.medical_history}
                onChange={(e) => setRegForm({ ...regForm, medical_history: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Portal Account Checkbox Option */}
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
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Portal Login Email *
                  </label>
                  <input
                    type="email"
                    required={createWithPortal}
                    placeholder="patient@example.com"
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required={createWithPortal}
                    placeholder="Min 6 characters"
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRegisterModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-50"
            >
              {registerMutation.isPending ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Grant Portal Account to Existing Walk-In Patient */}
      <Modal
        open={portalModalPatient !== null}
        onClose={() => setPortalModalPatient(null)}
        title="Activate Online Patient Portal"
      >
        {portalModalPatient && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              portalAccountMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
              <p className="text-xs font-semibold text-indigo-900">
                Activating Portal for: {portalModalPatient.name}
              </p>
              <p className="text-xs text-indigo-700 font-mono">
                Code: {portalModalPatient.patient_code} • ID: #{portalModalPatient.id}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Portal Login Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="patient@example.com"
                  value={portalForm.email}
                  onChange={(e) => setPortalForm({ ...portalForm, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={portalForm.password}
                  onChange={(e) => setPortalForm({ ...portalForm, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPortalModalPatient(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={portalAccountMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {portalAccountMutation.isPending ? 'Activating...' : 'Create Login'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 3: Book Appointment for Patient */}
      <Modal
        open={apptModalPatient !== null}
        onClose={() => setApptModalPatient(null)}
        title="Schedule Doctor Appointment"
      >
        {apptModalPatient && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              bookApptMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-900">
                Patient: {apptModalPatient.name} ({apptModalPatient.patient_code})
              </p>
              <p className="text-xs text-slate-500">
                {apptModalPatient.age} yrs • {apptModalPatient.gender}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Attending Doctor *
                </label>
                <select
                  required
                  value={apptForm.doctor_user_id}
                  onChange={(e) => setApptForm({ ...apptForm, doctor_user_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
                >
                  <option value="">Select Doctor...</option>
                  {(doctorsQuery.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} — {d.department} ({d.shift_start}–{d.shift_end})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Appointment Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={apptForm.appointment_date}
                  onChange={(e) => setApptForm({ ...apptForm, appointment_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for Visit
                </label>
                <input
                  placeholder="e.g. Fever, routine follow-up, knee pain"
                  value={apptForm.reason}
                  onChange={(e) => setApptForm({ ...apptForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Clinical Notes (Optional)
                </label>
                <input
                  placeholder="Additional instructions or notes"
                  value={apptForm.notes}
                  onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-clinical-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApptModalPatient(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bookApptMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {bookApptMutation.isPending ? 'Booking...' : 'Confirm Appointment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 4: Edit Demographics */}
      <Modal
        open={editModalPatient !== null}
        onClose={() => setEditModalPatient(null)}
        title="Edit Patient Demographics"
      >
        {editModalPatient && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editPatientMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={130}
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Medical History
                </label>
                <textarea
                  rows={2}
                  value={editForm.medical_history}
                  onChange={(e) => setEditForm({ ...editForm, medical_history: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditModalPatient(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editPatientMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-50"
              >
                {editPatientMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* EHR Records Drawer */}
      <PatientEhrDrawer
        patientId={drawerPatientId}
        open={drawerPatientId !== null}
        onClose={() => setDrawerPatientId(null)}
        canRunMlPrediction={false}
      />
    </div>
  );
}
