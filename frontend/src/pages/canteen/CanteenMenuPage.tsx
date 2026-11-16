import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Power } from 'lucide-react';
import { hmsService } from '@/services/hmsService';
import type { CanteenMenuItem } from '@/types/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { extractApiError, formatCurrency, formatLabel } from '@/lib/formatters';

export function CanteenMenuPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const canManageMenu = ['admin', 'department_admin', 'canteen_manager'].includes(
    user?.role ?? '',
  );

  const [form, setForm] = useState({
    item_name: '',
    category: 'patient_diet',
    description: '',
    price: '120',
    available_quantity: '25',
  });

  const menuQuery = useQuery({
    queryKey: ['canteen', 'menu', 'all'],
    queryFn: hmsService.getAllMenu,
  });

  const createMutation = useMutation({
    mutationFn: hmsService.createMenuItem,
    onSuccess: () => {
      toast.success('Menu item added to kitchen catalog');
      setModalOpen(false);
      setForm({
        item_name: '',
        category: 'patient_diet',
        description: '',
        price: '120',
        available_quantity: '25',
      });
      void queryClient.invalidateQueries({ queryKey: ['canteen', 'menu', 'all'] });
    },
    onError: (err) => toast.error('Could not add menu item', extractApiError(err)),
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, available }: { id: number; available: boolean }) =>
      hmsService.updateMenuAvailability(id, available),
    onSuccess: () => {
      toast.success('Menu item availability updated');
      void queryClient.invalidateQueries({ queryKey: ['canteen', 'menu', 'all'] });
    },
    onError: (err) => toast.error('Could not update availability', extractApiError(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      item_name: form.item_name.trim(),
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      price: Number(form.price),
      available_quantity: Number(form.available_quantity),
    });
  };

  const columns: ColumnDef<CanteenMenuItem>[] = [
    {
      key: 'name',
      header: 'Meal / Item',
      render: (m) => (
        <div>
          <p className="font-semibold text-slate-900">{m.item_name}</p>
          <p className="text-xs text-slate-500">{m.description || 'Standard hospital kitchen preparation'}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Diet Category',
      render: (m) => <Badge variant="purple">{formatLabel(m.category || 'general')}</Badge>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (m) => (
        <span className="font-semibold text-slate-900">{formatCurrency(m.price)}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Remaining Portions',
      render: (m) => (
        <Badge variant={m.available_quantity > 5 ? 'emerald' : m.available_quantity > 0 ? 'amber' : 'rose'}>
          {m.available_quantity} portions
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Availability',
      render: (m) => (
        <Badge variant={m.is_available ? 'emerald' : 'slate'}>
          {m.is_available ? 'Available for Order' : 'Paused'}
        </Badge>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (m) =>
        canManageMenu ? (
          <button
            type="button"
            disabled={availabilityMutation.isPending}
            onClick={() =>
              availabilityMutation.mutate({ id: m.id, available: !m.is_available })
            }
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Power className="h-3.5 w-3.5" />
            {m.is_available ? 'Pause Item' : 'Enable Item'}
          </button>
        ) : (
          <span className="text-xs text-slate-400">Manager control only</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Hospital Menu & Stock</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage meals, clinical diet categories, and live portion counts.
          </p>
        </div>
        {canManageMenu && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add Menu Item
          </button>
        )}
      </div>

      <Card>
        <CardHeader
          title="All Kitchen Menu Items"
          subtitle="Toggle availability anytime to pause or resume ordering for patients and staff."
        />
        <CardBody>
          <DataTable
            data={menuQuery.data ?? []}
            columns={columns}
            rowKey={(m) => m.id}
            isLoading={menuQuery.isLoading}
            error={menuQuery.error}
            searchPlaceholder="Search meal name or diet category..."
            searchFn={(m, q) =>
              m.item_name.toLowerCase().includes(q) ||
              (m.category ?? '').toLowerCase().includes(q) ||
              (m.description ?? '').toLowerCase().includes(q)
            }
          />
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Menu Item"
        subtitle="Add a meal or therapeutic diet option to the hospital menu."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Meal Name *</label>
              <input
                type="text"
                required
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                placeholder="e.g. Low-Sodium Khichdi Bowl"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Diet Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="patient_diet">Patient Diet</option>
                <option value="diabetic_friendly">Diabetic Friendly</option>
                <option value="low_sodium">Low Sodium</option>
                <option value="liquid_post_op">Liquid / Post-Op</option>
                <option value="high_protein">High Protein</option>
                <option value="regular_meal">Regular Meal</option>
                <option value="beverage">Beverage</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Price (₹) *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Initial Portions *</label>
              <input
                type="number"
                min={0}
                required
                value={form.available_quantity}
                onChange={(e) => setForm({ ...form, available_quantity: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Ingredients / Dietary Instructions
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Suitable for cardiac and diabetic inpatient trays"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Add to Menu'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
