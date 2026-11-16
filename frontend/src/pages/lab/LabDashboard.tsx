import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, Eye, FlaskConical } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { usePreferences } from '@/context/PreferencesContext';
import { hmsService } from '@/services/hmsService';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PrintableDocumentModal } from '@/components/shared/PrintableDocument';
import type { LabOrder, LabResult } from '@/types/api';

export function LabDashboard() {
  const toast = useToast();
  const { prefs } = usePreferences();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [publishOrder, setPublishOrder] = useState<LabOrder | null>(null);
  const [viewResultPair, setViewResultPair] = useState<{ order: LabOrder; result: LabResult } | null>(null);
  const [resultForm, setResultForm] = useState({
    result_value: '',
    unit: '',
    reference_range: '',
    interpretation: '',
    result_status: 'normal',
    remarks: '',
  });

  const ordersQuery = useQuery({
    queryKey: ['lab-orders'],
    queryFn: () => hmsService.getMyLabOrders(),
    refetchInterval: prefs.autoRefreshSeconds > 0 ? prefs.autoRefreshSeconds * 1000 : false,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      hmsService.updateLabOrderStatus(id, status),
    onSuccess: () => {
      toast.success('Lab order status updated');
      void queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
    },
    onError: (err) => toast.error('Status update failed', extractApiError(err)),
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      hmsService.createLabResult({
        lab_order_id: publishOrder!.id,
        result_value: resultForm.result_value,
        unit: resultForm.unit || undefined,
        reference_range: resultForm.reference_range || undefined,
        interpretation: resultForm.interpretation || undefined,
        result_status: resultForm.result_status,
        remarks: resultForm.remarks || undefined,
      }),
    onSuccess: () => {
      toast.success('Lab result published and order completed');
      setPublishOrder(null);
      setResultForm({
        result_value: '',
        unit: '',
        reference_range: '',
        interpretation: '',
        result_status: 'normal',
        remarks: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
    },
    onError: (err) => toast.error('Failed to publish result', extractApiError(err)),
  });

  const openResult = async (order: LabOrder) => {
    try {
      const result = await hmsService.getLabResultByOrder(order.id);
      setViewResultPair({ order, result });
    } catch (err) {
      toast.error('Unable to load lab result', extractApiError(err));
    }
  };

  const orders = ordersQuery.data ?? [];
  const orderedCount = orders.filter((o) => o.status === 'ordered').length;
  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  const filtered = orders.filter((o) => (statusFilter === 'all' ? true : o.status === statusFilter));

  const columns: ColumnDef<LabOrder>[] = [
    {
      key: 'test',
      header: 'Diagnostic Request',
      render: (o) => (
        <div>
          <p className="font-semibold text-slate-900">
            {o.test_name}
          </p>
          <p className="text-xs text-slate-500">
            Order ID {o.id} • Patient {o.patient_id} • Doctor {o.doctor_user_id} • {o.test_type || 'Standard'}
          </p>
          {o.clinical_notes && <p className="mt-0.5 text-xs text-slate-600">{o.clinical_notes}</p>}
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', render: (o) => <StatusBadge status={o.priority} /> },
    { key: 'ordered', header: 'Ordered At', render: (o) => formatDateTime(o.ordered_at) },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    {
      key: 'actions',
      header: 'Technician Actions',
      render: (o) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {o.status === 'ordered' && (
            <button
              type="button"
              onClick={() => statusMutation.mutate({ id: o.id, status: 'processing' })}
              className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Start Processing
            </button>
          )}
          {(o.status === 'ordered' || o.status === 'processing') && (
            <button
              type="button"
              onClick={() => setPublishOrder(o)}
              className="rounded-lg bg-clinical-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              Publish Result
            </button>
          )}
          {o.status === 'completed' && (
            <button
              type="button"
              onClick={() => void openResult(o)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <Eye className="h-3.5 w-3.5" />
              View Report
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending Sample Intake" value={orderedCount} icon={FlaskConical} tone="blue" />
        <StatCard label="In Processing" value={processingCount} icon={ClipboardCheck} tone="amber" />
        <StatCard label="Completed Reports" value={completedCount} icon={CheckCircle2} tone="emerald" />
      </div>

      <Card>
        <CardHeader
          title="Laboratory Work Queue"
          subtitle="Track sample processing and publish verified diagnostic lab results."
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {['all', 'ordered', 'processing', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize ${
                  statusFilter === st
                    ? 'bg-clinical-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            rowKey={(o) => o.id}
            isLoading={ordersQuery.isLoading}
            searchPlaceholder="Search test name, patient ID, or order ID..."
            searchFn={(o, q) =>
              `${o.id} ${o.test_name} ${o.patient_id} ${o.test_type ?? ''}`.toLowerCase().includes(q)
            }
          />
        </CardBody>
      </Card>

      <Modal
        open={publishOrder !== null}
        onClose={() => setPublishOrder(null)}
        title={`Publish Lab Result — ${publishOrder?.test_name ?? ''}`}
        subtitle={`Order ID ${publishOrder?.id ?? ''} • Patient ID ${publishOrder?.patient_id ?? ''}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            publishMutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Result Value</label>
              <input
                required
                placeholder="e.g. 6.4"
                value={resultForm.result_value}
                onChange={(e) => setResultForm({ ...resultForm, result_value: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Unit</label>
              <input
                placeholder="e.g. %, mg/dL"
                value={resultForm.unit}
                onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Result Flag</label>
              <select
                value={resultForm.result_status}
                onChange={(e) => setResultForm({ ...resultForm, result_status: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="normal">Normal</option>
                <option value="abnormal">Abnormal</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Reference Range</label>
            <input
              placeholder="e.g. 4.0 - 5.6%"
              value={resultForm.reference_range}
              onChange={(e) => setResultForm({ ...resultForm, reference_range: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Interpretation</label>
            <input
              placeholder="e.g. Elevated glycemic index"
              value={resultForm.interpretation}
              onChange={(e) => setResultForm({ ...resultForm, interpretation: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Remarks</label>
            <textarea
              rows={2}
              value={resultForm.remarks}
              onChange={(e) => setResultForm({ ...resultForm, remarks: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPublishOrder(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={publishMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish Result'}
            </button>
          </div>
        </form>
      </Modal>

      {viewResultPair && (
        <PrintableDocumentModal
          open={true}
          onClose={() => setViewResultPair(null)}
          title={`Lab Report — ${viewResultPair.order.test_name}`}
          filename={`lab-result-${viewResultPair.order.id}.txt`}
          plainTextSummary={[
            `Lab Report: ${viewResultPair.order.test_name}`,
            `Patient ID: ${viewResultPair.order.patient_id}`,
            `Value: ${viewResultPair.result.result_value} ${viewResultPair.result.unit || ''}`,
            `Range: ${viewResultPair.result.reference_range || '—'}`,
            `Status: ${viewResultPair.result.result_status}`,
            `Interpretation: ${viewResultPair.result.interpretation || '—'}`,
          ].join('\n')}
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-bold text-slate-900">{viewResultPair.order.test_name}</h4>
                <p className="text-xs text-slate-500">Order ID {viewResultPair.order.id}</p>
              </div>
              <Badge variant={viewResultPair.result.result_status === 'normal' ? 'emerald' : 'rose'}>
                {viewResultPair.result.result_status}
              </Badge>
            </div>
            <p className="font-semibold">
              Result: {viewResultPair.result.result_value} {viewResultPair.result.unit || ''}
            </p>
            <p className="text-xs text-slate-600">
              Reference Range: {viewResultPair.result.reference_range || '—'}
            </p>
            <p className="text-xs text-slate-600">
              Interpretation: {viewResultPair.result.interpretation || '—'}
            </p>
          </div>
        </PrintableDocumentModal>
      )}
    </div>
  );
}

