import type { UserRole } from '@/types/api';

export interface RoleMetadata {
  role: UserRole;
  label: string;
  portalName: string;
  homePath: string;
  accentClass: string;
  badgeVariant: 'blue' | 'teal' | 'purple' | 'amber' | 'rose' | 'slate' | 'emerald';
  description: string;
}

export const ROLE_METADATA: Record<UserRole, RoleMetadata> = {
  admin: {
    role: 'admin',
    label: 'Super Admin',
    portalName: 'Hospital Command Center',
    homePath: '/admin/dashboard',
    accentClass: 'from-slate-900 to-clinical-900',
    badgeVariant: 'purple',
    description: 'Full hospital operations, staff governance, ML lifecycle & RAG knowledge control.',
  },
  department_admin: {
    role: 'department_admin',
    label: 'Department Admin',
    portalName: 'Department Operations',
    homePath: '/admin/dashboard',
    accentClass: 'from-indigo-900 to-clinical-900',
    badgeVariant: 'purple',
    description: 'Department-scoped staff, assignments, clinical intake, billing & services oversight.',
  },
  doctor: {
    role: 'doctor',
    label: 'Doctor',
    portalName: 'Clinical Workspace',
    homePath: '/doctor/dashboard',
    accentClass: 'from-clinical-800 to-tealcare-700',
    badgeVariant: 'blue',
    description: 'Assigned EHR, consultations, e-prescriptions, lab orders, OCR & AI risk triage.',
  },
  nurse: {
    role: 'nurse',
    label: 'Nurse',
    portalName: 'Nursing Care Station',
    homePath: '/nurse/dashboard',
    accentClass: 'from-tealcare-700 to-emerald-800',
    badgeVariant: 'teal',
    description: 'Assigned emergency triage, ICU monitoring, OT support & patient diet orders.',
  },
  receptionist: {
    role: 'receptionist',
    label: 'Receptionist',
    portalName: 'Front Desk & Billing',
    homePath: '/reception/dashboard',
    accentClass: 'from-sky-800 to-indigo-900',
    badgeVariant: 'blue',
    description: 'Patient intake, appointment scheduling, billing invoices & emergency check-in.',
  },
  canteen_manager: {
    role: 'canteen_manager',
    label: 'Canteen Manager',
    portalName: 'Dietary & Kitchen Admin',
    homePath: '/canteen/dashboard',
    accentClass: 'from-amber-700 to-orange-800',
    badgeVariant: 'amber',
    description: 'Menu CRUD, stock & diet category management, live kitchen queue & sales analytics.',
  },
  canteen_worker: {
    role: 'canteen_worker',
    label: 'Canteen Staff',
    portalName: 'Kitchen Fulfillment',
    homePath: '/canteen/orders',
    accentClass: 'from-amber-700 to-orange-800',
    badgeVariant: 'amber',
    description: 'Live food order queue preparation, dietary notes review & delivery updates.',
  },
  housekeeping_supervisor: {
    role: 'housekeeping_supervisor',
    label: 'Housekeeping Supervisor',
    portalName: 'Facility & Sanitization',
    homePath: '/worker/dashboard',
    accentClass: 'from-emerald-800 to-teal-900',
    badgeVariant: 'emerald',
    description: 'Create & dispatch ward/room sanitization tasks and assign housekeeping workers.',
  },
  housekeeping_worker: {
    role: 'housekeeping_worker',
    label: 'Housekeeping Worker',
    portalName: 'Operations Duty Queue',
    homePath: '/worker/tasks',
    accentClass: 'from-emerald-800 to-teal-900',
    badgeVariant: 'emerald',
    description: 'View assigned room/ward cleaning tasks and update completion status.',
  },
  lab_technician: {
    role: 'lab_technician',
    label: 'Lab Technician',
    portalName: 'Diagnostics Laboratory',
    homePath: '/lab/dashboard',
    accentClass: 'from-cyan-800 to-sky-900',
    badgeVariant: 'teal',
    description: 'Process diagnostic lab orders, update sample workflow & publish lab results.',
  },
  pharmacist: {
    role: 'pharmacist',
    label: 'Pharmacist',
    portalName: 'Hospital Pharmacy',
    homePath: '/pharmacy/dashboard',
    accentClass: 'from-violet-800 to-purple-900',
    badgeVariant: 'purple',
    description: 'Medicine catalog, stock & expiry tracking, and prescription dispensing.',
  },
  radiology_technician: {
    role: 'radiology_technician',
    label: 'Radiology Technician',
    portalName: 'Staff & Diagnostics Support',
    homePath: '/worker/dashboard',
    accentClass: 'from-slate-800 to-cyan-900',
    badgeVariant: 'slate',
    description: 'Patient intake, imaging report uploads, smart report scanning & AI clinical assistant.',
  },
  staff: {
    role: 'staff',
    label: 'Hospital Staff',
    portalName: 'Staff Operations Portal',
    homePath: '/worker/dashboard',
    accentClass: 'from-slate-800 to-slate-900',
    badgeVariant: 'slate',
    description: 'Patient intake, health records, smart report scanning & AI clinical assistant.',
  },
  patient: {
    role: 'patient',
    label: 'Patient',
    portalName: 'Patient Care Portal',
    homePath: '/patient/dashboard',
    accentClass: 'from-clinical-700 to-sky-800',
    badgeVariant: 'blue',
    description: 'Appointments, medical reports, prescriptions, lab results, bills, meals & AI health guide.',
  },
};

export function getRoleHomePath(role?: string | null): string {
  if (!role) return '/login';
  const normalized = role.toLowerCase() as UserRole;
  return ROLE_METADATA[normalized]?.homePath ?? '/403';
}

export const STAFF_CREATABLE_ROLES: UserRole[] = [
  'department_admin',
  'doctor',
  'nurse',
  'receptionist',
  'canteen_manager',
  'canteen_worker',
  'housekeeping_supervisor',
  'housekeeping_worker',
  'lab_technician',
  'pharmacist',
  'radiology_technician',
];

export const ALL_USER_ROLES: UserRole[] = [
  'admin',
  ...STAFF_CREATABLE_ROLES,
  'staff',
  'patient',
];

export const ROLE_CAPABILITY_MATRIX: Array<{
  module: string;
  roles: string[];
  notes: string;
}> = [
  {
    module: 'Departments & DB Diagnostics',
    roles: ['admin'],
    notes: 'Create/list departments, inspect database health & schema tables.',
  },
  {
    module: 'Staff Onboarding & Assignments',
    roles: ['admin', 'department_admin'],
    notes: 'Department Admins are scoped to their own department.',
  },
  {
    module: 'Patients, Vitals & Report Scanning',
    roles: ['admin', 'doctor (assigned)', 'patient (self)', 'staff creators (own)'],
    notes: 'Access is strictly limited to assigned doctors, record creators, and the patient themselves.',
  },
  {
    module: 'Consultations & E-Prescriptions',
    roles: ['doctor (create & view own)', 'admin (view patient history)', 'patient (self view)'],
    notes: 'Only doctors can write consultations and prescriptions.',
  },
  {
    module: 'Laboratory Orders & Results',
    roles: ['admin', 'doctor (order & read)', 'lab_technician (process & publish results)', 'patient (self view)'],
    notes: 'Lab Technicians view all orders and enter results.',
  },
  {
    module: 'Pharmacy Inventory & Dispensing',
    roles: ['admin', 'pharmacist (full + dispense)', 'department_admin (inventory)', 'doctor (catalog read)'],
    notes: 'Dispensing requires an active prescription and valid non-expired stock.',
  },
  {
    module: 'Billing & Payments',
    roles: ['admin', 'department_admin', 'receptionist', 'doctor (read)', 'patient (self view)'],
    notes: 'Paid bills lock line-item edits automatically.',
  },
  {
    module: 'Emergency, ICU & Operation Theatre',
    roles: ['admin', 'doctor', 'nurse', 'department_admin (create)', 'receptionist (ER intake)'],
    notes: 'Doctors and nurses see cases assigned to them.',
  },
  {
    module: 'Housekeeping Tasks',
    roles: ['admin', 'department_admin', 'housekeeping_supervisor', 'housekeeping_worker (assigned)'],
    notes: 'Completed tasks cannot revert to pending/assigned.',
  },
  {
    module: 'Canteen Menu & Kitchen Orders',
    roles: ['admin', 'department_admin', 'canteen_manager', 'canteen_worker', 'doctor/nurse/receptionist/patient (order)'],
    notes: 'Delivered or cancelled orders are immutable.',
  },
  {
    module: 'ML Risk Training & RAG Knowledge',
    roles: ['admin (train & RAG CRUD)', 'doctor (predict & ask AI)', 'all authenticated (ask AI)'],
    notes: 'AI Assistant enforces strict patient-ID scoping per role.',
  },
];

