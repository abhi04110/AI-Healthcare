import { CheckCircle2, Info, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatLabel } from '@/lib/formatters';

export function CanteenSettingsPage() {
  const { user } = useAuth();
  const isManager = ['admin', 'department_admin', 'canteen_manager'].includes(user?.role ?? '');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Kitchen Access & Order Workflow"
          subtitle="Clear summary of what your kitchen role can manage in this hospital system."
          action={<UtensilsCrossed className="h-5 w-5 text-amber-600" />}
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900">
            <Info className="h-4 w-4 shrink-0 text-amber-700" />
            <span>
              Meal orders are submitted by <strong>Patients, Doctors, Nurses, and Reception</strong>.
              Kitchen teams receive them automatically in the <strong>Live Orders</strong> queue to prepare and deliver.
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Your Role</p>
                <Badge variant="amber">{formatLabel(user?.role)}</Badge>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  View all live and historical kitchen meal orders
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  Update order status (Preparing, Ready, Delivered, Cancelled) & kitchen notes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  View complete menu catalog & remaining portion counts
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Menu Management Access</p>
                <Badge variant={isManager ? 'emerald' : 'slate'}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isManager ? 'Enabled' : 'Manager Only'}
                </Badge>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                {isManager
                  ? 'As Canteen Manager / Admin, you can add new therapeutic diet items, set initial portion stock, and pause or resume menu items anytime from Menu & Stock.'
                  : 'Adding new dishes or pausing menu items requires Canteen Manager or Admin access. You can monitor live stock and fulfill all meal orders.'}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
