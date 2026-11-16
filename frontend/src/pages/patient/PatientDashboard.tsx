import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Bot,
  CalendarClock,
  CreditCard,
  FileHeart,
  FlaskConical,
  Pill,
  UtensilsCrossed,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { publicService } from '@/services/publicService';
import { formatCurrency, formatDateTime, formatLabel } from '@/lib/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';

export function PatientDashboard() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['patient-my-profile'],
    queryFn: () => publicService.getMyProfile(),
  });
  const apptsQuery = useQuery({
    queryKey: ['patient-my-appts'],
    queryFn: () => publicService.getMyAppointments(),
  });
  const rxQuery = useQuery({
    queryKey: ['patient-my-rx'],
    queryFn: () => publicService.getMyPrescriptions(),
  });
  const labsQuery = useQuery({
    queryKey: ['patient-my-labs'],
    queryFn: () => publicService.getMyLabs(),
  });
  const billsQuery = useQuery({
    queryKey: ['patient-my-bills'],
    queryFn: () => publicService.getMyBills(),
  });
  const recordsQuery = useQuery({
    queryKey: ['patient-my-records'],
    queryFn: () => publicService.getMyRecords(),
  });

  const appts = apptsQuery.data?.appointments ?? [];
  const upcomingAppts = appts.filter((a) => a.status === 'scheduled');
  const latestVitals = recordsQuery.data?.health_records?.[0];
  const latestRisk = recordsQuery.data?.risk_predictions?.[0];
  const outstandingBalance = (billsQuery.data ?? []).reduce(
    (sum, b) => sum + Math.max(0, Number(b.total_amount) - Number(b.paid_amount)),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Hello, {profileQuery.data?.name ?? user?.name}
            </h2>
            {profileQuery.data?.patient_code && (
              <Badge variant="blue">Patient ID: {profileQuery.data.patient_code}</Badge>
            )}
            {latestRisk && <StatusBadge status={latestRisk.risk} />}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Access your appointments, lab reports, prescriptions, meals, invoices, and AI health insights.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/patient/appointments"
            className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
          >
            <CalendarClock className="h-4 w-4" />
            Book Appointment
          </Link>
          <Link
            to="/patient/assistant"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Bot className="h-4 w-4 text-clinical-600" />
            Ask AI Health Assistant
          </Link>
        </div>
      </div>

      {apptsQuery.isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Upcoming Visits"
            value={upcomingAppts.length}
            hint={`${appts.length} total appointments`}
            icon={CalendarClock}
            tone="blue"
          />
          <StatCard
            label="Active Prescriptions"
            value={rxQuery.data?.length ?? 0}
            hint="Printable e-prescriptions"
            icon={Pill}
            tone="emerald"
          />
          <StatCard
            label="Lab Orders & Reports"
            value={labsQuery.data?.length ?? 0}
            hint={`${(labsQuery.data ?? []).filter((l) => l.result).length} results ready`}
            icon={FlaskConical}
            tone="teal"
          />
          <StatCard
            label="Outstanding Balance"
            value={formatCurrency(outstandingBalance)}
            hint={`${billsQuery.data?.length ?? 0} hospital bills`}
            icon={CreditCard}
            tone={outstandingBalance > 0 ? 'amber' : 'emerald'}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Latest Vitals & Risk Assessment"
            subtitle="Your most recent recorded health measurements"
            action={
              <Link to="/patient/records" className="text-xs font-semibold text-clinical-600">
                Full Health Timeline
              </Link>
            }
          />
          <CardBody>
            {latestVitals ? (
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">Glucose</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{latestVitals.glucose ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">Blood Pressure</p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {latestVitals.blood_pressure ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">BMI</p>
                  <p className="mt-1 text-base font-bold text-slate-900">{latestVitals.bmi ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">Cholesterol</p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {latestVitals.cholesterol ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">Heart Rate</p>
                  <p className="mt-1 text-base font-bold text-slate-900">
                    {latestVitals.heart_rate ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-slate-500">AI Risk Tier</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {latestRisk ? formatLabel(latestRisk.risk) : formatLabel(latestVitals.risk_label)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No vital signs logged yet. Upload a lab report or enter your readings in Health Records.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent Appointments & Self-Service"
            action={<Activity className="h-4 w-4 text-clinical-600" />}
          />
          <CardBody className="space-y-3">
            {appts.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">Dr. {a.doctor_name}</p>
                  <p className="text-slate-500">
                    {formatDateTime(a.appointment_date)} • {a.reason || 'Consultation'}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
              <Link
                to="/patient/canteen"
                className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 font-semibold text-slate-800 hover:bg-slate-50"
              >
                <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                Order Dietary Meal
              </Link>
              <Link
                to="/patient/records"
                className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 font-semibold text-slate-800 hover:bg-slate-50"
              >
                <FileHeart className="h-4 w-4 text-rose-600" />
                Upload Medical Report
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

