import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChefHat, RefreshCw, StickyNote, Truck, XCircle } from 'lucide-react';
import { hmsService } from '@/services/hmsService';
import type { CanteenOrder } from '@/types/api';
import { usePreferences } from '@/context/PreferencesContext';
import { useToast } from '@/context/ToastContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { extractApiError, formatCurrency, formatDateTime, formatLabel } from '@/lib/formatters';

const STATUS_TABS = ['all', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'] as const;

export function CanteenOrdersPage() {
  const { prefs } = usePreferences();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [notesOrder, setNotesOrder] = useState<CanteenOrder | null>(null);
  const [draftStatus, setDraftStatus] = useState<string>('preparing');
  const [draftNotes, setDraftNotes] = useState<string>('');

  const ordersQuery = useQuery({
    queryKey: ['canteen', 'orders'],
    queryFn: hmsService.listCanteenOrders,
    refetchInterval: prefs.autoRefreshSeconds ? prefs.autoRefreshSeconds * 1000 : false,
  });

  const menuQuery = useQuery({
    queryKey: ['canteen', 'menu', 'all'],
    queryFn: hmsService.getAllMenu,
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status, notes }: { orderId: number; status: string; notes?: string }) =>
      hmsService.updateCanteenOrderStatus(orderId, { status, notes }),
    onSuccess: (updated) => {
      toast.success(`Order ${updated.id} updated to ${formatLabel(updated.status)}`);
      setNotesOrder(null);
      void queryClient.invalidateQueries({ queryKey: ['canteen', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['canteen', 'menu', 'all'] });
    },
    onError: (err) => toast.error('Status update failed', extractApiError(err)),
  });

  const menuMap = useMemo(
    () => new Map((menuQuery.data ?? []).map((item) => [item.id, item])),
    [menuQuery.data],
  );

  const orders = useMemo(() => {
    const all = ordersQuery.data ?? [];
    if (filterStatus === 'all') return all;
    return all.filter((o) => o.status === filterStatus);
  }, [ordersQuery.data, filterStatus]);

  const openNotesEditor = (order: CanteenOrder) => {
    setNotesOrder(order);
    setDraftStatus(order.status);
    setDraftNotes(order.notes ?? '');
  };

  const columns: ColumnDef<CanteenOrder>[] = [
    {
      key: 'dish',
      header: 'Order & Meal Item',
      render: (o) => {
        const menu = menuMap.get(o.menu_item_id);
        return (
          <div>
            <p className="font-semibold text-slate-900">
              {menu?.item_name ?? `Menu Item ${o.menu_item_id}`}
            </p>
            <p className="text-xs text-slate-500">
              Order ID {o.id}
              {menu?.category ? ` • ${formatLabel(menu.category)}` : ''}
            </p>
          </div>
        );
      },
    },
    {
      key: 'recipient',
      header: 'Patient / Requester',
      render: (o) => (
        <div className="space-y-1 text-xs">
          {o.patient_id ? (
            <Badge variant="blue">Patient ID {o.patient_id}</Badge>
          ) : (
            <Badge variant="slate">Staff / Counter Order</Badge>
          )}
          <p className="text-slate-500">Ordered by Staff/User {o.ordered_by_user_id}</p>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Quantity & Bill',
      render: (o) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-800">
            {o.quantity} × {formatCurrency(o.unit_price)}
          </p>
          <p className="text-slate-500">Total: {formatCurrency(o.total_amount)}</p>
        </div>
      ),
    },
    {
      key: 'notes',
      header: 'Dietary Notes',
      render: (o) => <span className="text-xs text-slate-700">{o.notes || 'No special notes'}</span>,
    },
    {
      key: 'status',
      header: 'Stage',
      render: (o) => (
        <div className="space-y-1">
          <StatusBadge status={o.status} />
          <p className="text-[11px] text-slate-400">{formatDateTime(o.created_at)}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Kitchen Actions',
      render: (o) => {
        const locked = o.status === 'delivered' || o.status === 'cancelled';
        const isBusy = statusMutation.isPending && statusMutation.variables?.orderId === o.id;
        return locked ? (
          <span className="text-xs text-slate-400">Order closed</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {o.status === 'pending' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => statusMutation.mutate({ orderId: o.id, status: 'preparing' })}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <ChefHat className="h-3.5 w-3.5" />
                Prepare
              </button>
            )}
            {(o.status === 'pending' || o.status === 'preparing') && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => statusMutation.mutate({ orderId: o.id, status: 'ready' })}
                className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ready
              </button>
            )}
            {o.status === 'ready' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => statusMutation.mutate({ orderId: o.id, status: 'delivered' })}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Truck className="h-3.5 w-3.5" />
                Deliver
              </button>
            )}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => openNotesEditor(o)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <StickyNote className="h-3.5 w-3.5" />
              Notes / Status
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => statusMutation.mutate({ orderId: o.id, status: 'cancelled' })}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              title="Cancel order and restore menu stock"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kitchen Order Queue</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Process meal orders received from patients, wards, doctors, and reception.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void ordersQuery.refetch()}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${ordersQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      <Card>
        <CardHeader
          title="All Meal Orders"
          subtitle="Filter by order stage or search by dish name, patient ID, or dietary notes."
          action={
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${
                    filterStatus === status
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'all' ? `All (${(ordersQuery.data ?? []).length})` : formatLabel(status)}
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          <DataTable
            data={orders}
            columns={columns}
            rowKey={(o) => o.id}
            isLoading={ordersQuery.isLoading}
            error={ordersQuery.error || menuQuery.error}
            searchPlaceholder="Search dish, patient ID, or notes..."
            searchFn={(o, q) => {
              const menu = menuMap.get(o.menu_item_id);
              return (
                String(o.id).includes(q) ||
                String(o.patient_id ?? '').includes(q) ||
                (menu?.item_name ?? '').toLowerCase().includes(q) ||
                (o.notes ?? '').toLowerCase().includes(q)
              );
            }}
            emptyTitle="No meal orders in this view"
            emptyDescription="Meal orders submitted by patients, nurses, doctors, or reception will appear here."
          />
        </CardBody>
      </Card>

      <Modal
        open={Boolean(notesOrder)}
        onClose={() => setNotesOrder(null)}
        title={`Update Order ${notesOrder?.id ?? ''}`}
        subtitle="Update fulfilment stage or add kitchen preparation notes."
      >
        {notesOrder && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              statusMutation.mutate({
                orderId: notesOrder.id,
                status: draftStatus,
                notes: draftNotes.trim() || undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700">Order Stage</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:border-amber-500 focus:outline-none"
              >
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled (Restores Stock)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Kitchen / Delivery Notes
              </label>
              <textarea
                rows={3}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder="e.g. Low-sodium tray packed for Ward B, delivered to nurse desk"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNotesOrder(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={statusMutation.isPending}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {statusMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
