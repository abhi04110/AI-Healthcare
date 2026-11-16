import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { usePreferences } from '@/context/PreferencesContext';
import { hmsService } from '@/services/hmsService';
import { publicService } from '@/services/publicService';
import { extractApiError, formatCurrency, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import type { CanteenMenuItem, CanteenOrder } from '@/types/api';

export function PatientCanteenPage() {
  const toast = useToast();
  const { prefs } = usePreferences();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dietNote, setDietNote] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const profileQuery = useQuery({
    queryKey: ['patient-my-profile'],
    queryFn: () => publicService.getMyProfile(),
  });
  const menuQuery = useQuery({
    queryKey: ['canteen-available-menu'],
    queryFn: () => hmsService.getAvailableMenu(),
  });
  const ordersQuery = useQuery({
    queryKey: ['patient-canteen-orders', profileQuery.data?.id],
    queryFn: () => hmsService.getPatientCanteenOrders(profileQuery.data!.id),
    enabled: Boolean(profileQuery.data?.id),
    refetchInterval: prefs.autoRefreshSeconds > 0 ? prefs.autoRefreshSeconds * 1000 : false,
  });

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    for (const item of menuQuery.data ?? []) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set);
  }, [menuQuery.data]);

  const filteredMenu = useMemo(() => {
    const items = menuQuery.data ?? [];
    if (categoryFilter === 'All') return items;
    return items.filter((m) => m.category === categoryFilter);
  }, [menuQuery.data, categoryFilter]);

  const orderMutation = useMutation({
    mutationFn: (item: CanteenMenuItem) =>
      hmsService.createCanteenOrder({
        menu_item_id: item.id,
        quantity: quantities[item.id] ?? 1,
        patient_id: profileQuery.data?.id ?? null,
        notes: dietNote.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Meal order placed with hospital kitchen');
      void queryClient.invalidateQueries({ queryKey: ['patient-canteen-orders'] });
      void queryClient.invalidateQueries({ queryKey: ['canteen-available-menu'] });
    },
    onError: (err) => toast.error('Order failed', extractApiError(err)),
  });

  const orderColumns: ColumnDef<CanteenOrder>[] = [
    { key: 'id', header: 'Order Details', render: (o) => `Order ${o.id} (Item ${o.menu_item_id})` },
    {
      key: 'amount',
      header: 'Qty & Cost',
      render: (o) => `${o.quantity}x • ${formatCurrency(o.total_amount)}`,
    },
    { key: 'notes', header: 'Dietary Preferences', render: (o) => o.notes || 'Standard' },
    { key: 'status', header: 'Kitchen Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'created', header: 'Ordered', render: (o) => formatDateTime(o.created_at) },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Therapeutic Dietary Menu & Ordering"
          subtitle="Filter by dietary category and specify allergies or sodium/sugar restrictions before ordering."
          action={<UtensilsCrossed className="h-5 w-5 text-amber-600" />}
        />
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    categoryFilter === c
                      ? 'bg-amber-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              value={dietNote}
              onChange={(e) => setDietNote(e.target.value)}
              placeholder="Optional note (e.g. Low-Sodium, Diabetic, Room 204)"
              className="w-full sm:max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMenu.map((item) => {
              const qty = quantities[item.id] ?? 1;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-slate-900">{item.item_name}</h4>
                      <Badge variant="amber">{item.category || 'Standard'}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.description || 'Freshly prepared by MedCore Dietary Kitchen.'}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(item.price)}</p>
                      <p className="text-[11px] text-slate-500">{item.available_quantity} left</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={item.available_quantity}
                        value={qty}
                        onChange={(e) =>
                          setQuantities((prev) => ({ ...prev, [item.id]: Math.max(1, Number(e.target.value)) }))
                        }
                        className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={orderMutation.isPending || item.available_quantity < 1}
                        onClick={() => orderMutation.mutate(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Order
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="My Canteen Meal Orders" subtitle="Live status from hospital kitchen" />
        <CardBody>
          <DataTable
            data={ordersQuery.data ?? []}
            columns={orderColumns}
            rowKey={(o) => o.id}
            isLoading={ordersQuery.isLoading}
          />
        </CardBody>
      </Card>
    </div>
  );
}

