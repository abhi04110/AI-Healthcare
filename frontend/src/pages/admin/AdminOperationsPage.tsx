import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ambulance,
  CalendarClock,
  CreditCard,
  FileSpreadsheet,
  Pill,
  Plus,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { hmsService } from '@/services/hmsService';
import { patientService } from '@/services/patientService';
import { extractApiError, formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PrintableDocumentModal } from '@/components/shared/PrintableDocument';
import type {
  Appointment,
  Bill,
  BillItem,
  CanteenOrder,
  EmergencyCase,
  HousekeepingTask,
  ICUAdmission,
  Medicine,
  OperationTheatreCase,
} from '@/types/api';

type OpsTab = 'appointments' | 'billing' | 'pharmacy' | 'critical' | 'services';

export function AdminOperationsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<OpsTab>('appointments');

  // Modals
  const [apptModal, setApptModal] = useState(false);
  const [billModal, setBillModal] = useState(false);
  const [billItemModal, setBillItemModal] = useState<Bill | null>(null);
  const [payModal, setPayModal] = useState<Bill | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<{ bill: Bill; items: BillItem[] } | null>(null);
  const [medModal, setMedModal] = useState(false);
  const [erModal, setErModal] = useState(false);
  const [icuModal, setIcuModal] = useState(false);
  const [otModal, setOtModal] = useState(false);
  const [hkModal, setHkModal] = useState(false);

  // Form states
  const [apptForm, setApptForm] = useState({
    patient_id: '',
    doctor_user_id: '',
    appointment_date: '',
    reason: '',
    notes: '',
  });
  const [billForm, setBillForm] = useState({
    patient_id: '',
    bill_number: `INV-${Date.now().toString().slice(-6)}`,
    discount: '0',
    tax: '0',
    notes: '',
  });
  const [billItemForm, setBillItemForm] = useState({
    item_type: 'consultation',
    description: '',
    quantity: '1',
    unit_price: '',
  });
  const [payAmount, setPayAmount] = useState('');
  const [medForm, setMedForm] = useState({
    medicine_name: '',
    generic_name: '',
    category: '',
    manufacturer: '',
    batch_number: '',
    quantity: '50',
    unit_price: '10',
    expiry_date: '',
  });
  const [erForm, setErForm] = useState({
    patient_id: '',
    assigned_doctor_id: '',
    assigned_nurse_id: '',
    priority: 'urgent',
    symptoms: '',
    vitals: '',
    treatment_notes: '',
    admission_required: false,
  });
  const [icuForm, setIcuForm] = useState({
    patient_id: '',
    doctor_user_id: '',
    nurse_user_id: '',
    bed_number: '',
    room_number: '',
    admission_reason: '',
    vitals: '',
    treatment_notes: '',
  });
  const [otForm, setOtForm] = useState({
    patient_id: '',
    surgeon_user_id: '',
    nurse_user_id: '',
    operation_name: '',
    operation_type: 'General',
    theatre_number: 'OT-1',
    scheduled_at: '',
    diagnosis: '',
    pre_op_notes: '',
  });
  const [hkForm, setHkForm] = useState({
    task_type: 'sanitization',
    area: '',
    room_number: '',
    priority: 'normal',
    assigned_worker_id: '',
    description: '',
  });

  // Shared lookups
  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: () => patientService.listPatients() });
  const staffQuery = useQuery({ queryKey: ['hms-staff'], queryFn: () => hmsService.listStaff() });
  const doctors = useMemo(() => (staffQuery.data ?? []).filter((s) => s.role === 'doctor'), [staffQuery.data]);
  const nurses = useMemo(() => (staffQuery.data ?? []).filter((s) => s.role === 'nurse'), [staffQuery.data]);
  const hkWorkers = useMemo(
    () => (staffQuery.data ?? []).filter((s) => s.role === 'housekeeping_worker'),
    [staffQuery.data],
  );

  // Module queries
  const apptsQuery = useQuery({
    queryKey: ['hms-appointments'],
    queryFn: () => hmsService.listAppointments(),
    enabled: tab === 'appointments',
  });
  const billsQuery = useQuery({
    queryKey: ['hms-bills'],
    queryFn: () => hmsService.listBills(),
    enabled: tab === 'billing',
  });
  const medsQuery = useQuery({
    queryKey: ['hms-medicines'],
    queryFn: () => hmsService.listMedicines(),
    enabled: tab === 'pharmacy',
  });
  const erQuery = useQuery({
    queryKey: ['hms-er'],
    queryFn: () => hmsService.listEmergencyCases(),
    enabled: tab === 'critical',
  });
  const icuQuery = useQuery({
    queryKey: ['hms-icu'],
    queryFn: () => hmsService.listIcuAdmissions(),
    enabled: tab === 'critical',
  });
  const otQuery = useQuery({
    queryKey: ['hms-ot'],
    queryFn: () => hmsService.listOtCases(),
    enabled: tab === 'critical',
  });
  const hkQuery = useQuery({
    queryKey: ['hms-housekeeping'],
    queryFn: () => hmsService.listHousekeepingTasks(),
    enabled: tab === 'services',
  });
  const canteenOrdersQuery = useQuery({
    queryKey: ['hms-canteen-orders'],
    queryFn: () => hmsService.listCanteenOrders(),
    enabled: tab === 'services',
  });

  // Mutations
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
      toast.success('Appointment scheduled');
      setApptModal(false);
      void queryClient.invalidateQueries({ queryKey: ['hms-appointments'] });
    },
    onError: (err) => toast.error('Appointment creation failed', extractApiError(err)),
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

  const createBillMutation = useMutation({
    mutationFn: () =>
      hmsService.createBill({
        patient_id: Number(billForm.patient_id),
        bill_number: billForm.bill_number,
        discount: Number(billForm.discount || 0),
        tax: Number(billForm.tax || 0),
        notes: billForm.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Bill invoice created');
      setBillModal(false);
      void queryClient.invalidateQueries({ queryKey: ['hms-bills'] });
    },
    onError: (err) => toast.error('Bill creation failed', extractApiError(err)),
  });

  const addBillItemMutation = useMutation({
    mutationFn: () =>
      hmsService.addBillItem({
        bill_id: billItemModal!.id,
        item_type: billItemForm.item_type,
        description: billItemForm.description,
        quantity: Number(billItemForm.quantity),
        unit_price: Number(billItemForm.unit_price),
      }),
    onSuccess: () => {
      toast.success('Line item added');
      setBillItemModal(null);
      setBillItemForm({ item_type: 'consultation', description: '', quantity: '1', unit_price: '' });
      void queryClient.invalidateQueries({ queryKey: ['hms-bills'] });
    },
    onError: (err) => toast.error('Failed to add item', extractApiError(err)),
  });

  const paymentMutation = useMutation({
    mutationFn: () => hmsService.updateBillPayment(payModal!.id, Number(payAmount)),
    onSuccess: () => {
      toast.success('Payment recorded');
      setPayModal(null);
      setPayAmount('');
      void queryClient.invalidateQueries({ queryKey: ['hms-bills'] });
    },
    onError: (err) => toast.error('Payment failed', extractApiError(err)),
  });

  const createMedMutation = useMutation({
    mutationFn: () =>
      hmsService.createMedicine({
        medicine_name: medForm.medicine_name,
        generic_name: medForm.generic_name || undefined,
        category: medForm.category || undefined,
        manufacturer: medForm.manufacturer || undefined,
        batch_number: medForm.batch_number,
        quantity: Number(medForm.quantity),
        unit_price: Number(medForm.unit_price),
        expiry_date: medForm.expiry_date,
      }),
    onSuccess: () => {
      toast.success('Medicine added to catalog');
      setMedModal(false);
      void queryClient.invalidateQueries({ queryKey: ['hms-medicines'] });
    },
    onError: (err) => toast.error('Medicine creation failed', extractApiError(err)),
  });

  const stockMutation = useMutation({
    mutationFn: ({ id, qty }: { id: number; qty: number }) => hmsService.updateMedicineStock(id, qty),
    onSuccess: () => {
      toast.success('Stock updated');
      void queryClient.invalidateQueries({ queryKey: ['hms-medicines'] });
    },
    onError: (err) => toast.error('Stock update failed', extractApiError(err)),
  });

  const createErMutation = useMutation({
    mutationFn: () =>
      hmsService.createEmergencyCase({
        patient_id: Number(erForm.patient_id),
        assigned_doctor_id: erForm.assigned_doctor_id ? Number(erForm.assigned_doctor_id) : null,
        assigned_nurse_id: erForm.assigned_nurse_id ? Number(erForm.assigned_nurse_id) : null,
        priority: erForm.priority,
        symptoms: erForm.symptoms || undefined,
        vitals: erForm.vitals || undefined,
        treatment_notes: erForm.treatment_notes || undefined,
        admission_required: erForm.admission_required,
      }),
    onSuccess: () => {
      toast.success('Emergency case logged');
      setErModal(false);
      void queryClient.invalidateQueries({ queryKey: ['hms-er'] });
    },
    onError: (err) => toast.error('Emergency intake failed', extractApiError(err)),
  });

  const createIcuMutation = useMutation({
    mutationFn: () =>
      hmsService.createIcuAdmission({
        patient_id: Number(icuForm.patient_id),
        doctor_user_id: icuForm.doctor_user_id ? Number(icuForm.doctor_user_id) : null,
        nurse_user_id: icuForm.nurse_user_id ? Number(icuForm.nurse_user_id) : null,
        bed_number: icuForm.bed_number,
        room_number: icuForm.room_number || undefined,
        admission_reason: icuForm.admission_reason,
        vitals: icuForm.vitals || undefined,
        treatment_notes: icuForm.treatment_notes || undefined,
      }),
    onSuccess: () => {
      toast.success('ICU admission created');
      setIcuModal(false);
      void queryClient.invalidateQueries({ queryKey: ['hms-icu'] });
    },
    onError: (err) => toast.error('ICU admission failed', extractApiError(err)),
  });

  const createOtMutation = useMutation({
    mutationFn: () =>
      hmsService.createOtCase({
        patient_id: Number(otForm.patient_id),
        surgeon_user_id: otForm.surgeon_user_id ? Number(otForm.surgeon_user_id) : null,
        nurse_user_id: otForm.nurse_user_id ? Number(otForm.nurse_user_id) : null,
        operation_name: otForm.operation_name,
        operation_type: otForm.operation_type || undefined,
        theatre_number: otForm.theatre_number,
        scheduled_at: otForm.scheduled_at,
        diagnosis: otForm.diagnosis || undefined,
        pre_op_notes: otForm.pre_op_notes || undefined,
      }),
    onSuccess: () => {
      toast.success('OT surgery scheduled');
      setOtModal(false);
      void queryClient.invalidateQueries({ queryKey: ['hms-ot'] });
    },
    onError: (err) => toast.error('OT scheduling failed', extractApiError(err)),
  });

  const createHkMutation = useMutation({
    mutationFn: () =>
      hmsService.createHousekeepingTask({
        task_type: hkForm.task_type,
        area: hkForm.area,
        room_number: hkForm.room_number || undefined,
        priority: hkForm.priority,
        assigned_worker_id: hkForm.assigned_worker_id ? Number(hkForm.assigned_worker_id) : null,
        description: hkForm.description || undefined,
      }),
    onSuccess: () => {
      toast.success('Housekeeping task dispatched');
      setHkModal(false);
      void queryClient.invalidateQueries({ queryKey: ['hms-housekeeping'] });
    },
    onError: (err) => toast.error('Task creation failed', extractApiError(err)),
  });

  const openInvoice = async (billId: number) => {
    try {
      const detail = await hmsService.getBillDetail(billId);
      setInvoiceDetail(detail);
    } catch (err) {
      toast.error('Unable to load invoice', extractApiError(err));
    }
  };

  const apptColumns: ColumnDef<Appointment>[] = [
    { key: 'id', header: 'Appointment', render: (a) => `Appt ${a.id} (Patient ${a.patient_id})` },
    {
      key: 'when',
      header: 'Date & Reason',
      render: (a) => (
        <div>
          <p className="font-semibold text-slate-900">{formatDateTime(a.appointment_date)}</p>
          <p className="text-xs text-slate-500">{a.reason || 'Consultation'}</p>
        </div>
      ),
    },
    { key: 'doc', header: 'Doctor ID', render: (a) => `Doctor ${a.doctor_user_id}` },
    { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status} /> },
    {
      key: 'actions',
      header: 'Update Status',
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

  const billColumns: ColumnDef<Bill>[] = [
    {
      key: 'number',
      header: 'Invoice Number',
      render: (b) => (
        <div>
          <p className="font-semibold text-slate-900">{b.bill_number}</p>
          <p className="text-xs text-slate-500">Patient ID {b.patient_id}</p>
        </div>
      ),
    },
    {
      key: 'amounts',
      header: 'Totals',
      render: (b) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-900">Total: {formatCurrency(b.total_amount)}</p>
          <p className="text-slate-500">
            Paid: {formatCurrency(b.paid_amount)} • Sub: {formatCurrency(b.subtotal)}
          </p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.payment_status} /> },
    {
      key: 'actions',
      header: 'Billing Actions',
      render: (b) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void openInvoice(b.id)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Invoice / Print
          </button>
          {b.payment_status !== 'paid' && (
            <>
              <button
                type="button"
                onClick={() => setBillItemModal(b)}
                className="rounded-lg bg-clinical-50 px-2.5 py-1 text-xs font-semibold text-clinical-700 hover:bg-clinical-100"
              >
                + Item
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayModal(b);
                  setPayAmount(String(b.total_amount));
                }}
                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Record Pay
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const medColumns: ColumnDef<Medicine>[] = [
    {
      key: 'med',
      header: 'Medicine',
      render: (m) => (
        <div>
          <p className="font-semibold text-slate-900">{m.medicine_name}</p>
          <p className="text-xs text-slate-500">
            {m.generic_name || 'Generic N/A'} • Batch {m.batch_number}
          </p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock & Price',
      render: (m) => (
        <div className="text-xs">
          <Badge variant={m.quantity <= 10 ? 'rose' : 'emerald'}>{m.quantity} units</Badge>
          <p className="mt-1 text-slate-600">{formatCurrency(m.unit_price)} / unit</p>
        </div>
      ),
    },
    {
      key: 'expiry',
      header: 'Expiry & Status',
      render: (m) => {
        const expDays = Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000);
        return (
          <div className="text-xs">
            <p className={expDays <= 30 ? 'font-semibold text-rose-600' : 'text-slate-700'}>
              {formatDate(m.expiry_date)} ({expDays <= 0 ? 'Expired' : `${expDays}d`})
            </p>
            <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Adjust Stock',
      render: (m) => (
        <button
          type="button"
          onClick={() => {
            const next = window.prompt(`New stock quantity for ${m.medicine_name}:`, String(m.quantity));
            if (next !== null && !Number.isNaN(Number(next))) {
              stockMutation.mutate({ id: m.id, qty: Number(next) });
            }
          }}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Update Qty
        </button>
      ),
    },
  ];

  const erColumns: ColumnDef<EmergencyCase>[] = [
    { key: 'id', header: 'ER Case', render: (c) => `Case ${c.id} • Patient ${c.patient_id}` },
    { key: 'priority', header: 'Priority', render: (c) => <StatusBadge status={c.priority} /> },
    {
      key: 'clinical',
      header: 'Symptoms & Vitals',
      render: (c) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{c.symptoms || '—'}</p>
          <p className="text-slate-500">{c.vitals || '—'}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ];

  const icuColumns: ColumnDef<ICUAdmission>[] = [
    { key: 'bed', header: 'Bed & Patient', render: (c) => `Bed ${c.bed_number} • Patient ${c.patient_id}` },
    { key: 'reason', header: 'Reason', render: (c) => c.admission_reason },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'admitted', header: 'Admitted', render: (c) => formatDateTime(c.admitted_at) },
  ];

  const otColumns: ColumnDef<OperationTheatreCase>[] = [
    {
      key: 'op',
      header: 'Operation',
      render: (c) => (
        <div>
          <p className="font-semibold text-slate-900">{c.operation_name}</p>
          <p className="text-xs text-slate-500">
            {c.theatre_number} • Patient {c.patient_id}
          </p>
        </div>
      ),
    },
    { key: 'when', header: 'Scheduled', render: (c) => formatDateTime(c.scheduled_at) },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ];

  const hkColumns: ColumnDef<HousekeepingTask>[] = [
    {
      key: 'task',
      header: 'Area & Task',
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-900">
            {t.area} {t.room_number ? `(${t.room_number})` : ''}
          </p>
          <p className="text-xs text-slate-500">{t.task_type}</p>
        </div>
      ),
    },
    { key: 'prio', header: 'Priority', render: (t) => <StatusBadge status={t.priority} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
  ];

  const canteenColumns: ColumnDef<CanteenOrder>[] = [
    { key: 'order', header: 'Order', render: (o) => `Order ${o.id} (Menu Item ${o.menu_item_id})` },
    { key: 'qty', header: 'Qty & Total', render: (o) => `${o.quantity}x • ${formatCurrency(o.total_amount)}` },
    { key: 'notes', header: 'Dietary Notes', render: (o) => o.notes || 'Standard' },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'appointments', label: 'Appointments', icon: CalendarClock },
            { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },
            { id: 'pharmacy', label: 'Pharmacy Stock', icon: Pill },
            { id: 'critical', label: 'ER / ICU / OT', icon: Ambulance },
            { id: 'services', label: 'Housekeeping & Canteen', icon: UtensilsCrossed },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                tab === t.id
                  ? 'bg-clinical-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'appointments' && (
        <Card>
          <CardHeader
            title="Hospital Appointments Queue"
            action={
              <button
                type="button"
                onClick={() => setApptModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
              >
                <Plus className="h-4 w-4" />
                Book Appointment
              </button>
            }
          />
          <CardBody>
            <DataTable
              data={apptsQuery.data ?? []}
              columns={apptColumns}
              rowKey={(a) => a.id}
              isLoading={apptsQuery.isLoading}
              searchPlaceholder="Search appointment ID, reason, or status..."
              searchFn={(a, q) =>
                `${a.id} ${a.patient_id} ${a.reason ?? ''} ${a.status}`.toLowerCase().includes(q)
              }
            />
          </CardBody>
        </Card>
      )}

      {tab === 'billing' && (
        <Card>
          <CardHeader
            title="Hospital Billing & Invoices"
            subtitle="Create bills, append line items, record payments, and generate printable invoices."
            action={
              <button
                type="button"
                onClick={() => setBillModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                New Invoice
              </button>
            }
          />
          <CardBody>
            <DataTable
              data={billsQuery.data ?? []}
              columns={billColumns}
              rowKey={(b) => b.id}
              isLoading={billsQuery.isLoading}
              searchPlaceholder="Search bill number or status..."
              searchFn={(b, q) =>
                `${b.bill_number} ${b.patient_id} ${b.payment_status}`.toLowerCase().includes(q)
              }
            />
          </CardBody>
        </Card>
      )}

      {tab === 'pharmacy' && (
        <Card>
          <CardHeader
            title="Pharmacy Inventory Catalog"
            subtitle="Client-side expiry alerts computed from live /hms/pharmacy/medicines/ feed."
            action={
              <button
                type="button"
                onClick={() => setMedModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
              >
                <Plus className="h-4 w-4" />
                Add Medicine
              </button>
            }
          />
          <CardBody>
            <DataTable
              data={medsQuery.data ?? []}
              columns={medColumns}
              rowKey={(m) => m.id}
              isLoading={medsQuery.isLoading}
              searchPlaceholder="Search medicine name or batch..."
              searchFn={(m, q) =>
                `${m.medicine_name} ${m.generic_name ?? ''} ${m.batch_number}`.toLowerCase().includes(q)
              }
            />
          </CardBody>
        </Card>
      )}

      {tab === 'critical' && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Emergency Cases"
              action={
                <button
                  type="button"
                  onClick={() => setErModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  <Plus className="h-4 w-4" />
                  Log ER Case
                </button>
              }
            />
            <CardBody>
              <DataTable data={erQuery.data ?? []} columns={erColumns} rowKey={(c) => c.id} isLoading={erQuery.isLoading} />
            </CardBody>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="ICU Admissions"
                action={
                  <button
                    type="button"
                    onClick={() => setIcuModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Admit ICU
                  </button>
                }
              />
              <CardBody>
                <DataTable data={icuQuery.data ?? []} columns={icuColumns} rowKey={(c) => c.id} isLoading={icuQuery.isLoading} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Operation Theatre Schedule"
                action={
                  <button
                    type="button"
                    onClick={() => setOtModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Schedule OT
                  </button>
                }
              />
              <CardBody>
                <DataTable data={otQuery.data ?? []} columns={otColumns} rowKey={(c) => c.id} isLoading={otQuery.isLoading} />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === 'services' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Housekeeping Queue"
              action={
                <button
                  type="button"
                  onClick={() => setHkModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  New Task
                </button>
              }
            />
            <CardBody>
              <DataTable data={hkQuery.data ?? []} columns={hkColumns} rowKey={(t) => t.id} isLoading={hkQuery.isLoading} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent Canteen Orders" />
            <CardBody>
              <DataTable
                data={canteenOrdersQuery.data ?? []}
                columns={canteenColumns}
                rowKey={(o) => o.id}
                isLoading={canteenOrdersQuery.isLoading}
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* Modals */}
      <Modal open={apptModal} onClose={() => setApptModal(false)} title="Create Appointment">
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
            {doctors.map((d) => (
              <option key={d.user_id} value={d.user_id}>
                {d.name} ({d.department})
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
          <div className="flex justify-end gap-2">
            <button type="submit" className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white">
              Schedule
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={billModal} onClose={() => setBillModal(false)} title="Create Patient Bill">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBillMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            required
            value={billForm.patient_id}
            onChange={(e) => setBillForm({ ...billForm, patient_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select Patient...</option>
            {(patientsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.patient_code})
              </option>
            ))}
          </select>
          <input
            required
            value={billForm.bill_number}
            onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })}
            placeholder="Bill Number"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={billForm.discount}
              onChange={(e) => setBillForm({ ...billForm, discount: e.target.value })}
              placeholder="Discount"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={billForm.tax}
              onChange={(e) => setBillForm({ ...billForm, tax: e.target.value })}
              placeholder="Tax"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white">
              Create Bill
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={billItemModal !== null}
        onClose={() => setBillItemModal(null)}
        title={`Add Line Item (${billItemModal?.bill_number ?? ''})`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addBillItemMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            value={billItemForm.item_type}
            onChange={(e) => setBillItemForm({ ...billItemForm, item_type: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="consultation">Consultation</option>
            <option value="lab">Lab Test</option>
            <option value="medicine">Medicine</option>
            <option value="procedure">Procedure</option>
            <option value="other">Other</option>
          </select>
          <input
            required
            placeholder="Description"
            value={billItemForm.description}
            onChange={(e) => setBillItemForm({ ...billItemForm, description: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              required
              value={billItemForm.quantity}
              onChange={(e) => setBillItemForm({ ...billItemForm, quantity: e.target.value })}
              placeholder="Qty"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={billItemForm.unit_price}
              onChange={(e) => setBillItemForm({ ...billItemForm, unit_price: e.target.value })}
              placeholder="Unit Price"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white">
              Add Item
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={payModal !== null}
        onClose={() => setPayModal(null)}
        title={`Record Payment (${payModal?.bill_number ?? ''})`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            paymentMutation.mutate();
          }}
          className="space-y-3"
        >
          <p className="text-xs text-slate-600">
            Total Billed: {formatCurrency(payModal?.total_amount)} • Currently Paid:{' '}
            {formatCurrency(payModal?.paid_amount)}
          </p>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder="Cumulative Paid Amount"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
              Update Payment
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={medModal} onClose={() => setMedModal(false)} title="Add Medicine Stock">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMedMutation.mutate();
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <input
            required
            placeholder="Medicine Name"
            value={medForm.medicine_name}
            onChange={(e) => setMedForm({ ...medForm, medicine_name: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Generic Name"
            value={medForm.generic_name}
            onChange={(e) => setMedForm({ ...medForm, generic_name: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Batch Number"
            value={medForm.batch_number}
            onChange={(e) => setMedForm({ ...medForm, batch_number: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            required
            value={medForm.expiry_date}
            onChange={(e) => setMedForm({ ...medForm, expiry_date: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            required
            placeholder="Quantity"
            value={medForm.quantity}
            onChange={(e) => setMedForm({ ...medForm, quantity: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="Unit Price"
            value={medForm.unit_price}
            onChange={(e) => setMedForm({ ...medForm, unit_price: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white">
              Add Medicine
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={erModal} onClose={() => setErModal(false)} title="Log Emergency Case">
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
          <div className="grid grid-cols-2 gap-2">
            <select
              value={erForm.assigned_doctor_id}
              onChange={(e) => setErForm({ ...erForm, assigned_doctor_id: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Doctor (Optional)</option>
              {doctors.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={erForm.assigned_nurse_id}
              onChange={(e) => setErForm({ ...erForm, assigned_nurse_id: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Nurse (Optional)</option>
              {nurses.map((n) => (
                <option key={n.user_id} value={n.user_id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
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
            placeholder="Symptoms"
            value={erForm.symptoms}
            onChange={(e) => setErForm({ ...erForm, symptoms: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Initial Vitals (e.g. BP 140/90, SpO2 94%)"
            value={erForm.vitals}
            onChange={(e) => setErForm({ ...erForm, vitals: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
              Submit ER Case
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={icuModal} onClose={() => setIcuModal(false)} title="Admit Patient to ICU">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createIcuMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            required
            value={icuForm.patient_id}
            onChange={(e) => setIcuForm({ ...icuForm, patient_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select Patient...</option>
            {(patientsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.patient_code})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Bed Number (e.g. ICU-04)"
              value={icuForm.bed_number}
              onChange={(e) => setIcuForm({ ...icuForm, bed_number: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              placeholder="Room Number"
              value={icuForm.room_number}
              onChange={(e) => setIcuForm({ ...icuForm, room_number: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <input
            required
            placeholder="Admission Reason"
            value={icuForm.admission_reason}
            onChange={(e) => setIcuForm({ ...icuForm, admission_reason: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={icuForm.doctor_user_id}
              onChange={(e) => setIcuForm({ ...icuForm, doctor_user_id: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Doctor (Optional)</option>
              {doctors.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={icuForm.nurse_user_id}
              onChange={(e) => setIcuForm({ ...icuForm, nurse_user_id: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Nurse (Optional)</option>
              {nurses.map((n) => (
                <option key={n.user_id} value={n.user_id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white">
              Admit ICU
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={otModal} onClose={() => setOtModal(false)} title="Schedule Operation Theatre">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createOtMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            required
            value={otForm.patient_id}
            onChange={(e) => setOtForm({ ...otForm, patient_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select Patient...</option>
            {(patientsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.patient_code})
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Operation Name"
            value={otForm.operation_name}
            onChange={(e) => setOtForm({ ...otForm, operation_name: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Theatre Number"
              value={otForm.theatre_number}
              onChange={(e) => setOtForm({ ...otForm, theatre_number: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              required
              value={otForm.scheduled_at}
              onChange={(e) => setOtForm({ ...otForm, scheduled_at: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={otForm.surgeon_user_id}
              onChange={(e) => setOtForm({ ...otForm, surgeon_user_id: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Surgeon (Optional)</option>
              {doctors.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={otForm.nurse_user_id}
              onChange={(e) => setOtForm({ ...otForm, nurse_user_id: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">OT Nurse (Optional)</option>
              {nurses.map((n) => (
                <option key={n.user_id} value={n.user_id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white">
              Schedule OT
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={hkModal} onClose={() => setHkModal(false)} title="Create Housekeeping Task">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createHkMutation.mutate();
          }}
          className="space-y-3"
        >
          <input
            required
            placeholder="Area (e.g. Ward B / ICU Floor)"
            value={hkForm.area}
            onChange={(e) => setHkForm({ ...hkForm, area: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Room Number"
              value={hkForm.room_number}
              onChange={(e) => setHkForm({ ...hkForm, room_number: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={hkForm.priority}
              onChange={(e) => setHkForm({ ...hkForm, priority: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <select
            value={hkForm.assigned_worker_id}
            onChange={(e) => setHkForm({ ...hkForm, assigned_worker_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Assign Housekeeping Worker (Optional)</option>
            {hkWorkers.map((w) => (
              <option key={w.user_id} value={w.user_id}>
                {w.name} ({w.employee_code})
              </option>
            ))}
          </select>
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
              Dispatch Task
            </button>
          </div>
        </form>
      </Modal>

      {invoiceDetail && (
        <PrintableDocumentModal
          open={true}
          onClose={() => setInvoiceDetail(null)}
          title={`Invoice ${invoiceDetail.bill.bill_number}`}
          filename={`${invoiceDetail.bill.bill_number}.txt`}
          plainTextSummary={[
            `Invoice: ${invoiceDetail.bill.bill_number}`,
            `Patient ID: ${invoiceDetail.bill.patient_id}`,
            `Status: ${invoiceDetail.bill.payment_status}`,
            `Subtotal: ${formatCurrency(invoiceDetail.bill.subtotal)}`,
            `Discount: ${formatCurrency(invoiceDetail.bill.discount)}`,
            `Tax: ${formatCurrency(invoiceDetail.bill.tax)}`,
            `Total: ${formatCurrency(invoiceDetail.bill.total_amount)}`,
            `Paid: ${formatCurrency(invoiceDetail.bill.paid_amount)}`,
            '',
            'Line Items:',
            ...invoiceDetail.items.map(
              (i) => `- ${i.description} (${i.item_type}): ${i.quantity} x ${formatCurrency(i.unit_price)} = ${formatCurrency(i.total_price)}`,
            ),
          ].join('\n')}
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900">MedCore AI Hospital Invoice</h4>
                <p className="text-xs text-slate-500">Bill Number: {invoiceDetail.bill.bill_number}</p>
              </div>
              <StatusBadge status={invoiceDetail.bill.payment_status} />
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">Description</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceDetail.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 font-medium text-slate-800">{item.description}</td>
                    <td className="py-2 text-slate-500">{item.item_type}</td>
                    <td className="py-2">{item.quantity}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-200 pt-3 text-right text-xs space-y-1">
              <p>Subtotal: {formatCurrency(invoiceDetail.bill.subtotal)}</p>
              <p>Discount: -{formatCurrency(invoiceDetail.bill.discount)}</p>
              <p>Tax: +{formatCurrency(invoiceDetail.bill.tax)}</p>
              <p className="text-sm font-bold text-slate-900">
                Total: {formatCurrency(invoiceDetail.bill.total_amount)}
              </p>
              <p className="text-emerald-700">Paid: {formatCurrency(invoiceDetail.bill.paid_amount)}</p>
            </div>
          </div>
        </PrintableDocumentModal>
      )}
    </div>
  );
}

