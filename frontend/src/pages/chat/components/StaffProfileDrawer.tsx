import { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Building2,
  BadgeCheck,
  Stethoscope,
  Clock,
  IdCard,
  MessageSquare,
  Shield,
  Loader2,
  User,
  HeartPulse,
  Phone,
  MapPin
} from 'lucide-react';
import { chatService } from '@/services/chatService';
import type { StaffProfileDetail } from '@/types/chat';
import { ROLE_METADATA } from '@/config/roles';
import { Badge } from '@/components/ui/Badge';

interface StaffProfileDrawerProps {
  userId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onStartDm?: (userId: number, name: string) => void;
}

export function StaffProfileDrawer({
  userId,
  isOpen,
  onClose,
  onStartDm,
}: StaffProfileDrawerProps) {
  const [profile, setProfile] = useState<StaffProfileDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    chatService
      .getStaffProfile(userId)
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.response?.data?.detail || 'Failed to load profile details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const isPatient = profile?.role === 'patient';
  const roleMeta = profile && !isPatient ? ROLE_METADATA[profile.role] : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl transition ease-in-out duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-clinical-400" />
              <h2 className="text-base font-semibold text-white">
                {isPatient ? 'Patient Profile & Medical Card' : 'Hospital Staff Profile'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="h-[calc(100vh-65px)] overflow-y-auto px-6 py-6 space-y-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-clinical-400" />
                <p className="text-sm">Fetching verified profile details...</p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            {profile && (
              <>
                {/* Hero Card */}
                <div className="flex flex-col items-center text-center pb-4 border-b border-slate-800">
                  <div className="relative mb-3">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-clinical-600/30 border-2 border-clinical-500/40 text-2xl font-bold text-white shadow-lg">
                      {profile.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-slate-900 ${
                        profile.is_online ? 'bg-emerald-500 shadow-sm' : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  <h3 className="text-lg font-bold text-white">{profile.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    {isPatient ? (
                      <Badge variant="blue">Registered Patient</Badge>
                    ) : (
                      roleMeta && <Badge variant={roleMeta.badgeVariant}>{roleMeta.label}</Badge>
                    )}
                    <span className="text-xs text-slate-400 font-mono">
                      {isPatient
                        ? profile.patient_profile?.patient_code
                        : profile.staff_profile?.employee_code}
                    </span>
                  </div>

                  <div className="mt-4 flex w-full gap-2">
                    {onStartDm && (
                      <button
                        onClick={() => {
                          onStartDm(profile.id, profile.name);
                          onClose();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-clinical-600 hover:bg-clinical-500 text-white font-medium text-xs py-2.5 px-4 shadow-sm transition"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Send Direct Message
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                {isPatient && profile.patient_profile ? (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <IdCard className="h-4 w-4 text-clinical-400" />
                        <span>Patient Code</span>
                      </div>
                      <p className="text-sm font-mono font-bold text-white">
                        {profile.patient_profile.patient_code}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <User className="h-4 w-4 text-teal-400" />
                        <span>Demographics</span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {profile.patient_profile.age ? `${profile.patient_profile.age} yrs` : 'Age N/A'} •{' '}
                        {profile.patient_profile.gender || 'Gender unspecified'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <HeartPulse className="h-4 w-4 text-rose-400" />
                        <span>Medical & Clinical History</span>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                        {profile.patient_profile.medical_history || 'No recorded chronic conditions'}
                      </p>
                    </div>

                    {profile.patient_profile.phone && (
                      <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                        <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                          <Phone className="h-4 w-4 text-emerald-400" />
                          <span>Contact Phone</span>
                        </div>
                        <p className="text-sm font-semibold text-white">
                          {profile.patient_profile.phone}
                        </p>
                      </div>
                    )}

                    {profile.patient_profile.address && (
                      <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                        <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                          <MapPin className="h-4 w-4 text-amber-400" />
                          <span>Residential Address</span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {profile.patient_profile.address}
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <Mail className="h-4 w-4 text-sky-400" />
                        <span>Patient Email</span>
                      </div>
                      <p className="text-sm font-semibold text-white select-all">
                        {profile.email}
                      </p>
                    </div>
                  </div>
                ) : profile.staff_profile ? (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <Building2 className="h-4 w-4 text-clinical-400" />
                        <span>Department</span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {profile.staff_profile.department_name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Code: {profile.staff_profile.department_code}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <BadgeCheck className="h-4 w-4 text-teal-400" />
                        <span>Designation</span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {profile.staff_profile.designation}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <Stethoscope className="h-4 w-4 text-indigo-400" />
                        <span>Specialty & Qualifications</span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {profile.staff_profile.specialty}
                      </p>
                      <p className="text-xs text-slate-300 mt-1">
                        {profile.staff_profile.qualification}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <Clock className="h-4 w-4 text-amber-400" />
                        <span>Hospital Shift Hours</span>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {profile.staff_profile.shift_start} — {profile.staff_profile.shift_end}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <Mail className="h-4 w-4 text-sky-400" />
                        <span>Official Email</span>
                      </div>
                      <p className="text-sm font-semibold text-white select-all">
                        {profile.email}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 mb-1">
                        <IdCard className="h-4 w-4 text-emerald-400" />
                        <span>Employee ID</span>
                      </div>
                      <p className="text-sm font-mono font-semibold text-white">
                        {profile.staff_profile.employee_code}
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
