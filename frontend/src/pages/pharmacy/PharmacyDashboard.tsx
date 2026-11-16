import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, PackageCheck, Pill, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { hmsService } from '@/services/hmsService';
import { extractApiError, formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { Medicine, MedicineDispensing } from '@/types/api';

type StockFilter = 'all' | 'low' | 'expiring' | 'expired';

export function PharmacyDashboard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StockFilter>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [dispenseTarget, setDispenseTarget] = useState<Medicine | null>(null);
  const [medForm, setMedForm] = useState({
    medicine_name: '',
    generic_name: '',
    category: 'Tablet',
    manufacturer: '',
    batch_number: '',
    quantity: '100',
    unit_price: '12',
    expiry_date: '',
  });
  const [dispenseForm, setDispenseForm] = useState({
    prescription_id: '',
    patient_id: '',
    quantity: '1',
    notes: '',
  });

  const medicinesQuery = useQuery({
    queryKey: ['hms-medicines'],
    queryFn: () => hmsService.listMedicines(),
  });
  const dispensingsQuery = useQuery({
    queryKey: ['pharmacy-my-dispensings'],
    queryFn: () => hmsService.getMyDispensings(),
  });

  const stats = useMemo(() => {
    const list = medicinesQuery.data ?? [];
    const now = Date.now();
    const low = list.filter((m) => m.is_active && m.quantity <= 10);
    const expiring = list.filter((m) => {
      const days = (new Date(m.expiry_date).getTime() - now) / 86400000;
      return days > 0 && days <= 30;
    });
    const expired = list.filter((m) => new Date(m.expiry_date).getTime() <= now);
    return { total: list.length, low, expiring, expired };
  }, [medicinesQuery.data]);

  const displayedMedicines = useMemo(() => {
    const list = medicinesQuery.data ?? [];
    if (filter === 'low') return stats.low;
    if (filter === 'expiring') return stats.expiring;
    if (filter === 'expired') return stats.expired;
    return list;
  }, [filter, medicinesQuery.data, stats]);

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
      toast.success('Medicine batch added');
      setAddModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['hms-medicines'] });
    },
    onError: (err) => toast.error('Medicine creation failed', extractApiError(err)),
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ id, qty }: { id: number; qty: number }) => hmsService.updateMedicineStock(id, qty),
    onSuccess: () => {
      toast.success('Stock level updated');
      void queryClient.invalidateQueries({ queryKey: ['hms-medicines'] });
    },
    onError: (err) => toast.error('Stock update failed', extractApiError(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => hmsService.deactivateMedicine(id),
    onSuccess: () => {
      toast.success('Medicine deactivated');
      void queryClient.invalidateQueries({ queryKey: ['hms-medicines'] });
    },
    onError: (err) => toast.error('Deactivation failed', extractApiError(err)),
  });

  const dispenseMutation = useMutation({
    mutationFn: () =>
      hmsService.dispenseMedicine({
        medicine_id: dispenseTarget!.id,
        quantity: Number(dispenseForm.quantity),
        prescription_id: Number(dispenseForm.prescription_id),
        patient_id: dispenseForm.patient_id ? Number(dispenseForm.patient_id) : undefined,
        notes: dispenseForm.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Medication dispensed against prescription');
      setDispenseTarget(null);
      setDispenseForm({ prescription_id: '', patient_id: '', quantity: '1', notes: '' });
      void queryClient.invalidateQueries({ queryKey: ['hms-medicines'] });
      void queryClient.invalidateQueries({ queryKey: ['pharmacy-my-dispensings'] });
    },
    onError: (err) => toast.error('Dispensing blocked', extractApiError(err)),
  });

  const medColumns: ColumnDef<Medicine>[] = [
    {
      key: 'med',
      header: 'Medicine & Batch',
      render: (m) => (
        <div>
          <p className="font-semibold text-slate-900">{m.medicine_name}</p>
          <p className="text-xs text-slate-500">
            {m.generic_name || 'Generic'} • Batch {m.batch_number} • {m.category || 'Standard'}
          </p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Available Stock',
      render: (m) => (
        <div className="text-xs">
          <Badge variant={m.quantity <= 10 ? 'rose' : 'emerald'}>{m.quantity} units</Badge>
          <p className="mt-1 text-slate-500">{formatCurrency(m.unit_price)} / unit</p>
        </div>
      ),
    },
    {
      key: 'expiry',
      header: 'Expiry & Status',
      render: (m) => {
        const days = Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000);
        return (
          <div className="space-y-1 text-xs">
            <p className={days <= 30 ? 'font-semibold text-rose-600' : 'text-slate-700'}>
              {formatDate(m.expiry_date)} ({days <= 0 ? 'Expired' : `${days}d left`})
            </p>
            <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (m) => (
        <div className="flex flex-wrap gap-1.5">
          {m.is_active && m.quantity > 0 && (
            <button
              type="button"
              onClick={() => setDispenseTarget(m)}
              className="rounded-lg bg-clinical-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              Dispense
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const next = window.prompt(`Updated stock quantity for ${m.medicine_name}:`, String(m.quantity));
              if (next !== null && !Number.isNaN(Number(next))) {
                updateStockMutation.mutate({ id: m.id, qty: Number(next) });
              }
            }}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Restock
          </button>
          {m.is_active && (
            <button
              type="button"
              onClick={() => deactivateMutation.mutate(m.id)}
              className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
              title="Deactivate batch"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const dispColumns: ColumnDef<MedicineDispensing>[] = [
    { key: 'id', header: 'Dispense Record', render: (d) => `Entry ${d.id} (Medicine ${d.medicine_id})` },
    {
      key: 'rx',
      header: 'Prescription & Patient',
      render: (d) => `Rx ${d.prescription_id ?? '—'} • Patient ${d.patient_id ?? '—'}`,
    },
    {
      key: 'qty',
      header: 'Quantity & Total',
      render: (d) => `${d.quantity} units • ${formatCurrency(d.total_price)}`,
    },
    { key: 'time', header: 'Dispensed At', render: (d) => formatDateTime(d.dispensed_at) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Catalog Batches" value={stats.total} icon={Pill} tone="purple" />
        <StatCard label="Low Stock (<=10)" value={stats.low.length} icon={AlertTriangle} tone="amber" />
        <StatCard
          label="Expiring <=30d"
          value={stats.expiring.length}
          hint="Computed client-side"
          icon={PackageCheck}
          tone="rose"
        />
        <StatCard
          label="My Dispensings"
          value={dispensingsQuery.data?.length ?? 0}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader
          title="Pharmacy Medicine Catalog & Expiry Monitor"
          subtitle="Dispensing enforces valid prescription ID and non-expired active stock on backend."
          action={
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              <Plus className="h-4 w-4" />
              Add Batch
            </button>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', 'All Stock'],
                ['low', `Low Stock (${stats.low.length})`],
                ['expiring', `Expiring <=30d (${stats.expiring.length})`],
                ['expired', `Expired (${stats.expired.length})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  filter === k
                    ? 'bg-violet-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <DataTable
            data={displayedMedicines}
            columns={medColumns}
            rowKey={(m) => m.id}
            isLoading={medicinesQuery.isLoading}
            searchPlaceholder="Search medicine, generic name, or batch..."
            searchFn={(m, q) =>
              `${m.medicine_name} ${m.generic_name ?? ''} ${m.batch_number}`.toLowerCase().includes(q)
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent Dispensing Log" subtitle="History of medicines issued to patients" />
        <CardBody>
          <DataTable
            data={dispensingsQuery.data ?? []}
            columns={dispColumns}
            rowKey={(d) => d.id}
            isLoading={dispensingsQuery.isLoading}
          />
        </CardBody>
      </Card>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Medicine Batch">
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
            min={0}
            required
            placeholder="Quantity"
            value={medForm.quantity}
            onChange={(e) => setMedForm({ ...medForm, quantity: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            step="0.01"
            required
            placeholder="Unit Price"
            value={medForm.unit_price}
            onChange={(e) => setMedForm({ ...medForm, unit_price: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMedMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Add Stock
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={dispenseTarget !== null}
        onClose={() => setDispenseTarget(null)}
        title={`Dispense ${dispenseTarget?.medicine_name ?? ''}`}
        subtitle={`In stock: ${dispenseTarget?.quantity ?? 0} units`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            dispenseMutation.mutate();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Prescription ID</label>
              <input
                type="number"
                min={1}
                required
                value={dispenseForm.prescription_id}
                onChange={(e) => setDispenseForm({ ...dispenseForm, prescription_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Quantity</label>
              <input
                type="number"
                min={1}
                max={dispenseTarget?.quantity}
                required
                value={dispenseForm.quantity}
                onChange={(e) => setDispenseForm({ ...dispenseForm, quantity: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Patient ID (Optional)</label>
            <input
              type="number"
              min={1}
              value={dispenseForm.patient_id}
              onChange={(e) => setDispenseForm({ ...dispenseForm, patient_id: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Dispensing Notes</label>
            <input
              value={dispenseForm.notes}
              onChange={(e) => setDispenseForm({ ...dispenseForm, notes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDispenseTarget(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={dispenseMutation.isPending}
              className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white"
            >
              Confirm Dispense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

