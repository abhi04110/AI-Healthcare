import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { publicService } from '@/services/publicService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { extractApiError, formatDateTime } from '@/lib/formatters';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function LandingBookingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(todayIso());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [reason, setReason] = useState('');
  const [guestForm, setGuestForm] = useState({
    name: '',
    email: '',
    password: '',
    age: '28',
    gender: 'Male',
    phone: '',
    address: '',
  });
  const [bookingResult, setBookingResult] = useState<{
    patientCode?: string;
    doctorName: string;
    department: string;
    appointmentDate: string;
    reason: string;
  } | null>(null);

  const doctorsQuery = useQuery({
    queryKey: ['public-doctors'],
    queryFn: publicService.getDoctors,
  });

  const filteredDoctors = useMemo(() => {
    const list = doctorsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q),
    );
  }, [doctorsQuery.data, search]);

  const activeDoctor = useMemo(
    () => (doctorsQuery.data ?? []).find((d) => d.id === selectedDoctorId) ?? null,
    [doctorsQuery.data, selectedDoctorId],
  );

  const availabilityQuery = useQuery({
    queryKey: ['public-availability', selectedDoctorId, selectedDay],
    queryFn: () => publicService.getAvailability(selectedDoctorId!, selectedDay),
    enabled: selectedDoctorId !== null && Boolean(selectedDay),
  });

  const publicBookMutation = useMutation({
    mutationFn: () =>
      publicService.bookPublic({
        name: guestForm.name.trim(),
        email: guestForm.email.trim().toLowerCase(),
        password: guestForm.password,
        age: Number(guestForm.age),
        gender: guestForm.gender,
        phone: guestForm.phone.trim(),
        address: guestForm.address.trim() || undefined,
        doctor_user_id: selectedDoctorId!,
        appointment_date: selectedSlot,
        reason: reason.trim(),
      }),
    onSuccess: (res) => {
      toast.success('Appointment booked!', `Patient code: ${res.patient_code}`);
      setBookingResult({
        patientCode: res.patient_code,
        doctorName: res.appointment.doctor_name,
        department: res.appointment.department,
        appointmentDate: res.appointment.appointment_date,
        reason: res.appointment.reason,
      });
      setSelectedSlot('');
      setReason('');
    },
    onError: (err) => toast.error('Booking failed', extractApiError(err)),
  });

  const existingBookMutation = useMutation({
    mutationFn: () =>
      publicService.bookExisting({
        doctor_user_id: selectedDoctorId!,
        appointment_date: selectedSlot,
        reason: reason.trim(),
      }),
    onSuccess: (res) => {
      toast.success('Appointment confirmed!');
      setBookingResult({
        doctorName: res.appointment.doctor_name,
        department: res.appointment.department,
        appointmentDate: res.appointment.appointment_date,
        reason: res.appointment.reason,
      });
      setSelectedSlot('');
      setReason('');
    },
    onError: (err) => toast.error('Booking failed', extractApiError(err)),
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedSlot) {
      toast.error('Select a doctor and time slot first');
      return;
    }
    if (user?.role === 'patient') {
      existingBookMutation.mutate();
    } else if (user) {
      toast.error('Staff accounts cannot use patient self-booking here', 'Use the Reception or Admin portal.');
    } else {
      publicBookMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNavbar />

      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-900 via-clinical-900 to-tealcare-700 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:items-center lg:py-16">
          <div className="space-y-5 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-sky-100 ring-1 ring-white/20">
              <Sparkles className="h-3.5 w-3.5 text-teal-300" />
              AI-Powered Hospital Operations & Clinical Intelligence
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Precision Clinical Care & Unified Hospital Workflows
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
              Book real-time doctor consultations online, track diagnostics and prescriptions, or
              sign in to your dedicated role portal across Clinical, Laboratory, Pharmacy, Canteen,
              and Facility Operations.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="#booking-section"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
              >
                <Calendar className="h-4 w-4 text-clinical-600" />
                Book Doctor Slot
              </a>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                <ShieldCheck className="h-4 w-4" />
                Staff & Patient Sign In
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-5">
            {[
              { icon: Stethoscope, title: 'Live Doctor Slots', desc: '30-min IST availability' },
              { icon: Activity, title: 'AI Health Screening', desc: 'Smart clinical risk insights' },
              { icon: Sparkles, title: 'Medical AI Assistant', desc: 'Guideline-backed answers' },
              { icon: ShieldCheck, title: 'Role-Based Security', desc: 'Dedicated portal for every role' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <Icon className="h-5 w-5 text-teal-300" />
                  <p className="mt-2.5 text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-300">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Booking Workspace */}
      <section id="booking-section" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Online Doctor Directory & Appointment Booking
            </h2>
            <p className="text-sm text-slate-500">
              Select an active specialist below to check available 30-minute IST consultation slots.
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by doctor, specialty, or department..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-clinical-500 focus:outline-none sm:w-80"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Doctor Directory */}
          <div className="space-y-3 lg:col-span-5">
            {doctorsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : filteredDoctors.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="No doctors available"
                description="No active doctors match your filter or none are currently onboarded."
              />
            ) : (
              filteredDoctors.map((doc) => {
                const isSelected = doc.id === selectedDoctorId;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDoctorId(doc.id);
                      setSelectedSlot('');
                      setBookingResult(null);
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-clinical-500 bg-clinical-50/70 ring-2 ring-clinical-500/20'
                        : 'border-slate-200 bg-white hover:border-clinical-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{doc.name}</p>
                        <p className="text-xs font-medium text-clinical-700">{doc.specialty}</p>
                      </div>
                      <Badge variant="teal">{doc.department}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {doc.qualification && <span>{doc.qualification}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {doc.shift_start} – {doc.shift_end} IST
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Slot Picker & Form */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader
                title={
                  activeDoctor
                    ? `Book with ${activeDoctor.name}`
                    : 'Choose a Doctor to View Availability'
                }
                subtitle={
                  activeDoctor
                    ? `${activeDoctor.department} • ${activeDoctor.specialty}`
                    : 'Real-time doctor schedule and slot verification'
                }
              />
              <CardBody className="space-y-5">
                {bookingResult && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      Appointment Confirmed
                    </div>
                    <p className="mt-1.5 text-xs">
                      Doctor: <strong>{bookingResult.doctorName}</strong> ({bookingResult.department})
                      <br />
                      Time: <strong>{formatDateTime(bookingResult.appointmentDate)}</strong>
                      {bookingResult.patientCode && (
                        <>
                          <br />
                          Your Patient Code: <strong>{bookingResult.patientCode}</strong> — you can now{' '}
                          <Link to="/login" className="underline">
                            sign in
                          </Link>{' '}
                          to access your patient portal.
                        </>
                      )}
                    </p>
                  </div>
                )}

                {!activeDoctor ? (
                  <EmptyState
                    icon={Calendar}
                    title="Select a doctor on the left"
                    description="Pick any specialist from the directory to inspect open 30-minute consultation slots."
                  />
                ) : (
                  <form onSubmit={handleBookingSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Select Appointment Date (next 60 days)
                      </label>
                      <input
                        type="date"
                        min={todayIso()}
                        value={selectedDay}
                        onChange={(e) => {
                          setSelectedDay(e.target.value);
                          setSelectedSlot('');
                        }}
                        required
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-clinical-500 focus:outline-none sm:w-64"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-700">Available IST Time Slots</p>
                      {availabilityQuery.isLoading ? (
                        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          <Skeleton className="h-9 w-full" />
                          <Skeleton className="h-9 w-full" />
                          <Skeleton className="h-9 w-full" />
                          <Skeleton className="h-9 w-full" />
                        </div>
                      ) : availabilityQuery.isError ? (
                        <p className="mt-2 text-xs text-rose-600">
                          {extractApiError(availabilityQuery.error)}
                        </p>
                      ) : (availabilityQuery.data?.slots.length ?? 0) === 0 ? (
                        <p className="mt-2 text-xs text-amber-700">
                          No remaining open slots on {selectedDay}. Please try another date.
                        </p>
                      ) : (
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {availabilityQuery.data?.slots.map((slot) => (
                            <button
                              key={slot.value}
                              type="button"
                              onClick={() => setSelectedSlot(slot.value)}
                              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                                selectedSlot === slot.value
                                  ? 'border-clinical-600 bg-clinical-600 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-clinical-300'
                              }`}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!user && (
                      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            New Patient Account Details
                          </p>
                        </div>
                        <input
                          type="text"
                          required
                          minLength={2}
                          placeholder="Full Name *"
                          value={guestForm.name}
                          onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                        />
                        <input
                          type="email"
                          required
                          placeholder="Email Address *"
                          value={guestForm.email}
                          onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                        />
                        <input
                          type="password"
                          required
                          minLength={8}
                          placeholder="Account Password (min 8 chars) *"
                          value={guestForm.password}
                          onChange={(e) => setGuestForm({ ...guestForm, password: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                        />
                        <input
                          type="tel"
                          required
                          minLength={7}
                          placeholder="Phone Number *"
                          value={guestForm.phone}
                          onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          required
                          min={0}
                          max={120}
                          placeholder="Age *"
                          value={guestForm.age}
                          onChange={(e) => setGuestForm({ ...guestForm, age: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                        />
                        <select
                          value={guestForm.gender}
                          onChange={(e) => setGuestForm({ ...guestForm, gender: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Address (optional)"
                          value={guestForm.address}
                          onChange={(e) => setGuestForm({ ...guestForm, address: e.target.value })}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-clinical-500 focus:outline-none sm:col-span-2"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Reason for Visit / Symptoms *
                      </label>
                      <textarea
                        required
                        minLength={3}
                        rows={2}
                        placeholder="Describe your symptoms or consultation reason..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-clinical-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={
                        !selectedSlot ||
                        publicBookMutation.isPending ||
                        existingBookMutation.isPending
                      }
                      className="w-full rounded-xl bg-clinical-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-clinical-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {publicBookMutation.isPending || existingBookMutation.isPending
                        ? 'Booking Appointment...'
                        : 'Confirm Appointment Booking'}
                    </button>
                  </form>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

