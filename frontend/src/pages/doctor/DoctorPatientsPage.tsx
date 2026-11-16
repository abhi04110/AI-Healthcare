import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, HeartPulse, Users } from 'lucide-react';
import { hmsService } from '@/services/hmsService';
import { patientService } from '@/services/patientService';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { PatientEhrDrawer } from '@/components/shared/PatientEhrDrawer';
import type { AssignedPatient, PatientResponse } from '@/types/api';

export function DoctorPatientsPage() {
  const [drawerPatientId, setDrawerPatientId] = useState<number | null>(null);

  const assignedQuery = useQuery({
    queryKey: ['doctor-assigned-patients'],
    queryFn: () => hmsService.getMyAssignedPatients(),
  });

  const accessibleQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.listPatients(),
  });

  const assignedColumns: ColumnDef<AssignedPatient>[] = [
    {
      key: 'patient',
      header: 'Assigned Patient',
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.name}</p>
          <p className="text-xs text-slate-500">
            {p.patient_code} • ID {p.patient_id}
          </p>
        </div>
      ),
    },
    {
      key: 'demo',
      header: 'Age & Gender',
      render: (p) => (
        <div className="flex items-center gap-2">
          <Badge variant="blue">{p.age} yrs</Badge>
          <span className="text-xs text-slate-600">{p.gender}</span>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (p) => p.phone || '—' },
    {
      key: 'actions',
      header: 'Clinical Workspace',
      render: (p) => (
        <button
          type="button"
          onClick={() => setDrawerPatientId(p.patient_id)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-clinical-700"
        >
          <HeartPulse className="h-3.5 w-3.5" />
          Open Health Record & AI Risk
        </button>
      ),
    },
  ];

  const otherColumns: ColumnDef<PatientResponse>[] = [
    {
      key: 'patient',
      header: 'Accessible Patient',
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.name}</p>
          <p className="text-xs text-slate-500">{p.patient_code}</p>
        </div>
      ),
    },
    { key: 'age', header: 'Age / Gender', render: (p) => `${p.age} yrs • ${p.gender}` },
    { key: 'history', header: 'Medical History', render: (p) => p.medical_history || '—' },
    {
      key: 'action',
      header: 'EHR',
      render: (p) => (
        <button
          type="button"
          onClick={() => setDrawerPatientId(p.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <FileText className="h-3.5 w-3.5" />
          View Timeline
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="My Assigned Patients"
          subtitle="Patients under your care, including vital signs, medical reports, and AI risk scores."
          action={<Users className="h-5 w-5 text-clinical-600" />}
        />
        <CardBody>
          <DataTable
            data={assignedQuery.data ?? []}
            columns={assignedColumns}
            rowKey={(p) => p.assignment_id}
            isLoading={assignedQuery.isLoading}
            searchPlaceholder="Search assigned patients..."
            searchFn={(p, q) => `${p.name} ${p.patient_code} ${p.phone ?? ''}`.toLowerCase().includes(q)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="All Accessible Patient Records"
          subtitle="Includes patients you created or were assigned to care for."
        />
        <CardBody>
          <DataTable
            data={accessibleQuery.data ?? []}
            columns={otherColumns}
            rowKey={(p) => p.id}
            isLoading={accessibleQuery.isLoading}
            searchPlaceholder="Filter accessible patients..."
            searchFn={(p, q) =>
              `${p.name} ${p.patient_code} ${p.medical_history ?? ''}`.toLowerCase().includes(q)
            }
          />
        </CardBody>
      </Card>

      <PatientEhrDrawer
        patientId={drawerPatientId}
        open={drawerPatientId !== null}
        onClose={() => setDrawerPatientId(null)}
        canRunMlPrediction={true}
      />
    </div>
  );
}

