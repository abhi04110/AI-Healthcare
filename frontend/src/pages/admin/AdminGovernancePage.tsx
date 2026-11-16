import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Link2, Plus, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { hmsService } from '@/services/hmsService';
import { patientService } from '@/services/patientService';
import { authService } from '@/services/authService';
import {
  ALL_USER_ROLES,
  ROLE_CAPABILITY_MATRIX,
  ROLE_METADATA,
  STAFF_CREATABLE_ROLES,
} from '@/config/roles';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { Department, PatientAssignment, StaffMember, UserRole } from '@/types/api';

type GovTab = 'departments' | 'staff' | 'assignments' | 'rbac';

export function AdminGovernancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<GovTab>('staff');
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor',
    department_id: '',
    employee_code: '',
    designation: '',
    qualification: '',
    specialty: '',
    shift_start: '09:00',
    shift_end: '17:00',
  });
  const [rawUserForm, setRawUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as UserRole,
  });
  const [assignForm, setAssignForm] = useState({ patient_id: '', doctor_user_id: '' });

  const departmentsQuery = useQuery({
    queryKey: ['hms-departments'],
    queryFn: () => hmsService.listDepartments(),
  });

  const staffQuery = useQuery({
    queryKey: ['hms-staff'],
    queryFn: () => hmsService.listStaff(),
  });

  const assignmentsQuery = useQuery({
    queryKey: ['hms-assignments'],
    queryFn: () => hmsService.listAssignments(),
  });

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.listPatients(),
  });

  const doctors = useMemo(
    () => (staffQuery.data ?? []).filter((s) => s.role === 'doctor'),
    [staffQuery.data],
  );

  const createDeptMutation = useMutation({
    mutationFn: () => hmsService.createDepartment(deptForm),
    onSuccess: () => {
      toast.success('Department created');
      setDeptModalOpen(false);
      setDeptForm({ name: '', code: '', description: '' });
      void queryClient.invalidateQueries({ queryKey: ['hms-departments'] });
    },
    onError: (err) => toast.error('Department creation failed', extractApiError(err)),
  });

  const createStaffMutation = useMutation({
    mutationFn: () =>
      hmsService.createStaff({
        name: staffForm.name,
        email: staffForm.email,
        password: staffForm.password,
        role: staffForm.role,
        department_id: Number(staffForm.department_id),
        employee_code: staffForm.employee_code,
        designation: staffForm.designation,
        qualification: staffForm.qualification || undefined,
        specialty: staffForm.specialty || undefined,
        shift_start: staffForm.shift_start || undefined,
        shift_end: staffForm.shift_end || undefined,
      }),
    onSuccess: () => {
      toast.success('Staff account & profile created');
      setStaffModalOpen(false);
      setStaffForm({
        name: '',
        email: '',
        password: '',
        role: 'doctor',
        department_id: '',
        employee_code: '',
        designation: '',
        qualification: '',
        specialty: '',
        shift_start: '09:00',
        shift_end: '17:00',
      });
      void queryClient.invalidateQueries({ queryKey: ['hms-staff'] });
    },
    onError: (err) => toast.error('Staff onboarding failed', extractApiError(err)),
  });

  const createRawUserMutation = useMutation({
    mutationFn: () => authService.createUserByAdmin(rawUserForm),
    onSuccess: (created) => {
      toast.success('User created', `${created.email} (${created.role})`);
      setUserModalOpen(false);
      setRawUserForm({ name: '', email: '', password: '', role: 'staff' });
    },
    onError: (err) => toast.error('User creation failed', extractApiError(err)),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      hmsService.assignPatient(Number(assignForm.patient_id), Number(assignForm.doctor_user_id)),
    onSuccess: () => {
      toast.success('Patient assigned to doctor');
      setAssignModalOpen(false);
      setAssignForm({ patient_id: '', doctor_user_id: '' });
      void queryClient.invalidateQueries({ queryKey: ['hms-assignments'] });
    },
    onError: (err) => toast.error('Assignment failed', extractApiError(err)),
  });

  const deptColumns: ColumnDef<Department>[] = [
    {
      key: 'name',
      header: 'Department',
      render: (d) => (
        <div>
          <p className="font-semibold text-slate-900">{d.name}</p>
          <p className="text-xs text-slate-500">{d.description || 'No description'}</p>
        </div>
      ),
    },
    { key: 'code', header: 'Code', render: (d) => <Badge variant="blue">{d.code}</Badge> },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <StatusBadge status={d.is_active ? 'active' : 'inactive'} />,
    },
    { key: 'created', header: 'Created', render: (d) => formatDateTime(d.created_at) },
  ];

  const staffColumns: ColumnDef<StaffMember>[] = [
    {
      key: 'member',
      header: 'Staff Member',
      render: (s) => (
        <div>
          <p className="font-semibold text-slate-900">{s.name}</p>
          <p className="text-xs text-slate-500">{s.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (s) => (
        <Badge variant={ROLE_METADATA[s.role]?.badgeVariant ?? 'slate'}>
          {ROLE_METADATA[s.role]?.label ?? s.role}
        </Badge>
      ),
    },
    {
      key: 'department',
      header: 'Department & Code',
      render: (s) => (
        <div>
          <p className="font-medium text-slate-800">{s.department}</p>
          <p className="text-xs text-slate-500">
            {s.employee_code} • {s.designation || 'Staff'}
          </p>
        </div>
      ),
    },
    {
      key: 'shift',
      header: 'Shift & Specialty',
      render: (s) => (
        <div className="text-xs">
          <p className="text-slate-700">
            {s.shift_start || '—'} – {s.shift_end || '—'}
          </p>
          <p className="text-slate-500">{s.specialty || s.qualification || '—'}</p>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (s) => <StatusBadge status={s.is_active ? 'active' : 'inactive'} />,
    },
  ];

  const assignmentColumns: ColumnDef<PatientAssignment>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (a) => (
        <div>
          <p className="font-semibold text-slate-900">{a.patient_name}</p>
          <p className="text-xs text-slate-500">
            {a.patient_code} (ID {a.patient_id})
          </p>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Assigned Doctor',
      render: (a) => (
        <div>
          <p className="font-medium text-slate-900">{a.doctor_name}</p>
          <p className="text-xs text-slate-500">{a.doctor_email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusBadge status={a.is_active ? 'active' : 'inactive'} />,
    },
    { key: 'assigned', header: 'Assigned At', render: (a) => formatDateTime(a.assigned_at) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'staff', label: 'Staff Onboarding & Directory', icon: Users },
              { id: 'departments', label: 'Departments', icon: Building2 },
              { id: 'assignments', label: 'Doctor Assignments', icon: Link2 },
              { id: 'rbac', label: 'Role Permission Matrix', icon: ShieldCheck },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-clinical-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setDeptModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              New Department
            </button>
          )}
          <button
            type="button"
            onClick={() => setStaffModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
          >
            <UserPlus className="h-4 w-4" />
            Onboard Staff
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create Raw Auth User
            </button>
          )}
          <button
            type="button"
            onClick={() => setAssignModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-clinical-200 bg-clinical-50 px-3.5 py-2 text-xs font-semibold text-clinical-700 hover:bg-clinical-100"
          >
            <Link2 className="h-4 w-4" />
            Assign Doctor
          </button>
        </div>
      </div>

      {activeTab === 'staff' && (
        <Card>
          <CardHeader
            title="Hospital Staff Roster"
            subtitle="Scoped automatically: Super Admin sees all departments; Department Admin sees their own department."
          />
          <CardBody>
            <DataTable
              data={staffQuery.data ?? []}
              columns={staffColumns}
              rowKey={(s) => s.user_id}
              isLoading={staffQuery.isLoading}
              searchPlaceholder="Search name, email, role, or employee code..."
              searchFn={(s, q) =>
                [s.name, s.email, s.role, s.department, s.employee_code, s.designation ?? '']
                  .join(' ')
                  .toLowerCase()
                  .includes(q)
              }
            />
          </CardBody>
        </Card>
      )}

      {activeTab === 'departments' && (
        <Card>
          <CardHeader
            title="Hospital Departments"
            subtitle={
              isSuperAdmin
                ? 'Create and view clinical and support departments.'
                : 'View active hospital departments (Department creation requires Super Admin).'
            }
          />
          <CardBody>
            <DataTable
              data={departmentsQuery.data ?? []}
              columns={deptColumns}
              rowKey={(d) => d.id}
              isLoading={departmentsQuery.isLoading}
              searchPlaceholder="Search department or code..."
              searchFn={(d, q) =>
                `${d.name} ${d.code} ${d.description ?? ''}`.toLowerCase().includes(q)
              }
            />
          </CardBody>
        </Card>
      )}

      {activeTab === 'assignments' && (
        <Card>
          <CardHeader
            title="Patient-to-Doctor Care Assignments"
            subtitle="Controls which doctors have EHR, consultation, lab, and AI scope for a patient."
          />
          <CardBody>
            <DataTable
              data={assignmentsQuery.data ?? []}
              columns={assignmentColumns}
              rowKey={(a) => a.assignment_id}
              isLoading={assignmentsQuery.isLoading}
              searchPlaceholder="Search patient or doctor..."
              searchFn={(a, q) =>
                `${a.patient_name} ${a.patient_code} ${a.doctor_name} ${a.doctor_email}`
                  .toLowerCase()
                  .includes(q)
              }
            />
          </CardBody>
        </Card>
      )}

      {activeTab === 'rbac' && (
        <Card>
          <CardHeader
            title="Role Access & Permissions Overview"
            subtitle="Summary of allowed actions for each hospital staff and patient role."
          />
          <CardBody className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Module / Feature</th>
                    <th className="px-4 py-3">Permitted Roles</th>
                    <th className="px-4 py-3">Backend Enforcement Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {ROLE_CAPABILITY_MATRIX.map((row) => (
                    <tr key={row.module}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.module}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.roles.map((r) => (
                            <Badge key={r} variant="blue">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        open={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Create Department"
        subtitle="Add a new clinical or support department (Super Admin only)."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDeptMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700">Department Name</label>
            <input
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g., Cardiology"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Department Code</label>
            <input
              required
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
              placeholder="e.g., CARD"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={2}
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeptModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createDeptMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-60"
            >
              {createDeptMutation.isPending ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title="Onboard Hospital Staff Member"
        subtitle="Creates both the staff login account and their department profile."
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createStaffMutation.mutate();
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700">Full Name</label>
            <input
              required
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Initial Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={staffForm.password}
              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Role</label>
            <select
              value={staffForm.role}
              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {STAFF_CREATABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_METADATA[role].label} ({role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Department</label>
            <select
              required
              value={staffForm.department_id}
              onChange={(e) => setStaffForm({ ...staffForm, department_id: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select department...</option>
              {(departmentsQuery.data ?? []).map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Employee Code</label>
            <input
              required
              value={staffForm.employee_code}
              onChange={(e) => setStaffForm({ ...staffForm, employee_code: e.target.value })}
              placeholder="e.g., EMP-101"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Designation</label>
            <input
              required
              value={staffForm.designation}
              onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
              placeholder="e.g., Senior Cardiologist"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Specialty</label>
            <input
              value={staffForm.specialty}
              onChange={(e) => setStaffForm({ ...staffForm, specialty: e.target.value })}
              placeholder="Optional specialty"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Qualification</label>
            <input
              value={staffForm.qualification}
              onChange={(e) => setStaffForm({ ...staffForm, qualification: e.target.value })}
              placeholder="e.g., MD, MBBS"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Shift Start</label>
              <input
                type="time"
                value={staffForm.shift_start}
                onChange={(e) => setStaffForm({ ...staffForm, shift_start: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Shift End</label>
              <input
                type="time"
                value={staffForm.shift_end}
                onChange={(e) => setStaffForm({ ...staffForm, shift_end: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStaffModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStaffMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-60"
            >
              {createStaffMutation.isPending ? 'Onboarding...' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Create Direct Login Account"
        subtitle="Creates a user login without a department profile (ideal for admins, general staff, or patients)."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRawUserMutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700">Name</label>
            <input
              required
              value={rawUserForm.name}
              onChange={(e) => setRawUserForm({ ...rawUserForm, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={rawUserForm.email}
              onChange={(e) => setRawUserForm({ ...rawUserForm, email: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={rawUserForm.password}
              onChange={(e) => setRawUserForm({ ...rawUserForm, password: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Role</label>
            <select
              value={rawUserForm.role}
              onChange={(e) => setRawUserForm({ ...rawUserForm, role: e.target.value as UserRole })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {ALL_USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_METADATA[r].label} ({r})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRawUserMutation.isPending}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {createRawUserMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Patient to Doctor"
        subtitle="Link a patient to an attending physician."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            assignMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700">Patient</label>
            <select
              required
              value={assignForm.patient_id}
              onChange={(e) => setAssignForm({ ...assignForm, patient_id: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select patient...</option>
              {(patientsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.patient_code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Doctor</label>
            <select
              required
              value={assignForm.doctor_user_id}
              onChange={(e) => setAssignForm({ ...assignForm, doctor_user_id: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select doctor...</option>
              {doctors.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.name} — {d.department} ({d.specialty || 'General'})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assignMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700 disabled:opacity-60"
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign Doctor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

