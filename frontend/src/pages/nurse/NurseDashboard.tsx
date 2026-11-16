import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ambulance, BedDouble, HeartPulse, Scissors, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { usePreferences } from '@/context/PreferencesContext';
import { hmsService } from '@/services/hmsService';
import { patientService } from '@/services/patientService';
import { extractApiError, formatCurrency, formatDateTime } from '@/lib/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { AiAssistantPanel } from '@/components/shared/AiAssistantPanel';
import type { EmergencyCase, ICUAdmission, OperationTheatreCase } from '@/types/api';

export function NurseDashboard() {
  const toast = useToast();
  const { prefs } = usePreferences();
  const queryClient = useQueryClient();
  const refetchInterval = prefs.autoRefreshSeconds > 0 ? prefs.autoRefreshSeconds * 1000 : false;

  const [editingIcu, setEditingIcu] = useState<ICUAdmission | null>(null);
  const [icuForm, setIcuForm] = useState({ status: 'stable', vitals: '', treatment_notes: '' });
  const [editingEr, setEditingEr] = useState<EmergencyCase | null>(null);
  const [erForm, setErForm] = useState({ status: 'in_treatment', treatment_notes: '' });
  const [mealForm, setMealForm] = useState({ menu_item_id: '', quantity: '1', patient_id: '', notes: '' });

  const erQuery = useQuery({
    queryKey: ['nurse-er'],
    queryFn: () => hmsService.listEmergencyCases(),
    refetchInterval,
  });
  const icuQuery = useQuery({
    queryKey: ['nurse-icu'],
    queryFn: () => hmsService.listIcuAdmissions(),
    refetchInterval,
  });
  const otQuery = useQuery({
    queryKey: ['nurse-ot'],
    queryFn: () => hmsService.listOtCases(),
    refetchInterval,
  });
  const menuQuery = useQuery({
    queryKey: ['canteen-available-menu'],
    queryFn: () => hmsService.getAvailableMenu(),
  });
  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.listPatients(),
  });

  const icuMutation = useMutation({
    mutationFn: () =>
      hmsService.updateIcuStatus(editingIcu!.id, {
        status: icuForm.status,
        vitals: icuForm.vitals || undefined,
        treatment_notes: icuForm.treatment_notes || undefined,
      }),
    onSuccess: () => {
      toast.success('ICU vitals & chart updated');
      setEditingIcu(null);
      void queryClient.invalidateQueries({ queryKey: ['nurse-icu'] });
    },
    onError: (err) => toast.error('ICU update failed', extractApiError(err)),
  });

  const erMutation = useMutation({
    mutationFn: () =>
      hmsService.updateEmergencyStatus(editingEr!.id, {
        status: erForm.status,
        treatment_notes: erForm.treatment_notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Emergency case updated');
      setEditingEr(null);
      void queryClient.invalidateQueries({ queryKey: ['nurse-er'] });
    },
    onError: (err) => toast.error('ER update failed', extractApiError(err)),
  });

  const otMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      hmsService.updateOtStatus(id, { status }),
    onSuccess: () => {
      toast.success('OT status updated');
      void queryClient.invalidateQueries({ queryKey: ['nurse-ot'] });
    },
    onError: (err) => toast.error('OT update failed', extractApiError(err)),
  });

  const canteenMutation = useMutation({
    mutationFn: () =>
      hmsService.createCanteenOrder({
        menu_item_id: Number(mealForm.menu_item_id),
        quantity: Number(mealForm.quantity),
        patient_id: mealForm.patient_id ? Number(mealForm.patient_id) : null,
        notes: mealForm.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Ward / patient meal order sent to canteen');
      setMealForm({ menu_item_id: '', quantity: '1', patient_id: '', notes: '' });
      void queryClient.invalidateQueries({ queryKey: ['canteen-available-menu'] });
    },
    onError: (err) => toast.error('Order failed', extractApiError(err)),
  });

  const icuColumns: ColumnDef<ICUAdmission>[] = [
    { key: 'bed', header: 'Bed & Patient', render: (c) => `Bed ${c.bed_number} • Patient ${c.patient_id}` },
    { key: 'reason', header: 'Reason', render: (c) => c.admission_reason },
    { key: 'vitals', header: 'Latest Vitals', render: (c) => c.vitals || '—' },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'act',
      header: 'Update Vitals',
      render: (c) => (
        <button
          type="button"
          onClick={() => {
            setEditingIcu(c);
            setIcuForm({
              status: c.status,
              vitals: c.vitals ?? '',
              treatment_notes: c.treatment_notes ?? '',
            });
          }}
          className="rounded-lg bg-clinical-50 px-2.5 py-1 text-xs font-semibold text-clinical-700 hover:bg-clinical-100"
        >
          Log Vitals / Note
        </button>
      ),
    },
  ];

  const erColumns: ColumnDef<EmergencyCase>[] = [
    { key: 'id', header: 'ER Case', render: (c) => `Case ${c.id} • Patient ${c.patient_id}` },
    { key: 'priority', header: 'Priority', render: (c) => <StatusBadge status={c.priority} /> },
    { key: 'vitals', header: 'Symptoms & Vitals', render: (c) => `${c.symptoms || ''} (${c.vitals || '—'})` },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'act',
      header: 'Care Update',
      render: (c) => (
        <button
          type="button"
          onClick={() => {
            setEditingEr(c);
            setErForm({ status: c.status, treatment_notes: c.treatment_notes ?? '' });
          }}
          className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          Update Case
        </button>
      ),
    },
  ];

  const otColumns: ColumnDef<OperationTheatreCase>[] = [
    { key: 'op', header: 'Operation', render: (c) => `${c.operation_name} (${c.theatre_number})` },
    { key: 'when', header: 'Scheduled', render: (c) => formatDateTime(c.scheduled_at) },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'act',
      header: 'Stage',
      render: (c) => (
        <select
          value={c.status}
          onChange={(e) => otMutation.mutate({ id: c.id, status: e.target.value })}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        >
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned Emergency Cases" value={erQuery.data?.length ?? 0} icon={Ambulance} tone="rose" />
        <StatCard label="Assigned ICU Beds" value={icuQuery.data?.length ?? 0} icon={BedDouble} tone="teal" />
        <StatCard label="Assigned OT Surgeries" value={otQuery.data?.length ?? 0} icon={Scissors} tone="purple" />
      </div>

      <Card>
        <CardHeader
          title="Assigned ICU Monitoring"
          subtitle="Update bedside vitals and nursing observation notes"
          action={<HeartPulse className="h-5 w-5 text-tealcare-600" />}
        />
        <CardBody>
          <DataTable data={icuQuery.data ?? []} columns={icuColumns} rowKey={(c) => c.id} isLoading={icuQuery.isLoading} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Assigned Emergency Triage" />
          <CardBody>
            <DataTable data={erQuery.data ?? []} columns={erColumns} rowKey={(c) => c.id} isLoading={erQuery.isLoading} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Assigned Operation Theatre" />
          <CardBody>
            <DataTable data={otQuery.data ?? []} columns={otColumns} rowKey={(c) => c.id} isLoading={otQuery.isLoading} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Order Ward / Patient Dietary Meal"
          subtitle="Submit meal requests directly to the hospital kitchen"
          action={<UtensilsCrossed className="h-5 w-5 text-amber-600" />}
        />
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              canteenMutation.mutate();
            }}
            className="grid gap-3 sm:grid-cols-4"
          >
            <select
              required
              value={mealForm.menu_item_id}
              onChange={(e) => setMealForm({ ...mealForm, menu_item_id: e.target.value })}
              className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select meal...</option>
              {(menuQuery.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.item_name} ({formatCurrency(m.price)})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              required
              value={mealForm.quantity}
              onChange={(e) => setMealForm({ ...mealForm, quantity: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              placeholder="Patient ID (optional)"
              value={mealForm.patient_id}
              onChange={(e) => setMealForm({ ...mealForm, patient_id: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              placeholder="Diet restriction / Bed number..."
              value={mealForm.notes}
              onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
              className="sm:col-span-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white">
              Order Meal
            </button>
          </form>
        </CardBody>
      </Card>

      <AiAssistantPanel patients={patientsQuery.data ?? []} />

      <Modal
        open={editingIcu !== null}
        onClose={() => setEditingIcu(null)}
        title={`Update ICU Bed ${editingIcu?.bed_number ?? ''}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            icuMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            value={icuForm.status}
            onChange={(e) => setIcuForm({ ...icuForm, status: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="admitted">Admitted</option>
            <option value="critical">Critical</option>
            <option value="stable">Stable</option>
            <option value="discharged">Discharged</option>
          </select>
          <input
            placeholder="Vitals (e.g. HR 78, BP 120/80, SpO2 98%)"
            value={icuForm.vitals}
            onChange={(e) => setIcuForm({ ...icuForm, vitals: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            rows={3}
            placeholder="Nursing shift notes"
            value={icuForm.treatment_notes}
            onChange={(e) => setIcuForm({ ...icuForm, treatment_notes: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white">
              Save ICU Chart
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editingEr !== null}
        onClose={() => setEditingEr(null)}
        title={`Update Emergency Case ${editingEr?.id ?? ''}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            erMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            value={erForm.status}
            onChange={(e) => setErForm({ ...erForm, status: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="waiting">Waiting</option>
            <option value="in_treatment">In Treatment</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <textarea
            rows={3}
            placeholder="Treatment & triage notes"
            value={erForm.treatment_notes}
            onChange={(e) => setErForm({ ...erForm, treatment_notes: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
              Save Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

