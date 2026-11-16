import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { patientService } from '@/services/patientService';
import { extractApiError } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PatientEhrDrawer } from '@/components/shared/PatientEhrDrawer';
import type { PatientResponse } from '@/types/api';

const EMPTY_FORM = {
  patient_code: '',
  name: '',
  age: '',
  gender: 'Male',
  phone: '',
  address: '',
  medical_history: '',
};

export function AdminPatientsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'admin';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientResponse | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [drawerPatientId, setDrawerPatientId] = useState<number | null>(null);

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.listPatients(),
  });

  const openCreateModal = () => {
    setEditingPatient(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (patient: PatientResponse) => {
    setEditingPatient(patient);
    setForm({
      patient_code: patient.patient_code,
      name: patient.name,
      age: String(patient.age),
      gender: patient.gender,
      phone: patient.phone ?? '',
      address: patient.address ?? '',
      medical_history: patient.medical_history ?? '',
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingPatient) {
        return patientService.updatePatient(editingPatient.id, {
          name: form.name,
          age: Number(form.age),
          gender: form.gender,
          phone: form.phone || undefined,
          address: form.address || undefined,
          medical_history: form.medical_history || undefined,
        });
      }
      return patientService.createPatient({
        patient_code: form.patient_code || undefined,
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        phone: form.phone || undefined,
        address: form.address || undefined,
        medical_history: form.medical_history || undefined,
      });
    },
    onSuccess: () => {
      toast.success(editingPatient ? 'Patient record updated' : 'Patient created');
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err) => toast.error('Failed to save patient', extractApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (patientId: number) => patientService.deletePatient(patientId),
    onSuccess: () => {
      toast.success('Patient deleted');
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err) => toast.error('Delete failed', extractApiError(err)),
  });

  const columns: ColumnDef<PatientResponse>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.name}</p>
          <p className="text-xs text-slate-500">
            Code: {p.patient_code} • ID {p.id}
          </p>
        </div>
      ),
    },
    {
      key: 'demographics',
      header: 'Age & Gender',
      render: (p) => (
        <div className="flex items-center gap-2">
          <Badge variant="blue">{p.age} yrs</Badge>
          <span className="text-xs text-slate-600">{p.gender}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact & Address',
      render: (p) => (
        <div className="text-xs">
          <p className="text-slate-700">{p.phone || 'No phone'}</p>
          <p className="max-w-xs truncate text-slate-500">{p.address || 'No address'}</p>
        </div>
      ),
    },
    {
      key: 'history',
      header: 'Medical History',
      render: (p) => (
        <p className="max-w-xs truncate text-xs text-slate-600">
          {p.medical_history || 'None recorded'}
        </p>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDrawerPatientId(p.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-clinical-50 px-2.5 py-1.5 text-xs font-semibold text-clinical-700 hover:bg-clinical-100"
          >
            <FileText className="h-3.5 w-3.5" />
            Health Records
          </button>
          <button
            type="button"
            onClick={() => openEditModal(p)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete patient ${p.name} (${p.patient_code})?`)) {
                  deleteMutation.mutate(p.id);
                }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Patient Registry & Health Records"
          subtitle="Manage patient profiles, vital signs, uploaded medical reports, and AI summaries."
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              <Plus className="h-4 w-4" />
              Register Patient
            </button>
          }
        />
        <CardBody>
          <DataTable
            data={patientsQuery.data ?? []}
            columns={columns}
            rowKey={(p) => p.id}
            isLoading={patientsQuery.isLoading}
            searchPlaceholder="Search patient name, code, phone, or history..."
            searchFn={(p, q) =>
              [p.name, p.patient_code, p.phone ?? '', p.medical_history ?? '']
                .join(' ')
                .toLowerCase()
                .includes(q)
            }
            toolbarExtra={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                <Users className="h-3.5 w-3.5" />
                {patientsQuery.data?.length ?? 0} Patients
              </span>
            }
          />
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPatient ? `Update Patient (${editingPatient.patient_code})` : 'Register New Patient'}
        subtitle={editingPatient ? 'Edit patient contact and medical history details.' : 'Add a new patient to the hospital registry.'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          {!editingPatient && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Patient Code (optional)
              </label>
              <input
                value={form.patient_code}
                onChange={(e) => setForm({ ...form, patient_code: e.target.value })}
                placeholder="Auto-generated if empty"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className={editingPatient ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-semibold text-slate-700">Full Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Age</label>
            <input
              type="number"
              required
              min={0}
              max={130}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Medical History</label>
            <textarea
              rows={3}
              value={form.medical_history}
              onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Patient'}
            </button>
          </div>
        </form>
      </Modal>

      <PatientEhrDrawer
        patientId={drawerPatientId}
        open={drawerPatientId !== null}
        onClose={() => setDrawerPatientId(null)}
        canRunMlPrediction={isSuperAdmin}
      />
    </div>
  );
}

