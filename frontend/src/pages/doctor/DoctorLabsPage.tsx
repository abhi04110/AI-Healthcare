import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FlaskConical, Plus, Printer } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { hmsService } from '@/services/hmsService';
import { patientService } from '@/services/patientService';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PrintableDocumentModal } from '@/components/shared/PrintableDocument';
import type { LabOrder, LabResult } from '@/types/api';

export function DoctorLabsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [resultData, setResultData] = useState<LabResult | null>(null);
  const [form, setForm] = useState({
    patient_id: '',
    test_name: '',
    test_type: 'Blood Panel',
    priority: 'normal',
    clinical_notes: '',
  });

  const ordersQuery = useQuery({
    queryKey: ['doctor-lab-orders'],
    queryFn: () => hmsService.getMyLabOrders(),
  });
  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.listPatients(),
  });

  const createOrderMutation = useMutation({
    mutationFn: () =>
      hmsService.createLabOrder({
        patient_id: Number(form.patient_id),
        test_name: form.test_name,
        test_type: form.test_type || undefined,
        priority: form.priority,
        clinical_notes: form.clinical_notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Diagnostic lab order created');
      setOrderModalOpen(false);
      setForm({ patient_id: '', test_name: '', test_type: 'Blood Panel', priority: 'normal', clinical_notes: '' });
      void queryClient.invalidateQueries({ queryKey: ['doctor-lab-orders'] });
    },
    onError: (err) => toast.error('Lab order failed', extractApiError(err)),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: number) => hmsService.updateLabOrderStatus(orderId, 'cancelled'),
    onSuccess: () => {
      toast.success('Lab order cancelled');
      void queryClient.invalidateQueries({ queryKey: ['doctor-lab-orders'] });
    },
    onError: (err) => toast.error('Unable to cancel order', extractApiError(err)),
  });

  const viewResult = async (order: LabOrder) => {
    try {
      const res = await hmsService.getLabResultByOrder(order.id);
      setSelectedOrder(order);
      setResultData(res);
    } catch (err) {
      toast.info('Result not available yet', extractApiError(err));
    }
  };

  const columns: ColumnDef<LabOrder>[] = [
    {
      key: 'test',
      header: 'Diagnostic Order',
      render: (o) => (
        <div>
          <p className="font-semibold text-slate-900">{o.test_name}</p>
          <p className="text-xs text-slate-500">
            Order ID {o.id} • {o.test_type || 'General'} • Patient {o.patient_id}
          </p>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', render: (o) => <StatusBadge status={o.priority} /> },
    { key: 'status', header: 'Workflow Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'ordered', header: 'Ordered At', render: (o) => formatDateTime(o.ordered_at) },
    {
      key: 'actions',
      header: 'Actions',
      render: (o) => (
        <div className="flex flex-wrap gap-1.5">
          {o.status === 'completed' && (
            <button
              type="button"
              onClick={() => void viewResult(o)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <Eye className="h-3.5 w-3.5" />
              View / Print Result
            </button>
          )}
          {o.status === 'ordered' && (
            <button
              type="button"
              onClick={() => cancelOrderMutation.mutate(o.id)}
              className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Cancel
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
          title="Diagnostic Lab Orders & Results"
          subtitle="Request diagnostic tests and view verified laboratory reports."
          action={
            <button
              type="button"
              onClick={() => setOrderModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              <Plus className="h-4 w-4" />
              Order Lab Test
            </button>
          }
        />
        <CardBody>
          <DataTable
            data={ordersQuery.data ?? []}
            columns={columns}
            rowKey={(o) => o.id}
            isLoading={ordersQuery.isLoading}
            searchPlaceholder="Search test name, type, or status..."
            searchFn={(o, q) =>
              `${o.test_name} ${o.test_type ?? ''} ${o.status} ${o.patient_id}`
                .toLowerCase()
                .includes(q)
            }
            toolbarExtra={
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                <FlaskConical className="h-4 w-4 text-clinical-600" />
                {ordersQuery.data?.length ?? 0} Orders
              </span>
            }
          />
        </CardBody>
      </Card>

      <Modal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        title="Order Diagnostic Lab Test"
        subtitle="Creates a lab order routed immediately to the Laboratory queue."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createOrderMutation.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700">Patient</label>
            <select
              required
              value={form.patient_id}
              onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
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
            <label className="block text-xs font-semibold text-slate-700">Test Name</label>
            <input
              required
              placeholder="e.g. HbA1c, Lipid Profile, Complete Blood Count"
              value={form.test_name}
              onChange={(e) => setForm({ ...form, test_name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Category / Type</label>
              <input
                value={form.test_type}
                onChange={(e) => setForm({ ...form, test_type: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Clinical Notes</label>
            <textarea
              rows={2}
              value={form.clinical_notes}
              onChange={(e) => setForm({ ...form, clinical_notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOrderModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOrderMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              Submit Lab Order
            </button>
          </div>
        </form>
      </Modal>

      {selectedOrder && resultData && (
        <PrintableDocumentModal
          open={true}
          onClose={() => {
            setSelectedOrder(null);
            setResultData(null);
          }}
          title={`Lab Report — ${selectedOrder.test_name}`}
          filename={`lab-report-${selectedOrder.id}.txt`}
          plainTextSummary={[
            `MedCore AI Hospital — Diagnostic Lab Report`,
            `Order ID: ${selectedOrder.id} | Patient ID: ${selectedOrder.patient_id}`,
            `Test: ${selectedOrder.test_name} (${selectedOrder.test_type || 'Standard'})`,
            `Result: ${resultData.result_value} ${resultData.unit || ''}`,
            `Reference Range: ${resultData.reference_range || '—'}`,
            `Status: ${resultData.result_status}`,
            `Interpretation: ${resultData.interpretation || '—'}`,
            `Remarks: ${resultData.remarks || '—'}`,
            `Completed: ${formatDateTime(resultData.completed_at)}`,
          ].join('\n')}
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{selectedOrder.test_name}</h4>
                <p className="text-xs text-slate-500">
                  Order ID {selectedOrder.id} • Patient {selectedOrder.patient_id}
                </p>
              </div>
              <Badge variant={resultData.result_status === 'normal' ? 'emerald' : 'rose'}>
                <Printer className="h-3 w-3" />
                {resultData.result_status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Measured Value</p>
                <p className="mt-1 text-base font-bold text-slate-900">
                  {resultData.result_value} {resultData.unit || ''}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Reference Range</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {resultData.reference_range || 'Not specified'}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 text-xs space-y-1">
              <p className="font-semibold text-slate-800">Interpretation</p>
              <p className="text-slate-600">{resultData.interpretation || '—'}</p>
              {resultData.remarks && (
                <p className="pt-1 text-slate-500">Technician Remarks: {resultData.remarks}</p>
              )}
            </div>
          </div>
        </PrintableDocumentModal>
      )}
    </div>
  );
}

