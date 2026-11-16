import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, ScanText } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { patientService } from '@/services/patientService';
import { extractApiError } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { PatientEhrDrawer } from '@/components/shared/PatientEhrDrawer';
import { AiAssistantPanel } from '@/components/shared/AiAssistantPanel';
import type { PatientResponse } from '@/types/api';

export function WorkerStaffIntakePage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerPatientId, setDrawerPatientId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: '',
    medical_history: '',
  });

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.listPatients(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      patientService.createPatient({
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        phone: form.phone || undefined,
        address: form.address || undefined,
        medical_history: form.medical_history || undefined,
      }),
    onSuccess: (created) => {
      toast.success('Patient created', `Code: ${created.patient_code}`);
      setModalOpen(false);
      setForm({ name: '', age: '', gender: 'Male', phone: '', address: '', medical_history: '' });
      void queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err) => toast.error('Registration failed', extractApiError(err)),
  });

  const columns: ColumnDef<PatientResponse>[] = [
    {
      key: 'pt',
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
    { key: 'demo', header: 'Demographics', render: (p) => `${p.age} yrs • ${p.gender}` },
    { key: 'phone', header: 'Phone', render: (p) => p.phone || '—' },
    {
      key: 'ehr',
      header: 'Vitals & Reports',
      render: (p) => (
        <button
          type="button"
          onClick={() => setDrawerPatientId(p.id)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-clinical-700"
        >
          <FileText className="h-3.5 w-3.5" />
          Upload Scan / Vitals
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Staff & Radiology Diagnostics Intake"
          subtitle="Register patients you manage, upload imaging or lab reports for smart scanning, and record vitals."
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
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
            searchPlaceholder="Search your created patients..."
            searchFn={(p, q) => `${p.name} ${p.patient_code} ${p.phone ?? ''}`.toLowerCase().includes(q)}
            toolbarExtra={<ScanText className="h-4 w-4 text-clinical-600" />}
          />
        </CardBody>
      </Card>

      <AiAssistantPanel patients={patientsQuery.data ?? []} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Register Patient Intake">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input
            required
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            required
            min={0}
            max={130}
            placeholder="Age"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            rows={2}
            placeholder="Medical history / Radiology notes"
            value={form.medical_history}
            onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
            className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Register Patient
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

