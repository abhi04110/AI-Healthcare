import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Ambulance,
  CalendarClock,
  Clock,
  FilePlus2,
  FlaskConical,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { hmsService } from '@/services/hmsService';
import { publicService } from '@/services/publicService';
import { formatDateTime } from '@/lib/formatters';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export function DoctorDashboard() {
  const { user } = useAuth();
  const { prefs } = usePreferences();
  const refetchInterval = prefs.autoRefreshSeconds > 0 ? prefs.autoRefreshSeconds * 1000 : false;
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().slice(0, 10));

  const apptsQuery = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => hmsService.getMyDoctorAppointments(),
    refetchInterval,
  });
  const patientsQuery = useQuery({
    queryKey: ['doctor-assigned-patients'],
    queryFn: () => hmsService.getMyAssignedPatients(),
  });
  const consultationsQuery = useQuery({
    queryKey: ['doctor-consultations'],
    queryFn: () => hmsService.getMyConsultations(),
  });
  const labsQuery = useQuery({
    queryKey: ['doctor-lab-orders'],
    queryFn: () => hmsService.getMyLabOrders(),
  });
  const erQuery = useQuery({
    queryKey: ['doctor-er'],
    queryFn: () => hmsService.listEmergencyCases(),
  });
  const icuQuery = useQuery({
    queryKey: ['doctor-icu'],
    queryFn: () => hmsService.listIcuAdmissions(),
  });
  const publicDoctorsQuery = useQuery({
    queryKey: ['public-doctors'],
    queryFn: () => publicService.getDoctors(),
  });

  const doctorProfile = useMemo(
    () => (publicDoctorsQuery.data ?? []).find((d) => d.id === user?.id || d.email === user?.email),
    [publicDoctorsQuery.data, user],
  );

  const availabilityQuery = useQuery({
    queryKey: ['doctor-availability', user?.id, slotDate],
    queryFn: () => publicService.getAvailability(user!.id, slotDate),
    enabled: Boolean(user?.id && slotDate),
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysQueue = useMemo(
    () =>
      (apptsQuery.data ?? []).filter(
        (a) => a.appointment_date.slice(0, 10) === todayIso || a.status === 'scheduled',
      ),
    [apptsQuery.data, todayIso],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Welcome, Dr. {user?.name}</h2>
            {doctorProfile && (
              <Badge variant="teal">
                {doctorProfile.department} • {doctorProfile.specialty}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {doctorProfile
              ? `Active Shift: ${doctorProfile.shift_start} – ${doctorProfile.shift_end} (${doctorProfile.qualification})`
              : 'Clinical queue, EHR timeline, diagnostics & AI triage workspace.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/doctor/appointments"
            className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
          >
            <Stethoscope className="h-4 w-4" />
            Consultations Queue
          </Link>
          <Link
            to="/doctor/ai"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open AI Triage
          </Link>
        </div>
      </div>

      {apptsQuery.isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Scheduled / Today Appts"
            value={todaysQueue.length}
            hint={`${apptsQuery.data?.length ?? 0} total appointments`}
            icon={CalendarClock}
            tone="blue"
          />
          <StatCard
            label="Assigned Patients"
            value={patientsQuery.data?.length ?? 0}
            hint="Direct EHR & AI prediction scope"
            icon={Users}
            tone="teal"
          />
          <StatCard
            label="Consultations Written"
            value={consultationsQuery.data?.length ?? 0}
            hint="Clinical notes & Rx records"
            icon={FilePlus2}
            tone="emerald"
          />
          <StatCard
            label="Labs & Critical Care"
            value={labsQuery.data?.length ?? 0}
            hint={`ER: ${erQuery.data?.length ?? 0} • ICU: ${icuQuery.data?.length ?? 0}`}
            icon={FlaskConical}
            tone="rose"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Active Appointments Queue"
            subtitle="Scheduled and today's patient consultations"
            action={
              <Link
                to="/doctor/appointments"
                className="text-xs font-semibold text-clinical-600 hover:text-clinical-700"
              >
                Manage All
              </Link>
            }
          />
          <CardBody>
            {todaysQueue.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No pending scheduled appointments"
                description="Your scheduled and today's consultation queue is clear."
              />
            ) : (
              <div className="space-y-3">
                {todaysQueue.slice(0, 6).map((appt) => (
                  <div
                    key={appt.id}
                    className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 p-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {appt.patient_name || `Patient ID ${appt.patient_id}`}
                        </p>
                        <StatusBadge status={appt.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(appt.appointment_date)} • {appt.reason || 'General Consultation'}
                      </p>
                    </div>
                    <Link
                      to="/doctor/appointments"
                      className="rounded-lg bg-clinical-50 px-3 py-1.5 text-xs font-semibold text-clinical-700 hover:bg-clinical-100"
                    >
                      Open Visit
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Live Shift & Open Slots"
            subtitle="Check available consultation slots by date"
            action={<Clock className="h-4 w-4 text-clinical-600" />}
          />
          <CardBody className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Check Date</label>
              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            {availabilityQuery.isLoading ? (
              <p className="text-xs text-slate-500">Loading open slots...</p>
            ) : (availabilityQuery.data?.slots ?? []).length === 0 ? (
              <p className="text-xs text-slate-500">No open slots found for {slotDate}.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availabilityQuery.data?.slots.map((slot) => (
                  <Badge key={slot.value} variant="emerald">
                    {slot.label}
                  </Badge>
                ))}
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <Link
                to="/doctor/critical-care"
                className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100/70"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Ambulance className="h-4 w-4" />
                  Assigned Critical Care Cases
                </span>
                <span>{(erQuery.data?.length ?? 0) + (icuQuery.data?.length ?? 0)}</span>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

