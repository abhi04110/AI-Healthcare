import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Ambulance,
  BedDouble,
  CalendarClock,
  CreditCard,
  Database,
  HeartPulse,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { hmsService } from '@/services/hmsService';
import { clinicalAiService } from '@/services/clinicalAiService';
import { authService } from '@/services/authService';
import { formatCurrency, formatLabel } from '@/lib/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  unknown: '#64748b',
};

export function AdminDashboard() {
  const { user } = useAuth();
  const { prefs } = usePreferences();
  const isSuperAdmin = user?.role === 'admin';
  const refetchInterval = prefs.autoRefreshSeconds > 0 ? prefs.autoRefreshSeconds * 1000 : false;

  const hmsQuery = useQuery({
    queryKey: ['hms-dashboard'],
    queryFn: () => hmsService.getDashboard(),
    refetchInterval,
  });

  const analyticsQuery = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => clinicalAiService.getAnalyticsSummary(),
    refetchInterval,
  });

  const riskQuery = useQuery({
    queryKey: ['analytics-risk-dist'],
    queryFn: () => clinicalAiService.getRiskDistribution(),
    refetchInterval,
  });

  const outliersQuery = useQuery({
    queryKey: ['analytics-outliers'],
    queryFn: () => clinicalAiService.getOutliers(),
  });

  const dbCheckQuery = useQuery({
    queryKey: ['db-check'],
    queryFn: () => authService.checkDatabase(),
    enabled: isSuperAdmin,
  });

  const dash = hmsQuery.data?.dashboard ?? {};
  const emergency = hmsQuery.data?.emergency ?? {};
  const icu = hmsQuery.data?.icu ?? {};
  const ot = hmsQuery.data?.operation_theatre ?? {};
  const hk = hmsQuery.data?.housekeeping ?? {};
  const canteen = useMemo(() => hmsQuery.data?.canteen ?? {}, [hmsQuery.data]);
  const analytics = analyticsQuery.data?.analytics;

  const riskChartData = useMemo(() => {
    const dist = riskQuery.data?.risk_distribution ?? {};
    return Object.entries(dist).map(([name, value]) => ({
      name: formatLabel(name),
      key: name.toLowerCase(),
      value,
    }));
  }, [riskQuery.data]);

  const canteenChartData = useMemo(
    () => [
      { stage: 'Pending', count: canteen.pending_orders ?? 0 },
      { stage: 'Preparing', count: canteen.preparing_orders ?? 0 },
      { stage: 'Ready', count: canteen.ready_orders ?? 0 },
      { stage: 'Delivered', count: canteen.delivered_orders ?? 0 },
    ],
    [canteen],
  );

  const isHidden = (key: string) => prefs.hiddenAdminWidgets.includes(key);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {isSuperAdmin ? 'Hospital-Wide Command Overview' : 'Department Operations Overview'}
            </h2>
            {hmsQuery.data?.access_scope && (
              <Badge variant="purple">Scope: {formatLabel(hmsQuery.data.access_scope)}</Badge>
            )}
            {isSuperAdmin && dbCheckQuery.data && (
              <Badge variant={dbCheckQuery.data.status === 'ok' ? 'emerald' : 'rose'}>
                <Database className="h-3 w-3" />
                DB: {dbCheckQuery.data.status}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Live hospital operations, patient care, and analytics overview.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void hmsQuery.refetch();
              void analyticsQuery.refetch();
              void riskQuery.refetch();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Now
          </button>
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Customize Widgets
          </Link>
        </div>
      </div>

      {!isHidden('kpi_overview') &&
        (hmsQuery.isLoading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Patients & Vitals"
              value={dash.total_patients ?? analytics?.total_patients ?? 0}
              hint={`${analytics?.total_health_records ?? 0} EHR vitals entries`}
              icon={Users}
              tone="blue"
            />
            <StatCard
              label="Appointments"
              value={dash.total_appointments ?? 0}
              hint={`${dash.scheduled_appointments ?? 0} active / scheduled`}
              icon={CalendarClock}
              tone="teal"
            />
            <StatCard
              label="Total Billed / Paid"
              value={formatCurrency(dash.total_paid_amount ?? 0)}
              hint={`Billed: ${formatCurrency(dash.total_billed_amount ?? 0)}`}
              icon={CreditCard}
              tone="emerald"
            />
            <StatCard
              label="Active Staff & Depts"
              value={dash.total_staff ?? 0}
              hint={`${dash.total_departments ?? 0} depts • ${dash.total_prescriptions ?? 0} Rx • ${dash.total_lab_orders ?? 0} labs`}
              icon={ShieldCheck}
              tone="purple"
            />
          </div>
        ))}

      <div className="grid gap-6 lg:grid-cols-2">
        {!isHidden('risk_chart') && (
          <Card>
            <CardHeader
              title="Patient Clinical Risk Distribution"
              subtitle={`Outliers detected in EHR vitals: ${outliersQuery.data?.total_outliers ?? 0}`}
              action={
                <Link
                  to="/admin/ai"
                  className="text-xs font-semibold text-clinical-600 hover:text-clinical-700"
                >
                  Open ML & Outliers
                </Link>
              }
            />
            <CardBody>
              {riskQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : riskChartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  No risk predictions or labelled records available yet.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {riskChartData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={RISK_COLORS[entry.key] ?? '#0284c7'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {analytics && (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs">
                  <div>
                    <p className="text-slate-500">Avg Glucose</p>
                    <p className="font-semibold text-slate-900">
                      {analytics.average_glucose?.toFixed(1) ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Avg Systolic BP</p>
                    <p className="font-semibold text-slate-900">
                      {analytics.average_blood_pressure?.toFixed(1) ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Avg BMI</p>
                    <p className="font-semibold text-slate-900">
                      {analytics.average_bmi?.toFixed(1) ?? '—'}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {!isHidden('canteen_chart') && (
          <Card>
            <CardHeader
              title="Canteen Order Pipeline & Dietary Activity"
              subtitle={`Menu items: ${canteen.total_menu_items ?? 0} total (${canteen.available_menu_items ?? 0} available)`}
              action={
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Total Orders: {canteen.total_orders ?? 0}
                </span>
              }
            />
            <CardBody>
              {hmsQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={canteenChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0284c7" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {!isHidden('department_status') && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Emergency Dept
                </span>
                <Ambulance className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{emergency.total_cases ?? 0}</p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="amber">Waiting: {emergency.waiting ?? 0}</Badge>
                <Badge variant="rose">Critical: {emergency.critical ?? 0}</Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ICU Wards
                </span>
                <BedDouble className="h-4 w-4 text-clinical-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{icu.total_admissions ?? 0}</p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="blue">Occupied: {icu.active_occupied ?? 0}</Badge>
                <Badge variant="rose">Critical: {icu.critical ?? 0}</Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Operation Theatre
                </span>
                <Scissors className="h-4 w-4 text-violet-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{ot.total_cases ?? 0}</p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="blue">Scheduled: {ot.scheduled ?? 0}</Badge>
                <Badge variant="amber">Active: {ot.in_progress ?? 0}</Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Housekeeping & Pharmacy
                </span>
                <HeartPulse className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {hk.total_tasks ?? 0} <span className="text-sm font-normal text-slate-500">tasks</span>
              </p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="amber">Pending: {hk.pending ?? 0}</Badge>
                <Badge variant="teal">Meds: {dash.total_medicines ?? 0}</Badge>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader
          title="Quick Command Actions"
          subtitle="Jump straight to governance, operations, billing, or patient EHR management."
          action={<Activity className="h-4 w-4 text-clinical-600" />}
        />
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/admin/governance"
            className="rounded-xl border border-slate-200 p-4 transition hover:border-clinical-300 hover:bg-clinical-50/40"
          >
            <p className="text-sm font-semibold text-slate-900">Manage Staff & Depts</p>
            <p className="mt-1 text-xs text-slate-500">Onboard doctors, nurses, canteen & workers.</p>
          </Link>
          <Link
            to="/admin/patients"
            className="rounded-xl border border-slate-200 p-4 transition hover:border-clinical-300 hover:bg-clinical-50/40"
          >
            <p className="text-sm font-semibold text-slate-900">Patient EHR Directory</p>
            <p className="mt-1 text-xs text-slate-500">Vitals, OCR scans, reports & timelines.</p>
          </Link>
          <Link
            to="/admin/operations"
            className="rounded-xl border border-slate-200 p-4 transition hover:border-clinical-300 hover:bg-clinical-50/40"
          >
            <p className="text-sm font-semibold text-slate-900">Live Operations Console</p>
            <p className="mt-1 text-xs text-slate-500">Appointments, billing, ER/ICU/OT, canteen.</p>
          </Link>
          <Link
            to="/admin/ai"
            className="rounded-xl border border-slate-200 p-4 transition hover:border-clinical-300 hover:bg-clinical-50/40"
          >
            <p className="text-sm font-semibold text-slate-900">ML Risk & RAG Knowledge</p>
            <p className="mt-1 text-xs text-slate-500">Train classifier, cluster patients, index PDFs.</p>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
