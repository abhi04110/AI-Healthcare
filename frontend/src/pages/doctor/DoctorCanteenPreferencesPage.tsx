import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { hmsService } from '@/services/hmsService';
import { extractApiError, formatCurrency } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

export function DoctorCanteenPreferencesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [menuItemId, setMenuItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const menuQuery = useQuery({
    queryKey: ['canteen-available-menu'],
    queryFn: () => hmsService.getAvailableMenu(),
  });

  const orderMutation = useMutation({
    mutationFn: () =>
      hmsService.createCanteenOrder({
        menu_item_id: Number(menuItemId),
        quantity: Number(quantity),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Meal order sent to hospital canteen');
      setMenuItemId('');
      setQuantity('1');
      setNotes('');
      void queryClient.invalidateQueries({ queryKey: ['canteen-available-menu'] });
    },
    onError: (err) => toast.error('Order failed', extractApiError(err)),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Doctor On-Call Meal Ordering"
          subtitle="Order meals for yourself or request special nutrition trays for patients."
          action={<UtensilsCrossed className="h-5 w-5 text-amber-600" />}
        />
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              orderMutation.mutate();
            }}
            className="grid gap-3 sm:grid-cols-4"
          >
            <select
              required
              value={menuItemId}
              onChange={(e) => setMenuItemId(e.target.value)}
              className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select available meal...</option>
              {(menuQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_name} ({formatCurrency(item.price)}) — {item.available_quantity} left
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={orderMutation.isPending}
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Place Order
            </button>
            <input
              placeholder="Delivery notes / Doctors lounge..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="sm:col-span-4 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

