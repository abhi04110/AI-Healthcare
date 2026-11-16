import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock,
  IndianRupee,
  Package,
  RefreshCw,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { hmsService } from '@/services/hmsService';
import { usePreferences } from '@/context/PreferencesContext';
import { useToast } from '@/context/ToastContext';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { extractApiError, formatCurrency, formatDateTime, formatLabel } from '@/lib/formatters';

export function CanteenDashboard() {
  const { prefs } = usePreferences();
  const queryClient = useQueryClient();
  const toast = useToast();

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
      void queryClient.invalidateQueries({ queryKey: ['canteen', 'orders'] });
      void queryClient.invalidateQueries({ queryKey: ['canteen', 'menu', 'all'] });
    },
    onError: (err) => toast.error('Could not update order', extractApiError(err)),
  });

  const orders = ordersQuery.data ?? [];
  const menu = menuQuery.data ?? [];
  const menuMap = new Map(menu.map((m) => [m.id, m]));

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const deliveredRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const lowStockCount = menu.filter((m) => m.available_quantity <= 5 || !m.is_available).length;

  const activeQueue = orders.filter(
    (o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready',
  );

  const stageData = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'].map((status) => ({
    stage: formatLabel(status),
    count: orders.filter((o) => o.status === status).length,
  }));

  const dietMix = Object.entries(
    menu.reduce<Record<string, number>>((acc, item) => {
      const cat = formatLabel(item.category || 'general');
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {}),
  );

  const loadError = ordersQuery.error || menuQuery.error;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kitchen & Dietary Overview</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Track live meal requests from patients and clinical staff, update preparation status, and monitor kitchen inventory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void ordersQuery.refetch();
              void menuQuery.refetch();
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${ordersQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/canteen/orders"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
          >
            <UtensilsCrossed className="h-4 w-4" />
            All Orders ({orders.length})
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold">Unable to load kitchen data</p>
            <p className="text-xs text-rose-700">{extractApiError(loadError)}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending & Preparing"
          value={pendingCount + preparingCount}
          hint={`${pendingCount} new requests • ${preparingCount} cooking`}
          icon={ChefHat}
          tone="amber"
        />
        <StatCard
          label="Ready for Serving"
          value={readyCount}
          hint="Prepared meals awaiting tray dispatch"
          icon={Clock}
          tone="teal"
        />
        <StatCard
          label="Active Order Value"
          value={formatCurrency(deliveredRevenue)}
          hint={`${orders.filter((o) => o.status !== 'cancelled').length} valid meal orders`}
          icon={IndianRupee}
          tone="emerald"
        />
        <StatCard
          label="Menu Items"
          value={menu.length}
          hint={`${lowStockCount} out of stock or paused`}
          icon={Package}
          tone={lowStockCount > 0 ? 'rose' : 'blue'}
        />
      </div>

      <Card>
        <CardHeader
          title="Active Kitchen Queue"
          subtitle="Move incoming orders through preparation, ready, and delivery with one click."
          action={
            <Link to="/canteen/orders" className="text-xs font-semibold text-amber-700 hover:underline">
              Open Full Queue
            </Link>
          }
        />
        <CardBody className="space-y-2.5">
          {activeQueue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No active meal orders right now</p>
              <p className="mt-1 text-xs text-slate-500">
                New orders placed by patients, doctors, nurses, or reception will appear here automatically.
              </p>
            </div>
          ) : (
            activeQueue.slice(0, 8).map((o) => {
              const item = menuMap.get(o.menu_item_id);
              const isBusy =
                statusMutation.isPending && statusMutation.variables?.orderId === o.id;
              return (
                <div
                  key={o.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {item?.item_name ?? `Menu Item ${o.menu_item_id}`}
                      </span>
                      <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                        Qty {o.quantity} • {formatCurrency(o.total_amount)}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Order ID {o.id}
                      {o.patient_id ? ` • Patient ID ${o.patient_id}` : ' • Staff / Counter Order'}
                      {' • '}
                      {formatDateTime(o.created_at)}
                    </p>
                    {o.notes && (
                      <p className="text-xs text-slate-700">
                        <span className="font-medium text-slate-800">Dietary Note:</span> {o.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {o.status === 'pending' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          statusMutation.mutate({ orderId: o.id, status: 'preparing' })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        <ChefHat className="h-3.5 w-3.5" />
                        Start Preparing
                      </button>
                    )}
                    {(o.status === 'pending' || o.status === 'preparing') && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => statusMutation.mutate({ orderId: o.id, status: 'ready' })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Ready
                      </button>
                    )}
                    {o.status === 'ready' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          statusMutation.mutate({ orderId: o.id, status: 'delivered' })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Mark Delivered
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        statusMutation.mutate({ orderId: o.id, status: 'cancelled' })
                      }
                      className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Order Progress Summary"
            subtitle="Overview of all kitchen orders across each fulfilment stage."
          />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#d97706" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Diet Categories" subtitle="Available items grouped by nutrition plan" />
          <CardBody className="space-y-2.5">
            {dietMix.length === 0 ? (
              <p className="text-xs text-slate-500">No menu items added yet.</p>
            ) : (
              dietMix.map(([cat, count]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-slate-700">{cat}</span>
                  <span className="font-bold text-slate-900">{count} items</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
